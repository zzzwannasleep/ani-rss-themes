<script setup lang="ts">
import {computed} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'
import AniFilterBar from '@/components/ani/AniFilterBar.vue'
import {aniActions, compactOf, isTouch, overflowOf} from '@/components/ani/aniActions'

/**
 * Finder 的图标视图：一格一张封面，名字压在下面的名牌上，选中整块反白。
 *
 * 和海报墙那两款（二次元、Material）看着都是网格，但不是一回事：
 * 那两款的封面是主角，字压在图上、卡片有圆角和阴影；这一款的封面只是「文件图标」——
 * 一圈 1px 黑边、方角、没有阴影，真正承载信息的是下面那块名牌。
 * 所以这里的格子小、密度高，一屏能摆下的数量差着一倍。
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
 * 格子只有 120 来点宽，触屏上按钮要 36px 才点得着，摆两颗就满了 ——
 * 所以触屏一颗都不摆，全收进菜单，只留那一颗「更多」。
 */
const room = computed(() => (xs.value ? 0 : isTouch.value ? 1 : Infinity))

const picked = (a: Ani) => !!a.id && s.ani.selected.has(a.id)
</script>

<template>
  <div class="mac-subs">
    <!-- ── 工具条 ── 那个年代的工具条就是一排按钮，没有图标按钮，都带字 -->
    <div class="bar">
      <v-btn size="small" @click="s.adding.value = true">新建订阅…</v-btn>
      <v-btn :loading="s.ani.loading" size="small" @click="s.ani.refreshAll()">刷新</v-btn>
      <v-btn size="small" @click="s.collecting.value = true">合集…</v-btn>
      <v-btn size="small" @click="s.importing.value = true">导入…</v-btn>
      <v-btn :active="s.selectMode.value" size="small" @click="s.toggleSelectMode()">
        {{ s.selectMode.value ? '结束选择' : '选择…' }}
      </v-btn>
      <AniFilterBar/>
    </div>

    <AniBatchBar :s="s" rounded="0" variant="flat"/>

    <!-- Finder 的窗口抬头：一行「N 个项目」 -->
    <div class="head">
      <span>{{ s.ani.filtered.length }} 个项目，{{ s.ani.enabledCount }} 个已启用</span>
      <v-spacer/>
      <button class="linkish touch-link" type="button" @click="s.prefs.showWeek = !s.prefs.showWeek">
        {{ s.prefs.showWeek ? '按星期排列' : '不分组' }}
      </button>
    </div>

    <div v-if="s.ani.loading && !s.ani.all.length" class="grid">
      <div v-for="i in 12" :key="i" class="ic">
        <div class="sk ic-img"/>
        <div class="sk ic-name-sk"/>
      </div>
    </div>

    <template v-else>
      <v-empty-state
          v-if="!s.ani.filtered.length"
          :text="s.ani.filtering ? '换个关键词或放宽筛选条件试试，搜索支持拼音和首字母' : '还没有订阅'"
          :title="s.ani.filtering ? '没有匹配的订阅' : '空空如也'"
          icon="mdi-television-off"
      />

      <template v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                v-else :key="w.label">
        <h2 v-if="w.label" class="sec">{{ w.label }}</h2>

        <div class="grid">
          <div v-for="a in w.items" :key="a.id" :class="{picked: picked(a), off: !a.enable}" class="ic">
            <!-- 封面就是「文件图标」：方角、1px 黑边、没有阴影 -->
            <div class="ic-img cover-hit" @click="s.on.coverClick(a)">
              <v-img :src="cover(a.cover)" aspect-ratio="0.7" cover>
                <template #placeholder>
                  <div class="fill-height d-flex align-center justify-center">
                    <v-icon icon="mdi-image-outline" size="20"/>
                  </div>
                </template>
              </v-img>
              <span v-if="!a.enable" class="ic-off">停用</span>
            </div>

            <!-- 名牌：选中就整块反白，这是 Finder 表达「选中」的唯一方式 -->
            <div class="ic-name" @click="s.selectMode.value ? s.on.toggle(a) : s.on.edit(a)">
              {{ a.title }}
            </div>

            <div class="ic-sub">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</div>

            <div class="ic-acts">
              <v-btn v-for="act in compactOf(aniActions(s, a), room)" :key="act.key" :icon="act.icon"
                     :title="act.title" density="comfortable" size="x-small" variant="text"
                     @click.stop="act.run()"/>
              <v-menu location="bottom end">
                <template #activator="{isActive, props: menu}">
                  <v-btn v-bind="menu" :icon="isActive ? 'mdi-menu-up' : 'mdi-menu-down'"
                         :title="isActive ? '收起' : '展开操作'" density="comfortable" size="x-small"
                         variant="text" @click.stop/>
                </template>
                <v-list density="comfortable" min-width="176">
                  <v-list-item v-for="act in overflowOf(aniActions(s, a), room)" :key="act.key"
                               :base-color="act.danger ? 'error' : undefined" :prepend-icon="act.icon"
                               :title="act.title" @click="act.run()"/>
                </v-list>
              </v-menu>
            </div>
          </div>
        </div>
      </template>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.mac-subs {
    padding: 10px 12px 22px;
}

.bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
}

.head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 4px;
    margin-bottom: 10px;
    box-shadow: inset 0 -1px 0 var(--mac-ink);
}

/*
 * 「按星期排列 / 不分组」是个纯文字开关 —— Finder 的窗口抬头上就是这种没有边框的字。
 * touch-link 是全站共用的热区补丁（见 styles/touch.css）：字只有 14px 高，
 * 手指够不着，那个类把热区撑到 36px，看着一点没变。
 */
.linkish {
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
}

.sec {
    margin: 14px 0 8px;
    font-size: 12px;
    line-height: 16px;
    /* 点阵字没有粗体，加粗的做法是错开一像素再描一遍 */
    text-shadow: 1px 0 0 currentColor;
}

/*
 * 图标网格。auto-fill + minmax：格子宽度自己长，不写死列数 ——
 * 写死列数的话 360px 上会挤成两列各 40px 宽，封面糊成一团。
 */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 14px 10px;
}

@media (min-width: 900px) {
    .grid {
        grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
    }
}

.ic {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
}

.ic-img {
    position: relative;
    width: 100%;
    background: var(--mac-paper);
    box-shadow: var(--mac-edge);
    cursor: pointer;
    overflow: hidden;
}

/* 停用的订阅整张图压成灰 —— 1 位色的年代没有别的办法表示「不生效」 */
.ic.off .ic-img {
    filter: grayscale(1) contrast(.7) brightness(1.15);
}

.ic-off {
    position: absolute;
    left: 0;
    bottom: 0;
    padding: 0 4px;
    background: var(--mac-ink);
    color: var(--mac-paper);
}

/*
 * 名牌：一块贴在图标下面的白牌子，选中就整块反白。
 * 两行封顶 —— 番剧名动辄二十几个字，不封顶的话每格高度都不一样，网格会参差不齐。
 */
.ic-name {
    margin-top: 5px;
    padding: 1px 5px;
    max-width: 100%;
    background: var(--mac-paper);
    text-align: center;
    line-height: 16px;
    cursor: pointer;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
}

.ic.picked .ic-name {
    background: var(--mac-ink);
    color: var(--mac-paper);
}

.ic-sub {
    margin-top: 2px;
    opacity: .7;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.ic-acts {
    display: flex;
    justify-content: center;
    /* 图标按钮之间 4px 起 —— 2px 时一排糊成一条。4 仍在点阵网格上 */
    gap: 4px;
    margin-top: 2px;
}

/*
 * 鼠标能悬停时，按钮平时藏起来 —— Finder 的图标底下本来什么都没有。
 * 触屏没有悬停，藏了就再也召不出来，所以那边常驻（见下一条媒体查询）。
 *
 * 用 opacity 而不是 display: none：后者会让格子在悬停时突然长高一截，
 * 整行图标跟着跳一下。
 */
@media (hover: hover) {
    .ic-acts {
        opacity: 0;
        transition: opacity var(--m-dur) var(--m-ease);
    }

    .ic:hover .ic-acts,
    .ic:focus-within .ic-acts {
        opacity: 1;
    }
}

/*
 * 骨架屏那一格没有 v-img 撑高度，`.ic-img` 只有 width: 100% —— 不给比例的话它是 0 高，
 * 加载中看起来是「一片空白」而不是「正在加载」。0.7 和真封面同一个比例，数据回来时不跳。
 */
.sk.ic-img {
    aspect-ratio: .7;
}

.ic-name-sk {
    width: 80%;
    height: 14px;
    margin-top: 5px;
}
</style>
