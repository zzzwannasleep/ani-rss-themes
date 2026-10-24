<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, RssToAniDTO} from '@shared/types'
import * as api from '@shared/api'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'
import type {BatchRequest} from './batch'
import AniEditDialog from './AniEditDialog.vue'
import DangerConfirm from '@/components/common/DangerConfirm.vue'

/**
 * 统一的「确认订阅信息」弹窗 —— 所有新增订阅的路都从这里走。
 *
 * 上游 3.2.48（bd69f45「优化订阅添加流程」）把原来那套「每个来源各写一遍批量添加」
 * 收成了一个多标签弹窗，这是这一轮最值得借的一处交互：
 *
 *   以前（我们和上游都是）：
 *     选几个字幕组 → 点「批量添加」→ 一个进度条 → 全加完 → location.reload()
 *   问题在于**中间那一段什么都看不见**。哪一条解析失败了、规则挑错没有、
 *   标题刮成了哪一部，全都要等入库之后回到列表里才发现，而那时候删了重加更麻烦。
 *
 *   现在：
 *     每个字幕组是一条标签，**串行**解析（一条一条来，不是并发一堆），
 *     标签上挂着状态（加载中 / 待确认 / 失败），
 *     解析好的直接摆出完整的订阅编辑框 —— 标题、季度、匹配规则、备用源都能当场改，
 *     点「添加」才入库，这一条从队列里消失、自动切到下一条。
 *
 * 三处配套：
 *  - 手填 RSS 和 Bangumi 搜索也走同一个弹窗（单条队列），不再各走各的第二步；
 *  - 撞名不再是一个全局开关，而是这一步问一次（「覆盖」才带 override 重发）；
 *  - 解析失败只废掉那一条，后面的照常往下走，失败的那条可以「重试」。
 *
 * 队列条目的形状（BatchRequest）在 batch.ts 里 —— 番剧列表和这里都要用，
 * 放一处免得两边各写一份、改一边忘一边。
 */

type Status = 'loading' | 'ready' | 'error'

interface Entry {
    id: string
    label: string
    request: BatchRequest
    status: Status
    ani: Ani | null
    error: string
}

const model = defineModel<boolean>({required: true})
/**
 * 要过的那一批。**每次打开都换一个新数组**（见 useAniScreen.openBatch），
 * 所以下面那个 watch 靠引用变化就能认出「又排了一批」。
 */
const props = defineProps<{requests: BatchRequest[]}>()

const ani = useAniStore()
const ui = useUiStore()
const {mobile} = useDisplay()

const entries = ref<Entry[]>([])
const active = ref('')
/** 这次会话里真的加进去过 —— 关弹窗时要据此把列表刷一遍 */
let dirty = false

const current = computed(() => entries.value.find(e => e.id === active.value) ?? null)

const STATUS: Record<Status, {text: string; color: string}> = {
    loading: {text: '加载中', color: 'info'},
    ready: {text: '待确认', color: 'primary'},
    error: {text: '失败', color: 'error'},
}

let seq = 0

/**
 * 把一批请求排成队列并**串行**加载。
 *
 * 串行不是为了省事：并发一堆 rssToAni 等于把后端同时按在好几个 RSS 站上，
 * 而 Mikan / AniBT 这类站对并发很敏感（一被限速，整批都废）。
 * 上游那句注释也是这个意思 ——「单条串行解析，失败只影响当前 tab，后续任务继续执行」。
 */
async function startBatch(requests: BatchRequest[]) {
    entries.value = requests.map((request, i) => ({
        id: `b${Date.now()}-${seq++}-${i}`,
        label: request.label || request.ani?.title || `订阅 ${i + 1}`,
        request,
        status: 'loading' as Status,
        ani: null,
        error: '',
    }))
    active.value = entries.value[0]?.id ?? ''
    if (!entries.value.length) return
    for (const e of entries.value) await loadEntry(e)
}

