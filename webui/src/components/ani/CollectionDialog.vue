<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, BgmInfo, CollectionInfo, Item} from '@shared/types'
import * as api from '@shared/api'
import {useUiStore} from '@/stores/ui'
import {pickedFile} from '@/composables/pickedFile'

const model = defineModel<boolean>({required: true})

const ui = useUiStore()
const {mobile} = useDisplay()

/*
 * 合集默认排除的东西：特典目录、字体、无字幕 OP/ED、迷你动画。
 * 抄的是上游 CollectionView 选完 Bangumi 条目之后写死的那两条，
 * 不是订阅用的那套（720p / 合集 / 特别篇）—— 合集里那几条会把整包过滤光。
 */
const COLLECTION_EXCLUDE = ['^(SPs?|CDs|Scans|PV|menu)/', 'Fonts|NCED|NCOP|迷你动画']

/**
 * 一份「什么都填好了」的空订阅。
 *
 * 不能只给 {} —— 后端 CollectionService.preview() 里是直接
 * `exclude.isEmpty()` / `match.isEmpty()` / `if (globalExclude)` 这么用的，
 * 三个都不判空，少一个就是
 * `Cannot invoke "java.util.List.isEmpty()" because "exclude" is null`，
 * 而预览、开始下载、识别字幕组全都要走 preview()，等于整个合集功能都用不了。
 * 上游没这问题只是因为它的种子上传藏在「选完条目」后面，条目一到手就把这些字段填上了；
 * 我们这边允许先传种子，那默认值就得自己备齐。
 *
 * 每次现造一个，不要共用一份常量：里面几个数组会被就地改。
 */
function blankAni(): Ani {
  return {
    title: '', subgroup: '', season: 1, offset: 0,
    match: [], exclude: [...COLLECTION_EXCLUDE], globalExclude: true,
    // 日期给今天而不是空串：重命名模板里的 ${year} 要从这儿取
    releaseDate: new Date().toISOString().slice(0, 10),
    ova: false, enable: true, omit: true, downloadNew: false, notDownload: [],
    currentEpisodeNumber: 0, totalEpisodeNumber: 0, score: 0,
    themoviedbName: '', standbyRssList: [],
    customDownloadPath: false, customDownloadPathTemplate: '',
    customEpisode: false, customEpisodeStr: '', customEpisodeGroupIndex: 0,
    customRenameTemplateEnable: false, customRenameTemplate: '',
    customTagsEnable: false, customTags: [],
    customPriorityKeywordsEnable: false, customPriorityKeywords: [],
    customUploadEnable: false, customUploadPathTarget: '',
    customCompleted: false, customCompletedPathTemplate: '',
    completed: false, message: true, upload: false, procrastinating: false,
  }
}

const busy = ref('')
const files = ref<File[]>([])
/**
 * 种子从哪来。torrent 一个字段两种含义：.torrent 的 base64，或者一条磁力链接
 * （上游 3.2.34 起，6b7dde8；后端看开头是不是 magnet:? 分流）。
 */
const source = ref<'file' | 'magnet'>('file')
/** 后端要的是 .torrent 的 base64 或磁力链接，不是文件本身 */
const data = ref<CollectionInfo>({torrent: '', ani: blankAni(), bgmInfo: {}})
const keyword = ref('')
const results = ref<BgmInfo[]>([])
const preview = ref<Item[]>([])
/** 预览单开一个窗口：一包合集动辄几十个文件，接在表单下面只能一直往下滚 */
const previewOpen = ref(false)

/* 从预览结果的文件名里认字幕组（上游预览框也是这么认的），和当前填的不一样就提示换 */
const detected = computed(() => {
  const hit = preview.value.map(it => /^\[(.+?)]/.exec(it.title ?? '')).find(Boolean)
  const sub = hit?.[1]
  return sub && sub !== data.value.ani?.subgroup ? sub : ''
})

