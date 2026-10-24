<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {clearableText} from '@/composables/clearableText'
import {useDisplay} from 'vuetify'
import type {
  Ani, AniBTGroup, AniBTItem, AnimeGardenGroup, AnimeGardenItem, GroupRegexRegexItem,
  MikanGroup, MikanItem, MikanSeason,
} from '@shared/types'
import * as api from '@shared/api'
import {posterUrl, proxyImage} from '@shared/http'
import {formatSize, formatTime, fromNow} from '@shared/format'
import {useUiStore} from '@/stores/ui'
import type {PickedGroup} from './batch'

/**
 * 番剧浏览器 —— 「按星期看这一季在播什么」。
 *
 * 上游 Mikan.vue / AniBT.vue / AnimeGarden.vue 是三份 400~500 行、彼此复制的文件。
 * 三个接口返回的其实是同一个形状（季度 + 按星期分的番剧 + 每部番的字幕组），
 * 只是字段名各叫各的，所以这里只写一份，靠下面这张适配表把三家归一。
 *
 * 在这之前，「添加订阅」里这三个来源要人手填 Bangumi 条目 ID —— 谁记得住条目 ID。
 */

const model = defineModel<boolean>({required: true})
const props = defineProps<{
  source: 'mikan' | 'anibt' | 'garden'
  /**
   * 带着一条订阅打开：直接定位到这部番，而不是从整季列表从头翻。
   * 「换个字幕组」是编辑订阅里的常规动作，让人重新搜一遍番名等于没做。
   */
  preset?: Ani
}>()
const emit = defineEmits<{
    pick: [{url: string; bgmUrl?: string; subgroup?: string; match: string[]}]
    /**
     * 篮子里的全部选择。
     *
     * 以前这里是**就地入库**：勾几个组、点批量添加、进度条跑完 location.reload()。
     * 中间什么都看不见 —— 哪条解析失败、规则挑对没有，要回列表里才发现。
     * 现在只把选择交出去，由调用方排进「确认订阅信息」那个弹窗逐条过。
     */
    pickMany: [PickedGroup[]]
}>()

const ui = useUiStore()
const {mobile} = useDisplay()

/* ── 归一后的模型 ── */
interface Item {
  /** 取字幕组时要回传的键：mikan 是番剧页 url，另外两家是番剧 id */
  key: string
  title: string
  cover?: string
  score?: number
  exists?: boolean
  bgmUrl?: string
  /** 番剧详情外链，没有就不给跳 */
  link?: string
}

interface Week {label: string; items: Item[]}

interface Group {
  label: string
  rss: string
  bgmUrl?: string
  /** 副标题：更新日 / 连载状态 / 最近更新，各家给什么用什么 */
  sub?: string
  tags?: string[]
  /** 匹配规则候选，选中一组会拼成 {{字幕组}}:正则 */
  regexList: GroupRegexRegexItem[][]
  /** 这个组最近发过的资源。订之前看一眼命名和体积，比订完再来预览省事 */
  items: Res[]
}

/** 三家的资源项字段名不同，取出来的就这几样 */
interface Res {
  title: string
  size: string
  time: string
  magnet?: string
  torrent?: string
}

const SOURCES = {
  mikan: {name: 'Mikan', searchable: true, seasons: true},
  anibt: {name: 'AniBT', searchable: true, seasons: true},
  garden: {name: 'AnimeGarden', searchable: false, seasons: false},
} as const

const meta = computed(() => SOURCES[props.source])

/*
 * 封面走 api/proxyImage：番剧源给的是站外地址，直连会碰上防盗链和 CORS，
 * 后端那一跳还能顺带走代理。
 * 演示构建例外 —— 演示是靠替换 fetch 伪造后端的，而 <img src> 不走 fetch，
 * 拦不住，只能让地址直接用。
 *
 * 先过一道 posterUrl：Mikan 发的地址自带「裁成正方形」的缩放参数，
 * 不摘掉的话它先裁一刀、我们的封面框再裁一刀，剩不下半张海报。
 */
const coverOf = (url?: string) =>
  !url ? '' : __DEMO__ ? url : proxyImage(posterUrl(url))

