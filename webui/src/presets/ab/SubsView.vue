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
 * Auto_Bangumi 的番剧墙。
 *
 * 和本仓库另外两种卡都不一样的地方，全在原版 ab-bangumi-card.vue 里量得到：
 *   · 海报是 5:7，不是常见的 2:3 —— 比标准海报略胖一点
 *   · 标题在**图外面**，图只管是图；字压在图上的那种是别家的做法
 *   · 悬停时整张图蒙一层暗色 + 模糊，正中间浮出一颗 44px 的圆按钮
 *   · 抬起只有 2px。AB 的层级是描边和底色给的，位移只用来确认「点得到」
 *
 * 触屏没有悬停，那颗圆按钮改成常驻 —— 不然手机上这张卡永远编辑不了。
 */
const s = useAniScreen()
const {mobile} = useDisplay()

const cover = (a: Ani) => (a.cover ? toApiFile(a.cover) : '')

/** 标签左边那颗 7×7 的小方点，颜色就是状态本身 */
const dot = (a: Ani) => (!a.enable ? 'rgb(var(--v-theme-secondary))' : a.ova ? 'rgb(var(--v-theme-warning))' : 'rgb(var(--v-theme-success))')
</script>

<template>
  <div class="pa-3 pa-lg-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>
      <!-- 次按钮是「填充灰」不是描边：AB 的 secondary 变体填 --color-surface-2 -->
      <v-btn :loading="s.ani.loading" :icon="mobile ? 'mdi-refresh' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-refresh'" :text="mobile ? undefined : '刷新全部'"
             color="surface-variant" title="刷新全部" @click="s.ani.refreshAll()"/>
      <v-btn :icon="mobile ? 'mdi-package-variant-closed' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-package-variant-closed'" :text="mobile ? undefined : '合集'"
             color="surface-variant" title="合集下载" @click="s.collecting.value = true"/>
      <v-btn :icon="mobile ? 'mdi-file-import-outline' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-file-import-outline'" :text="mobile ? undefined : '导入'"
             color="surface-variant" title="导入订阅" @click="s.importing.value = true"/>
      <AniFilterBar/>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :icon="mobile ? (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline') : undefined"
             :prepend-icon="mobile ? undefined : (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline')"
             :text="mobile ? undefined : (s.selectMode.value ? '退出多选' : '多选')"
             color="surface-variant" title="多选" @click="s.toggleSelectMode()"/>
    </div>

    <AniBatchBar :s="s" rounded="md"/>

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
          <div v-if="w.label" class="d-flex align-center ga-2 mb-3">
            <h3 class="sec-title">{{ w.label }}</h3>
            <span class="sec-count">{{ w.items.length }}</span>
          </div>

          <div class="wall">
            <div v-for="(a, i) in w.items" :key="a.id" :class="{'is-off': !a.enable, 'is-touch': isTouch}"
                 :style="{'--i': i}" class="ab-card ani-in" @click="s.selectMode.value && s.on.toggle(a)">
              <div class="art cover-hit" @click.stop="s.on.coverClick(a)">
                <v-img :alt="a.title" :src="cover(a)" aspect-ratio="0.714" cover>
                  <template #placeholder>
                    <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                      <v-icon class="text-medium-emphasis" icon="mdi-image-outline" size="28"/>
                    </div>
                  </template>
                  <template #error>
                    <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                      <v-icon class="text-medium-emphasis" icon="mdi-image-broken-variant" size="28"/>
                    </div>
                  </template>
                </v-img>

                <!-- 悬停蒙层：暗 + 模糊，正中一颗圆按钮。触屏这层不出现，见样式里的 .is-touch -->
                <div class="veil">
                  <v-btn class="round" color="primary" icon="mdi-pencil" size="44"
                         title="编辑" @click.stop="s.on.edit(a)"/>
                </div>

                <!-- 动作菜单挂右上角。触屏常驻，鼠标下跟着蒙层一起出现 -->
                <v-menu>
                  <template #activator="{props}">
                    <!-- 触屏撑到 40：手指够不着 28px 的热区，test:mobile 量的就是这个 -->
                    <v-btn v-bind="props" :size="isTouch ? 40 : 28" class="more" icon="mdi-dots-horizontal"
                           title="更多" variant="flat" @click.stop/>
                  </template>
                  <v-list density="comfortable" min-width="176">
                    <v-list-item v-for="act in aniActions(s, a)" :key="act.key"
                                 :base-color="act.danger ? 'error' : undefined" :prepend-icon="act.icon"
                                 :title="act.title" @click="act.run()"/>
                  </v-list>
                </v-menu>

                <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                            class="pick" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

                <span v-if="s.prefs.showScore && a.score" class="score">{{ a.score.toFixed(1) }}</span>
              </div>

              <div :title="a.title" class="name" @click.stop="s.on.edit(a)">{{ a.title }}</div>

              <div class="tags">
                <span class="tag"><i :style="{background: dot(a)}"/>{{ a.enable ? (a.ova ? 'OVA' : 'TV') : '停用' }}</span>
                <span class="tag ellipsis">{{ a.subgroup || '未知字幕组' }}</span>
              </div>

              <div class="sub">
                {{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}
                <template v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                  · {{ fromNow(a.lastDownloadTime) }}
                </template>
              </div>
            </div>
          </div>
        </section>
      </template>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.sec-title {
    font-size: 1rem;
    font-weight: 600;
}

.sec-count {
    font-size: .75rem;
    padding: 1px 7px;
    border-radius: 999px;
    background: rgb(var(--v-theme-surface-variant));
}

/*
 * 三档栅格照抄原版 bangumi.vue：120/12 → 140/16 → 150/20。
 * 卡片本身在原版是定宽 150px，这里用 auto-fill + minmax —— 定宽在超宽屏上会把
 * 一整排卡片挤在左边留出半屏空白，minmax 让它们均分，视觉宽度还是 150 上下。
 */
.wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    /* 抬起 2px 会超出网格上沿，留一点余量免得被父级裁掉 */
    padding: 4px 2px;
    margin: -4px -2px;
}

