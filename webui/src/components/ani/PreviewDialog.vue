<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, Item} from '@shared/types'
import * as api from '@shared/api'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'

/**
 * 预览：这条订阅按当前 RSS + 匹配规则，会命中哪些资源。
 *
 * 列是照上游 Preview.vue 的表来的 —— 那张表一行有十一列，我们原来只挑了六列，
 * 少掉的字幕组 / 发布时间 / InfoHash 恰恰是排查「为什么下了这一集」时要看的：
 * 同一集常有好几个字幕组的版本，光看标题和大小分不出命中的是哪一条。
 *
 * 三个状态（禁不禁止下载、本地在不在、走的主还是备用 RSS）原来挤在一列里，
 * 三选一地显示 —— 「已下载」和「不下载」同时成立时后者把前者盖掉，
 * 看上去就像这一集根本没下过。现在拆成三列，各说各的。
 */

const props = defineProps<{
  item: Ani
  /**
   * 由外层负责落盘。
   *
   * 这个面板有两个入口：卡片菜单点进来时它是孤立的，改完「禁止下载」必须自己存；
   * 编辑订阅里点进来时外面还有一颗「保存」，这里再存一次就等于把人家没改完的
   * 表单提前提交了 —— 改了一半的标题、还没确认的匹配规则，全被写进去。
   * 这种情况只改传进来的对象，落盘交给外层那颗保存。
   */
  deferSave?: boolean
}>()
const emit = defineEmits<{close: []}>()

/**
 * 「本地已存在」这一位，上游 WebUI 读的是 item.local，
 * 而 types.ts 是从 Java 实体生成的，那边叫 hasDownloaded。
 * 不确定哪个版本的后端发的是哪个名字，两个都认，谁有值算谁。
 */
type Row = Item & {local?: boolean}

const store = useAniStore()
const ui = useUiStore()
const {mobile} = useDisplay()
const dialog = ref(true)
const loading = ref(false)
const busy = ref('')
const downloadPath = ref('')
/** 种子位置弹窗里要显示的那条路径，空串 = 关着 */
const pathDialog = ref('')
const items = ref<Row[]>([])
const omitList = ref<number[]>([])

const isLocal = (it: Row) => it.local ?? it.hasDownloaded ?? false

/** 选中的行号 —— 用下标而不是集数：同一集可能有多个字幕组的版本 */
const picked = ref<number[]>([])

/* notDownload 是「这几集不要下」的集数清单，存在订阅上。
   上游的预览面板就是靠它做「禁止下载 / 允许下载」的，而我们这边这个字段
   在整个界面里一次都没被引用过 —— 也就是说这个能力根本没做出来。 */
const blocked = computed(() => new Set(props.item.notDownload ?? []))
const isBlocked = (it: Row) => typeof it.episode === 'number' && blocked.value.has(it.episode)

/** 上游表头上方那个下拉，照搬 —— 补完一季之后只想看还缺哪几集 */
const VIEWS: {label: string; fn: (it: Row) => boolean}[] = [
  {label: '全部', fn: () => true},
  {label: '本地已存在', fn: it => isLocal(it)},
  {label: '本地不存在', fn: it => !isLocal(it)},
]
const view = ref('全部')

/** 带上原始下标一起过滤：picked 存的是 items 里的位置，筛选不能把它错位 */
const shown = computed(() => {
  const fn = (VIEWS.find(v => v.label === view.value) ?? VIEWS[0]).fn
  return items.value.map((it, i) => ({it, i})).filter(({it}) => fn(it))
})

const chosen = computed(() => picked.value.map(i => items.value[i]).filter(Boolean))
const chosenEpisodes = computed(() =>
    [...new Set(chosen.value.map(it => it.episode).filter((e): e is number => typeof e === 'number'))])
const chosenHashes = computed(() =>
    chosen.value.filter(it => isLocal(it) && it.infoHash).map(it => it.infoHash as string))

const allPicked = computed(() =>
    shown.value.length > 0 && shown.value.every(({i}) => picked.value.includes(i)))