/* ── 状态 ── */
const loading = ref(false)
const weeks = ref<Week[]>([])
const seasons = ref<{label: string; value: MikanSeason | string}[]>([])
const season = ref('')
/* clearable 清空时写回的是 null，而 @click:clear 紧接着就去 trim —— 见 clearableText */
const keyword = clearableText()
const weekTab = ref(0)

/**
 * weeks / groups / seasons 现在装的是哪一家的结果。
 *
 * 三家共用同一个组件实例（父组件是 `:source="browseSource"`，切来源只是改 prop），
 * 而 Item.key 三家语义不同：Mikan 是番剧页地址，AniBT / AnimeGarden 是番剧 id。
 * 不认这个的话，看完 Mikan 再点开 AniBT，屏幕上还是上一家的列表，
 * 点一部番就会拿 Mikan 的地址去 `api/aniBTGroup?bgmId=`，
 * 后端原样转给 anibt.net —— 那边回 400。季度标签和搜索词（Mikan 认 `id: 12345`
 * 这种写法）同样各认各的，一起作废。
 */
const loadedSource = ref('')

/** 展开中的番剧 → 它的字幕组，取过就缓存，来回点不重复请求 */
const openKey = ref('')
const groups = ref<Record<string, Group[]>>({})
const groupLoading = ref(false)

/** 篮子，跨番剧累计。每一条带着它自己挑好的匹配规则 */
const basket = ref<{item: Item; group: Group; match: string[]}[]>([])

/**
 * 把订阅换成一个「定位条件」。**三家收的根本不是同一样东西**，别拿一个值喂三家：
 *
 *   上游 Mikan.vue        `show(ani)`     ← 整个订阅对象，内部抠成搜索词
 *   上游 AniBT.vue        `show(bgmUrl)`  ← bgmUrl 字符串，搜索框全程留空
 *   上游 AnimeGarden.vue  `show(bgmUrl)`  ← 同上，它连搜索框都没有
 *
 * 所以：
 *  - Mikan 只有搜索框、没有 bgmUrl 入参，只能拼一个搜索词。它认 `id: 12345` 这种
 *    写法（bangumiId），抠得到就用 id，精确；抠不到退回番名，并且要先把标题里的
 *    `(2024)`、`[tmdbid=123]` 这些刮削后缀去掉 —— 带着后缀去搜是搜不到的。
 *  - AniBT / AnimeGarden 的列表接口直接收 bgmUrl，服务端自己筛，**不给搜索词**。
 *
 * 原来这里不分来源，一律返回那个搜索词，调用处又无脑 `keyword.value = text`：
 * 从编辑订阅点开 AniBT，搜索框里躺着 Mikan 的 `id: 12345`，一起发成
 * `api/aniBT {title: "id: 12345"}` —— AniBT 认的是 bgmId，按这个标题当然一部都搜不着；
 * AnimeGarden 更直接，那串字拿去本地过滤，整季列表当场被过滤成空。
 */
function locate(ani: Ani | undefined, source: 'mikan' | 'anibt' | 'garden'): {text: string; bgmUrl: string} {
  if (!ani) return {text: '', bgmUrl: ''}
  const bgmUrl = ani.bgmUrl ?? ''
  // 搜索词是 Mikan 专用的：另外两家靠 bgmUrl 定位，塞了词反而把结果筛没
  if (source !== 'mikan') return {text: '', bgmUrl}

  if (ani.url) {
    try {
      const id = new URL(ani.url).searchParams.get('bangumiId')
      if (id) return {text: `id: ${id}`, bgmUrl}
    } catch {
      // 地址不合法就当没有，退回按名字搜
    }
  }

  const title = (ani.mikanTitle || ani.title || '')
      .replace(/ ?\((19|20)\d{2}\)/g, '')
      .replace(/ ?\[tmdbid=\d+]/g, '')
      .trim()
  return {text: title.length > 2 ? title : '', bgmUrl}
}

/** 本次打开的定位条件，fetchList 要用 */
const pin = ref<{text: string; bgmUrl: string}>({text: '', bgmUrl: ''})

/* ── 三家的适配 ── */

