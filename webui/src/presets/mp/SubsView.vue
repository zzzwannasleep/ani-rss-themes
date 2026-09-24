<script setup lang="ts">
import type {Ani} from '@shared/types'
import {useDisplay} from 'vuetify'
import {toApiFile} from '@shared/http'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'
import AniFilterBar from '@/components/ani/AniFilterBar.vue'
import {aniActions, isTouch} from '@/components/ani/aniActions'

/**
 * MoviePilot 的媒体墙。
 *
 * 照 MediaCard.vue 来的三件事：
 *   · 海报 2:3（不是 0.7），卡片 12px 圆角，一列最窄 9rem = 144px
 *   · 类型角标压左上、评分压右上，都是 elevated 的小 chip
 *   · 悬停时整张图罩一层从 40% 到 90% 的深灰紫渐变，标题和简介浮在上面，卡片抬 4px
 *
 * 触屏没有悬停（isTouch），所以底部那条渐变常驻、标题一直在 —— 不然手机上这一屏
 * 全是没有名字的海报，认不出哪张是哪部。
 */
const s = useAniScreen()
const {mobile} = useDisplay()

const cover = (a: Ani) => (a.cover ? toApiFile(a.cover) : '')
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn prepend-icon="mdi-plus" variant="flat" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" :icon="mobile ? 'mdi-refresh' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-refresh'" :text="mobile ? undefined : '刷新全部'"
             title="刷新全部" variant="tonal" @click="s.ani.refreshAll()"/>
      <v-btn :icon="mobile ? 'mdi-package-variant-closed' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-package-variant-closed'" :text="mobile ? undefined : '合集'"
             title="合集下载" variant="tonal" @click="s.collecting.value = true"/>
      <v-btn :icon="mobile ? 'mdi-file-import-outline' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-file-import-outline'" :text="mobile ? undefined : '导入'"
             title="导入订阅" variant="tonal" @click="s.importing.value = true"/>
      <AniFilterBar/>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :icon="mobile ? (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline') : undefined"
             :prepend-icon="mobile ? undefined : (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline')"
             :text="mobile ? undefined : (s.selectMode.value ? '退出多选' : '多选')"
             title="多选" variant="tonal" @click="s.toggleSelectMode()"/>
    </div>

    <AniBatchBar :s="s" rounded="lg"/>

    <div v-if="s.ani.loading && !s.ani.all.length" class="wall">
      <AniSkeleton :count="12" shape="poster"/>
    </div>

    <template v-else>
      <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate rounded/>

      <v-empty-state
          v-if="!s.ani.filtered.length"
          :text="s.ani.filtering ? '换个关键词或放宽筛选条件试试，搜索支持拼音和首字母' : '还没有订阅，点上面添加一个'"
          :title="s.ani.filtering ? '没有匹配的订阅' : '空空如也'"
          icon="mdi-television-off"
      />

      <template v-else>
        <section v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                 :key="w.label" class="mb-6">
          <h3 v-if="w.label" class="sec mb-3">
            {{ w.label }}
            <span class="sec-count">{{ w.items.length }}</span>
          </h3>

          <div class="wall">
            <v-card v-for="(a, i) in w.items" :key="a.id" :class="{'is-off': !a.enable, 'is-touch': isTouch}"
                    :style="{'--i': i}" class="mp-card ani-in cover-hit" rounded="lg"
                    @click="s.on.coverClick(a)">
              <v-img :alt="a.title" :src="cover(a)" aspect-ratio="0.667" cover>
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                    <v-icon class="text-medium-emphasis" icon="mdi-television-classic" size="40"/>
                  </div>
                </template>
                <template #error>
                  <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                    <v-icon class="text-medium-emphasis" icon="mdi-image-broken-variant" size="40"/>
                  </div>
                </template>

                <v-chip class="badge left" size="small" variant="elevated">{{ a.ova ? 'OVA' : 'TV' }}</v-chip>
                <v-chip v-if="s.prefs.showScore && a.score" class="badge right" color="warning" size="small"
                        variant="elevated">
                  {{ a.score.toFixed(1) }}
                </v-chip>

                <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                            class="pick" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

                <!-- 渐变 + 文字。鼠标下平时藏起来、悬停才出；触屏常驻，见样式里的 .is-touch -->
                <div class="veil">
                  <div class="veil-in">
                    <div :title="a.title" class="name">{{ a.title }}</div>
                    <div class="sub">
                      {{ a.subgroup || '未知字幕组' }} · {{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}
                    </div>
                    <div v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime" class="sub">
                      {{ fromNow(a.lastDownloadTime) }}
                    </div>
                    <div v-if="!a.enable" class="sub off">已停用</div>
                  </div>
                </div>

                <v-menu>
                  <template #activator="{props}">
                    <!-- 触屏撑到 40：手指够不着 30px 的热区，test:mobile 量的就是这个 -->
                    <v-btn v-bind="props" :size="isTouch ? 40 : 30" class="more" icon="mdi-dots-vertical"
                           title="更多" variant="flat" @click.stop/>
                  </template>
                  <v-list density="comfortable" min-width="176">
                    <v-list-item v-for="act in aniActions(s, a)" :key="act.key"
                                 :base-color="act.danger ? 'error' : undefined" :prepend-icon="act.icon"
                                 :title="act.title" @click="act.run()"/>
                  </v-list>
                </v-menu>
              </v-img>
            </v-card>
          </div>
        </section>
      </template>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.sec {
    font-size: 1.05rem;
    font-weight: 500;
}

.sec-count {
    font-size: .75rem;
    opacity: .6;
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
}

/* 原版 .grid-media-card：repeat(auto-fill, minmax(9rem, 1fr)) */
.wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(144px, 1fr));
    gap: 16px;
    /* 抬起 4px 会超出网格上沿，留一点余量免得被裁掉 */
    padding: 6px 2px;
    margin: -6px -2px;
}