/** 全选只管当前筛出来的那些，别把看不见的行也勾上 */
function toggleAll() {
  const ids = shown.value.map(({i}) => i)
  picked.value = allPicked.value
      ? picked.value.filter(i => !ids.includes(i))
      : [...new Set([...picked.value, ...ids])]
}

async function load() {
  loading.value = true
  try {
    const r = await api.previewAni(props.item)
    downloadPath.value = r.downloadPath
    items.value = r.items || []
    omitList.value = r.omitList || []
  } finally {
    loading.value = false
  }
}

onMounted(load)

/**
 * 改「不下载」清单并存盘。
 *
 * 上游是在订阅编辑表单里改 ani.notDownload，靠用户点「保存」才落盘；
 * 我们这个对话框是从卡片直接打开的，没有外层的保存按钮 ——
 * 改完不存等于白改，所以这里直接存。
 */
async function setBlocked(block: boolean) {
  const eps = chosenEpisodes.value
  if (!eps.length) return ui.error('先选中要操作的剧集')
  const next = new Set(props.item.notDownload ?? [])
  for (const e of eps) block ? next.add(e) : next.delete(e)

  const list = [...next].sort((a, b) => a - b)
  const msg = block ? `已禁止下载 ${eps.length} 集` : `已允许下载 ${eps.length} 集`

  if (props.deferSave) {
    props.item.notDownload = list
    ui.info(`${msg}，保存后生效`)
    return
  }

  busy.value = block ? 'block' : 'allow'
  try {
    await store.update({...props.item, notDownload: list}, false, msg)
    props.item.notDownload = list
  } finally {
    busy.value = ''
  }
}

/**
 * 复制。种子链接和 InfoHash 都走这里 —— 上游表里这两样也都是点一下就进剪贴板。
 * 用处很实在：某一集匹配规则没命中、或者只想单独补一集时，
 * 直接把链接丢给下载器，不用为一集去改订阅规则。
 *
 * 没有直接用 navigator.clipboard：ani-rss 常跑在 http 的内网地址上，
 * 那不是安全上下文，这个 API 会直接抛。
 */
async function copyText(text: string | undefined, what: string) {
  if (!text) return ui.error(`这一条没有${what}`)
  try {
    await navigator.clipboard.writeText(text)
    ui.success(`${what}已复制`)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    ui.success(`${what}已复制`)
  }
}

/**
 * 种子位置。用弹窗摊开而不是塞进表格列 —— 那条路径是
 * `{configDir}/torrent/xxx.torrent` 那种绝对路径，宽屏上也要占掉两百多个像素。
 */
function showTorrentPath(path: string) {
  pathDialog.value = path
}

