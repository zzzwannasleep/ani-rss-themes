<script setup lang="ts">
import {computed} from 'vue'
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes} from '@shared/format'
import {usePrefsStore} from '@/stores/prefs'
import type {AniScreen} from '@/composables/useAniScreen'
import {aniActions, compactOf, isTouch, overflowOf} from './aniActions'

/**
 * 海报卡：整张卡就是一张海报，文字压在下沿的渐变里，操作按钮悬停才浮出来。
 *
 * 和 M3 那张卡（AniCard）的分别不是配色，是信息的容身之处 ——
 * 那张卡有独立的文字区，这张没有；那张常驻四个按钮，这张平时一个都不显示。
 * 媒体库类界面（Jellyfin / Plex）都是这个路子：一屏的信息量全靠图，
 * 文字只在需要辨认时才出现。
 *
 * 触屏没有悬停，按钮改成常驻的一颗「更多」——不然操作按钮永远召不出来。
 */
const props = defineProps<{
  item: Ani
  /* 动作清单在 aniActions 里统一定义，卡片只负责摆，加动作不用改卡片 */
  s: AniScreen
  selected?: boolean
  selectMode?: boolean
}>()

const acts = computed(() => aniActions(props.s, props.item))

/*
 * 触屏上图标行一颗都不留，全进「更多」菜单。
 *
 * 原来这件事是 CSS 干的（@media (hover:none) 把 :not(:last-child) 藏掉），
 * 而菜单是按「一颗没藏」算的 —— 藏掉的「视频列表 / 编辑 / 预览」哪儿都不在，
 * 手机上这张卡就再也编辑不了。数目得让 JS 知道，菜单才补得回来。
 */
const room = computed(() => (isTouch.value ? 0 : Infinity))

const prefs = usePrefsStore()

const coverUrl = computed(() => (props.item.cover ? toApiFile(props.item.cover) : ''))

/** 点标题跳 Bangumi；没有 bgmUrl 就退化成按标题搜索，与上游行为一致 */
function openBgm() {
  const it = props.item
  if (it.bgmUrl) {
    window.open(it.bgmUrl, '_blank', 'noopener')
    return
  }
  if (it.title) {
    const t = it.title.replace(/ ?\((19|20)\d{2}\)/g, '').replace(/ ?\[tmdbid=(\d+)]/g, '').trim()
    window.open(`https://bgm.tv/subject_search/${encodeURIComponent(t)}?cat=2`, '_blank', 'noopener')
  }
}
</script>

<template>
  <!-- 整张卡就是封面，点哪都算点封面（标题、按钮各自 stop 掉了）；多选模式下 coverClick 自己转成勾选 -->
  <div :class="{'is-selected': selected, 'is-off': !item.enable}" class="poster-card ani-lift cover-hit"
       @click="s.on.coverClick(item)">
    <v-img :alt="item.title" :src="coverUrl" aspect-ratio="0.7" class="art" cover>
      <template #placeholder>
        <div class="d-flex align-center justify-center fill-height bg-surface-variant">
          <v-icon class="text-medium-emphasis" size="32">mdi-image-outline</v-icon>
        </div>
      </template>
      <template #error>
        <div class="d-flex align-center justify-center fill-height bg-surface-variant">
          <v-icon class="text-medium-emphasis" size="32">mdi-image-broken-variant</v-icon>
        </div>
      </template>
    </v-img>

    <!-- 常驻：底部渐变里的标题与进度 -->
    <div class="veil">
      <div class="v-title" :title="item.title" @click.stop="openBgm">{{ item.title }}</div>
      <div class="v-meta">
        <span class="ep">{{ formatEpisodes(item.currentEpisodeNumber, item.totalEpisodeNumber) }}</span>
        <span class="dot">·</span>
        <span class="grp">{{ item.subgroup || '未知字幕组' }}</span>
      </div>
    </div>

    <!-- 角标 -->
    <v-chip v-if="prefs.showScore && item.score" class="badge-score" color="primary" size="small"
            variant="flat" @click.stop="s.on.rate(item)">
      {{ item.score.toFixed(1) }}
    </v-chip>

    <v-chip v-if="!item.enable" class="badge-off" size="x-small" variant="flat">未启用</v-chip>
    <v-chip v-else-if="item.ova" class="badge-off" color="secondary" size="x-small" variant="flat">OVA</v-chip>

    <!-- 图标换成圆的：默认那对是 mdi-checkbox-blank-outline / -marked，两个都是方块，
         压在卡片的圆角上就是一个方角顶着一个圆角，选中之后整块填实更像圆角缺了一块 -->
    <v-checkbox v-if="selectMode" :model-value="selected" class="pick" color="primary" density="compact"
                false-icon="mdi-circle-outline" hide-details true-icon="mdi-check-circle"
                @click.stop="s.on.toggle(item)"/>

    <!-- 悬停浮出的操作条。触屏下常驻，且只剩一颗「更多」（room=0） -->
    <div class="acts" @click.stop>
      <v-btn v-for="act in compactOf(acts, room)" :key="act.key" :icon="act.icon" :title="act.title"
             size="small" variant="flat" @click="act.run()"/>
      <v-menu location="top end">
        <template #activator="{isActive, props: menu}">
          <v-btn v-bind="menu" :icon="isActive ? 'mdi-close' : 'mdi-dots-horizontal'"
                 :title="isActive ? '收起' : '更多'" size="small" variant="flat"/>
        </template>
        <v-list density="comfortable" min-width="180">
          <v-list-item v-for="act in overflowOf(acts, room)" :key="act.key"
                       :base-color="act.danger ? 'error' : undefined"
                       :prepend-icon="act.icon" :title="act.title" @click="act.run()"/>
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<style scoped>
.poster-card {
    position: relative;
    border-radius: var(--ani-radius, 14px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .34);
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, 1));
    cursor: pointer;
}