/**
 * 种子读成 base64。
 *
 * 以前是丢给后端 `api/upload?type=getBase64` 换的，但那个 type 开关在上游 3.2.18 之后的
 * 重构里删掉了，改成另一个端点 /api/uploadAndReadToBase64 —— 跟着换就得按后端版本分叉，
 * 老版本上没有那个端点。而合集要的只是那串 base64，文件根本不用上服务器：
 * 浏览器自己读完事，少一跳往返，也就不用管后端是哪一版。
 */
const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onerror = () => reject(r.error ?? new Error('读取失败'))
  // readAsDataURL 回的是 `data:...;base64,xxxx`，后端只要逗号后面那截
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
  r.readAsDataURL(f)
})

async function onPick(picked: File | File[]) {
  const f = pickedFile(picked)
  if (!f) return
  if (!f.name.endsWith('.torrent')) return ui.error('请选择 .torrent 文件')
  busy.value = 'upload'
  try {
    data.value.torrent = await toBase64(f)
    ui.success('种子已读取')
    await guessSubgroup()
  } catch {
    ui.error('种子读取失败')
  } finally {
    busy.value = ''
  }
}

/*
 * 换来源就把旧的清掉 —— 否则上一个来源留下的值会被当成这一个来源提交：
 * 选过种子再切到磁力，框里是空的，发出去的却还是那串 base64。
 */
function switchSource() {
  files.value = []
  data.value.torrent = ''
}

/**
 * 磁力链接要后端先去 DHT 上拿元数据（jlibtorrent），慢的时候几十秒。
 * 所以不跟着每次按键走，敲回车或移开焦点才认一次字幕组，顺带当作「这条链接能不能解析」的检验。
 */
const magnetOk = (v: string) => /^magnet:\?/i.test(v.trim())
let lastMagnet = ''

async function onMagnet() {
  const v = (data.value.torrent ?? '').trim()
  data.value.torrent = v
  if (!magnetOk(v) || v === lastMagnet) return
  lastMagnet = v
  busy.value = 'magnet'
  try {
    await guessSubgroup()
  } finally {
    busy.value = ''
  }
}

async function guessSubgroup() {
  if (!data.value.torrent) return
  try {
    const sub = await api.getCollectionSubgroup(data.value)
    if (!sub) return
    data.value.ani = {...data.value.ani, subgroup: sub}
    // 认不出来时后端回的就是这四个字，别报成「识别到字幕组：未知字幕组」
    if (sub !== '未知字幕组') ui.info(`识别到字幕组：${sub}`)
  } catch (e) {
    /* 认不出来本身不算错（用户可以自己填），但整个失败要说出来 ——
       原来这里是完全静默的，后端那条 exclude 空指针就是被它咽掉的，
       表现成「传一次没反应，传第二次才认出来」，看不出是报错。 */
    ui.warn(`没能识别字幕组，可以自己填：${(e as Error).message || '请求失败'}`)
  }
}

async function search() {
  if (!keyword.value.trim()) return
  busy.value = 'search'
  try {
    results.value = await api.searchBgm(keyword.value.trim())
    if (!results.value.length) ui.warn('没有搜到条目')
  } finally {
    busy.value = ''
  }
}

async function pick(b: BgmInfo) {
  busy.value = 'pick'
  try {
    data.value.bgmInfo = b
    const sub = data.value.ani?.subgroup
    /*
     * 三层叠：默认体兜底（条目回来的 Ani 里 match/exclude 可能是 null）、
     * 条目本身、再把合集这几项按上游 bgmAdd 的做法压回去。
     * subgroup 用已经从种子里认出来的那个 —— 上游是先选条目后传种子，
     * 所以它写死 '未知字幕组'；我们两个顺序都允许，认出来了就别覆盖掉。
     */
    data.value.ani = {
      ...blankAni(),
      ...(await api.getAniBySubjectId(String(b.id))),
      subgroup: sub || '未知字幕组',
      customEpisode: true,
      match: [],
      exclude: [...COLLECTION_EXCLUDE],
    }
    ui.success(`已选择：${b.nameCn || b.name}`)
    // 种子先传的那种顺序：这会儿才有完整的 ani，之前认不出来的字幕组现在能认了
    if (data.value.torrent && !sub) await guessSubgroup()
  } finally {
    busy.value = ''
  }
}

