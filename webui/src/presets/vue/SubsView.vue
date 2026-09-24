<script setup lang="ts">
import {computed} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'
import AniFilterBar from '@/components/ani/AniFilterBar.vue'
import {aniActions, compactOf, isTouch, overflowOf} from '@/components/ani/aniActions'

/**
 * 文档式列表：一行一条，靠细线分栏，不用卡片也不用阴影。
 * 星期分组做成文档的小节标题（## 周一），信息密度介于表格和海报墙之间。
 *
 * 分组与不分组只写一遍：把「不分组」当成一个 label 为空的组，
 * 两份几乎一样的模板迟早会改歪一份（之前搜索态就少了季数和更新时间）。
 */
const s = useAniScreen()

/*
 * 一行里摆得下几颗图标按钮。
 *
 * 原来这是 CSS 干的：@media (max-width: 599px) 里把 .actions 的前两颗 display: none。
 * 前两颗正好是「视频列表」和「编辑」，而「更多」菜单是按「一颗没藏」算的 ——
 * 于是手机上这两个动作从界面上彻底消失，不是换了个地方，是点不到了。
 * 数目交给 JS，菜单才补得回来（见 aniActions 里 compactOf 上面那段）。
 */
const {xs} = useDisplay()
const room = computed(() => (xs.value ? 1 : isTouch.value ? 2 : Infinity))

const cover = (a: Ani) => (a.cover ? toApiFile(a.cover) : '')

/** 点标题跳 Bangumi，与卡片视图一致 */
function openBgm(a: Ani) {
  if (a.bgmUrl) return window.open(a.bgmUrl, '_blank', 'noopener')
  if (a.title) {
    const t = a.title.replace(/ ?\((19|20)\d{2}\)/g, '').replace(/ ?\[tmdbid=(\d+)]/g, '').trim()
    window.open(`https://bgm.tv/subject_search/${encodeURIComponent(t)}?cat=2`, '_blank', 'noopener')
  }
}
</script>

<template>
  <div class="doc-page">
    <header class="page-head">
      <h1 class="h1">订阅</h1>
      <span class="count">{{ s.ani.filtered.length }} 条</span>
      <AniFilterBar/>
      <v-spacer/>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" prepend-icon="mdi-refresh" variant="outlined"
             @click="s.ani.refreshAll()">刷新全部
      </v-btn>
      <v-menu>
        <template #activator="{props}">
          <v-btn v-bind="props" icon="mdi-dots-horizontal" variant="text"/>
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-package-variant-closed" title="合集下载"
                       @click="s.collecting.value = true"/>
          <v-list-item prepend-icon="mdi-file-import-outline" title="导入订阅"
                       @click="s.importing.value = true"/>
          <v-list-item :prepend-icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
                       :title="s.selectMode.value ? '退出多选' : '多选'"
                       @click="s.toggleSelectMode()"/>
        </v-list>
      </v-menu>
    </header>

    <AniBatchBar :s="s" rounded="lg" variant="outlined"/>

    <div v-if="s.ani.loading && !s.ani.all.length">
      <AniSkeleton :count="8" shape="row"/>
    </div>

    <template v-else>
      <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate/>

      <v-empty-state
          v-if="!s.ani.filtered.length"
          :text="s.ani.filtering ? '换个关键词或放宽筛选条件试试，搜索支持拼音和首字母' : '还没有订阅，点右上角添加一个'"
          :title="s.ani.filtering ? '没有匹配的订阅' : '空空如也'"
          icon="mdi-television-off"
      />

      <!-- 搜索时不分组：结果再按星期切碎反而难找，所以 grouped 为 false 时只有一个空标题的组 -->
      <section v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
               v-else :key="w.label" class="section">
        <h2 v-if="w.label" class="h2">
          {{ w.label }}
          <span class="count">{{ w.items.length }}</span>
        </h2>

        <div class="rows">
          <div v-for="(a, i) in w.items" :key="a.id" :style="{'--i': i}" class="row ani-in"
               @click="s.selectMode.value && s.on.toggle(a)">
            <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                        class="flex-grow-0" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

            <v-img :src="cover(a)" aspect-ratio="0.7" class="thumb cover-hit" cover width="40"
                   @click.stop="s.on.coverClick(a)"/>

            <div class="min0">
              <div class="title" @click.stop="openBgm(a)">{{ a.title }}</div>
              <div class="meta">
                <span class="meta-i">{{ a.subgroup || '未知字幕组' }}</span>
                <span class="sep">·</span>
                <span class="meta-i">第 {{ a.season ?? 1 }} 季</span>
                <span class="sep">·</span>
                <span class="meta-i">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                <template v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                  <span class="sep hide-sm">·</span>
                  <span class="meta-i hide-sm">{{ fromNow(a.lastDownloadTime) }}</span>
                </template>
              </div>
            </div>

            <span v-if="s.prefs.showScore && a.score" class="score" @click.stop="s.on.rate(a)">
              {{ a.score.toFixed(1) }}
            </span>
            <span v-if="!a.enable" class="off">停用</span>

            <div class="actions">
              <v-btn v-for="act in compactOf(aniActions(s, a), room)" :key="act.key" :icon="act.icon"
                     :title="act.title" density="comfortable" size="small" variant="text" @click.stop="act.run()"/>
              <v-menu location="bottom end">
                <template #activator="{isActive, props: menu}">
                  <v-btn v-bind="menu" :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                         :title="isActive ? '收起' : '展开操作'" density="comfortable" size="small"
                         variant="text" @click.stop/>
                </template>
                <v-list density="comfortable" min-width="180">
                  <v-list-item v-for="act in overflowOf(aniActions(s, a), room)" :key="act.key"
                               :base-color="act.danger ? 'error' : undefined" :prepend-icon="act.icon"
                               :title="act.title" @click="act.run()"/>
                </v-list>
              </v-menu>
            </div>
          </div>
        </div>
      </section>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.doc-page {
    padding: 24px 24px 64px;
}

