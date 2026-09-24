<script setup lang="ts">
import {computed} from 'vue'
import type {Config} from '@shared/types'
import {THEMES, THEME_MAP} from '@shared/themes/registry'
import meta from '@preset/meta'
import {HOME} from '@/router'
import {usePrefsStore} from '@/stores/prefs'
import SettingField from './SettingField.vue'
import type {FieldDef} from './schema'

defineProps<{config: Config}>()
const prefs = usePrefsStore()

const themeItems = computed(() => [
  {value: '', title: '不启用（Vuetify 原生）', desc: '只用上面的明暗与主题色', remote: false},
  ...THEMES.map(t => ({value: t.id, title: t.name, desc: t.desc, remote: !!t.remote})),
])

const currentTheme = computed(() => (prefs.themeId ? THEME_MAP.get(prefs.themeId) : undefined))

/*
 * 启动页可选项。总览那条只在有总览的预设上给 —— github 那款压根没有这一页，
 * 列出来选了也只会被路由退回落地页，看起来像设置没生效。
 * 第一条留空串，表示「这款界面自己的落地页」，与 prefs 里的默认值对上。
 */
const startupItems = [
  {value: '', title: `跟随界面默认（${meta.dashboard ? '总览' : '订阅'}）`},
  ...(meta.dashboard ? [{value: HOME, title: '总览'}] : []),
  {value: '/subscriptions', title: '订阅'},
  {value: '/downloads', title: '下载'},
  {value: '/logs', title: '日志'},
]

/* 明暗三档。列成数组是为了下面三颗按钮长一个样 —— 手写三遍迟早写歪一颗 */
const MODES = [
  {value: 'light', label: '浅色', icon: 'mdi-weather-sunny'},
  {value: 'dark', label: '深色', icon: 'mdi-weather-night'},
  {value: 'system', label: '跟随系统', icon: 'mdi-theme-light-dark'},
] as const

/**
 * 这一页分两半：
 *  - 外观、显示项存在浏览器本地（键与 ani-rss 自带界面共用，切过来设置还在）
 *  - 排序方式、自定义 CSS/JS 存在服务端配置里
 * 混在一个面板里是因为用户不关心谁存在哪，只关心「页面长什么样」。
 */
const serverFields: FieldDef[] = [
  {
    key: 'sortType', label: '排序方式', type: 'select', items: [
      {title: '评分', value: 'SCORE'},
      {title: '拼音', value: 'PINYIN'},
      {title: '下载时间', value: 'DOWNLOAD_TIME'},
    ],
  },
  {
    key: 'customCss', label: '自定义 CSS', type: 'textarea',
    hint: '与 ani-rss 自带界面共用同一份，现有主题可直接沿用',
  },
  {key: 'customJs', label: '自定义 JS', type: 'textarea'},
]
</script>