function mapGroups(list: (MikanGroup | AniBTGroup | AnimeGardenGroup)[]): Group[] {
  return list.map(g => {
    const it = g as MikanGroup & AniBTGroup & AnimeGardenGroup
    const raw = (it.items ?? []).slice(0, 8).map(r => r as MikanItem & AniBTItem & AnimeGardenItem)
    /* 「最近更新」：AniBT / AnimeGarden 在组上直接给了 lastUpdatedAt，
       Mikan 没有，就取这个组最新一条资源的时间 —— 三家都能显示出来。 */
    const stamp = (v?: string | number) => (v == null ? 0 : new Date(v).getTime() || 0)
    const last = stamp(it.lastUpdatedAt) || Math.max(0, ...raw.map(x => stamp(x.createdAt ?? x.publishedAt)))
    return {
      label: it.label || it.name || '未知字幕组',
      rss: it.rss || '',
      // AniBT / AnimeGarden 只给 bgmId，自己拼成条目地址，否则订阅进来是没有 Bgm 的
      bgmUrl: it.bgmUrl || (it.bgmId ? `https://bgm.tv/subject/${it.bgmId}` : undefined),
      /* 原来是 `updateDay || status || 最近更新` —— AniBT 每个组都带 status，
         后面那截永远轮不到，发布时间明明拿到了却一直不显示。改成两段都要。 */
      sub: [it.updateDay || it.status, last ? `最近更新 ${fromNow(last)}` : '']
          .filter(Boolean).join(' · '),
      tags: it.groupRegex?.tags,
      regexList: it.groupRegex?.regexList ?? [],
      items: raw.map(x => {
        const t = x.createdAt ?? x.publishedAt
        return {
          title: x.title || '',
          size: x.formatSize || (x.size ? formatSize(x.size) : ''),
          time: t ? formatTime(new Date(t).getTime()) : '',
          magnet: x.magnet,
          torrent: x.torrent,
        }
      }),
    }
  }).filter(g => g.rss)
}

async function fetchList() {
  loading.value = true
  openKey.value = ''
  try {
    const k = keyword.value.trim()
    if (props.source === 'mikan') {
      const picked = seasons.value.find(s => s.label === season.value)?.value
      const r = await api.mikan(k, k ? null : (picked as MikanSeason))
      // 搜索结果里不带季度列表，别让它把已有的选择器清空
      if (r.seasons?.length) {
        seasons.value = r.seasons.map(s => ({label: s.seasonLabel || '', value: s}))
        if (!season.value) season.value = r.seasons.find(s => s.select)?.seasonLabel || ''
      }
      weeks.value = (r.weeks || []).map(w => ({
        label: w.weekLabel || '其它',
        items: (w.items || []).map(i => ({
          key: i.url || '', title: i.title || '', cover: i.cover, score: i.score,
          exists: i.exists, bgmUrl: i.bgmUrl, link: i.url,
        })),
      }))
    } else if (props.source === 'anibt') {
      const r = await api.aniBT({
        season: season.value || undefined,
        title: k || undefined,
        bgmUrl: pin.value.bgmUrl || undefined,
      })
      if (r.availableSeasons?.length) {
        seasons.value = r.availableSeasons.map(s => ({label: s, value: s}))
        if (!season.value) season.value = r.requestedSeason || r.currentSeason || ''
      }
      weeks.value = (r.byWeekday || []).map(w => ({
        label: w.weekdayLabel || '其它',
        items: (w.animes || []).map(a => ({
          key: a.bgmId || '',
          title: a.title?.chinese || a.title?.primary || a.title?.romaji || a.title?.english || '',
          cover: a.cover, score: a.rating, exists: a.exists,
          bgmUrl: a.bgmId ? `https://bgm.tv/subject/${a.bgmId}` : undefined,
        })),
      }))
    } else {
      const r = await api.animeGardenList(pin.value.bgmUrl || undefined)
      weeks.value = (r || []).map(w => ({
        label: w.weekLabel || '其它',
        items: (w.subjects || []).map(s => ({
          key: s.id || '', title: s.name || '', cover: s.cover, score: s.score, exists: s.exists,
        })),
      }))
    }
    weeks.value = weeks.value.filter(w => w.items.length)
    if (weekTab.value >= weeks.value.length) weekTab.value = 0
    loadedSource.value = props.source
    if (!weeks.value.length) ui.warn('没有查到番剧')
  } finally {
    loading.value = false
  }
}

