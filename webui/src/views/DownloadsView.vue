<script setup lang="ts">
import {computed, onActivated, onDeactivated, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {TorrentsInfo} from '@shared/types'
import {formatSize} from '@shared/format'
import {useTorrentsStore} from '@/stores/torrents'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

const t = useTorrentsStore()
const {mobile} = useDisplay()
const removing = ref<TorrentsInfo | null>(null)

/*
 * 「刷新」那颗的转圈只跟手动点的那一次走。
 *
 * 直接绑 t.loading 的话，每 3 秒的轮询也会把它点亮再熄灭 —— 一颗按钮自己在那儿
 * 一闪一闪，看着像是页面在不停重载。轮询本来就该是无声的。
 */
const manual = ref(false)

async function manualReload() {
  manual.value = true
  try {
    await t.reload()
  } finally {
    manual.value = false
  }
}

/*
 * 只在本页可见时轮询，离开立刻停。
 * 用 activated/deactivated 而不是 mounted/unmounted：这一页在 keep-alive 里，
 * 切走时组件不销毁，onBeforeUnmount 根本不会触发，轮询会一直空转到关标签页。
 */
onActivated(() => t.startPolling(3000))
onDeactivated(() => t.stopPolling())

/** 状态 → 配色。后端 TorrentsStateEnum 的取值沿用 qBittorrent 那一套命名 */
function stateColor(s?: string) {
  if (!s) return undefined
  if (/^(downloading|forcedDL|metaDL|forcedMetaDL)$/.test(s)) return 'primary'
  if (/^(uploading|forcedUP|stalledUP)$/.test(s)) return 'success'
  if (/error|missingFiles/i.test(s)) return 'error'
  if (/checking|moving|allocating/i.test(s)) return 'warning'
  if (/paused|stopped/i.test(s)) return undefined
  return 'info'
}

/*
 * 排序。宽屏点表头、窄屏点 chip，两边**同一份状态** ——
 * 分成两套的话，横竖屏一转排序就回到默认，而且两边支持的字段迟早不一样。
 *
 * 五个字段：标题、进度、已下载、总大小、状态。
 * 前两个是上游那个下载弹窗本来就有的；后端 TorrentsInfo 上还摆着 completed
 * （已下载的字节数），之前只拿来显示不拿来排 —— 而「哪个快下完了」「哪个最占地方」
 * 恰恰是看下载列表时最常问的两句。
 */
const SORTS = [
  {key: 'name', label: '标题', get: (x: TorrentsInfo) => x.name ?? ''},
  {key: 'progress', label: '进度', get: (x: TorrentsInfo) => x.progress ?? 0},
  {key: 'completed', label: '已下载', get: (x: TorrentsInfo) => x.completed ?? 0},
  {key: 'size', label: '总大小', get: (x: TorrentsInfo) => x.size ?? 0},
  {key: 'state', label: '状态', get: (x: TorrentsInfo) => x.state ?? ''},
] as const

const sortKey = ref<string>('name')
const sortAsc = ref(true)

function changeSort(k: string) {
  if (sortKey.value === k) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = k
    sortAsc.value = true
  }
}

const sorted = computed(() => {
  const s = SORTS.find(x => x.key === sortKey.value)
  if (!s) return t.items
  const dir = sortAsc.value ? 1 : -1
  return [...t.items].sort((a, b) => {
    const x = s.get(a), y = s.get(b)
    return dir * (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number))
  })
})

/* v-data-table 的表头排序接回上面那份状态：点表头 = 点 chip */
const tableSort = computed({
  get: () => [{key: sortKey.value, order: (sortAsc.value ? 'asc' : 'desc') as 'asc' | 'desc'}],
  set: (v: { key: string; order?: 'asc' | 'desc' }[]) => {
    if (!v?.length) return
    sortKey.value = v[0].key
    sortAsc.value = v[0].order !== 'desc'
  },
})

const headers = [
  {title: '标题', key: 'name'},
  {title: '已下载', key: 'completed', width: 104},
  {title: '总大小', key: 'size', width: 104},
  {title: '进度', key: 'progress', width: 190},
  {title: '状态', key: 'state', width: 130},
  {title: '', key: 'actions', sortable: false, align: 'end' as const, width: 60},
]

