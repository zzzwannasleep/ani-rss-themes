<script setup lang="ts">
import {computed} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import {aniActions, compactOf, isTouch, overflowOf} from '@/components/ani/aniActions'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'
import AniFilterBar from '@/components/ani/AniFilterBar.vue'

/**
 * 横躺的大玻璃板：左边一张海报，右边信息和操作。
 *
 * 不做海报墙是因为这套视觉的重点在「玻璃的边缘折射」——
 * 卡片越小边缘占比越高，一屏几十张小卡会糊成一片高光。宽板少而大，才看得出材质。
 *
 * 板子的反馈是「边缘高光变亮」而不是「抬起来投影」：后者是纸片的语言。
 */
const s = useAniScreen()

/* 一行摆得下几颗图标按钮；摆不下的自动进「更多」菜单，不要改用 CSS 藏 */
const {xs} = useDisplay()
const room = computed(() => (xs.value ? 1 : isTouch.value ? 2 : Infinity))

const cover = (a: Ani) => (a.cover ? toApiFile(a.cover) : '')
</script>

<template>
  <div class="lg-page">
    <div class="bar">
      <v-btn color="primary" prepend-icon="mdi-plus" rounded="pill" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" icon="mdi-refresh" title="刷新全部" variant="tonal"
             @click="s.ani.refreshAll()"/>
      <v-btn icon="mdi-package-variant-closed" title="合集下载" variant="tonal" @click="s.collecting.value = true"/>
      <v-btn icon="mdi-file-import-outline" title="导入订阅" variant="tonal" @click="s.importing.value = true"/>
      <AniFilterBar/>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
             title="多选" variant="tonal" @click="s.toggleSelectMode()"/>
    </div>

    <AniBatchBar :s="s" rounded="xl"/>

    <div v-if="s.ani.loading && !s.ani.all.length" class="card-column">
      <AniSkeleton :count="4" shape="wide"/>
    </div>

    <template v-else>
      <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate rounded/>

      <v-empty-state
          v-if="!s.ani.filtered.length"
          :text="s.ani.filtering ? '换个关键词或放宽筛选条件试试，搜索支持拼音和首字母' : '还没有订阅'"
          :title="s.ani.filtering ? '没有匹配的订阅' : '空空如也'"
          icon="mdi-television-off"
      />

      <template v-else>
        <template v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                  :key="w.label">
          <div v-if="w.label" class="group-head">
            <h2 class="group-title">{{ w.label }}</h2>
            <span class="group-count">{{ w.items.length }}</span>
          </div>

          <div class="card-column">
            <article v-for="(a, i) in w.items" :key="a.id"
                     :class="{'is-selected': !!a.id && s.ani.selected.has(a.id), 'is-off': !a.enable}"
                     :style="{'--i': i}" class="slab ani-in ani-lift"
                     @click="s.selectMode.value && s.on.toggle(a)">
              <!-- 必须给 aspect-ratio：v-img 在 flex 行里没有固有高度，只给 width 会塌成 0 高
                   （表现是海报那一栏整块空白，不报错） -->
              <v-img :src="cover(a)" aspect-ratio="0.7" class="poster cover-hit" cover width="104"
                     @click.stop="s.on.coverClick(a)">
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                    <v-icon icon="mdi-image-outline"/>
                  </div>
                </template>
              </v-img>

              <div class="body">
                <div class="d-flex align-start ga-3">
                  <div class="min0">
                    <h3 class="title">{{ a.title }}</h3>
                    <div class="sub">
                      {{ a.subgroup || '未知字幕组' }}
                      <template v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                        · {{ fromNow(a.lastDownloadTime) }}
                      </template>
                    </div>
                  </div>
                  <v-chip v-if="s.prefs.showScore && a.score" class="flex-grow-0" color="primary" size="small"
                          variant="flat" @click.stop="s.on.rate(a)">
                    {{ a.score.toFixed(1) }}
                  </v-chip>
                  <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                              class="flex-grow-0" density="compact" hide-details @click.stop="s.on.toggle(a)"/>
                </div>

                <!-- 玻璃板上不用 tonal chip：半透明底叠半透明 chip 等于没有对比度 -->
                <div class="tags">
                  <span class="tag">第 {{ a.season ?? 1 }} 季</span>
                  <span class="tag tag-hi">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                  <span class="tag">{{ a.ova ? 'OVA' : 'TV' }}</span>
                  <span v-if="!a.enable" class="tag">未启用</span>
                </div>

                <div class="acts">
                  <v-btn v-for="act in compactOf(aniActions(s, a), room)" :key="act.key" :icon="act.icon"
                         :title="act.title" density="comfortable" size="small" variant="text"
                         @click.stop="act.run()"/>
                  <v-spacer/>
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
            </article>
          </div>
        </template>
      </template>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.lg-page {
    padding: 16px;
    max-width: 1400px;
    margin: 0 auto;
}

