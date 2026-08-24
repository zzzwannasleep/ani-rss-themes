<script setup lang="ts">
import type {Ani} from '@shared/types'
import {useDisplay} from 'vuetify'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import {aniActions, compactOf, overflowOf} from '@/components/ani/aniActions'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'
import AniFilterBar from '@/components/ani/AniFilterBar.vue'

/**
 * 仓库清单的排法：一张带边框的容器，顶部一条筛选栏，里面全是等高的行。
 * 没有封面图 —— GitHub 的清单靠文字密度取胜，塞海报就变味了。
 *
 * 也几乎没有动效：Primer 的层级来自 1px 边框和底色，不来自位移和阴影。
 * 除了 win98（那一款一帧动画都没有），这是最安静的一款，切过来应该能立刻感觉到区别。
 */
const s = useAniScreen()
const {mobile} = useDisplay()

/** 状态点的颜色，对应 GitHub 的语言色点 */
const dot = (a: Ani) => (!a.enable ? '#6e7681' : a.ova ? '#a371f7' : '#3fb950')

/**
 * 副标题。刮削名和日文名经常就等于标题本身，原样显示会一行重复两遍，
 * 看着像渲染坏了 —— 只在真的不一样时才给这一行。
 */
const desc = (a: Ani) => [a.themoviedbName, a.jpTitle].find(v => v && v !== a.title) || ''

</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="success" prepend-icon="mdi-plus" variant="flat" @click="s.adding.value = true">添加订阅</v-btn>
      <!--
        文字用 :text 传，不要写成 <template v-if="!mobile">…</template>。
        VBtn 是「有默认插槽就不画 icon」——插槽只要存在（哪怕 v-if 让它渲染成空）
        icon 那一支就不走了，窄屏上得到的是一颗空按钮：有边框、能点、里面什么都没有。
      -->
      <v-btn :loading="s.ani.loading" :icon="mobile ? 'mdi-refresh' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-refresh'" :text="mobile ? undefined : '刷新全部'"
             title="刷新全部" variant="outlined" @click="s.ani.refreshAll()"/>
      <v-btn :icon="mobile ? 'mdi-package-variant-closed' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-package-variant-closed'" :text="mobile ? undefined : '合集'"
             title="合集下载" variant="outlined" @click="s.collecting.value = true"/>
      <v-btn :icon="mobile ? 'mdi-file-import-outline' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-file-import-outline'" :text="mobile ? undefined : '导入'"
             title="导入订阅" variant="outlined" @click="s.importing.value = true"/>
      <AniFilterBar/>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :icon="mobile ? (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline') : undefined"
             :prepend-icon="mobile ? undefined : (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline')"
             :text="mobile ? undefined : (s.selectMode.value ? '退出多选' : '多选')"
             title="多选" variant="outlined" @click="s.toggleSelectMode()"/>
    </div>

    <AniBatchBar :s="s" rounded="md" variant="outlined"/>

    <v-card>
      <!-- 清单头：GitHub 那条灰底的 filter bar -->
      <div class="list-head">
        <span class="text-body-2 min0 ellipsis">
          <strong>{{ s.ani.filtered.length }}</strong> 条订阅 ·
          {{ s.ani.enabledCount }} 启用
        </span>
        <v-spacer/>
        <!-- 不用 v-btn-toggle：无边框的两颗按钮被它拼成一条，涟漪和悬停底色连成一片，
             看上去是一根长条而不是两颗按钮。拆成两颗独立的，之间 8px。 -->
        <div class="d-flex flex-grow-0 ga-2">
          <v-btn v-for="w in [{v: true, t: '按星期'}, {v: false, t: '平铺'}]" :key="String(w.v)"
                 :color="s.prefs.showWeek === w.v ? 'primary' : undefined" density="compact" size="small"
                 :variant="s.prefs.showWeek === w.v ? 'tonal' : 'text'" @click="s.prefs.showWeek = w.v">
            {{ w.t }}
          </v-btn>
        </div>
      </div>

      <div v-if="s.ani.loading && !s.ani.all.length" class="px-4">
        <AniSkeleton :count="8" shape="row"/>
      </div>

      <template v-else>
        <v-progress-linear v-if="s.ani.loading" indeterminate/>

        <v-empty-state
            v-if="!s.ani.filtered.length"
            :text="s.ani.filtering ? '换个关键词或放宽筛选条件试试，搜索支持拼音和首字母' : '还没有订阅'"
            :title="s.ani.filtering ? '没有匹配的订阅' : '空空如也'"
            icon="mdi-television-off"
        />

        <template v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                  v-else :key="w.label">
          <div v-if="w.label" class="week-head">{{ w.label }}</div>
          <div v-for="a in w.items" :key="a.id" class="gh-row"
               @click="s.selectMode.value && s.on.toggle(a)">
            <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                        class="flex-grow-0 mr-2" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

            <div class="min0">
              <!-- 这一层也要 min-width:0：flex 子项的默认 min-width 是 auto，
                   不改的话内层再怎么写 ellipsis 都不会生效，长标题直接把整行撑宽 -->
              <div class="d-flex align-center ga-2 min0">
                <a class="repo-title" @click.stop="s.on.edit(a)">{{ a.title }}</a>
                <span v-if="!a.enable" class="pill">停用</span>
                <span v-if="a.standbyRssList?.length" class="pill pill-info">备用 RSS</span>
              </div>

              <div v-if="desc(a)" class="desc">{{ desc(a) }}</div>

              <!-- 这一行是要换行的：五段信息在窄屏排不下一行，
                   硬写 nowrap 会把后面几段推出可视区（看不见也没有横滚条） -->
              <div class="sub">
                <span class="d-inline-flex align-center">
                  <span :style="{background: dot(a)}" class="dot"/>
                  {{ a.ova ? 'OVA' : 'TV' }} · 第 {{ a.season ?? 1 }} 季
                </span>
                <span class="ellipsis">{{ a.subgroup || '未知字幕组' }}</span>
                <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                <span v-if="s.prefs.showScore && a.score" class="d-inline-flex align-center">
                  <v-icon icon="mdi-star" size="12"/>&nbsp;{{ a.score.toFixed(1) }}
                </span>
                <span v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                  更新于 {{ fromNow(a.lastDownloadTime) }}
                </span>
              </div>
            </div>

            <!-- 窄屏时按钮全部收进菜单：Primer 的行动作本来就是「一颗更多」，
                 挤三颗按钮进 360px 的行里会把标题压没 -->
            <div class="d-flex flex-grow-0 ga-2">
              <template v-if="!mobile">
                <v-btn v-for="act in compactOf(aniActions(s, a))" :key="act.key" :prepend-icon="act.icon"
                       size="small" variant="outlined" @click.stop="act.run()">{{ act.title }}
                </v-btn>
              </template>
              <v-menu>
                <template #activator="{isActive, props}">
                  <v-btn v-bind="props" :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                         :title="isActive ? '收起' : '展开操作'" size="small" variant="outlined" @click.stop/>
                </template>
                <v-list density="comfortable" min-width="180">
                  <v-list-item v-for="act in (mobile ? aniActions(s, a) : overflowOf(aniActions(s, a)))"
                               :key="act.key" :base-color="act.danger ? 'error' : undefined"
                               :prepend-icon="act.icon" :title="act.title" @click="act.run()"/>
                </v-list>
              </v-menu>
            </div>
          </div>
        </template>
      </template>
    </v-card>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