async function confirmRemove() {
  const x = removing.value
  if (!x) return
  await t.remove(x.id || '', x.hash || '')
  removing.value = null
}
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-chip variant="tonal">共 {{ t.items.length }} 个任务</v-chip>
      <v-chip color="primary" variant="tonal">下载中 {{ t.downloading.length }}</v-chip>
      <v-chip color="success" variant="tonal">做种 {{ t.seeding.length }}</v-chip>
      <v-chip variant="tonal">{{ formatSize(t.totalSize) }}</v-chip>
      <v-spacer/>
      <v-btn :loading="manual" prepend-icon="mdi-refresh" variant="tonal" @click="manualReload">刷新</v-btn>
    </div>

    <!--
          报错不再顶掉整张列表。
          轮询每 3 秒一轮，中间任何一次抖一下（下载器重连、后端超时）都会让 error 亮起来；
          写成 v-if / v-else 的话，那一瞬间整张列表就没了，下一轮又回来 ——
          在界面上就是「一闪一闪，怎么也加载不出来」。
          报错归报错，上一轮拿到的数据还在，照常显示。
        -->
    <v-alert v-if="t.error" class="mb-4" density="compact" type="error" variant="tonal">
      读取下载器失败：{{ t.error }}
      <div class="text-caption mt-1">检查「设置 → 下载设置」里的地址与账号。</div>
    </v-alert>

    <!--
      首屏骨架只认「一次都还没成功过」，不认 loading ——
      loading 每 3 秒都会真真假假闪一遍，拿它当条件就是每 3 秒铺一次骨架。
    -->
    <v-card v-if="!t.loaded && !t.error" variant="flat">
      <div class="pa-4">
        <AniSkeleton :count="6" shape="row"/>
      </div>
    </v-card>

    <v-empty-state v-else-if="!t.items.length" icon="mdi-download-off"
                   text="下载器里当前没有任务" title="没有任务"/>

    <!-- 宽屏用表格，窄屏换卡片：表格在手机上只能横向滚动，很难用 -->
    <v-card v-else-if="!mobile" variant="flat">
      <!-- 保存路径可以很长，横滚必须发生在卡片里，不能让整页跟着变宽 -->
      <div class="table-scroll">
        <v-data-table v-model:sort-by="tableSort" :headers="headers" :items="t.items" :items-per-page="25"
                      density="comfortable" item-value="hash" must-sort>
          <template #item.name="{item}">
            <div class="py-1 name-cell">
              <div class="text-body-2 ellipsis" :title="item.name">{{ item.name }}</div>
              <div class="text-caption text-medium-emphasis ellipsis" :title="item.savePath">{{ item.savePath }}</div>
              <!-- 下载器里的标签：ani-rss 会给自己管的种子打标，混着手动加的种子时靠这个分辨 -->
              <div v-if="item.tagList?.length" class="d-flex flex-wrap ga-1 mt-1">
                <v-chip v-for="tag in item.tagList" :key="tag" size="x-small" variant="tonal">{{ tag }}</v-chip>
              </div>
            </div>
          </template>
          <template #item.completed="{item}">{{ formatSize(item.completed ?? 0) }}</template>
          <template #item.size="{item}">{{ item.formatSize || formatSize(item.size) }}</template>
          <template #item.progress="{item}">
            <div class="d-flex align-center ga-2">
              <v-progress-linear :color="stateColor(item.state)" :model-value="item.progress"
                                 height="6" rounded/>
              <span class="text-caption" style="min-width: 44px">{{ item.progress + '%' }}</span>
            </div>
          </template>
          <template #item.state="{item}">
            <v-chip :color="stateColor(item.state)" size="x-small" variant="tonal">{{ item.state }}</v-chip>
          </template>
          <template #item.actions="{item}">
            <!-- 宽屏这颗和窄屏卡片里那颗是同一个动作，title 也要一样：
                 只有图标没有名字，鼠标悬上去没提示，读屏也念不出来 -->
            <v-btn color="error" icon="mdi-delete-outline" size="small" title="删除任务" variant="text"
                   @click="removing = item"/>
          </template>
        </v-data-table>
      </div>
    </v-card>

    <div v-else>
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <span class="text-caption text-medium-emphasis">排序</span>
        <v-chip v-for="o in SORTS" :key="o.key" :append-icon="sortKey === o.key
                  ? (sortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down') : undefined"
                :color="sortKey === o.key ? 'primary' : undefined" size="small" variant="tonal"
                @click="changeSort(o.key)">
          {{ o.label }}
        </v-chip>
      </div>

      <v-card v-for="(item, i) in sorted" :key="item.hash" :style="{'--i': i}" class="mb-2 ani-in"
              variant="tonal">
        <v-card-text class="pb-2">
          <div class="text-body-2 mb-1 ellipsis" :title="item.name">{{ item.name }}</div>
          <div class="d-flex align-center ga-2 mb-1">
            <v-progress-linear :color="stateColor(item.state)" :model-value="item.progress"
                               height="6" rounded/>
            <span class="text-caption">{{ item.progress + '%' }}</span>
          </div>
          <!--
            换行只发生在左边那一堆信息里，删除键单独占一格钉在右边。
            原来是「chip / 体积 / 标签 / spacer / 删除」同在一个 flex-wrap 里 ——
            信息一多，删除键会跟着折到下一行，而 spacer 留在上一行，
            于是它落在新一行的**最左边**：看着像是从卡片里掉出来的一颗孤零零的红叉，
            360px 上还正好压在左下角那枚角标上。
            左边那堆仍然要能换行：不换行时 flex 会把 chip 压到比里面的字还窄，字漫出圆角框外。
          -->
          <div class="d-flex align-center ga-2">
            <div class="d-flex align-center flex-wrap ga-2 min0">
              <v-chip :color="stateColor(item.state)" size="x-small" variant="tonal">{{ item.state }}</v-chip>
              <span class="text-caption text-medium-emphasis">
                {{ formatSize(item.completed ?? 0) }} / {{ item.formatSize || formatSize(item.size) }}
              </span>
              <v-chip v-for="tag in item.tagList || []" :key="tag" size="x-small" variant="tonal">{{ tag }}</v-chip>
            </div>
            <v-btn class="flex-grow-0" color="error" icon="mdi-delete-outline" size="small" title="删除任务"
                   variant="text" @click="removing = item"/>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-dialog :model-value="!!removing" max-width="420" @update:model-value="removing = null">
      <v-card>
        <v-card-title>删除任务</v-card-title>
        <v-card-text>
          确定从下载器删除 <strong class="d-block ellipsis">{{ removing?.name }}</strong>？
          <div class="text-caption text-medium-emphasis mt-2">只作用于下载器，订阅本身不受影响。</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="removing = null">取消</v-btn>
          <v-btn color="error" variant="flat" @click="confirmRemove">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* flex 子项的默认 min-width 是 auto，不清零的话里面的 chip 撑得下多宽它就占多宽，
   把右边的删除键顶出卡片 */
.min0 {
  flex: 1 1 auto;
  min-width: 0;
}

.table-scroll {
  overflow-x: auto;
}

/* 名称列封顶，否则一条长发布名能把「进度」「状态」两列推到视口外 */
.name-cell {
  max-width: 46ch;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