/*
 * 合集的标题 / TMDB 名和普通订阅一样重要：重命名模板和刮削都按它们走，
 * 名字不对，一整季文件全落错地方。上游合集框里挂着「使用 Bangumi」「使用 TMDB」
 * 「获取 TMDB」「下载位置」四颗，我们一颗都没有 —— 只能听天由命。
 */
async function useBgmName() {
  busy.value = 'bgm'
  try {
    const t = await api.getBgmTitle(data.value.ani ?? {})
    if (!t) return ui.warn('没有查到标题')
    data.value.ani = {...data.value.ani, title: t}
    ui.success('已使用 Bangumi 标题')
  } finally {
    busy.value = ''
  }
}

async function fetchTmdb() {
  busy.value = 'tmdb'
  try {
    const r = await api.getThemoviedbName(data.value.ani ?? {})
    if (!r?.themoviedbName) return ui.warn('没有查到 TMDB 名称')
    data.value.ani = {...data.value.ani, themoviedbName: r.themoviedbName, tmdb: r.tmdb}
    ui.success(`已获取：${r.themoviedbName}`)
  } finally {
    busy.value = ''
  }
}

async function showPath() {
  busy.value = 'path'
  try {
    const r = await api.downloadPath(data.value.ani ?? {})
    ui.info(`会下到：${r.downloadPath}`)
  } finally {
    busy.value = ''
  }
}

/**
 * 填入「不启用自定义路径时会下到哪」，当作改模板的起点。
 *
 * 和 AniEditDialog 一样先把 customDownloadPath 置 false 再算 —— 不置的话
 * 后端会拿你正在编辑的这个模板去算，等于原样返回。
 */
async function fillDownloadPath() {
  busy.value = 'fillPath'
  try {
    const r = await api.downloadPath({...data.value.ani, customDownloadPath: false})
    data.value.ani = {...data.value.ani, customDownloadPathTemplate: r.downloadPath}
    ui.success('已填入当前的默认下载位置')
  } finally {
    busy.value = ''
  }
}

/** 磁力那一格里填的不是磁力链接：拦在前面，别发给后端当 base64 去解 */
function sourceMissing(): string {
  const t = data.value.torrent?.trim()
  if (source.value === 'magnet') return t && magnetOk(t) ? '' : '请填入以 magnet:? 开头的磁力链接'
  return t ? '' : '请先选择种子文件'
}

async function doPreview() {
  const miss = sourceMissing()
  if (miss) return ui.error(miss)
  busy.value = 'preview'
  previewOpen.value = true
  try {
    preview.value = await api.previewCollection(data.value)
    if (!preview.value.length) ui.warn('没有解析出可下载的剧集')
  } finally {
    busy.value = ''
  }
}

/** 预览里认出来的字幕组和填的不一样：一键改过去，顺便按新名字重算一次 */
async function applyDetected() {
  data.value.ani = {...data.value.ani, subgroup: detected.value}
  await doPreview()
}

async function start() {
  const miss = sourceMissing()
  if (miss) return ui.error(miss)
  busy.value = 'start'
  try {
    await api.startCollection(data.value)
    ui.success('已开始下载合集')
    model.value = false
    reset()
  } finally {
    busy.value = ''
  }
}

function reset() {
  files.value = []
  source.value = 'file'
  lastMagnet = ''
  data.value = {torrent: '', ani: blankAni(), bgmInfo: {}}
  keyword.value = ''
  results.value = []
  preview.value = []
  previewOpen.value = false
}
</script>

