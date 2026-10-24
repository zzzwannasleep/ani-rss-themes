<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useRouter} from 'vue-router'
import type {Ani} from '@shared/types'
import * as api from '@shared/api'
import type {LegacySubtitle, PlayableItem} from '@shared/api'
import {toApiFile} from '@shared/http'
import {formatTime} from '@shared/format'
import ExternalPlayerMenu from '@/components/player/ExternalPlayerMenu.vue'

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const {mobile} = useDisplay()
const router = useRouter()
const dialog = ref(true)
const loading = ref(false)
const items = ref<PlayableItem[]>([])

onMounted(async () => {
  loading.value = true
  try {
    items.value = await api.playList(props.item)
  } finally {
    loading.value = false
  }
})

const srcOf = (p: PlayableItem) => (p.filename ? toApiFile(p.filename) : '')

/**
 * 交给播放页。
 * 不在弹窗里塞播放器：webplayer 自带完整的播放界面（轨道选择、字幕、弹幕、Anime4K），
 * 挤在一个对话框里两边都难受，整页给它更合适。
 */
/*
 * 外挂字幕可能不止一条（同一集常同时放简体和繁体，偶尔还有日字），
 * 播放页一次只收一条，所以有多条时先让人选 —— 原来是闷头取第一条，
 * 想看另一条没有任何入口。mkv 里的内封字幕不走这里，播放器自己从容器里取。
 *
 * 3.2.46 起后端不再回这份列表了（见 shared/api.ts 的 LegacySubtitle），
 * 新后端上这里恒为空，选字幕那一步自然就不出现 —— 不是坏了，是没有数据可列。
 */
const subs = (p: PlayableItem) => (p.subtitles || []).filter(s => s.url)

/** 有简体就默认简体：绝大多数人要的是这条，省一次点击 */
function preferred(list: LegacySubtitle[]) {
  const zh = list.find(s => /(简|chs|sc|zh-?hans)/i.test(`${s.name ?? ''}${s.html ?? ''}`))
  return zh ?? list[0]
}

/** 丢给本机播放器时带上的字幕：支持 sub 的那几个（Infuse / PotPlayer / VLC）用得到 */
function subUrl(p: PlayableItem) {
  const list = subs(p)
  const s = list.length ? preferred(list) : undefined
  return s?.url ? toApiFile(s.url) : undefined
}

/** 选字幕的弹窗；null 表示没在选 */
const choosing = ref<PlayableItem | null>(null)

function play(p: PlayableItem, sub?: LegacySubtitle) {
  const list = subs(p)
  if (!sub && list.length > 1) {
    choosing.value = p
    return
  }
  const use = sub ?? (list.length ? preferred(list) : undefined)
  choosing.value = null
  void router.push({
    name: 'play',
    query: {
      src: srcOf(p),
      title: `${props.item.title || ''}${p.episode ? ` E${String(p.episode).padStart(2, '0')}` : ''}`.trim(),
      ...(use?.url ? {suburl: toApiFile(use.url), sublabel: use.name || '字幕'} : {}),
    },
  })
}
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="720" scrollable @after-leave="emit('close')">
    <v-card :loading="loading">
      <v-card-title class="d-flex align-center">
        <span class="text-truncate">{{ item.title }}</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="dialog = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text class="pa-0">
        <v-empty-state v-if="!loading && !items.length" icon="mdi-video-off"
                       text="该订阅目录下暂无可播放的文件" title="没有找到视频文件"/>

        <v-list v-else density="comfortable">
          <v-list-item
              v-for="(p, i) in items"
              :key="i"
              :subtitle="`${p.formatSize || ''} · ${formatTime(p.lastModify)}`
                         + (subs(p).length > 1 ? ` · ${subs(p).length} 条字幕` : '')"
              :title="p.title || p.name"
              @click="play(p)"
          >
            <template #prepend>
              <v-avatar color="surface-variant" size="36">
                <span class="text-caption">{{ p.episode ?? '—' }}</span>
              </v-avatar>
            </template>

            <template #append>
              <div class="d-flex align-center ga-2" @click.stop>
                <ExternalPlayerMenu :name="p.name" :src="srcOf(p)" :sub="subUrl(p)" icon-only/>
                <v-btn :href="srcOf(p)" icon="mdi-download" size="small" target="_blank" title="下载"
                       variant="text"/>
                <v-btn color="primary" icon="mdi-play" size="small" title="播放" variant="text"
                       @click="play(p)"/>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- 多条外挂字幕时先挑一条，播放页一次只收一条 -->
  <v-dialog :model-value="!!choosing" max-width="420" @update:model-value="choosing = null">
    <v-card v-if="choosing">
      <v-card-title class="text-subtitle-1">选一条字幕</v-card-title>
      <v-divider/>
      <v-list density="comfortable">
        <v-list-item v-for="(sb, i) in subs(choosing)" :key="i" :subtitle="sb.type"
                     :title="sb.name || sb.html || `字幕 ${i + 1}`" prepend-icon="mdi-subtitles-outline"
                     @click="play(choosing!, sb)"/>
        <v-divider class="my-1"/>
        <v-list-item prepend-icon="mdi-subtitles-off-outline" title="不加载字幕"
                     @click="play(choosing!, {})"/>
      </v-list>
      <v-divider/>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="choosing = null">取消</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