async function toggleItem(it: Item) {
  if (openKey.value === it.key) {
    openKey.value = ''
    return
  }
  openKey.value = it.key
  if (groups.value[it.key]) return
  groupLoading.value = true
  try {
    const raw = props.source === 'mikan' ? await api.mikanGroup(it.key)
        : props.source === 'anibt' ? await api.aniBTGroup(it.key)
            : await api.animeGardenGroup(it.key)
    groups.value[it.key] = mapGroups(raw)
    if (!groups.value[it.key].length) ui.warn('这部番还没有可用的字幕组 RSS')
  } finally {
    groupLoading.value = false
  }
}

/** 展开中的字幕组（看它最近发了什么），一次只开一个 */
const openRss = ref('')

async function copyMagnet(magnet?: string) {
  if (!magnet) return
  try {
    await navigator.clipboard.writeText(magnet)
    ui.success('磁力链接已复制')
  } catch {
    // http 页面下 clipboard API 不可用（安全上下文限制），退回到老办法
    const el = document.createElement('textarea')
    el.value = magnet
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    ui.success('磁力链接已复制')
  }
}

/* ── 匹配规则选择 ── */
/**
 * 正在选匹配规则的那一组。
 *
 * `batch` 区分两种来意：勾复选框（batch=true，选完进篮子继续挑别的）和
 * 点「添加」（batch=false，选完就直接把这一条交出去）。
 * 上游 3.2.48 给批量那条路补上的正是这一步 —— 以前勾了复选框就直接进篮子，
 * 挑的规则**没有任何地方能选**，于是批量加进去的订阅一律「全部版本」，
 * 一集下好几遍；而单条添加是有这一步的，两条路的手感不一样。
 */
const matchFor = ref<{item: Item; group: Group; batch: boolean} | null>(null)
const matchPick = ref('[]')

/** 候选末尾补一个空数组当「全部」，和上游一致 */
const matchOptions = computed(() => [...(matchFor.value?.group.regexList ?? []), []])

/** 拼成上游的格式：每条是 `{{字幕组}}:正则`，前缀让后端知道这条规则属于谁 */
const parsedMatch = () => (JSON.parse(matchPick.value) as string[])
    .map(r => `{{${matchFor.value?.group.label}}}:${r}`)

function openMatch(item: Item, group: Group) {
  matchFor.value = {item, group, batch: false}
  matchPick.value = '[]'
}

function confirmMatch() {
  const cur = matchFor.value
  if (!cur) return
  const match = parsedMatch()
  matchFor.value = null

  if (cur.batch) {
    basket.value.push({item: cur.item, group: cur.group, match})
    return
  }

  emit('pick', {
    url: cur.group.rss,
    bgmUrl: cur.group.bgmUrl || cur.item.bgmUrl,
    subgroup: cur.group.label,
    match,
  })
  model.value = false
}

/* ── 批量：篮子 ── */
const inBasket = (g: Group) => basket.value.some(b => b.group.rss === g.rss)

/**
 * 勾 / 取消勾一个字幕组。
 *
 * 勾上时先开「选择要下载的版本」，规则确认了才进篮子 ——
 * 直接塞进篮子的话，批量那条路永远拿不到规则（见 matchFor 那段注释）。
 */
function toggleBasket(item: Item, group: Group) {
  const i = basket.value.findIndex(b => b.group.rss === group.rss)
  if (i >= 0) {
    basket.value.splice(i, 1)
    return
  }
  matchFor.value = {item, group, batch: true}
  matchPick.value = '[]'
}

/** 把篮子整个交出去。真正入库在「确认订阅信息」那个弹窗里逐条过 */
function handOffBasket() {
  const picked: PickedGroup[] = basket.value.map(b => ({
    animeKey: b.item.key,
    animeTitle: b.item.title,
    url: b.group.rss,
    bgmUrl: b.group.bgmUrl || b.item.bgmUrl,
    subgroup: b.group.label,
    match: b.match,
  }))
  basket.value = []
  emit('pickMany', picked)
  model.value = false
}

/*
 * 打开时拉一次。
 * 带了 preset（从编辑订阅点进来的）就每次都重拉 —— 定位条件变了，缓存的整季列表没用；
 * 没带 preset 就沿用上次的结果，来回开关不白等。
 */
/** 换来源：上一家的东西一件都不留（为什么见 loadedSource 的注释） */
function dropList() {
  weeks.value = []
  groups.value = {}
  seasons.value = []
  season.value = ''
  keyword.value = ''
  openKey.value = ''
  openRss.value = ''
  weekTab.value = 0
  loadedSource.value = ''
}

