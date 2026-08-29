<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {useAniStore} from '@/stores/ani'
import {useConfigStore} from '@/stores/config'
import * as api from '@shared/api'
import type {TmdbGroup} from '@shared/api'
import {useUiStore} from '@/stores/ui'
import StringListField from '@/components/common/StringListField.vue'
import SourceBrowserDialog from './SourceBrowserDialog.vue'
import PreviewDialog from './PreviewDialog.vue'
import DangerConfirm from '@/components/common/DangerConfirm.vue'

const props = defineProps<{
  item: Ani
  /** 新建模式：不直接调接口，把改好的对象交给调用方去 addAni */
  isNew?: boolean
}>()
const emit = defineEmits<{close: []; submit: [Ani]}>()

const ani = useAniStore()
const ui = useUiStore()
const config = useConfigStore()
/* 备用 RSS 那一栏要知道全局开关开没开；已经加载过就直接返回，不会重复请求 */
void config.load()
const {mobile} = useDisplay()

/** 深拷贝一份改，取消时原对象不受影响 */
const form = ref<Ani>(JSON.parse(JSON.stringify(props.item)))
const tab = ref('basic')
const saving = ref(false)
/** 勾上后后端会把已下载的文件一并移动到新路径，是破坏性操作，默认关 */
const move = ref(false)

const dialog = ref(true)
function close() {
  dialog.value = false
  emit('close')
}

const confirmMove = ref(false)

/**
 * 勾了「同时移动已下载的文件」就先拦一道。
 *
 * 那个勾选传到后端是把整个已下载目录搬到新路径 —— 路径填错了，文件就散在一个
 * 谁也不会去看的目录里，界面上没有「撤销移动」这回事。勾选框本身就在保存按钮旁边，
 * 顺手点上再顺手保存是一气呵成的两下。
 */
function save() {
  if (!props.isNew && move.value) {
    confirmMove.value = true
    return
  }
  void doSave()
}

async function doSave() {
  saving.value = true
  try {
    if (props.isNew) {
      emit('submit', form.value)
    } else {
      await ani.update(form.value, move.value)
      confirmMove.value = false
      close()
    }
  } finally {
    saving.value = false
  }
}

/* ── 几个「按当前表单去后端算一下」的辅助动作 ── */
const busy = ref('')

/*
 * 换字幕组 / 换 RSS：带着这条订阅去对应的番剧站，直接定位到这部番。
 *
 * 上游主 RSS 那一栏下面就挂着 Mikan / AniBT / AnimeGarden 三颗图标按钮，
 * 我们之前一颗都没有 —— 想换个字幕组只能自己去网站上找 RSS 地址粘回来，
 * 比上游还退了一步。
 */
type SourceId = 'mikan' | 'anibt' | 'garden'

const SOURCES: {id: SourceId; name: string; icon: string}[] = [
  {id: 'mikan', name: 'Mikan', icon: 'mdi-alpha-m-circle-outline'},
  {id: 'anibt', name: 'AniBT', icon: 'mdi-alpha-b-circle-outline'},
  {id: 'garden', name: 'AnimeGarden', icon: 'mdi-flower-outline'},
]

const browsing = ref(false)
const browseSource = ref<SourceId>('mikan')
/** 挑回来的 RSS 是换主源，还是追加成一条备用源 */
const browseTarget = ref<'main' | 'standby'>('main')

function browse(id: SourceId, target: 'main' | 'standby' = 'main') {
  browseSource.value = id
  browseTarget.value = target
  browsing.value = true
}

/**
 * 从番剧站挑完回来：换掉 RSS 和字幕组，并把匹配规则换成新组的。
 *
 * 关键是先剔除旧的同字幕组规则再追加 —— 上游那句 filter 就是干这个的。
 * 不剔的话，来回换几次字幕组，match 里会积一堆早就不用的 `{{某组}}:xxx`，
 * 而这些规则是「或」的关系，等于把过滤条件一点点放宽到形同虚设。
 */