@media (min-width: 960px) {
    .lg-page {
        padding: 24px;
    }
}

.bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 18px;
}

.min0 {
    flex: 1 1 auto;
    min-width: 0;
}

.group-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 28px 0 14px;
}

.group-title {
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -.01em;
}

.group-count {
    font-size: .8rem;
    opacity: .72;
    font-variant-numeric: tabular-nums;
}

/* 宽屏两列就够了：再多列板子就变窄，玻璃的边缘折射看不出来 */
.card-column {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    /* 悬停时边框提亮不产生位移，但 :active 会缩，留一点余量免得被裁 */
    padding: 4px 2px;
    margin: -4px -2px;
}

@media (min-width: 1100px) {
    .card-column {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 22px;
    }
}

/*
 * 一块玻璃板。
 * 内侧上下两道高光是折射边，外阴影负责把它从背景里抬起来 ——
 * 只写内阴影的话板子看着是「陷进去」的，和「浮在渐变上」正好相反。
 */
.slab {
    display: flex;
    overflow: hidden;
    border-radius: 24px;
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, .66));
    backdrop-filter: blur(var(--ani-panel-blur, 22px)) saturate(1.35);
    -webkit-backdrop-filter: blur(var(--ani-panel-blur, 22px)) saturate(1.35);
    border: 1px solid rgba(255, 255, 255, .3);
    border-top-color: rgba(255, 255, 255, .5);
    box-shadow: 0 14px 40px rgba(0, 0, 0, .2),
    inset 0 1px 0 rgba(255, 255, 255, .45),
    inset 0 -1px 0 rgba(255, 255, 255, .12);
    cursor: default;
}

/* 选中用外圈：板子 overflow:hidden，内描边会被 24px 的圆角切掉四个角 */
.is-selected {
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary)),
    0 14px 40px rgba(var(--v-theme-primary), .3);
}

.is-off {
    opacity: .72;
}

.poster {
    flex: 0 0 104px;
    align-self: stretch;
}

.body {
    flex: 1 1 auto;
    min-width: 0;
    padding: 16px 18px 8px;
}

.title {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.32;
    letter-spacing: -.01em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.sub {
    font-size: .78rem;
    opacity: .72;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
}

.tag {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: .7rem;
    line-height: 1.5;
    background: rgba(255, 255, 255, .16);
    border: 1px solid rgba(255, 255, 255, .24);
    white-space: nowrap;
}

.tag-hi {
    background: rgba(var(--v-theme-primary), .26);
    border-color: rgba(var(--v-theme-primary), .4);
}

.acts {
    display: flex;
    align-items: center;
    /* 图标按钮本身没有边框，缝隙就是它们之间唯一的分界。
       4px 还是不够 —— 水波纹和悬停底色一铺就连成一片。8px 是 M3 的最小档，
       也是版式体检量的那一条 */
    gap: 8px;
    margin-top: 10px;
}

@media (max-width: 599px) {
    .poster {
        flex-basis: 84px;
    }

    .body {
        padding: 12px 12px 6px;
    }
}
</style>