async function loadEntry(entry: Entry) {
    entry.status = 'loading'
    entry.error = ''
    try {
        let a: Ani
        if (entry.request.ani) {
            // 已经解析好的（Bangumi 搜索那条路）：深拷贝一份，改它不影响调用方手里的对象
            a = JSON.parse(JSON.stringify(entry.request.ani)) as Ani
        } else {
            const dto: RssToAniDTO = {...entry.request.dto}
            /*
             * 备用源两种给法都带上：
             *  - 3.2.48 起 DTO 上有 standbyRssList，后端解析完直接带着它回来；
             *  - 老后端不认这个字段（DTO 里多一个键，Gson 直接忽略），所以下面自己补一遍。
             * 补是幂等的：新后端已经返回了列表，非空就不再覆盖。
             */
            if (entry.request.standby?.length) dto.standbyRssList = entry.request.standby
            a = await api.rssToAni(dto)
            if (entry.request.standby?.length && !a.standbyRssList?.length) {
                a.standbyRssList = entry.request.standby
            }
        }
        if (entry.request.match?.length) a.match = entry.request.match
        entry.ani = a
        entry.label = a.title || entry.label
        entry.status = 'ready'
    } catch (e) {
        entry.status = 'error'
        entry.error = (e as Error)?.message || '订阅加载失败'
    }
}

/* ── 确认入库 ── */

/** 后端撞名时抛的两句话，出自 AniService.addAni */
const DUPLICATE = ['此订阅已存在', '订阅标题重复']

/** 撞名的那一条，以及它要提交的对象。null = 没在问 */
const duplicate = ref<{entry: Entry; value: Ani} | null>(null)
const overwriting = ref(false)

function submitCurrent(value: Ani) {
    if (current.value) void submit(current.value, value)
}

async function submit(entry: Entry, value: Ani) {
    try {
        await api.addAniQuiet(value)
    } catch (e) {
        const msg = (e as Error)?.message ?? ''
        // 撞名：交给用户决定，别自动覆盖
        if (DUPLICATE.includes(msg)) {
            duplicate.value = {entry, value}
            return
        }
        ui.error(msg || '订阅添加失败')
        return
    }
    accepted(entry)
}

async function doOverwrite() {
    const job = duplicate.value
    if (!job) return
    overwriting.value = true
    try {
        await api.addAniQuiet(job.value, true)
    } catch (e) {
        /*
         * override 是 3.2.48 加的。老后端忽略这个参数，重发还是同一句「订阅标题重复」——
         * 这时该说的是「后端不够新」，不是把同一句话再弹一遍让人以为没点着。
         */
        const msg = (e as Error)?.message ?? ''
        ui.error(DUPLICATE.includes(msg)
            ? '覆盖失败：当前 ani-rss 不支持覆盖重名订阅（需要 3.2.48 及以上）'
            : (msg || '订阅添加失败'))
        return
    } finally {
        overwriting.value = false
    }
    duplicate.value = null
    accepted(job.entry)
}

function accepted(entry: Entry) {
    dirty = true
    ui.success('订阅添加成功')
    closeEntry(entry)
}

/* ── 队列维护 ── */

function closeEntry(entry: Entry) {
    const i = entries.value.findIndex(e => e.id === entry.id)
    if (i < 0) return
    entries.value.splice(i, 1)
    if (active.value === entry.id) {
        // 切到下一条：优先后面那条，没有了就退回前一条
        active.value = (entries.value[i] ?? entries.value[i - 1])?.id ?? ''
    }
    if (!entries.value.length) close()
}

/**
 * 收尾。已经加进去过就把列表刷一遍 ——
 * 不然关掉弹窗回到订阅页，新加的几条要等下一次轮询才出现，看着像没加上。
 */
function close() {
    model.value = false
    if (dirty) {
        dirty = false
        void ani.reload()
    }
}

// 从外面关（Esc、点背景、调用方把 model 置 false）走的是这条路，同样要收尾
watch(model, v => {
    if (!v && dirty) {
        dirty = false
        void ani.reload()
    }
})

// 排进来一批就开始过。model 和 requests 通常同一拍变，watch 会合并成一次
watch([model, () => props.requests], ([open, requests]) => {
    if (open && requests.length) void startBatch(requests)
})

defineExpose({open: startBatch})
</script>

