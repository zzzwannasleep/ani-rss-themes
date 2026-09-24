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
 * 套件中心的排法：一格一条，封面当套件图标摆在左边，右边是名字 + 说明 + 一排动作。
 *
 * 和 Material 那款的网格看着像，实际是两种格子：
 * M3 的卡是「上图下文」的竖卡，封面占掉大半张，一屏摆得下的条数少；
 * 这一款是「左图右文」的横卡，图只有 54px 宽，右边全是可读的字 ——
 * 后台管理界面的列表要的是「一眼扫完二十条」，不是「看脸」。
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
 */
const room = computed(() => (xs.value ? 2 : isTouch.value ? 3 : Infinity))

/** 说明行：刮削名和日文名经常就等于标题，一样就不显示，免得一行重复两遍 */
const alt = (a: Ani) => [a.themoviedbName, a.jpTitle].find(v => v && v !== a.title) || ''
</script>

<template>
  <div class="pa-4">
    <!-- ── 工具条 ── DSM 的工具条：主动作实心蓝，其余描边 -->
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" @click="s.adding.value = true">新增</v-btn>

      <!--
        文字用 :text 传，不要写成 <template v-if="!xs">…</template>。
        VBtn 是「有默认插槽就不画 icon」—— 插槽只要存在（哪怕 v-if 让它渲染成空），
        icon 那一支就不走了，窄屏上得到的是一颗空按钮：有边框、能点、里面什么都没有。
      -->
      <v-btn :icon="xs ? 'mdi-refresh' : undefined" :loading="s.ani.loading"
             :prepend-icon="xs ? undefined : 'mdi-refresh'" :text="xs ? undefined : '全部刷新'"
             title="全部刷新" @click="s.ani.refreshAll()"/>
      <v-btn :icon="xs ? 'mdi-package-variant-closed' : undefined"
             :prepend-icon="xs ? undefined : 'mdi-package-variant-closed'" :text="xs ? undefined : '合集'"
             title="合集下载" @click="s.collecting.value = true"/>
      <v-btn :icon="xs ? 'mdi-file-import-outline' : undefined"
             :prepend-icon="xs ? undefined : 'mdi-file-import-outline'" :text="xs ? undefined : '导入'"
             title="导入订阅" @click="s.importing.value = true"/>

      <AniFilterBar/>
      <v-spacer/>

      <v-btn :active="s.selectMode.value"
             :icon="xs ? (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline') : undefined"
             :prepend-icon="xs ? undefined : (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline')"
             :text="xs ? undefined : (s.selectMode.value ? '退出批量' : '批量操作')"
             title="批量操作" @click="s.toggleSelectMode()"/>
    </div>

    <AniBatchBar :s="s" rounded="sm" variant="outlined"/>

    <div class="head mb-3">
      <span><b>{{ s.ani.filtered.length }}</b> 条订阅 · {{ s.ani.enabledCount }} 已启用</span>
      <v-spacer/>
      <v-btn-toggle v-model="s.prefs.showWeek" class="flex-grow-0" density="compact" mandatory rounded="sm"
                    variant="outlined">
        <v-btn :value="true" size="small">按星期</v-btn>
        <v-btn :value="false" size="small">平铺</v-btn>
      </v-btn-toggle>
    </div>

    <div v-if="s.ani.loading && !s.ani.all.length" class="grid">
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
        <h2 v-if="w.label" class="sec">{{ w.label }}</h2>

        <div class="grid mb-5">
          <v-card v-for="(a, i) in w.items" :key="a.id" :class="{picked: !!a.id && s.ani.selected.has(a.id)}"
                  :style="{'--i': i}" class="pkg ani-in"
                  @click="s.selectMode.value && s.on.toggle(a)">
            <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                        class="flex-grow-0" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

            <v-img :src="cover(a.cover)" class="pkg-icon cover-hit" cover @click.stop="s.on.coverClick(a)">
              <template #placeholder>
                <div class="fill-height d-flex align-center justify-center bg-surface-variant">
                  <v-icon icon="mdi-image-outline" size="18"/>
                </div>
              </template>
            </v-img>

            <div class="pkg-body min0">
              <div class="d-flex align-center ga-2 min0">
                <a class="pkg-title" @click.stop="s.on.edit(a)">{{ a.title }}</a>
                <span v-if="!a.enable" class="badge">已停用</span>
                <span v-if="a.ova" class="badge">OVA</span>
              </div>

              <div class="pkg-alt">{{ alt(a) || (a.subgroup || '未知字幕组') }}</div>

              <!-- 这一行要能换行：几段信息在 360px 上排不下一行，
                   硬写 nowrap 会把后面几段推出可视区（看不见，也没有横滚条） -->
              <div class="pkg-meta">
                <span>第 {{ a.season ?? 1 }} 季</span>
                <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                <span v-if="s.prefs.showScore && a.score" class="d-inline-flex align-center">
                  <v-icon icon="mdi-star" size="13"/>&nbsp;{{ a.score.toFixed(1) }}
                </span>
                <span v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                  更新于 {{ fromNow(a.lastDownloadTime) }}
                </span>
              </div>
            </div>

            <div class="pkg-acts">
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