watch(model, v => {
  if (!v) return
  basket.value = []
  if (loadedSource.value && loadedSource.value !== props.source) dropList()
  const next = locate(props.preset, props.source)
  const changed = next.text !== pin.value.text || next.bgmUrl !== pin.value.bgmUrl
  pin.value = next
  if (props.preset) {
    keyword.value = next.text
    // 换了一部番，季度也要重挑，否则会拿上一部番的季度去筛
    if (changed) season.value = ''
    void fetchList()
    return
  }
  if (!weeks.value.length) void fetchList()
})
watch(season, (v, old) => {
  // 列表刚作废（换来源）时不管：紧接着的 fetchList 会带上新的季度
  if (!loadedSource.value) return
  if (old === '' || v === old) return
  /*
   * 「挑季度」和「定位到某一部 / 搜某个词」是两种互斥的看法，换季度就是要看整季。
   * 不清掉的话：AniBT 那边 bgmUrl 硬筛，换到哪一季都只有点进来的那一部；
   * Mikan 那边 `api.mikan(text, season)` 只要 text 非空就走搜索、季度直接被忽略 ——
   * 两种都表现成「季度选择器点了没反应」。上游换季度走的也是「不带定位条件重拉」。
   */
  pin.value = {text: '', bgmUrl: ''}
  keyword.value = ''
  void fetchList()
})

/** AnimeGarden 没有服务端搜索，本地过滤 */
const shownItems = computed(() => {
  const w = weeks.value[weekTab.value]
  if (!w) return []
  const k = keyword.value.trim().toLowerCase()
  if (!k || meta.value.searchable) return w.items
  return w.items.filter(i => i.title.toLowerCase().includes(k))
})

function search() {
  /*
   * 手动搜索 = 松开「定位到这一部」的销子。
   * AniBT 的列表接口里 bgmUrl 是硬筛：留着它，返回的永远只有点进来的那一部，
   * 搜什么都是它 —— 看着像搜索坏了。上游是同一个做法：`show(bgmUrl)` 时把 bgmUrl
   * 传给列表接口，之后回车/点搜索走的 `i()` 不带参数，bgmUrl 自然就空了。
   *
   * AnimeGarden 没有服务端搜索，平时不用重拉；但它同样会被 bgmUrl 钉住，
   * 钉着的时候列表里只有一部，本地过滤过滤个寂寞 —— 松销子这一次得回服务端要整季。
   */
  const wasPinned = !!pin.value.bgmUrl
  pin.value = {text: '', bgmUrl: ''}
  if (meta.value.searchable || wasPinned) void fetchList()
}
</script>