<template>
  <v-dialog v-model="model" :fullscreen="mobile" max-width="720" scrollable @after-leave="reset">
    <v-card>
      <v-card-title class="d-flex align-center">
        合集下载
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="model = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-3">
          用一个整季打包的种子建立订阅：先选种子，再指定它对应的 Bangumi 条目，
          刮削与重命名才能按正确的剧集信息进行。
        </div>

        <v-btn-toggle v-model="source" class="mb-3" color="primary" density="compact" divided mandatory
                      variant="outlined" @update:model-value="switchSource">
          <v-btn prepend-icon="mdi-file-download-outline" value="file">种子文件</v-btn>
          <v-btn prepend-icon="mdi-magnet" value="magnet">磁力链接</v-btn>
        </v-btn-toggle>

        <v-textarea
            v-if="source === 'magnet'"
            v-model="data.torrent"
            :loading="busy === 'magnet'"
            auto-grow
            class="mb-3"
            hint="需要 ani-rss 3.2.34 及以上。后端要先去拿元数据，识别和预览会慢一些"
            label="磁力链接"
            persistent-hint
            placeholder="magnet:?xt=urn:btih:..."
            rows="2"
            @blur="onMagnet"
            @keydown.enter.prevent="onMagnet"
        />

        <v-file-input
            v-else
            v-model="files"
            :loading="busy === 'upload'"
            accept=".torrent"
            class="mb-3"
            label="合集种子（.torrent）"
            prepend-icon="mdi-file-download-outline"
            show-size
            @update:model-value="onPick"
        />

        <v-text-field
            v-model="keyword"
            :loading="busy === 'search'"
            append-inner-icon="mdi-magnify"
            class="mb-2"
            label="搜索 Bangumi 条目"
            @click:append-inner="search"
            @keyup.enter="search"
        />

        <v-list v-if="results.length" class="mb-3" density="compact" max-height="200" style="overflow-y:auto">
          <v-list-item v-for="b in results" :key="b.id" :subtitle="b.date" :title="b.nameCn || b.name"
                       @click="pick(b)">
            <template #prepend>
              <v-avatar rounded size="32">
                <v-img :src="b.images?.grid || b.images?.small"/>
              </v-avatar>
            </template>
          </v-list-item>
        </v-list>

        <v-alert v-if="data.bgmInfo?.id" class="mb-3" density="compact" type="success" variant="tonal">
          已选条目：{{ data.bgmInfo.nameCn || data.bgmInfo.name }}
        </v-alert>

        <!-- 标题和 TMDB 名决定文件最后落到哪个目录，合集一次就是一整季，错了要全挪 -->
        <v-text-field v-model="data.ani!.title" class="mb-1" label="标题">
          <template #append>
            <v-btn :loading="busy === 'bgm'" size="small" variant="tonal" @click="useBgmName">用 Bgm 名</v-btn>
            <v-btn :disabled="!data.ani?.themoviedbName || data.ani?.title === data.ani?.themoviedbName"
                   class="ml-2" size="small" variant="tonal"
                   @click="data.ani = {...data.ani, title: data.ani!.themoviedbName}">
              用 TMDB 名
            </v-btn>
          </template>
        </v-text-field>

        <v-text-field v-model="data.ani!.themoviedbName" class="mb-1" label="TMDB">
          <template #append>
            <v-btn :loading="busy === 'tmdb'" size="small" variant="tonal" @click="fetchTmdb">获取</v-btn>
          </template>
        </v-text-field>

        <v-text-field v-model="data.ani!.subgroup" class="mb-3" hint="留空则由后端从种子名推断"
                      label="字幕组" persistent-hint/>

        <!--
          自定义位置和重命名模板。

          合集一次落的是一整季，模板不对就是一整季文件全放错地方、全得手工挪。
          这两项在 blankAni() 里一直有字段、也一直跟着 preview / start 发给后端，
          界面上却没有入口 —— 等于只能吃全局模板，普通订阅能改的这里改不了。
          折进折叠面板而不是平铺：多数合集不用改，但要改的时候必须改得到。
        -->
        <v-expansion-panels class="mb-3" multiple variant="accordion">
          <v-expansion-panel title="自定义位置">
            <template #text>
              <v-switch v-model="data.ani!.customDownloadPath" class="mb-2" color="primary" hide-details
                        label="启用"/>
              <v-text-field v-model="data.ani!.customDownloadPathTemplate"
                            :disabled="!data.ani?.customDownloadPath" label="路径模版"/>
              <div class="d-flex align-center flex-wrap ga-2 mt-3">
                <v-btn :disabled="!data.ani?.customDownloadPath" :loading="busy === 'fillPath'" size="small"
                       variant="tonal" @click="fillDownloadPath">
                  填入默认位置
                </v-btn>
                <span class="text-caption text-medium-emphasis">最终位置点下面的「下载位置」核对</span>
              </div>
            </template>
          </v-expansion-panel>

          <v-expansion-panel title="重命名模版">
            <template #text>
              <v-switch v-model="data.ani!.customRenameTemplateEnable" class="mb-2" color="primary" hide-details
                        label="启用"/>
              <v-text-field v-model="data.ani!.customRenameTemplate"
                            :disabled="!data.ani?.customRenameTemplateEnable"
                            label="模版" placeholder="${title} S${seasonFormat}E${episodeFormat}"/>
              <a class="text-caption doc-link touch-link"
                 href="https://docs.wushuo.top/config/basic/rename#rename-template"
                 rel="noopener" target="_blank">
                可用占位符看文档
                <v-icon icon="mdi-open-in-new" size="12"/>
              </a>
              <!-- 改完直接预览：这一栏的对错在「→ 重命名后」那列一眼能看出来 -->
            </template>
          </v-expansion-panel>
        </v-expansion-panels>

        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-btn :loading="busy === 'preview'" prepend-icon="mdi-eye-outline" variant="tonal" @click="doPreview">
            预览剧集
          </v-btn>
          <v-btn :loading="busy === 'path'" prepend-icon="mdi-folder-outline" variant="tonal" @click="showPath">
            下载位置
          </v-btn>
        </div>

      </v-card-text>

      <v-divider/>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="model = false">取消</v-btn>
        <v-btn :disabled="!data.torrent" :loading="busy === 'start'" color="primary" variant="flat" @click="start">
          开始下载
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!--
    预览单开一窗。
    一包合集是几十上百个文件，接在表单下面就只能一直往下滚 ——
    要对照的「原名 → 重命名后」在最下面，而字幕组、季、偏移这些一改就得重看的输入框在最上面。
    单开之后表格自己滚，关掉就回到表单，两边都不动位置。
  -->
  <v-dialog v-model="previewOpen" :fullscreen="mobile" max-width="900" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        合集预览
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="previewOpen = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text style="min-height: 40vh">
        <v-alert v-if="detected" class="mb-3" density="compact" type="info" variant="tonal">
          <div class="d-flex align-center ga-2 flex-wrap">
            <span>文件名里的字幕组是「{{ detected }}」，和填的不一样</span>
            <v-spacer/>
            <v-btn :loading="busy === 'preview'" size="small" variant="tonal" @click="applyDetected">
              改成它
            </v-btn>
          </div>
        </v-alert>

        <v-skeleton-loader v-if="busy === 'preview' && !preview.length" type="table-row@6"/>

        <v-table v-else-if="preview.length" density="compact">
          <thead>
          <tr>
            <th style="width:56px">集</th>
            <th>文件 / 重命名后</th>
            <th style="width:96px">大小</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(it, i) in preview" :key="i">
            <td>{{ it.episode ?? '—' }}</td>
            <td>
              <div class="text-body-2">{{ it.title }}</div>
              <div v-if="it.reName" class="text-caption text-medium-emphasis">→ {{ it.reName }}</div>
            </td>
            <td class="text-caption">{{ it.formatSize || '—' }}</td>
          </tr>
          </tbody>
        </v-table>

        <v-empty-state v-else icon="mdi-file-search-outline" text="换个字幕组或者放宽排除条件再试"
                       title="没有解析出可下载的剧集"/>
      </v-card-text>

      <v-divider/>
      <v-card-actions>
        <span class="text-caption text-medium-emphasis ml-2">共 {{ preview.length }} 项</span>
        <v-spacer/>
        <v-btn variant="text" @click="previewOpen = false">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
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
</style>