async function removeTorrents() {
  const hashes = chosenHashes.value
  if (!hashes.length) return ui.error('选中的项里没有已下载的种子')
  busy.value = 'torrent'
  try {
    await api.deleteTorrent(props.item.id ?? '', hashes.join(','))
    ui.success(`已删除 ${hashes.length} 个种子缓存`)
    picked.value = []
    await load()
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="920" scrollable @after-leave="emit('close')">
    <v-card :loading="loading">
      <v-card-title class="d-flex align-center">
        <span class="text-truncate">预览 · {{ item.title }}</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="dialog = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-1">下载位置</div>
        <div class="text-body-2 mb-4 path">{{ downloadPath || '—' }}</div>

        <v-alert v-if="omitList.length" class="mb-4" density="compact" type="warning" variant="tonal">
          推断出遗漏集数：{{ omitList.join('、') }}
        </v-alert>

        <div class="d-flex align-center flex-wrap ga-4 mb-3">
          <!-- 不用 v-btn-toggle：那玩意儿把几颗按钮拼成一条，中间一点缝都没有。
               三颗独立的按钮，之间 8px，和右边的计数隔 16px。 -->
          <div class="d-flex align-center flex-wrap ga-2">
            <v-btn v-for="v in VIEWS" :key="v.label" :variant="view === v.label ? 'tonal' : 'text'"
                   :color="view === v.label ? 'primary' : undefined" size="small" @click="view = v.label">
              {{ v.label }}
            </v-btn>
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ shown.length === items.length ? `共 ${items.length} 项` : `${shown.length} / ${items.length} 项` }}
          </div>
          <v-chip v-if="blocked.size" color="error" size="x-small" variant="tonal">
            {{ blocked.size }} 集不下载
          </v-chip>
        </div>

        <v-empty-state v-if="!loading && !items.length" icon="mdi-magnify-close"
                       text="当前 RSS 与匹配规则下没有命中任何资源" title="没有匹配项"/>

        <v-empty-state v-else-if="!shown.length" icon="mdi-filter-remove-outline"
                       text="换个筛选看看" :title="`没有${view}的资源`"/>

        <template v-else>
          <!-- 选中后才出现的操作条：没选东西时摆一排灰按钮只会让人以为坏了 -->
          <v-slide-y-transition>
            <div v-if="picked.length" class="picked-bar mb-2">
              <span class="text-body-2">已选 {{ picked.length }} 项</span>
              <v-spacer/>
              <v-btn :loading="busy === 'allow'" prepend-icon="mdi-check" size="small" variant="text"
                     @click="setBlocked(false)">
                允许下载
              </v-btn>
              <v-btn :loading="busy === 'block'" prepend-icon="mdi-cancel" size="small" variant="text"
                     @click="setBlocked(true)">
                禁止下载
              </v-btn>
              <!--
                新建订阅的预览里没有这颗：deleteTorrent 要拿订阅 id 去找下载器里的任务，
                而这条订阅还没入库、没有 id。传空串过去删的不知道是谁的种子。
                「允许 / 禁止下载」两颗留着 —— 它们只改 notDownload，跟着「添加」一起存。
              -->
              <v-btn v-if="item.id" :disabled="!chosenHashes.length" :loading="busy === 'torrent'" color="error"
                     prepend-icon="mdi-delete-outline" size="small" variant="text" @click="removeTorrents">
                删除种子（{{ chosenHashes.length }}）
              </v-btn>
            </div>
          </v-slide-y-transition>

          <!-- fixed-header + 外面那条 max-height：表格自己是一个滚动框。
               不这么做的话横向滚动条挂在整张表的最下沿，行一多就掉到屏幕外，
               要先把整页往下拖才够得着它。现在它固定在这个框的底边，
               表头也钉住，滚轮只管上下，左右那条一直在手边。 -->
          <v-table class="grid" density="compact" fixed-header>
            <thead>
            <tr>
              <th style="width: 48px">
                <v-checkbox-btn :indeterminate="picked.length > 0 && !allPicked" :model-value="allPicked"
                                density="compact" @update:model-value="toggleAll"/>
              </th>
              <th style="width: 52px">集</th>
              <th style="width: 76px">下载</th>
              <th style="width: 88px">本地</th>
              <th style="width: 78px">RSS</th>
              <th style="width: 130px">字幕组</th>
              <th style="min-width: 300px">标题</th>
              <th style="min-width: 240px">重命名后</th>
              <th style="width: 112px">发布时间</th>
              <th style="width: 92px">大小</th>
              <th style="width: 132px">InfoHash</th>
              <th style="width: 48px"/>
            </tr>
            </thead>
            <tbody>
            <tr v-for="{it, i} in shown" :key="i" :class="{blocked: isBlocked(it)}">
              <td>
                <v-checkbox-btn v-model="picked" :value="i" density="compact"/>
              </td>
              <td>{{ it.episode ?? '—' }}</td>
              <td>
                <!-- 这三列各说各的：禁不禁止下载、本地在不在、走的哪条 RSS。
                     两边都给成色块而不是「有色块 / 一行灰字」—— 灰字太不显眼，
                     扫一列的时候只看得见有色块的那几行，另一半像是空的。
                     三列三套颜色（绿红 / 蓝灰 / 紫橙），不会互相认错。 -->
                <v-chip v-if="isBlocked(it)" color="error" size="x-small" variant="flat">禁止</v-chip>
                <v-chip v-else color="success" size="x-small" variant="tonal">允许</v-chip>
              </td>
              <td>
                <v-chip v-if="isLocal(it)" color="info" size="x-small" variant="tonal">已下载</v-chip>
                <v-chip v-else size="x-small" variant="outlined">未下载</v-chip>
              </td>
              <td>
                <v-chip v-if="it.master" color="primary" size="x-small" variant="tonal">主</v-chip>
                <v-chip v-else color="warning" size="x-small" variant="flat">备用</v-chip>
              </td>
              <td class="text-caption">{{ it.subgroup || '—' }}</td>
              <!-- 标题和重命名各占一列。叠在一格里省宽度，但两边对不齐，
                   要核对「这条被改成了什么」得一行一行上下看 -->
              <td class="text-body-2">{{ it.title }}</td>
              <td class="text-caption text-medium-emphasis">{{ it.reName || '—' }}</td>
              <td class="text-caption text-medium-emphasis">{{ it.pubDate || '—' }}</td>
              <td class="text-caption">{{ it.formatSize || '—' }}</td>
              <td>
                <!-- 四十位十六进制，整串摆出来能把表挤到没边；截断显示，点一下拿全的 -->
                <span v-if="it.infoHash" :title="it.infoHash" class="hash"
                      @click="copyText(it.infoHash, 'InfoHash')">{{ it.infoHash }}</span>
                <span v-else class="text-caption text-medium-emphasis">—</span>
              </td>
              <td>
                <!-- 单独补一集时直接拿链接走，不用为一集去改订阅规则 -->
                <v-btn :disabled="!it.torrent" icon="mdi-content-copy" size="x-small"
                       title="复制种子链接" variant="text" @click="copyText(it.torrent, '种子链接')"/>
                <!--
                  种子落盘之后后端才认得它的位置（Item.torrentPath，上游 3.2.42 db375d7
                  把种子从内存挪到文件时加的）。整条路径常常上百个字符，塞进表格会把
                  「改名后」那一列挤没，所以点开弹窗看。
                -->
                <v-btn v-if="it.torrentPath" icon="mdi-folder-open-outline" size="x-small"
                       title="种子位置" variant="text" @click="showTorrentPath(it.torrentPath)"/>
              </td>
            </tr>
            </tbody>
          </v-table>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- 种子位置：整条路径摊开，可选中复制 —— 拿去下载器里手动做种时要用 -->
  <v-dialog :model-value="!!pathDialog" max-width="560" @update:model-value="pathDialog = ''">
    <v-card>
      <v-card-title class="pt-4">种子位置</v-card-title>
      <v-card-text>
        <div class="path text-body-2">{{ pathDialog }}</div>
      </v-card-text>
      <v-divider/>
      <v-card-actions class="pa-3">
        <v-spacer/>
        <v-btn variant="text" @click="pathDialog = ''">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* 路径可能很长，允许在任意位置断行，别把弹窗撑宽 */