.head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: .86rem;
}

.sec {
    margin-bottom: 12px;
    font-size: .95rem;
    font-weight: 600;
    opacity: .82;
}

/*
 * 套件中心的网格：一格最少 340px。
 * 再窄就装不下「左图 + 右边两行字 + 一排动作按钮」，动作会被挤到第三行去 ——
 * 那时候一格比两格还高，网格反而不如单列。所以窄屏直接一列。
 */
.grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
}

@media (min-width: 760px) {
    .grid {
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    }
}

.pkg {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
}

/* 批量选中：一圈主色边，不改底色 —— 底色一变，封面和字的对比度全跟着变 */
.pkg.picked {
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary)) inset;
}

/* 封面当「套件图标」：小、方、只有一点圆角 */
.pkg-icon {
    flex: 0 0 54px;
    width: 54px;
    height: 76px;
    border-radius: 4px;
}

.pkg-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: 1px;
}

.pkg-title {
    flex: 0 1 auto;
    min-width: 0;
    font-size: .95rem;
    font-weight: 600;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pkg-title:hover {
    color: rgb(var(--v-theme-primary));
    text-decoration: underline;
}

.pkg-alt {
    font-size: .8rem;
    opacity: .7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pkg-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    margin-top: 2px;
    font-size: .76rem;
    opacity: .68;
    min-width: 0;
}

.pkg-meta > span {
    max-width: 100%;
}

/* DSM 的状态标签：方角、细边、不填色 */
.badge {
    flex: 0 0 auto;
    padding: 0 6px;
    border: 1px solid rgba(128, 128, 128, .45);
    border-radius: 3px;
    font-size: .68rem;
    line-height: 1.6;
    opacity: .8;
}

/*
 * 动作列竖着排在卡片右边。
 * align-self: stretch + flex-wrap：桌面端全铺时它会自动折成两列，
 * 不会把卡片撑得比别的格子宽。
 */
.pkg-acts {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-content: flex-start;
    flex: 0 0 auto;
    /* 74px 正好放两颗（32 + 8 + 32 = 72），四颗折成规整的 2×2；
       再宽一档（96px）就是 3 + 1，最后那颗「更多」孤零零吊在第二行。
       缝隙跟着 8px 走：图标按钮没有边框，4px 时几颗的水波纹是连着的 */
    max-width: 74px;
    gap: 8px;
}

/*
 * 手机上按钮要 40px 才点得着，70px 一行只放得下一颗 —— 三颗竖着摞成一条，
 * 把卡片撑到 140px 高，右边一整条全是图标。
 * 换成「图 + 字」一行、动作占满第二行靠右 —— 卡片反而更矮，也更像 DSM 的卡片脚。
 */
@media (max-width: 599.98px), (pointer: coarse) {
    .pkg {
        flex-wrap: wrap;
    }

    .pkg-acts {
        width: 100%;
        max-width: none;
        justify-content: flex-end;
    }
}
</style>