/*
 * 圆角自己也得画一遍，不能只靠外面那层 overflow: hidden。
 *
 * 下面 .is-off 给这张图挂了 filter，带 filter 的元素会被提成独立的合成层，
 * 而祖先的圆角裁剪对合成层不生效 —— 图照着方角画满，四个角就从卡片的圆角里
 * 支出来一块。壁纸那款是浅色卡片底，支出来的是四个白角，最显眼。
 * 图本身就是卡片的形状，让它自己带上圆角，跟合成不合成无关。
 */
.art {
    display: block;
    border-radius: inherit;
}

/* 未启用整张压暗，一眼能从墙里挑出来 */
.is-off .art {
    filter: grayscale(.7) brightness(.62);
}

.is-selected {
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
}

/*
 * 文字压在渐变上。渐变要够高（45%）才能盖住浅色海报下半部分，
 * 只铺 20% 的话遇到白底番剧封面文字直接看不见。
 */
.veil {
    position: absolute;
    inset: auto 0 0 0;
    /* 下两角自己也要圆：这块渐变贴着卡片下沿，跟上面那张图一样不能只靠祖先裁剪。
       只给下面两个 —— 它的上边在卡片中间，圆了会在渐变里啃出两个缺口。 */
    border-radius: 0 0 var(--ani-radius, 14px) var(--ani-radius, 14px);
    padding: 34% 10px 9px;
    background: linear-gradient(transparent, rgba(0, 0, 0, .55) 42%, rgba(0, 0, 0, .88));
    color: #fff;
    pointer-events: none;
}

.v-title {
    font-size: .84rem;
    font-weight: 600;
    line-height: 1.3;
    pointer-events: auto;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.v-meta {
    display: flex;
    gap: 4px;
    align-items: baseline;
    font-size: .7rem;
    opacity: .82;
    margin-top: 3px;
    min-width: 0;
}

.ep, .dot {
    flex: 0 0 auto;
}

/* 字幕组名可以很长，只有它该被截断 */
.grp {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 角标离边 10px：贴到 6px 时会压在 14px 的圆角上，看着像溢出去了 */
.badge-score {
    position: absolute;
    top: 10px;
    right: 10px;
}

.badge-off {
    position: absolute;
    top: 10px;
    left: 10px;
}

/*
 * 多选标记：一颗浮在海报上的圆点。
 *
 * 三处都要改，少一处它还是个方块：
 *  · 底衬得是正圆。v-checkbox 的控件行高是 40、图标才 28 宽，
 *    border-radius: 50% 画在 28×40 上出来的是立着的椭圆，不是圆。
 *  · 位置跟另外两个角标对齐到 10px。原来是 2px —— 跟 .badge-score 那条注释同一个道理，
 *    贴到 6px 以内就整个压在 14px 的圆角上了，看着像从角上溢出去。
 *  · 没选中时图标得是白的。默认取 on-surface，浅色主题下是深灰，
 *    压在这块半透明黑底衬上是深压深，基本看不见勾选框在哪。
 *    选中那一档由 color="primary" 接管（Vuetify 给它挂的 .text-primary 带 !important，
 *    压得过这条），所以这里只影响未选中。
 */
.pick {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, .45);
    border-radius: 50%;
}

.pick :deep(.v-selection-control) {
    min-height: 28px;
}

/* :not(--dirty)：只管未选中那一档。选中之后交给 color="primary"，
   不这么限一下的话白色会把主色盖掉，选中和没选中只差一个勾的形状 */
.pick :deep(.v-selection-control:not(.v-selection-control--dirty) .v-selection-control__input) {
    color: #fff;
}

/* 多选时角标要给复选框让位，否则两个叠在左上角 */
.pick ~ .badge-off {
    display: none;
}

/*
 * 操作条：默认藏在卡外，悬停滑进来。
 * 位移用 translateY 而不是改 display —— display 切换没有过渡，会硬闪。
 */
.acts {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    /* 8px：6px 时几颗图标按钮的水波纹是连着的，看着像一根长条 */
    gap: 8px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity var(--m-dur) var(--m-ease), transform var(--m-dur) var(--m-ease);
}

@media (hover: hover) {
    .poster-card:hover .acts,
    .poster-card:focus-within .acts {
        opacity: 1;
        transform: none;
    }

    /* 按钮浮出来时把文字往上让，两者叠在一起谁都看不清 */
    .poster-card:hover .veil {
        padding-bottom: 44px;
    }
}

/*
 * 触屏没有悬停：操作条常驻。
 * 「只留一颗」这件事交给 room 去算（见 script），这里不再拿 CSS 藏按钮 ——
 * 藏掉的那几颗不会自动进菜单，是真的从界面上消失。
 */
@media (hover: none) {
    .acts {
        opacity: 1;
        transform: none;
    }

    .veil {
        padding-right: 46px;
    }
}
</style>