function onPicked(v: {url: string; bgmUrl?: string; subgroup?: string; match: string[]}) {
  const sub = v.subgroup ?? ''
  mergeMatch(sub, v.match)

  if (browseTarget.value === 'standby') {
    /* 这里不动 bgmUrl —— 上游备用订阅的回调只取 {subgroup, match, url}。
       在番剧站上挑备用源时很容易点到相邻的另一部番，跟着把整条订阅的 bgmUrl
       改掉，评分和刮削就全指到别的番去了，而且界面上没有任何提示。 */
    form.value.standbyRssList = [...(form.value.standbyRssList ?? []), newStandby(v.url, sub)]
    ui.success(`已加一条备用：${sub || '所选字幕组'}`)
    return
  }

  if (v.bgmUrl) form.value.bgmUrl = v.bgmUrl
  form.value.url = v.url
  form.value.subgroup = sub
  ui.success(`已换成 ${sub || '所选字幕组'} 的 RSS`)
}

/** 换/加一个字幕组时，先把这个组的旧规则清掉再追加，别越积越松 */
function mergeMatch(sub: string, match: string[]) {
  const kept = (form.value.match ?? []).filter(m => !m.startsWith(`{{${sub}}}:`))
  form.value.match = [...kept, ...match]
}

/* ── 备用 RSS ── */

/*
 * 偏移默认跟主源走，不是 0 —— 上游 plus() 就是 `offset: props.ani.offset`。
 * 备用源播的是同一部番，主源要偏移几集，备用源多半也要；默认 0 等于每加一条都得手改。
 */
const newStandby = (url = '', label = '') => ({label, url, offset: form.value.offset ?? 0})

/** 挂在标签上的条数：不点进这一页也知道配没配、配了几条 */
const standbyCount = computed(() => form.value.standbyRssList?.length ?? 0)

/** 备用源是按顺序往下试的，所以顺序本身是配置项，得能调 */
function moveStandby(i: number, d: -1 | 1) {
  const list = form.value.standbyRssList
  if (!list) return
  const j = i + d
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
}

/* ── TMDB ── */

/** TMDB 条目页地址：剧场版走 movie，其余走 tv —— 上游就是按 ova 分的 */
const tmdbUrl = computed(() => {
  const id = tmdbId.value
  return id ? `https://www.themoviedb.org/${form.value.ova ? 'movie' : 'tv'}/${id}` : ''
})

/** 按 TmdbId 反查：番名被改过、或同名番太多时，按标题搜是搜不准的 */
const askTmdbId = ref(false)
const tmdbIdInput = ref('')

async function applyTmdbId() {
  const id = tmdbIdInput.value.trim()
  if (!id) return
  askTmdbId.value = false
  busy.value = 'tmdb'
  try {
    const r = await api.getThemoviedbName({...form.value, tmdbId: id} as Ani)
    if (!r?.themoviedbName) return ui.warn('这个 TmdbId 没查到条目')
    form.value.themoviedbName = r.themoviedbName
    if (r.tmdb) form.value.tmdb = r.tmdb
    ui.success(`已获取：${r.themoviedbName}`)
  } finally {
    busy.value = ''
  }
}

/* ── 底部「其他」：刷新 / 刮削 / 强制刮削 ── */
const previewing = ref(false)

const MORE = [
  {key: 'refresh', title: '刷新这一条', subtitle: '立刻按当前规则跑一遍 RSS', icon: 'mdi-refresh'},
  {key: 'scrape', title: '刮削', subtitle: '生成 nfo 和封面，已刮过的跳过', icon: 'mdi-image-text'},
  {key: 'scrapeF', title: '强制刮削', subtitle: '忽略已有结果，整条重做', icon: 'mdi-image-sync-outline'},
] as const

async function runMore(key: typeof MORE[number]['key']) {
  busy.value = key
  try {
    if (key === 'refresh') {
      await api.refreshAni(form.value)
      ui.success('已触发刷新')
    } else {
      await api.scrape(key === 'scrapeF', form.value)
      ui.success(key === 'scrapeF' ? '已触发强制刮削' : '已触发刮削')
    }
  } finally {
    busy.value = ''
  }
}

async function pickTmdbName() {
  busy.value = 'tmdb'
  try {
    const r = await api.getThemoviedbName(form.value)
    if (r?.themoviedbName) {
      form.value.themoviedbName = r.themoviedbName
      // 剧集组信息也一并回填，否则下次保存会把它清掉
      if (r.tmdb) form.value.tmdb = r.tmdb
      ui.success(`已获取：${r.themoviedbName}`)
    } else {
      ui.warn('没有查到 TMDB 名称')
    }
  } finally {
    busy.value = ''
  }
}