/* flex 子项的默认 min-width 是 auto，不清零的话内部的 ellipsis 一律失效 */
.min0 {
    flex: 1 1 auto;
    min-width: 0;
}

.ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.list-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(var(--v-theme-on-surface), .05);
    border-bottom: 1px solid rgba(128, 128, 128, .28);
}

/* 和 list-head 用同一种灰：两条横条挨着却是两个色，看着像没对齐 */
.week-head {
    padding: 6px 16px;
    font-size: .75rem;
    font-weight: 600;
    letter-spacing: .04em;
    opacity: .72;
    background: rgba(var(--v-theme-on-surface), .05);
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

.gh-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
    /* Primer 的反馈只有底色，没有位移也没有阴影 */
    transition: background-color var(--m-dur) var(--m-ease);
}

.gh-row:last-child {
    border-bottom: none;
}

.gh-row:hover {
    background: rgba(var(--v-theme-on-surface), .04);
}

.repo-title {
    flex: 0 1 auto;
    min-width: 0;
    font-size: 1rem;
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.repo-title:hover {
    text-decoration: underline;
}

/* Primer 的小标签：方角、细边、不填色 */
.pill {
    flex: 0 0 auto;
    padding: 0 7px;
    border-radius: 999px;
    font-size: .69rem;
    line-height: 1.7;
    border: 1px solid rgba(128, 128, 128, .4);
    opacity: .8;
}

.pill-info {
    color: rgb(var(--v-theme-info));
    border-color: rgba(var(--v-theme-info), .5);
    opacity: 1;
}

.desc {
    font-size: .8rem;
    opacity: .72;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sub {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: .78rem;
    opacity: .72;
    margin-top: 6px;
    min-width: 0;
}

.sub > span {
    max-width: 100%;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
    display: inline-block;
}
</style>