@media (min-width: 1920px) {
    .wall {
        grid-template-columns: repeat(auto-fill, minmax(144px, 200px));
        justify-content: center;
    }
}

.mp-card {
    cursor: pointer;
    overflow: hidden;
    transition: transform .3s ease, box-shadow .3s ease;
}

.mp-card:hover {
    transform: translate3d(0, -4px, 0);
    box-shadow: var(--mp-elev-3);
}

.is-off {
    opacity: .6;
}

.badge {
    position: absolute;
    top: 8px;
    font-weight: 600;
}

.badge.left {
    left: 8px;
}

.badge.right {
    right: 8px;
}

.pick {
    position: absolute;
    top: 34px;
    left: 2px;
}

.more {
    position: absolute;
    right: 6px;
    bottom: 6px;
    background: rgba(45, 55, 72, .72) !important;
    color: #fff;
    opacity: 0;
    transition: opacity var(--m-dur) var(--m-ease);
    z-index: 1;
}

/* 原版的遮罩：rgba(45,55,72,.4) → rgba(45,55,72,.9)，自上而下 */
.veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    background: linear-gradient(rgba(45, 55, 72, .4) 0%, rgba(45, 55, 72, .9) 100%);
    opacity: 0;
    transition: opacity .3s ease;
}

.veil-in {
    padding: 10px 10px 12px;
    color: #fff;
}

.name {
    font-size: 1.125rem;
    line-height: 1.25rem;
    font-weight: 500;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.sub {
    margin-top: 4px;
    font-size: .875rem;
    line-height: 1rem;
    opacity: .85;
}

.off {
    color: rgb(var(--v-theme-error));
    opacity: 1;
}

.mp-card:not(.is-touch):hover .veil,
.mp-card:not(.is-touch):hover .more {
    opacity: 1;
}

/*
 * 触屏：遮罩常驻但只留下半截（顶上透明），标题一直看得见 ——
 * 全罩着的话海报等于白放了一张，一屏都不留名字又认不出是哪部。
 *
 * 用 isTouch 这一个来源，不写 @media (hover: none)：带触屏的笔记本两边都命中，
 * 而且 CSS 藏起来的东西 JS 是不知道的（AniPosterCard 那次就是这么把编辑入口弄丢的）。
 */
.mp-card.is-touch .veil {
    opacity: 1;
    background: linear-gradient(rgba(45, 55, 72, 0) 30%, rgba(45, 55, 72, .9) 100%);
}

.mp-card.is-touch .more {
    opacity: 1;
}

.mp-card.is-touch .name {
    font-size: .9rem;
    line-height: 1.15rem;
    -webkit-line-clamp: 2;
    line-clamp: 2;
}

.mp-card.is-touch .sub {
    font-size: .72rem;
}
</style>
