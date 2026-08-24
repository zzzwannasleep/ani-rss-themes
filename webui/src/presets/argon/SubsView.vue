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
 * Argon 的订阅页 = 博客的文章列表：一列宽卡，一张一条，鼠标一过整张浮起来。
 *
 * 刻意不做成网格。海报墙那两款（二次元、Material）已经把「一屏看很多张脸」这件事做了，
 * 这一款走的是另一条路：一行只有一条，但这一条把字幕组、集数、更新时间、标签全摊开，
 * 不用点进去也不用悬停就能看全 —— 博客列表的信息密度就在于此。
 */
const s = useAniScreen()
const {xs} = useDisplay()

const cover = (c?: string) => (c ? toApiFile(c) : '')

/**
 * 图标行上摆得下几颗。
 *
 * ⚠️ 摆不下的时候只能改这个数，不要用 CSS 把多出来的按钮 display: none ——
 * 「更多」菜单里放哪些是按这个数算出来的（见 aniActions.ts 的注释），
 * CSS 藏掉的那颗不会自动补进菜单，它是从界面上彻底消失。
 *
 * 手机上卡片本来就窄，留 2 颗 + 「更多」；平板等触屏没有 hover，图标行必须常驻，
 * 留 3 颗；桌面端全铺，反正一行有的是地方。
 */
const room = computed(() => (xs.value ? 2 : isTouch.value ? 3 : Infinity))

/** 刮削名和日文名经常就等于标题，原样显示会一行重复两遍，只在真不一样时才给 */
const alt = (a: Ani) => [a.themoviedbName, a.jpTitle].find(v => v && v !== a.title) || ''
</script>

<template>
  <div class="ag-wrap py-5">
    <!-- ── 工具条 ── -->
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>

      <!--
        文字用 :text 传，不要写成 <template v-if="!xs">…</template>。
        VBtn 是「有默认插槽就不画 icon」—— 插槽只要存在（哪怕 v-if 让它渲染成空），
        icon 那一支就不走了，窄屏上得到的是一颗空按钮：有底色、能点、里面什么都没有。
      -->
      <v-btn :icon="xs ? 'mdi-refresh' : undefined" :loading="s.ani.loading"
             :prepend-icon="xs ? undefined : 'mdi-refresh'" :text="xs ? undefined : '刷新全部'"
             title="刷新全部" variant="tonal" @click="s.ani.refreshAll()"/>
      <v-btn :icon="xs ? 'mdi-package-variant-closed' : undefined"
             :prepend-icon="xs ? undefined : 'mdi-package-variant-closed'" :text="xs ? undefined : '合集'"
             title="合集下载" variant="tonal" @click="s.collecting.value = true"/>
      <v-btn :icon="xs ? 'mdi-file-import-outline' : undefined"
             :prepend-icon="xs ? undefined : 'mdi-file-import-outline'" :text="xs ? undefined : '导入'"
             title="导入订阅" variant="tonal" @click="s.importing.value = true"/>

      <AniFilterBar/>
      <v-spacer/>

      <v-btn :active="s.selectMode.value"
             :icon="xs ? (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline') : undefined"
             :prepend-icon="xs ? undefined : (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline')"
             :text="xs ? undefined : (s.selectMode.value ? '退出多选' : '多选')"
             title="多选" variant="tonal" @click="s.toggleSelectMode()"/>
    </div>

    <AniBatchBar :s="s"/>

    <div class="d-flex align-center ga-2 mb-4 count">
      <b>{{ s.ani.filtered.length }}</b> 条订阅 · {{ s.ani.enabledCount }} 启用
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

    <div v-if="s.ani.loading && !s.ani.all.length" class="d-flex flex-column ga-4">
      <AniSkeleton :count="6" shape="wide"/>
    </div>

    <template v-else>
      <v-progress-linear v-if="s.ani.loading" class="mb-3" indeterminate rounded/>

      <v-empty-state
          v-if="!s.ani.filtered.length"
          :text="s.ani.filtering ? '换个关键词或放宽筛选条件试试，搜索支持拼音和首字母' : '还没有订阅'"
          :title="s.ani.filtering ? '没有匹配的订阅' : '空空如也'"
          icon="mdi-television-off"
      />

      <template v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                v-else :key="w.label">
        <h2 v-if="w.label" class="sec-title">{{ w.label }}</h2>

        <div class="d-flex flex-column ga-4 mb-6">
          <v-card v-for="(a, i) in w.items" :key="a.id" :class="{picked: !!a.id && s.ani.selected.has(a.id)}"
                  :style="{'--i': i}" class="post ani-in ani-lift"
                  @click="s.selectMode.value && s.on.toggle(a)">
            <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                        class="flex-grow-0" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

            <div class="post-thumb">
              <v-img :src="cover(a.cover)" aspect-ratio="0.7" cover>
                <template #placeholder>
                  <div class="fill-height d-flex align-center justify-center bg-surface-variant">
                    <v-icon icon="mdi-image-outline"/>
                  </div>
                </template>
              </v-img>
            </div>

            <div class="post-body min0">
              <div class="d-flex align-center ga-2 min0">
                <a class="post-title" @click.stop="s.on.edit(a)">{{ a.title }}</a>
                <span v-if="!a.enable" class="tag">停用</span>
                <span v-if="a.ova" class="tag">OVA</span>
              </div>

              <div v-if="alt(a)" class="post-alt">{{ alt(a) }}</div>

              <!-- 这一行要能换行：五段信息在 360px 上排不下一行，
                   硬写 nowrap 会把后面几段推出可视区（看不见，也没有横滚条） -->
              <div class="post-meta">
                <span class="ellipsis">{{ a.subgroup || '未知字幕组' }}</span>
                <span>第 {{ a.season ?? 1 }} 季</span>
                <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                <span v-if="s.prefs.showScore && a.score" class="d-inline-flex align-center">
                  <v-icon icon="mdi-star" size="13"/>&nbsp;{{ a.score.toFixed(1) }}
                </span>
                <span v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                  更新于 {{ fromNow(a.lastDownloadTime) }}
                </span>
              </div>

              <div class="acts">
                <v-btn v-for="act in compactOf(aniActions(s, a), room)" :key="act.key" :icon="act.icon"
                       :title="act.title" density="comfortable" size="small" variant="text"
                       @click.stop="act.run()"/>
                <v-menu location="bottom end">
                  <template #activator="{isActive, props: menu}">
                    <v-btn v-bind="menu" :icon="isActive ? 'mdi-chevron-up' : 'mdi-dots-horizontal'"
                           :title="isActive ? '收起' : '展开操作'" density="comfortable" size="small"
                           variant="text" @click.stop/>
                  </template>
                  <v-list density="comfortable" min-width="184">
                    <v-list-item v-for="act in overflowOf(aniActions(s, a), room)" :key="act.key"
                                 :base-color="act.danger ? 'error' : undefined" :prepend-icon="act.icon"
                                 :title="act.title" @click="act.run()"/>
                  </v-list>
                </v-menu>
              </div>
            </div>
          </v-card>
        </div>
      </template>
    </template>

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

