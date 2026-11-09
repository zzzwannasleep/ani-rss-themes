<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
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

/* ── 队列条：一条一条横着排，多了就滑 ──
 *
 * ── 为什么不是 v-tabs（3.2.52 那一版就是这么叠起来的）──
 *
 * 上游用 el-tabs，我们跟了 v-tabs。但 Vuetify 的 .v-tab 实际是 .v-btn：
 * `.v-tab.v-tab.v-btn { min-width: 90px }` 是 **(0,3,0)** ——
 * 组件自己那条 `.queue-tab` 只有 (0,1,0)，加 scoped 也才 (0,2,0)，改不动；
 * 而 .v-btn 是 `inline-grid; flex-shrink: 0`，插槽又被包进不收缩的 .v-btn__content，
 * 标题又是 nowrap：宽度钉死、内容缩不动，字就漫出按钮盒子，
 * 压到隔壁那条身上 —— 看着像「标题糊在一起」，其实是溢出叠字。
 * 条数再一多，后面的被前面那些宽盒子挤出可视区，滚也滚不动（slide-group 只在
 * 有箭头时替你挪），于是点都点不到。
 *
 * 所以这一层整个自己排，不留 Vuetify 的中间层：
 *   · flex 排，条与条之间有缝，名字可以截断，谁都盖不到谁；
 *   · 宽度有上限，超出的部分由容器横着滚过去（滚轮 / 中键拖 / 两端箭头三条路）；
 *   · 切到哪一条就把它滚进视野 —— 加进队列的顺序是先第一条，
 *     光标跟着 active 走，永远看得见当前这条。
 * 语义照旧是 tablist / tab / tabpanel：键盘 Tab 进来、左右键换条、Home/End 到头。
 */
const strip = ref<HTMLElement>()
const canLeft = ref(false)
const canRight = ref(false)

/** 队列条和下方正文是一对 aria 关系，id 得写死；tab 那半按条目 id 拼 */
const PANE_ID = 'ani-queue-pane'
const tabId = (id: string) => `ani-queue-tab-${id}`

function syncEdges() {
    const el = strip.value
    if (!el) return
    // 亚像素：到头时 scrollLeft 可能是 max - 0.5，留 1px 容差（同 DashboardView 的轨道）
    canLeft.value = el.scrollLeft > 1
    canRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
}

/** 让当前这条滚进视野。手动算落点，不用 scrollIntoView —— 那会把外层的弹窗正文一起带走 */
function revealActive() {
    const box = strip.value
    if (!box) return
    const tab = box.querySelector<HTMLElement>('.queue-tab--active')
    if (!tab) return
    const pad = 8
    const left = tab.offsetLeft - pad
    const right = tab.offsetLeft + tab.offsetWidth + pad
    if (left < box.scrollLeft) box.scrollLeft = Math.max(0, left)
    else if (right > box.scrollLeft + box.clientWidth) box.scrollLeft = right - box.clientWidth
    syncEdges()
}

/**
 * 竖着滚滚轮 → 队列条横着走。
 *
 * 两处必须放行，否则鼠标停在条上时弹窗正文就滚不动了：
 * 触控板本来就在横着滑（deltaX 更大，浏览器自己会滚这条），
 * 以及条已经顶到这一头。
 */