<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-3">外观与显示项存在本机浏览器，不随配置备份。</div>

    <!--
      不用 v-btn-toggle。那个组件的设计就是把几颗按钮拼成一条、中间一点缝都没有，
      三个模式挤成一根长条，得靠中间那道分隔线去数「原来是三颗」。
      预览面板的筛选早先也栽在同一件事上，那边换成了三颗独立按钮，这里跟它一致：
      每颗自己一个盒子，之间 8px（ga-2，M3 的最小档）。
      顺带这样也回到了版式体检的取景框里 —— 它第五条量的是「挨着的两颗 .v-btn
      之间有没有 8px」，而整组的分段按钮（v-btn-toggle）是被那条规则排除掉的，
      所以这处以前一直漏检。
    -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-btn v-for="m in MODES" :key="m.value"
             :color="prefs.mode === m.value ? 'primary' : undefined"
             :prepend-icon="m.icon"
             :variant="prefs.mode === m.value ? 'flat' : 'outlined'"
             density="comfortable"
             @click="prefs.mode = m.value">
        {{ m.label }}
      </v-btn>
    </div>

    <div class="d-flex align-center mb-4 ga-3">
      <div class="text-body-2">主题色</div>
      <input v-model="prefs.accent" class="color-input" type="color"/>
      <span class="text-caption text-medium-emphasis">{{ prefs.accent }}</span>
    </div>

    <!-- ── 主题皮肤 ── -->
    <div class="text-body-2 mb-2">主题</div>
    <v-select
        v-model="prefs.themeId"
        :items="themeItems"
        class="mb-2"
        item-title="title"
        item-value="value"
    >
      <template #item="{props: itemProps, item}">
        <v-list-item v-bind="itemProps" :subtitle="item.raw.desc">
          <template v-if="item.raw.remote" #append>
            <v-chip size="x-small" variant="tonal">联网</v-chip>
          </template>
        </v-list-item>
      </template>
    </v-select>

    <div v-if="currentTheme" class="text-caption text-medium-emphasis mb-2">
      {{ currentTheme.desc }}
      <template v-if="currentTheme.base !== 'auto'">
        · 该主题只在{{ currentTheme.base === 'dark' ? '深色' : '浅色' }}下成立，会忽略上面的明暗选择
      </template>
    </div>
    <v-alert v-if="currentTheme?.remote" class="mb-4" density="compact" type="info" variant="tonal">
      这款主题的壁纸来自第三方公共接口，会产生外部网络请求。介意就换用不带壁纸的那几款。
    </v-alert>
    <div v-else class="mb-4"></div>

    <!--
      壁纸的模糊和白纱（ani-rss-themes#3）。只有整屏铺壁纸的皮肤才出这两条，
      别的皮肤背景是渐变或纯色，拉了也看不出变化，只会让人以为坏了。
      拖动时即时生效，不用保存 —— 和上面的明暗、主题色一样是本机偏好。
    -->
    <template v-if="currentTheme?.wallpaper">
      <div class="d-flex align-center">
        <div class="text-body-2 wp-label">背景模糊</div>
        <v-slider v-model="prefs.wallpaperBlur" :max="20" :min="0" :step="1" class="mx-2"
                  color="primary" hide-details/>
        <span class="text-caption text-medium-emphasis wp-value">{{ prefs.wallpaperBlur }}px</span>
      </div>
      <div class="d-flex align-center">
        <div class="text-body-2 wp-label">浅色白纱</div>
        <v-slider v-model="prefs.wallpaperVeil" :max="0.8" :min="0" :step="0.05" class="mx-2"
                  color="primary" hide-details/>
        <span class="text-caption text-medium-emphasis wp-value">{{ Math.round(prefs.wallpaperVeil * 100) }}%</span>
      </div>
      <div class="text-caption text-medium-emphasis mb-4">
        把壁纸往后推，让订阅卡片更显眼。都拉到 0 就是原图；白纱只在浅色下有，深色自带压暗层。
      </div>
    </template>

    <div class="d-flex align-center py-1">
      <div class="flex-grow-1 pr-4 text-body-2">显示评分</div>
      <v-switch v-model="prefs.showScore" color="primary" density="compact" hide-details/>
    </div>
    <div class="d-flex align-center py-1">
      <div class="flex-grow-1 pr-4">
        <div class="text-body-2">按星期分组</div>
        <div class="text-caption text-medium-emphasis">搜索时自动不分组</div>
      </div>
      <v-switch v-model="prefs.showWeek" color="primary" density="compact" hide-details/>
    </div>
    <div class="d-flex align-center py-1">
      <div class="flex-grow-1 pr-4 text-body-2">显示视频列表入口</div>
      <v-switch v-model="prefs.showPlaylist" color="primary" density="compact" hide-details/>
    </div>
    <div class="d-flex align-center py-1 mb-4">
      <div class="flex-grow-1 pr-4 text-body-2">显示更新时间</div>
      <v-switch v-model="prefs.showLastDownloadTime" color="primary" density="compact" hide-details/>
    </div>

    <div class="text-body-2 mb-2">启动页</div>
    <v-select v-model="prefs.startupPage" :items="startupItems" class="mb-4"
              hide-details item-title="title" item-value="value"/>

    <div class="d-flex align-center py-1 mb-4">
      <div class="flex-grow-1 pr-4">
        <div class="text-body-2">加载自定义 CSS / JS</div>
        <div class="text-caption text-medium-emphasis">
          读取下方「自定义 CSS / JS」框里的内容。为 ani-rss 自带界面写的样式在这里不生效（类名体系不同）。
          关闭后已执行过的 JS 需刷新页面才失效。
        </div>
      </div>
      <v-switch v-model="prefs.loadCustomAssets" color="primary" density="compact" hide-details/>
    </div>

    <v-divider class="mb-4"/>

    <SettingField v-for="f in serverFields" :key="f.key" :config="config" :def="f"/>
  </div>
</template>

<style scoped>
.color-input {
    width: 44px;
    height: 30px;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
}

/* 两条滑块的标签和读数各自定宽：滑轨才会上下对齐，数字从 5 跳到 15 时滑轨也不跟着抖 */
.wp-label {
    flex: 0 0 5em;
}

.wp-value {
    flex: 0 0 3.5em;
    text-align: right;
    font-variant-numeric: tabular-nums;
}
</style>