async function pickBgmTitle() {
  busy.value = 'bgm'
  try {
    const t = await api.getBgmTitle(form.value)
    if (t) {
      form.value.title = t
      ui.success('已获取标题')
    } else {
      ui.warn('没有查到标题')
    }
  } finally {
    busy.value = ''
  }
}

/*
 * TMDB 剧集组。
 *
 * 原来这儿是个让人手打组 id 的输入框 —— 那串 id 只有 themoviedb.org 的页面地址里有，
 * 谁会去翻。上游是弹一张列表让人挑，每条带「按什么分的、几组、几集」，
 * 挑错组会导致整季集数对不上，这三个数就是用来分辨的。
 *
 * 前置条件是 ani.tmdb.id —— 接口第一行就 Assert.notBlank(tmdb.getId())，
 * 所以没取过 TMDB 时先提示去点「获取」，别让人对着一个空列表猜。
 */
const groups = ref<TmdbGroup[]>([])
const groupOpen = ref(false)

const tmdbId = computed(() => {
  const t = form.value.tmdb
  return t && typeof t === 'object' ? String((t as {id?: string}).id ?? '') : ''
})

const tmdbGroupId = computed({
  get: () => {
    const t = form.value.tmdb
    return t && typeof t === 'object' ? String((t as {tmdbGroupId?: string}).tmdbGroupId ?? '') : ''
  },
  set: (v: string) => {
    form.value.tmdb = {...(form.value.tmdb as object || {}), tmdbGroupId: v}
  },
})

async function openGroups() {
  if (!tmdbId.value) return ui.warn('先点 TMDB 那一栏的「获取」，拿到条目之后才能列剧集组')
  groupOpen.value = true
  busy.value = 'group'
  try {
    groups.value = await api.getThemoviedbGroup(form.value)
    if (!groups.value.length) ui.info('这个条目没有剧集组，按默认播出顺序算集数')
  } finally {
    busy.value = ''
  }
}

function pickGroup(g: TmdbGroup) {
  tmdbGroupId.value = g.id ?? ''
  groupOpen.value = false
  ui.success(`已选择剧集组：${g.name ?? g.id}`)
}

/**
 * 算出「不启用自定义路径时会下到哪」，并把结果填进模板框。
 *
 * 上游就是这么做的：算之前先把 customDownloadPath 置 false，拿到的才是全局模板
 * 算出来的真实路径 —— 不置的话后端会拿你正在编辑的这个模板去算，等于原样返回。
 * 填进去而不是弹个提示：这一步的用处是「拿默认路径当起点改」，只给人看等于白算。
 */