function onWheel(e: WheelEvent) {
    const el = strip.value
    if (!el || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    const max = el.scrollWidth - el.clientWidth
    if (max <= 0) return
    if (e.deltaY < 0 ? el.scrollLeft <= 0 : el.scrollLeft >= max - 1) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
}

/**
 * 箭头翻页：按整数条翻，一屏放几条就翻几条，留一条重叠当上下文。
 * 算绝对落点而不是 scrollBy —— 用滚轮随手滑过之后 scrollLeft 是个零头，
 * 相对翻页会把这个零头一路带下去，此后每一屏都卡在半条上。
 */
function page(dir: 1 | -1) {
    const el = strip.value
    if (!el) return
    const first = el.querySelector<HTMLElement>('.queue-tab')
    if (!first) return
    // 步距 = 条宽 + 间距，宽度是内容撑出来的，只能量不能算
    const next = first.nextElementSibling as HTMLElement | null
    const pitch = next ? next.offsetLeft - first.offsetLeft : first.offsetWidth + 8
    const step = Math.max(1, Math.floor(el.clientWidth / pitch) - 1)
    el.scrollTo({left: (Math.round(el.scrollLeft / pitch) + dir * step) * pitch, behavior: 'smooth'})
}

/* ── 中键拖动：按住滚轮左右拽 ──
 *
 * 中键在浏览器里默认是「自动滚动」那个四向光标，得在 mousedown 上 preventDefault
 * 才按住（模板里 `.middle.prevent` 就是干这个的）。之后用指针捕获把 move/up 全收过来，
 * 指针滑出条外也照拖不误。
 */
let pan: {x: number; left: number; id: number} | null = null

function onStripDown(e: PointerEvent) {
    if (e.button !== 1) return
    const el = strip.value
    if (!el || el.scrollWidth - el.clientWidth <= 1) return
    pan = {x: e.clientX, left: el.scrollLeft, id: e.pointerId}
    el.classList.add('is-panning')
    try {
        el.setPointerCapture(e.pointerId)
    } catch {
        // 拿不到捕获也能用，只是拖出条外会断
    }
}

function onStripMove(e: PointerEvent) {
    if (!pan || !strip.value) return
    strip.value.scrollLeft = pan.left - (e.clientX - pan.x)
}

function endPan(e: PointerEvent) {
    if (!pan || e.pointerId !== pan.id) return
    pan = null
    const el = strip.value
    el?.classList.remove('is-panning')
    try {
        el?.releasePointerCapture(e.pointerId)
    } catch {
        // 指针已经自己释放过了
    }
}

/** 方向键换条。焦点跟着走，不然按一下就丢在条外，第二个方向键按不出来 */
function onTabKey(e: KeyboardEvent) {
    const id = (e.currentTarget as HTMLElement).dataset.queueId
    const i = entries.value.findIndex(x => x.id === id)
    if (i < 0) return
    let next = -1
    if (e.key === 'ArrowRight') next = Math.min(entries.value.length - 1, i + 1)
    else if (e.key === 'ArrowLeft') next = Math.max(0, i - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = entries.value.length - 1
    if (next < 0) return
    e.preventDefault()
    const target = entries.value[next]
    if (!target) return
    active.value = target.id
    void nextTick(() => strip.value?.querySelector<HTMLElement>(`[data-queue-id="${target.id}"]`)?.focus())
}

// 换条就把它滚进来；名字解析完会变长（「订阅 2」→ 真实番剧名），宽度跟着变，边界重算一遍
watch(active, () => nextTick(revealActive))

/*
 * 尺寸相关的重算：条数变、名字变、队列条自己刚挂上（弹窗是淡入的，
 * 挂上那一刻宽度可能还是 0，量一遍不够）。
 * 所以 nextTick 之后再来一帧 —— 过渡一开跑，容器宽度才是最终值。
 */
const refresh = () => {
    syncEdges()
    revealActive()
}
watch([strip, () => entries.value.length, () => entries.value.map(e => e.label).join('|')], () => nextTick(() => {
    refresh()
    requestAnimationFrame(refresh)
}))

/* 弹窗宽度会变（全屏切换、窗口缩放），条的溢出与否跟着变 */
onMounted(() => window.addEventListener('resize', refresh))
onBeforeUnmount(() => window.removeEventListener('resize', refresh))

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
        队列条自己做，不用 v-tabs —— 为什么见上面那段注释（Vuetify 把 .v-tab 的
        min-width 钉在 90px 且内容不收缩，标题一长就叠字，条多了滚不到）。
        一条上只放「名字 + 状态」，关闭走编辑框上方那颗「跳过这一条」：
        不往按钮里塞按钮，键盘 Tab 得到、回车点得动，手机上也有 40px 高。
      -->
      <div v-if="entries.length" class="queue-bar">
        <div
            ref="strip"
            aria-label="待确认的订阅"
            class="queue-strip"
            role="tablist"
            @lostpointercapture="endPan"
            @mousedown.middle.prevent
            @pointercancel="endPan"
            @pointerdown="onStripDown"
            @pointermove="onStripMove"
            @pointerup="endPan"
            @scroll.passive="syncEdges"
            @wheel="onWheel"
        >
          <button
              v-for="e in entries"
              :key="e.id"
              :aria-controls="PANE_ID"
              :aria-selected="e.id === active"
              :class="['queue-tab', {'queue-tab--active': e.id === active}]"
              :data-queue-id="e.id"
              :id="tabId(e.id)"
              :tabindex="e.id === active ? 0 : -1"
              role="tab"
              type="button"
              @click="active = e.id"
              @keydown="onTabKey"
          >
            <span class="queue-name">{{ e.label }}</span>
            <span :class="`text-${STATUS[e.status].color}`" class="queue-state">{{ STATUS[e.status].text }}</span>
          </button>
        </div>
        <!--
          只有一条时没什么可翻的，箭头出来只是占地方。
          手机上也不给：全屏弹窗本来就窄，两颗箭头吃掉 80px 就是少看一条；
          触屏有原生横滑，用手指比拿箭头一下一下点还快。
        -->
        <template v-if="entries.length > 1 && !mobile">
          <v-btn
              :disabled="!canLeft"
              aria-label="往前翻几条"
              class="queue-nav"
              density="comfortable"
              icon="mdi-chevron-left"
              size="small"
              variant="text"
              @click="page(-1)"
          />
          <v-btn
              :disabled="!canRight"
              aria-label="往后翻几条"
              class="queue-nav"
              density="comfortable"
              icon="mdi-chevron-right"
              size="small"
              variant="text"
              @click="page(1)"
          />
        </template>
      </div>
      <v-divider v-if="entries.length"/>

      <v-card-text :id="PANE_ID" :aria-labelledby="active ? tabId(active) : undefined" class="pane" role="tabpanel">
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
/*
 * 队列条。
 *
 * 三件事写在这里，缺一件就会回到「标题叠在一起、后面几条点不到」那个样子：
 *   · 条本身可以被压缩（flex: 1 1 auto + min-width: 0），容器不许被内容撑宽 ——
 *     撑宽了就是整条伸出弹窗外面；
 *   · 每条有宽度上限、名字 ellipsis、条与条之间留缝 —— 内容缩得动才不叠字；
 *   · 溢出的部分横着滚，滚动条藏掉（一条横杠压在标题条中间比它还抢眼），
 *     改用滚轮、中键拖、两端箭头三条路（见 script 里的 onWheel / onStripDown / page）。
 */
.queue-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    /* .v-card 是一条 flex 竖排，不写死就会被正文压扁（同 touch.css 里 .v-tabs 那条） */
    flex: 0 0 auto;
    padding: 6px 12px;
}

.queue-strip {
    /* offsetLeft 要相对这条算落点，得有个定位参照 */
    position: relative;
    display: flex;
    flex: 1 1 auto;
    gap: 8px;
    min-width: 0;
    /* 上下留 2px：胶囊的 hover 底色和 focus 圈都不至于贴着边被裁 */
    padding: 2px;
    overflow-x: auto;
    overflow-y: hidden;
    /* 滚到头别把滚动链传给弹窗正文，不然拖到边会突然整页往下跑 */
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    user-select: none;
    cursor: grab;
}

.queue-strip::-webkit-scrollbar {
    display: none;
}

.queue-strip.is-panning {
    cursor: grabbing;
}

/*
 * 一条队列。原生 button 而不是 v-btn：v-btn 那套网格 + 不收缩的内容正是
 * 上一版叠字的根源（见 script 顶部注释），这里只要一个能收缩的 flex 胶囊。
 */
.queue-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    /* 不换行也不平分：条数多了让容器滚，别把每条挤成只剩两个字 */
    flex: 0 0 auto;
    max-width: 260px;
    height: 36px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    background: rgba(var(--v-theme-on-surface), .07);
    color: rgba(var(--v-theme-on-surface), .78);
    font-family: inherit;
    font-size: .8125rem;
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
    transition: background .18s ease, color .18s ease;
}

.queue-tab:hover {
    background: rgba(var(--v-theme-on-surface), .13);
}

/* 焦点圈画在内侧：贴着滚动容器的那两条边不会被裁掉一半 */
.queue-tab:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: -2px;
}

.queue-tab--active,
.queue-tab--active:hover {
    background: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
}

/* 名字可以让位，状态不能 —— 状态就是这一条为什么还在这儿的原因 */
.queue-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.queue-state {
    flex: 0 0 auto;
    font-size: .7rem;
}

/*
 * 选中那条是 primary 底：状态文字原来按 text-primary / text-info / text-error 上色，
 * 在 primary 底上「待确认」正好是同色，等于看不见。这一个盖成 on-primary。
 */
.queue-tab--active .queue-state {
    color: rgb(var(--v-theme-on-primary));
    opacity: .85;
}

/* 箭头只在还有得翻的时候亮起来（disabled 掉的那颗留着占位，宽度不跳） */
.queue-nav {
    flex: 0 0 auto;
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

/* 手指上没有滚轮也没有中键：胶囊给到 40px，横滑交给浏览器原生手势 */
@media (max-width: 599.98px), (pointer: coarse) {
    .queue-tab {
        height: 40px;
    }
}
</style>