<template>
  <v-dialog v-model="model" :fullscreen="mobile" max-width="1100" scrollable>
    <v-card class="browser">
      <v-card-title class="d-flex align-center ga-3 py-4">
        <v-icon icon="mdi-calendar-week" size="22"/>
        <span>{{ meta.name }} 番剧列表</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="model = false"/>
      </v-card-title>

      <!-- 工具条：搜索 + 季度 + 按钮。三样都可能不存在，用 gap 撑开而不是塞满 -->
      <div class="toolbar">
        <v-text-field
            v-model="keyword" :placeholder="meta.searchable ? '搜索番剧名' : '在本季结果里过滤'"
            class="tool-search" clearable density="comfortable" flat hide-details
            prepend-inner-icon="mdi-magnify" variant="solo-filled"
            @click:clear="search" @keyup.enter="search"/>
        <v-select
            v-if="meta.seasons && seasons.length" v-model="season" :items="seasons.map(s => s.label)"
            class="tool-season" density="comfortable" flat hide-details label="季度" variant="solo-filled"/>
        <v-btn v-if="meta.searchable" :loading="loading" class="tool-btn" color="primary"
               prepend-icon="mdi-magnify" variant="tonal" @click="search">
          搜索
        </v-btn>
      </div>

      <!-- 星期条：这就是「一键按星期看」。今天排在最前，后端已经排好序 -->
      <v-tabs v-if="weeks.length" v-model="weekTab" class="weekbar" density="comfortable" show-arrows>
        <v-tab v-for="(w, i) in weeks" :key="w.label" :value="i">
          {{ w.label }}
          <v-chip class="ml-2" size="x-small" variant="tonal">{{ w.items.length }}</v-chip>
        </v-tab>
      </v-tabs>
      <v-divider/>

      <v-card-text class="body">
        <div v-if="loading" class="grid">
          <v-skeleton-loader v-for="i in 8" :key="i" class="rounded-lg" type="list-item-avatar-two-line"/>
        </div>

        <v-empty-state v-else-if="!weeks.length" icon="mdi-calendar-remove"
                       text="换个关键词或季度再试" title="这里还没有番剧"/>

        <div v-else class="grid">
          <div v-for="it in shownItems" :key="it.key" :class="{open: openKey === it.key}" class="tile">
            <button class="tile-head" type="button" @click="toggleItem(it)">
              <div class="cover">
                <!-- 必须给 height：不给的话 v-img 按图片的固有比例撑一个 .v-responsive
                     出来，横版封面（有些站只给横图）算出来才三十来像素高，缩在 74px 的
                     框子顶上变成一条 —— 剩下的全是灰底。钉死 100% 让它永远占满框，
                     裁剪交给 object-fit。Vuetify 那条 .v-responsive{max-height:100%}
                     是组件自己的规则，不去改它。 -->
                <v-img v-if="it.cover" :src="coverOf(it.cover)" cover height="100%">
                  <template #placeholder>
                    <div class="cover-ph">
                      <v-icon icon="mdi-image-outline" size="20"/>
                    </div>
                  </template>
                </v-img>
                <div v-else class="cover-ph">
                  <v-icon icon="mdi-television-classic" size="22"/>
                </div>
                <span v-if="it.exists" class="flag">已订阅</span>
              </div>
              <div class="tile-meta">
                <div class="tile-title">{{ it.title }}</div>
                <!-- 展不展开右边那颗箭头已经说清楚了，不用再写一遍「看字幕组」 -->
                <div v-if="it.score" class="tile-sub">
                  <span class="score">★ {{ it.score.toFixed(1) }}</span>
                </div>
              </div>
              <v-icon :class="{flip: openKey === it.key}" class="chev" icon="mdi-chevron-down" size="20"/>
            </button>

            <v-expand-transition>
              <div v-if="openKey === it.key" class="groups">
                <div v-if="groupLoading" class="groups-load">
                  <v-progress-circular indeterminate size="22" width="2"/>
                </div>
                <template v-else>
                  <div v-for="g in groups[it.key] || []" :key="g.rss">
                  <div class="group">
                    <v-checkbox-btn :model-value="inBasket(g)" density="compact"
                                    @update:model-value="toggleBasket(it, g)"/>
                    <div class="group-meta">
                      <div class="group-name">{{ g.label }}</div>
                      <div v-if="g.sub" class="group-sub">{{ g.sub }}</div>
                      <div v-if="g.tags?.length" class="group-tags">
                        <v-chip v-for="t in g.tags" :key="t" size="x-small" variant="tonal">{{ t }}</v-chip>
                      </div>
                    </div>
                    <v-btn color="primary" prepend-icon="mdi-plus" size="small" variant="tonal"
                           @click="openMatch(it, g)">
                      添加
                    </v-btn>
                    <!-- 展开看这个组最近发了什么：命名、体积、发布时间，
                         订之前扫一眼就知道这个组合不合适 -->
                    <v-btn v-if="g.items.length" :icon="openRss === g.rss ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                           :title="openRss === g.rss ? '收起最近资源' : '看最近资源'" size="small" variant="text"
                           @click="openRss = openRss === g.rss ? '' : g.rss"/>
                  </div>

                  <v-expand-transition>
                    <div v-if="openRss === g.rss" class="res">
                      <div v-for="(r, ri) in g.items" :key="ri" class="res-row">
                        <div class="res-meta">
                          <div class="res-title">{{ r.title }}</div>
                          <div class="res-sub">{{ [r.size, r.time].filter(Boolean).join(' · ') }}</div>
                        </div>
                        <v-btn v-if="r.magnet" icon="mdi-magnet" size="x-small" title="复制磁力链接"
                               variant="text" @click="copyMagnet(r.magnet)"/>
                        <v-btn v-if="r.torrent" :href="r.torrent" icon="mdi-download-outline" rel="noopener"
                               size="x-small" target="_blank" title="下载种子" variant="text"/>
                      </div>
                    </div>
                  </v-expand-transition>
                  </div>
                  <a v-if="it.link" :href="it.link" class="group-link" rel="noopener" target="_blank">
                    在 {{ meta.name }} 打开
                    <v-icon icon="mdi-open-in-new" size="13"/>
                  </a>
                </template>
              </div>
            </v-expand-transition>
          </div>
        </div>
      </v-card-text>

      <!-- 选了才出现：没选东西时摆一条灰工具条只会让人以为坏了 -->
      <v-slide-y-reverse-transition>
        <div v-if="basket.length" class="basket">
          <span class="text-body-2">已选 {{ basket.length }} 个字幕组</span>
          <v-spacer/>
          <v-btn size="small" variant="text" @click="basket = []">清空</v-btn>
          <v-btn color="primary" prepend-icon="mdi-playlist-plus" size="small" variant="flat"
                 @click="handOffBasket">
            下一步（{{ basket.length }}）
          </v-btn>
        </div>
      </v-slide-y-reverse-transition>
    </v-card>
  </v-dialog>

  <!-- 匹配规则：一个字幕组常常同时发简繁 / 多分辨率，不挑就会一集下好几遍 -->
  <v-dialog :model-value="!!matchFor" max-width="520" @update:model-value="matchFor = null">
    <v-card v-if="matchFor">
      <v-card-title class="pt-4">选择要下载的版本</v-card-title>
      <v-card-subtitle class="pb-4">{{ matchFor.group.label }} · {{ matchFor.item.title }}</v-card-subtitle>
      <v-divider/>
      <v-card-text class="py-3">
        <v-radio-group v-model="matchPick" hide-details>
          <v-radio v-for="(opt, i) in matchOptions" :key="i" :value="JSON.stringify(opt.map(o => o.regex))">
            <template #label>
              <div class="d-flex flex-wrap ga-2 py-1">
                <v-chip v-for="o in opt" :key="o.regex" size="small" variant="tonal">{{ o.label }}</v-chip>
                <v-chip v-if="!opt.length" color="success" size="small" variant="tonal">全部</v-chip>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
      <v-divider/>
      <v-card-actions class="pa-3">
        <v-spacer/>
        <v-btn variant="text" @click="matchFor = null">取消</v-btn>
        <v-btn color="primary" variant="flat" @click="confirmMatch">确定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.browser {
    display: flex;
    flex-direction: column;
}