async function fillDownloadPath() {
  busy.value = 'path'
  try {
    const r = await api.downloadPath({...form.value, customDownloadPath: false})
    form.value.customDownloadPathTemplate = r.downloadPath
    ui.success('已填入当前的默认下载位置')
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="820" scrollable @after-leave="emit('close')">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span class="text-truncate">{{ isNew ? '确认订阅信息' : '编辑订阅' }}</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="close"/>
      </v-card-title>

      <v-tabs v-model="tab" density="comfortable">
        <v-tab value="basic">基本</v-tab>
        <!--
          备用 RSS 单开一页 —— 上游就是单独一个弹窗，不是塞在主 RSS 底下。
          挤在「基本」页里的时候，主源那一栏和备用源那一整片中间没有任何分界，
          翻到一半分不清正在配的是哪一个；而它自己又是「一行四个控件 + 三颗图标」
          的重控件，一条就顶掉半屏，把下面的日期、季、集数偏移全推到看不见的地方。
          条数挂在标签上，不点进来也知道配没配、配了几条。
        -->
        <v-tab value="standby">
          备用 RSS
          <v-chip v-if="standbyCount" class="ml-2" size="x-small" variant="tonal">{{ standbyCount }}</v-chip>
        </v-tab>
        <v-tab value="custom">自定义</v-tab>
        <v-tab value="other">其它</v-tab>
      </v-tabs>

      <v-divider/>

      <!--
        min-height 是给宽屏的：三页内容长短不一，不兜个下限的话切标签时弹窗会跳一下。
        全屏时不能要 —— 屏幕矮的手机上 440 撑得整张卡溢出，标题和标签条跟着滚走。
      -->
      <v-card-text :style="mobile ? undefined : 'min-height: 440px'">
        <v-tabs-window v-model="tab">
          <!-- ══ 基本 ══ -->
          <v-tabs-window-item value="basic">
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="form.title" label="标题">
                  <template #append>
                    <v-btn :loading="busy === 'bgm'" size="small" variant="tonal" @click="pickBgmTitle">
                      用 Bgm 名
                    </v-btn>
                    <!-- 刮削按 TMDB 名走，标题和它不一致时目录名会对不上，
                         上游给了这颗一键对齐的按钮 -->
                    <v-btn :disabled="!form.themoviedbName || form.title === form.themoviedbName"
                           class="ml-2" size="small" variant="tonal"
                           @click="form.title = form.themoviedbName">
                      用 TMDB 名
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field v-model="form.themoviedbName" label="TMDB">
                  <template v-if="tmdbUrl" #append-inner>
                    <!-- 条目页可点：核对刮到的是不是同一部（同名不同年的番很常见） -->
                    <a :href="tmdbUrl" class="tmdb-link" rel="noopener" target="_blank" @click.stop>
                      <v-icon icon="mdi-open-in-new" size="16"/>
                    </a>
                  </template>
                  <template #append>
                    <v-btn icon="mdi-magnify" size="small" title="按 TmdbId 反查" variant="tonal"
                           @click="tmdbIdInput = tmdbId; askTmdbId = true"/>
                    <v-btn :loading="busy === 'tmdb'" class="ml-2" size="small" title="按标题重新获取"
                           variant="tonal" @click="pickTmdbName">
                      获取
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="tmdbGroupId" label="剧集组" placeholder="默认播出顺序"
                              persistent-hint hint="集数对不上时换一个">
                  <template #append>
                    <v-btn :loading="busy === 'group'" size="small" variant="tonal" @click="openGroups">
                      选择
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field v-model="form.bgmUrl" label="BgmUrl"/>
              </v-col>
              <v-col cols="12" md="4">
                <!-- 字幕组名是可以改的：RSS 解析猜错时这一栏没法改，卡片上就一直挂着
                     「未知字幕组」，重命名模板里的 ${subgroup} 也跟着错 -->
                <v-text-field v-model="form.subgroup" label="字幕组" placeholder="未知字幕组"/>
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="form.url" auto-grow label="主 RSS" rows="2"/>
                <!--
                  换字幕组的入口。上游主 RSS 底下就挂着这三颗，
                  少了它们，想换个组只能自己上网站找 RSS 粘回来 —— 比上游还退一步。
                  点开是带着这条订阅定位过去的，不用重新搜番名。
                -->
                <div class="d-flex flex-wrap align-center ga-2 mt-2">
                  <span class="text-caption text-medium-emphasis mr-1">换字幕组：</span>
                  <v-btn v-for="src in SOURCES" :key="src.id" :prepend-icon="src.icon"
                         size="small" variant="tonal" @click="browse(src.id)">
                    {{ src.name }}
                  </v-btn>
                </div>
              </v-col>

              <v-col cols="6" md="3">
                <v-text-field v-model="form.releaseDate" label="日期" placeholder="yyyy-MM-dd"/>
              </v-col>
              <!-- 剧场版没有「季」和「集数偏移」，上游这两栏在 ova 下是禁用的 -->
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.season" :disabled="form.ova" label="季" type="number"/>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.offset" :disabled="form.ova" label="集数偏移" type="number"/>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.totalEpisodeNumber" label="总集数" type="number"/>
              </v-col>

              <v-col cols="12" md="6">
                <StringListField v-model="form.match"
                                 :doc="{text: '正则语法', href: 'https://www.runoob.com/regexp/regexp-syntax.html'}"
                                 label="匹配"/>
              </v-col>
              <v-col cols="12" md="6">
                <StringListField v-model="form.exclude"
                                 :doc="{text: '正则语法', href: 'https://www.runoob.com/regexp/regexp-syntax.html'}"
                                 import-key="exclude" label="排除"/>
              </v-col>

              <v-col cols="12">
                <div class="d-flex flex-wrap ga-6 mt-1">
                  <v-switch v-model="form.globalExclude" color="primary" hide-details label="全局排除"/>
                  <v-switch v-model="form.ova" color="primary" hide-details label="剧场版"/>
                  <v-switch v-model="form.enable" color="primary" hide-details label="启用"/>
                </div>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <!-- ══ 备用 RSS ══ -->
          <v-tabs-window-item value="standby">
            <!-- 主源抽了或字幕组咕了才会走到备用源，全局开关关着的话这一栏配了也不生效 -->
            <v-alert v-if="config.loaded && !config.config.standbyRss" class="mb-3" density="compact"
                     icon="mdi-alert-outline" type="warning" variant="tonal">
              <span class="text-caption">备用 RSS 总开关没开，这里配了也不会用上 —— 去「设置 → RSS」打开。</span>
            </v-alert>

            <!-- 和主 RSS 一样的三颗：挑一个组直接追加成备用源，顺带把它的匹配规则也带过来。
                 上游备用订阅弹窗里就有这三颗，缺了就只能自己去站上找地址粘回来。 -->
            <div class="d-flex flex-wrap align-center ga-2 mb-3">
              <v-btn prepend-icon="mdi-plus" size="small" variant="tonal"
                     @click="form.standbyRssList = [...(form.standbyRssList || []), newStandby()]">
                手填一条
              </v-btn>
              <span class="text-caption text-medium-emphasis mx-1">或从番剧站挑：</span>
              <v-btn v-for="src in SOURCES" :key="src.id" :prepend-icon="src.icon"
                     size="small" variant="tonal" @click="browse(src.id, 'standby')">
                {{ src.name }}
              </v-btn>
            </div>

            <div v-if="!form.standbyRssList?.length" class="text-caption text-disabled">未配置</div>
            <div v-for="(s, i) in form.standbyRssList || []" :key="i" class="d-flex align-center ga-3 mb-3">
              <v-text-field v-model="s.label" density="compact" hide-details placeholder="未知字幕组"
                            label="名称" style="max-width: 180px"/>
              <v-text-field v-model="s.url" density="compact" hide-details label="地址"/>
              <v-text-field v-model.number="s.offset" density="compact" hide-details label="偏移"
                            style="max-width: 90px" type="number"/>
              <!-- 顺序 = 优先级，上游给了上下移；没有的话想调顺序只能删了重加 -->
              <v-btn :disabled="i === 0" density="comfortable" icon="mdi-arrow-up" size="small"
                     title="上移" variant="text" @click="moveStandby(i, -1)"/>
              <v-btn :disabled="i === (form.standbyRssList?.length ?? 0) - 1" density="comfortable"
                     icon="mdi-arrow-down" size="small" title="下移" variant="text" @click="moveStandby(i, 1)"/>
              <v-btn color="error" density="comfortable" icon="mdi-close" size="small" title="删除"
                     variant="text" @click="form.standbyRssList!.splice(i, 1)"/>
            </div>
          </v-tabs-window-item>

          <!-- ══ 自定义 ══ -->
          <v-tabs-window-item value="custom">
            <v-expansion-panels multiple variant="accordion">
              <v-expansion-panel title="自定义集数规则">
                <template #text>
                  <v-switch v-model="form.customEpisode" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customEpisodeStr" :disabled="!form.customEpisode" label="正则"/>
                  <v-text-field v-model.number="form.customEpisodeGroupIndex" :disabled="!form.customEpisode"
                                class="mt-3" label="捕获组序号" type="number"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义路径">
                <template #text>
                  <v-switch v-model="form.customDownloadPath" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customDownloadPathTemplate" :disabled="!form.customDownloadPath"
                                label="路径模版"/>
                  <div class="d-flex align-center flex-wrap ga-2 mt-3">
                    <v-btn :disabled="!form.customDownloadPath" :loading="busy === 'path'" size="small"
                           variant="tonal" @click="fillDownloadPath">
                      填入默认位置
                    </v-btn>
                    <span class="text-caption text-medium-emphasis">最终位置以「预览」为准</span>
                  </div>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义上传">
                <template #text>
                  <v-switch v-model="form.customUploadEnable" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customUploadPathTarget" :disabled="!form.customUploadEnable"
                                label="上传目标路径"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义完结迁移">
                <template #text>
                  <v-switch v-model="form.customCompleted" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customCompletedPathTemplate" :disabled="!form.customCompleted"
                                label="完结后迁移路径模版"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="重命名模版">
                <template #text>
                  <v-switch v-model="form.customRenameTemplateEnable" color="primary" hide-details label="启用"
                            class="mb-2"/>
                  <v-text-field v-model="form.customRenameTemplate" :disabled="!form.customRenameTemplateEnable"
                                label="模版" placeholder="${title} S${seasonFormat}E${episodeFormat}"/>
                  <a class="text-caption doc-link touch-link" href="https://docs.wushuo.top/config/basic/rename#rename-template"
                     rel="noopener" target="_blank">
                    可用占位符看文档
                    <v-icon icon="mdi-open-in-new" size="12"/>
                  </a>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义标签">
                <template #text>
                  <v-switch v-model="form.customTagsEnable" color="primary" hide-details label="启用" class="mb-2"/>
                  <StringListField v-model="form.customTags" :disabled="!form.customTagsEnable" label="标签"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="优先保留">
                <template #text>
                  <v-switch v-model="form.customPriorityKeywordsEnable" color="primary" hide-details label="启用"
                            class="mb-2"/>
                  <StringListField v-model="form.customPriorityKeywords"
                                   :disabled="!form.customPriorityKeywordsEnable"
                                   hint="种子里有多个文件时优先保留的，越靠前优先级越高"
                                   import-key="priorityKeywords" label="关键词"/>
                </template>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-tabs-window-item>

          <!-- ══ 其它 ══ -->
          <v-tabs-window-item value="other">
            <v-list class="py-0" density="comfortable">
              <v-list-item title="遗漏检测" subtitle="补齐历史缺集">
                <template #append>
                  <v-switch v-model="form.omit" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="自动上传" subtitle="下载完成后上传到网盘">
                <template #append>
                  <v-switch v-model="form.upload" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="只下载最新集">
                <template #append>
                  <v-switch v-model="form.downloadNew" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="摸鱼检测" subtitle="字幕组长期不更新时提醒">
                <template #append>
                  <v-switch v-model="form.procrastinating" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="通知">
                <template #append>
                  <v-switch v-model="form.message" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="完结迁移" subtitle="完结后移动到归档目录">
                <template #append>
                  <v-switch v-model="form.completed" color="primary" hide-details/>
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>

      <v-divider/>

      <v-card-actions class="flex-wrap">
        <!-- 「其他」里全是刷新、刮削、重命名 —— 都要有入库的对象才作用得上，新建时没有 -->
        <v-menu v-if="!isNew" location="top start">
          <template #activator="{props: p}">
            <v-btn v-bind="p" append-icon="mdi-menu-up" variant="text">其他</v-btn>
          </template>
          <v-list density="comfortable" min-width="240">
            <v-list-item v-for="m in MORE" :key="m.key" :prepend-icon="m.icon" :subtitle="m.subtitle"
                         :title="m.title" @click="runMore(m.key)"/>
          </v-list>
        </v-menu>

        <!--
          「预览」新建时也要有 —— 上游 Ani.vue 底下这颗就没分新建和编辑。
          它一度和「其他」一起被藏了，理由写的是「新建的还没入库」：那句话对「其他」成立，
          对预览不成立。api/previewAni 是把整条订阅**放在请求体里**发过去的，
          后端拿着它现算下载位置和命中项，数据库里有没有这一行根本不相干。
          而恰恰是新建这一步最需要它：字幕组和匹配规则刚挑完，
          「这条规则到底能命中几集、文件会落到哪个目录」得先看一眼再入库 ——
          存完再回来看，就得多走一趟删了重加。
        -->
        <v-btn prepend-icon="mdi-eye-outline" variant="text" @click="previewing = true">预览</v-btn>

        <!-- 移动文件是不可逆的，放在保存旁边并默认关闭，避免顺手点了 -->
        <v-checkbox v-if="!isNew" v-model="move" density="compact" hide-details label="同时移动已下载的文件"/>
        <v-spacer/>
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn :loading="saving" color="primary" variant="flat" @click="save">{{ isNew ? '添加' : '保存' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <DangerConfirm v-model="confirmMove" :loading="saving" ok-text="执意继续移动" @ok="doSave">
    保存的同时会把这条订阅<strong>已下载的整个目录</strong>搬到新路径，搬完不能撤销。
    <div class="text-caption text-medium-emphasis mt-2">
      只想改配置、不动文件的话，取消后把「同时移动已下载的文件」的勾去掉再保存。
    </div>
  </DangerConfirm>

  <!-- 带着这条订阅去番剧站换字幕组：定位到这部番，不用重新搜 -->
  <SourceBrowserDialog v-model="browsing" :preset="form" :source="browseSource" @pick="onPicked"/>

  <!-- 预览：改完匹配规则先看命中了什么再保存，比存完再回来看少一趟 -->
  <PreviewDialog v-if="previewing" :item="form" defer-save @close="previewing = false"/>

  <!-- 按 TmdbId 反查：番名被改过、或同名番太多时，按标题搜是搜不准的 -->
  <v-dialog v-model="askTmdbId" max-width="380">
    <v-card>
      <v-card-title class="pt-4">按 TmdbId 获取</v-card-title>
      <v-card-text>
        <v-text-field v-model="tmdbIdInput" autofocus hide-details label="TmdbId" placeholder="例如 1429"
                      @keyup.enter="applyTmdbId"/>
        <div class="text-caption text-medium-emphasis mt-3">
          在 themoviedb.org 打开条目，地址里 /tv/ 或 /movie/ 后面那串数字就是。
        </div>
      </v-card-text>
      <v-divider/>
      <v-card-actions class="pa-3">
        <v-spacer/>
        <v-btn variant="text" @click="askTmdbId = false">取消</v-btn>
        <v-btn color="primary" variant="flat" @click="applyTmdbId">获取</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 剧集组列表：每条带「按什么分的 / 几组 / 几集」，挑错组整季集数就会错位 -->
  <v-dialog v-model="groupOpen" max-width="480" scrollable>
    <v-card>
      <v-card-title class="pt-4">选择剧集组</v-card-title>
      <v-card-subtitle class="pb-4">TMDB #{{ tmdbId }}</v-card-subtitle>
      <v-divider/>
      <v-card-text style="max-height: 60vh">
        <div v-if="busy === 'group'" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate/>
        </div>
        <v-empty-state v-else-if="!groups.length" icon="mdi-format-list-numbered"
                       text="这个条目只有默认的播出顺序" title="没有剧集组"/>
        <div v-else class="d-flex flex-column ga-3">
          <div v-for="g in groups" :key="g.id" :class="{picked: g.id === tmdbGroupId}" class="grp"
               @click="pickGroup(g)">
            <div class="d-flex align-center ga-2">
              <a :href="`https://www.themoviedb.org/tv/${tmdbId}/episode_group/${g.id}`" class="grp-name"
                 rel="noopener" target="_blank" @click.stop>{{ g.name }}</a>
              <v-spacer/>
              <v-chip v-if="g.id === tmdbGroupId" color="primary" size="x-small" variant="flat">已选择</v-chip>
            </div>
            <div class="d-flex flex-wrap ga-2 mt-2">
              <v-chip color="success" size="x-small" variant="tonal">{{ g.typeName }}</v-chip>
              <v-chip size="x-small" variant="tonal">{{ g.groupCount }} 组</v-chip>
              <v-chip size="x-small" variant="tonal">{{ g.episodeCount }} 集</v-chip>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-divider/>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="tmdbGroupId = ''; groupOpen = false">用默认顺序</v-btn>
        <v-spacer/>
        <v-btn variant="text" @click="groupOpen = false">取消</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* TMDB 名右边那颗外链图标：贴在输入框内侧，不占 append 的位置 */
.tmdb-link {
    display: inline-flex;
    align-items: center;
    color: rgb(var(--v-theme-primary));
}

.doc-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-top: 6px;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.doc-link:hover {
    text-decoration: underline;
}

.grp {
    padding: 12px 14px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 12px;
    cursor: pointer;
    transition: border-color .18s, background-color .18s;
}

.grp:hover {
    border-color: rgba(var(--v-theme-primary), .5);
    background: rgba(var(--v-theme-primary), .05);
}

.grp.picked {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), .08);
}

.grp-name {
    font-size: 14px;
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.grp-name:hover {
    text-decoration: underline;
}
</style>