@media (min-width: 960px) {
    .doc-page {
        padding: 40px 40px 72px;
    }
}

.page-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding-bottom: 18px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

.h1 {
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -.02em;
}

.h2 {
    font-size: 1.05rem;
    font-weight: 600;
    padding-bottom: 8px;
    margin-bottom: 2px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

.count {
    font-size: .8rem;
    opacity: .72;
    font-variant-numeric: tabular-nums;
}

.section {
    margin-top: 34px;
}

.min0 {
    flex: 1 1 auto;
    min-width: 0;
}

.rows {
    display: flex;
    flex-direction: column;
}

.row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 10px;
    border-bottom: 1px solid rgba(128, 128, 128, .14);
    /* 文档站不抬起、不投影，只换底色 —— 层级来自留白和细线 */
    transition: background-color var(--m-dur) var(--m-ease);
}

.row:hover {
    background: rgba(128, 128, 128, .07);
}

.thumb {
    flex: 0 0 40px;
    border-radius: 4px;
}

.title {
    font-weight: 500;
    font-size: .95rem;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.title:hover {
    color: rgb(var(--v-theme-primary));
    text-decoration: underline;
}

.meta {
    display: flex;
    gap: 6px;
    align-items: baseline;
    font-size: .78rem;
    opacity: .72;
    margin-top: 3px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}

.sep {
    flex: 0 0 auto;
}

/* 只让字幕组那一段被截断；集数和季数是短的，截了反而看不懂 */
.meta-i {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.score, .off {
    flex: 0 0 auto;
    padding: 1px 8px;
    border-radius: 20px;
    font-size: .74rem;
    border: 1px solid rgba(128, 128, 128, .32);
}

.score {
    cursor: pointer;
    color: rgb(var(--v-theme-primary));
    border-color: rgba(var(--v-theme-primary), .45);
    font-variant-numeric: tabular-nums;
}

.off {
    opacity: .72;
}

.actions {
    display: flex;
    flex: 0 0 auto;
    /* 图标按钮之间留缝：不留的话四颗 32px 的圆热区严丝合缝并排，
       看着是一条长条不是四颗按钮（test:mobile 里那条「按钮贴在一起」查的就是这个） */
    gap: 4px;
    opacity: 0;
    transition: opacity var(--m-dur) var(--m-ease);
}

.row:hover .actions,
.row:focus-within .actions {
    opacity: 1;
}

/* 触屏没有 hover，操作按钮必须一直显示 */
@media (hover: none) {
    .actions {
        opacity: 1;
    }
}

@media (max-width: 599px) {
    .hide-sm {
        display: none;
    }

    .row {
        gap: 10px;
        padding: 10px 4px;
    }

}
</style>