.count {
    font-size: .88rem;
    opacity: .8;
}

.sec-title {
    font-size: 1.05rem;
    font-weight: 700;
    padding-left: 12px;
    margin-bottom: 14px;
    border-left: 4px solid rgb(var(--v-theme-primary));
    line-height: 1.3;
}

.post {
    display: flex;
    align-items: stretch;
    gap: 16px;
    padding: 14px;
    overflow: hidden;
}

/* 多选选中：整张卡换一圈主色边，不改底色 —— 底色一变，封面和字的对比度全跟着变 */
.post.picked {
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary)) inset;
}

.post-thumb {
    flex: 0 0 88px;
    align-self: flex-start;
    border-radius: 12px;
    overflow: hidden;
}

@media (max-width: 599.98px) {
    .post-thumb {
        flex-basis: 66px;
    }
}

.post-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.post-title {
    flex: 0 1 auto;
    min-width: 0;
    font-size: 1.02rem;
    font-weight: 700;
    line-height: 1.35;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.post-title:hover {
    color: rgb(var(--v-theme-primary));
}

.post-alt {
    font-size: .8rem;
    opacity: .66;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.post-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: .8rem;
    opacity: .74;
    min-width: 0;
}

.post-meta > span {
    max-width: 100%;
}

/* Argon 的小标签是灰底胶囊，没有边框 */
.tag {
    flex: 0 0 auto;
    padding: 1px 9px;
    border-radius: 999px;
    background: rgba(var(--v-theme-on-surface), .09);
    font-size: .7rem;
    line-height: 1.7;
}

/*
 * 动作行摆在卡片右下。用 margin-left: auto 顶到右边而不是 justify-content：
 * 窄屏上它要能换行到自己一整行，justify-content 会让换行后的那排也贴右，
 * 和上面左对齐的信息行错开一大截。
 */
.acts {
    display: flex;
    flex-wrap: wrap;
    /* 8px：4px 时几颗图标按钮的水波纹和悬停底色是连着的，一排看着是一根长条。
       8px 是 M3 的最小档，也是版式体检量的那一条 */
    gap: 8px;
    margin-top: 2px;
    margin-left: auto;
}
</style>