@media (min-width: 640px) {
    .wall {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 16px;
    }
}

@media (min-width: 1024px) {
    .wall {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 20px;
    }
}

/* 超宽屏封顶：不封的话 auto-fill 会把 150px 的卡拉到 300px，海报糊得很明显 */
@media (min-width: 1920px) {
    .wall {
        grid-template-columns: repeat(auto-fill, minmax(150px, 190px));
        justify-content: center;
    }
}

.ab-card {
    cursor: pointer;
    transition: transform var(--m-dur) var(--m-ease);
}

.ab-card:hover {
    transform: translateY(-2px);
}

.is-off {
    opacity: .55;
}

.art {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -2px rgba(0, 0, 0, .1);
    transition: box-shadow var(--m-dur) var(--m-ease);
}

.ab-card:hover .art {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, .1), 0 4px 6px -4px rgba(0, 0, 0, .1);
}

.veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, .45);
    backdrop-filter: blur(2px);
    opacity: 0;
    transition: opacity var(--m-dur) var(--m-ease);
}

.round {
    box-shadow: none;
}

.more {
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(15, 23, 42, .55) !important;
    color: #fff;
    opacity: 0;
    transition: opacity var(--m-dur) var(--m-ease);
}

/*
 * 触屏一律不做悬停：蒙层不出现，「更多」常驻（这时候编辑走标题或那颗菜单）。
 *
 * 判断交给 isTouch 而不是写一对 @media (hover)：仓库里 AniPosterCard 已经栽过一次 ——
 * CSS 藏掉的按钮 JS 并不知道，菜单按「一颗没藏」算，手机上那张卡就再也编辑不了。
 * 一个来源，模板和样式说的是同一件事。
 */
.ab-card:not(.is-touch):hover .veil,
.ab-card:not(.is-touch):hover .more {
    opacity: 1;
}

.ab-card.is-touch .more {
    opacity: 1;
}

.pick {
    position: absolute;
    top: 0;
    left: 2px;
}

.score {
    position: absolute;
    left: 6px;
    bottom: 6px;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: .7rem;
    font-weight: 600;
    color: #fff;
    background: rgba(15, 23, 42, .62);
}

.name {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    /* 一行和两行的卡不能一高一矮，否则整排底边参差不齐 */
    min-height: 2.7em;
}

/* ab-tag：透明底、1px 描边、4px 圆角，左边一颗 7×7 的方点 —— 颜色在点上，不在字上 */
.tags {
    display: flex;
    gap: 4px;
    margin-top: 4px;
    min-width: 0;
}

.tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: 0 1 auto;
    min-width: 0;
    padding: 1px 6px;
    border: 1px solid rgba(var(--v-theme-on-surface), .14);
    border-radius: 4px;
    font-size: 11px;
    line-height: 1.5;
}

.tag > i {
    flex: 0 0 auto;
    width: 7px;
    height: 7px;
    border-radius: 2px;
}

.ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sub {
    margin-top: 4px;
    font-size: 11px;
    opacity: .7;
    font-variant-numeric: tabular-nums;
}
</style>