/* 工具条：三件套之间给 12px，别贴在一起；窄屏让搜索自己掉一行 */
.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 0 20px 16px;
}

.tool-search {
    flex: 1 1 240px;
    min-width: 0;
}

.tool-season {
    flex: 0 1 170px;
    min-width: 140px;
}

/* 和 comfortable 的输入框同高，并排放着才像一排 */
.tool-btn {
    height: 48px;
}

.weekbar {
    padding: 0 12px;
}

.body {
    padding: 20px;
}

/*
 * 一行一部番，不排多列。
 *
 * 原来是 auto-fill minmax(268px)，宽屏排三到四列。问题不在列表本身，在展开之后：
 * 一格只有 268px，「最近资源」那几行的种子名
 *（`[ANi] 转学后班上的清纯可爱美少女 - 08 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4` 这种）
 * 只剩不到 200px，一律在第一个方括号那儿就省略号收尾 —— 而看清这一串正是
 * 「订之前先看一眼这个组的命名、分辨率、字幕语言」的全部意义，看不清等于这块白做。
 * 单列之后同一位置有近 1000px，配上下面 .res-title 的折行，整串都在。
 */
.grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    align-items: start;
}

.tile {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 14px;
    background: rgba(var(--v-theme-on-surface), .02);
    overflow: hidden;
    transition: border-color var(--m-dur) var(--m-ease), background-color var(--m-dur) var(--m-ease);
}

/*
 * 悬停只换边框和底色，不再往上抬。
 *
 * 原来是 translateY(-2px) + 一层阴影。抬起这件事在网格里根本站不住：
 * 卡片自己 overflow: hidden，外面又套着 v-card-text 那个滚动容器，
 * 抬到容器边缘的那张会被切掉一截 —— 动效没做成「浮起来」，做成了「被啃掉一块」。
 * 而且这一格随时会展开成一整块字幕组列表，抬一下再展开，两段位移叠在一起直接抖。
 */