<template>
  <v-dialog v-model="model" :fullscreen="mobile" max-width="900" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center ga-2 py-4">
        <v-icon icon="mdi-playlist-plus" size="22"/>
        <span>确认订阅信息</span>
        <v-chip v-if="entries.length > 1" size="x-small" variant="tonal">{{ entries.length }} 条待确认</v-chip>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="close"/>
      </v-card-title>
      <v-divider/>

      <!--
        标签条用 v-tabs 而不是一排 chip。
        chip 那颗 × 是个 button，而 v-tab 本身也是 button —— 想「一条上挂一个关闭键」
        就只能拿 chip 当标签用，而 chip 不在 group 里时是个普通 span：键盘 Tab 不到、
        回车点不动，手机上还只有 24px 高。上游那套 el-tabs 自带 closable，
        我们这边换一条路：去留在编辑框上方那颗「跳过这一条」，
        标签条只负责切和显示状态 —— 三样各归各位，也不用往按钮里塞按钮。
      -->
      <v-tabs v-if="entries.length" v-model="active" density="comfortable" show-arrows>
        <v-tab v-for="e in entries" :key="e.id" :value="e.id" class="queue-tab">
          <span class="queue-name">{{ e.label }}</span>
          <span :class="`text-${STATUS[e.status].color}`" class="queue-state">{{ STATUS[e.status].text }}</span>
        </v-tab>
      </v-tabs>
      <v-divider v-if="entries.length"/>

      <v-card-text class="pane">
        <template v-if="current">
          <div v-if="current.status === 'loading'" class="center">
            <v-progress-circular indeterminate/>
            <div class="text-body-2 text-medium-emphasis mt-3">正在加载订阅信息…</div>
          </div>

          <template v-else-if="current.status === 'error'">
            <v-alert :title="current.error" class="mb-4" type="error" variant="tonal"/>
            <div class="text-caption text-medium-emphasis mb-4">
              这一条失败不影响后面几条，后面的已经照常加载完了。重试只重发这一条。
            </div>
            <div class="d-flex justify-end ga-2">
              <v-btn variant="text" @click="closeEntry(current)">跳过</v-btn>
              <v-btn color="primary" prepend-icon="mdi-refresh" variant="flat" @click="loadEntry(current)">
                重试
              </v-btn>
            </div>
          </template>

          <!-- 解析好了：摆出完整的编辑框，改完点「添加」才入库 -->
          <template v-else-if="current.ani">
            <div class="ready-bar">
              <span class="text-body-2 text-truncate">{{ current.label }}</span>
              <v-spacer/>
              <v-btn size="small" variant="text" @click="closeEntry(current)">跳过这一条</v-btn>
            </div>
            <AniEditDialog
                :key="current.id"
                :item="current.ani"
                embedded
                is-new
                @submit="submitCurrent"
            />
          </template>
        </template>

        <v-empty-state v-else icon="mdi-check-circle-outline" text="全部处理完了" title="队列已空"/>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!--
    撞名：覆盖会把原来那条删掉再建（后端 AniUtil.ANI_LIST.remove + add），
    原来那条上的下载记录和「不下载」的标记不跟着过来，所以套的是危险确认那一层。
  -->
  <DangerConfirm
      :loading="overwriting"
      :model-value="!!duplicate"
      ok-text="覆盖原订阅"
      title="订阅重复"
      @ok="doOverwrite"
      @update:model-value="v => { if (!v) duplicate = null }"
  >
    订阅「{{ duplicate?.value.title }}」已经存在。
    <div class="text-caption text-medium-emphasis mt-2">
      覆盖会把原来那条删掉，换成现在这条。原来的下载记录和「不下载」标记不会跟过来。
    </div>
  </DangerConfirm>
</template>

<style scoped>
/* 一条标签上同时摆名字和状态：名字可以让位，状态不能（它就是这一条为什么在这儿的原因） */
.queue-tab {
    min-width: 0;
    max-width: 280px;
}

.queue-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.queue-state {
    flex: 0 0 auto;
    margin-left: 8px;
    font-size: .7rem;
}

/* 编辑框上方那条：左边是这条订阅的名字，右边是「跳过这一条」 */
.ready-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    min-width: 0;
}

.pane {
    min-height: 360px;
}

.center {
    display: grid;
    place-items: center;
    min-height: 300px;
}
</style>