.path {
    word-break: break-all;
    font-family: var(--ani-font-mono, monospace);
}

/* 一排按钮，之间 8px、离条子的边 8px（左边留 16px 给那句「已选 N 项」）。
   原来是 4px，三颗文字按钮挨在一起像连在一块儿的一根长条 */
.picked-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 8px 8px 16px;
    border-radius: 10px;
    background: rgba(var(--v-theme-primary), .1);
}

/* 十二列，横向放不下。v-table 自带的滚动容器已经是 overflow:auto，
   给里面的表定一个下限就会横滚，不至于把每一列压成竖排的字。
   同时把这个容器封顶：横向滚动条就钉在框底，不会随着行数往下跑。 */
.grid :deep(.v-table__wrapper) {
    max-height: min(52vh, 420px);
}

.grid :deep(table) {
    min-width: 1360px;
}

.grid :deep(th) {
    white-space: nowrap;
}

/* 标题和重命名都是一长串文件名，不许在中间断词，让它整段换行 */
.grid :deep(td) {
    word-break: break-word;
}

.hash {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
    font-family: var(--ani-font-mono, monospace);
    font-size: 11.5px;
    color: rgba(var(--v-theme-on-surface), .62);
    cursor: pointer;
}

.hash:hover {
    color: rgb(var(--v-theme-primary));
}

/* 标成不下载的整行压暗，一眼看出来哪几集被排除了 */
.blocked > td {
    opacity: .72;
}
</style>