.tile:hover {
    border-color: rgba(var(--v-theme-primary), .5);
    background: rgba(var(--v-theme-on-surface), .05);
}

/* 展开的那张：边框再深一点，表示「当前在看这个」 */
.tile.open {
    border-color: rgba(var(--v-theme-primary), .6);
}

.tile-head {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px;
    text-align: left;
    background: none;
    border: 0;
    cursor: pointer;
}

.cover {
    position: relative;
    flex: 0 0 auto;
    width: 54px;
    height: 74px;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(var(--v-theme-on-surface), .06);
}

.cover-ph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: rgba(var(--v-theme-on-surface), .38);
}

.flag {
    position: absolute;
    inset: auto 0 0 0;
    /* 和封面同一个圆角，别只指望 .cover 的 overflow */
    border-radius: 0 0 8px 8px;
    padding: 2px 0;
    font-size: 10px;
    text-align: center;
    color: #fff;
    /* 不用 primary：主题色可能是浅色，白字压不住 */
    background: rgba(0, 0, 0, .68);
}

.tile-meta {
    flex: 1 1 auto;
    min-width: 0;
}

.tile-title {
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.35;
    /* 番剧名很长，压两行，超出省略 */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
}

.tile-sub {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 11.5px;
    color: rgba(var(--v-theme-on-surface), .62);
}

.score {
    color: rgb(var(--v-theme-warning));
    font-weight: 600;
}

.chev {
    flex: 0 0 auto;
    color: rgba(var(--v-theme-on-surface), .5);
    transition: transform .2s;
}

.chev.flip {
    transform: rotate(180deg);
}

.groups {
    padding: 4px 10px 10px;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.groups-load {
    display: flex;
    justify-content: center;
    padding: 18px 0;
}

/* 每个字幕组一行，行与行之间 6px —— 挨着放会分不清哪个复选框管哪一行 */
.group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 6px 8px 0;
    border-radius: 10px;
}

.groups > template + div,
.groups > div + div {
    margin-top: 6px;
}

.group:hover {
    background: rgba(var(--v-theme-on-surface), .04);
}

/*
 * 复选框不许抢宽度。
 *
 * 它是 .v-selection-control，Vuetify 给的是 `flex: 1 0` —— 摆进一条 flex 行里，
 * 整行剩下的宽度全归它，字幕组名被推到行的中间去，看着像有人写了 text-align: center。
 * 多列的时候一格才 268px，没有剩余宽度可抢，这条一直藏着；改成一行一部番就露出来了。
 */
.group > .v-checkbox-btn {
    flex: 0 0 auto;
}

.group-meta {
    flex: 1 1 auto;
    min-width: 0;
}

.group-name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.group-sub {
    margin-top: 2px;
    font-size: 11px;
    color: rgba(var(--v-theme-on-surface), .62);
}

.group-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
}

/* 资源列表：缩进一格挂在字幕组下面，视觉上从属关系一眼看得出来 */
.res {
    margin: 4px 0 8px 34px;
    padding-left: 12px;
    border-left: 2px solid rgba(var(--v-theme-primary), .3);
}

/* 行尾那两颗图标按钮（复制磁力 / 下载种子）之间要 8px，6px 挨得看不出是两颗 */
.res-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
}

.res-row + .res-row {
    border-top: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * .6));
}

.res-meta {
    flex: 1 1 auto;
    min-width: 0;
}

/*
 * 种子名要看全，所以折行不省略。
 *
 * 原来是一行 + 省略号 —— 那是多列时代的将就：一格 268px，不截就把整张卡撑爆。
 * 现在一行一部番，横向有的是地方，剩下的问题只是这串字里不一定有空格可断，
 * 交给 overflow-wrap: anywhere 让它随处断。封两行：三行以上的名字是极少数，
 * 而每个组最多列 8 条，条条三行会把展开的那块拉得比屏幕还长。
 */
.res-title {
    font-size: 11.5px;
    line-height: 1.4;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
}

.res-sub {
    margin-top: 1px;
    font-size: 10.5px;
    color: rgba(var(--v-theme-on-surface), .6);
}

.group-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin: 10px 0 2px 6px;
    font-size: 12px;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.group-link:hover {
    text-decoration: underline;
}

.basket {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    background: rgba(var(--v-theme-primary), .08);
}
</style>
