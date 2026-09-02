<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * Auto_Bangumi 的外壳：三块浮起来的圆角板。
 *
 * 顶栏、侧栏、内容不是贴边铺满的，而是各自一张 12px 圆角、1px 描边、带一层极淡阴影的板，
 * 板与板之间留 12~16px 的缝，底色（--color-bg）从缝里透出来。这是这一款最认得出来的地方 ——
 * 别的界面里顶栏是「一条」，这里顶栏是「一张卡」。
 *
 * 断点用 640 / 1024 而不是 Vuetify 的 600 / 960：这两个数是 AB 自己 mixin.scss 里的
 * $bp-tablet / $bp-desktop，形态换挡的位置跟着原版走才对得上。
 *   < 640   底部悬浮导航，没有侧栏
 *   < 1024  侧栏收成 64px 只剩图标
 *   ≥ 1024  侧栏 200px，可手动收起
 */
const {width} = useDisplay()
const phone = computed(() => width.value < 640)
const tablet = computed(() => width.value < 1024)

const s = useShell()
const collapsed = ref(false)
/* 平板宽度强制收起：那一档原版就没有展开态，让用户展开会把内容挤到 400px 以下 */
const rail = computed(() => tablet.value || collapsed.value)
const menu = ref(false)
</script>

<template>
  <v-app-bar :elevation="0" :height="phone ? 60 : 72" class="ab-bar">
    <div class="bar-card">
      <v-icon class="logo" icon="mdi-rss" size="22"/>
      <span class="brand">ani-rss</span>

      <v-text-field
          v-if="!phone"
          v-model="s.ani.keyword"
          class="bar-search ml-3"
          clearable
          hide-details
          :placeholder="s.searchHint.value"
          prepend-inner-icon="mdi-magnify"
      />

      <v-spacer/>

      <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" size="small" variant="text"
             @click="s.cycleTheme"/>
      <v-menu v-model="menu">
        <template #activator="{props}">
          <v-btn v-bind="props" icon="mdi-account-circle-outline" size="small" variant="text"/>
        </template>
        <v-list density="compact">
          <v-list-item :subtitle="`${s.ani.enabledCount} / ${s.ani.total} 启用`" title="ani-rss"/>
          <v-divider/>
          <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="s.logout"/>
        </v-list>
      </v-menu>
    </div>
  </v-app-bar>

  <v-navigation-drawer v-if="!phone" :rail="rail" :width="216" class="ab-side" permanent rail-width="80">
    <div class="side-card">
      <div v-if="!tablet" class="side-head">
        <v-btn :icon="rail ? 'mdi-menu' : 'mdi-menu-open'" :title="rail ? '展开侧栏' : '收起侧栏'"
               size="small" variant="text" @click="collapsed = !collapsed"/>
      </div>

      <v-list class="side-nav" density="comfortable" nav>
        <!-- :active 自己给：设置页是 /settings/:tab，光靠 router-link 的判活，
             翻到「基本设置」时侧栏那条就不算选中了 -->
        <v-list-item v-for="n in s.nav.value" :key="n.to" :active="s.isActive(n.to)"
                     :prepend-icon="n.icon" :title="n.label" :to="n.to">
          <template v-if="!rail && n.badge()" #append>
            <span class="count">{{ n.badge() }}</span>
          </template>
        </v-list-item>
      </v-list>
    </div>
  </v-navigation-drawer>

  <!-- 小白条那一截 Vuetify 不知道（--v-layout-bottom 只按 height=68 算），整屏高度的页面要自己扣 -->
  <v-main :style="phone ? {'--ani-page-bottom': 'env(safe-area-inset-bottom, 0px)'} : undefined">
    <div v-if="phone && s.showSearch.value" class="pb-0 px-3 pt-3">
      <v-text-field v-model="s.ani.keyword" clearable hide-details placeholder="搜索订阅"
                    prepend-inner-icon="mdi-magnify"/>
    </div>
    <!-- keep-alive：切走再切回来不重新挂载，列表不重渲染、滚动位置还在。
         没有套 <transition> —— 它和 keep-alive 一起用时 out-in 收不到离场结束事件，整个路由会卡死 -->
    <router-view v-slot="{Component}">
      <keep-alive :max="4">
        <component :is="Component"/>
      </keep-alive>
    </router-view>
    <div v-if="phone" :style="{height: 'env(safe-area-inset-bottom, 0px)'}"/>
  </v-main>

  <v-bottom-navigation v-if="phone" :elevation="0" class="ab-tabs" grow height="68">
    <v-btn v-for="n in s.nav.value" :key="n.to" :active="s.isActive(n.to)" :to="n.to" :value="n.to">
      <v-icon :icon="n.icon"/>
      <span class="tab-label">{{ n.label }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
/*
 * ── 顶栏 ──
 * v-app-bar 本身透明，真正的「板」是里面这张 bar-card。
 * 高度给 60/72（板高 48/56 + 一道 gap），板用 margin 把那道 gap 让出来。
 */
.ab-bar.v-toolbar {
    background: transparent !important;
    /* base.css 给 .v-toolbar 的底色带 !important，主题一换就把透明盖掉 —— 上面那行同样带 */
    backdrop-filter: none;
}

.ab-bar :deep(.v-toolbar__content) {
    padding: 0;
}

.bar-card {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: calc(100% - var(--ab-gap));
    margin: var(--ab-gap) var(--ab-gap) 0;
    padding: 0 8px 0 12px;
    border: 1px solid rgba(var(--v-theme-on-surface), .12);
    border-radius: var(--ab-radius);
    background: rgb(var(--v-theme-surface));
    box-shadow: 0 1px 2px rgba(0, 0, 0, .05);
}

.logo {
    flex: 0 0 auto;
    color: rgb(var(--v-theme-primary));
}

.brand {
    flex: 0 1 auto;
    min-width: 0;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bar-search {
    flex: 1 1 180px;
    min-width: 0;
    max-width: 400px;
}

/*
 * ── 侧栏 ──
 * 抽屉本体只当定位用，看得见的是里面那张 side-card；
 * 抽屉宽度比板宽 16px，多出来的就是左边和上下的缝。
 */
.ab-side.v-navigation-drawer {
    background: transparent !important;
    border: none;
    padding: var(--ab-gap) 0 var(--ab-gap) var(--ab-gap);
}

.ab-side :deep(.v-navigation-drawer__content) {
    overflow: visible;
}

.side-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid rgba(var(--v-theme-on-surface), .12);
    border-radius: var(--ab-radius);
    background: rgb(var(--v-theme-surface));
    box-shadow: 0 1px 2px rgba(0, 0, 0, .05);
    overflow: hidden;
}

.side-head {
    display: flex;
    justify-content: flex-end;
    padding: 6px 8px;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), .12);
}

.side-nav {
    flex: 1 1 auto;
    padding: 8px;
    overflow-y: auto;
}

/* 选中态：主色文字压在主色的浅色底上，没有指示条 —— 原版 sidebar-item--active 就这两样 */
.side-nav :deep(.v-list-item--active) {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), .14);
    font-weight: 500;
}

.side-nav :deep(.v-list-item) {
    margin-bottom: 2px;
    min-height: 40px;
}

/*
 * 收起态：图标要落在选中块正中间。
 *
 * 不收起时一条导航项是「图标 + 一段间隙 + 标题」，那段间隙是 --v-list-prepend-gap；
 * 收起后标题被压成 0 宽，那段间隙（comfortable 档是 32px）却还占着 ——
 * 图标于是被顶到左边，选中块的右半边空出一条。
 * rail-width 用 Vuetify 默认的 56 时这点偏差正好被吃掉，这一款是 80，就露出来了。
 *
 * 所以收起时把间隙归零，再让这条 grid 自己居中 —— 不去写死任何像素，
 * 换 rail-width 也不用跟着改。
 */
.v-navigation-drawer--rail .side-nav :deep(.v-list-item) {
    --v-list-prepend-gap: 0px;
    /* 一条导航项是 `max-content 1fr auto` 三栏。中间那条 1fr 会把剩下的宽度全吃掉 ——
       标题虽然被裁得看不见，那一栏照样占着十来个像素，图标就是被它顶偏的；
       而 1fr 吃光之后 justify-content 手里一点余量都没有，光写居中不管用。
       收起态本来就不显示标题，把那一栏压成 0，余量交回给居中。 */
    grid-template-columns: max-content 0 auto;
    justify-content: center;
}

.count {
    font-size: .72rem;
    opacity: .7;
    font-variant-numeric: tabular-nums;
}

/*
 * ── 窄屏底部导航 ──
 * 同样是一张浮板：离屏幕底边 12px，两侧各 12px，56px 高。
 * 选中项不填底色，改成顶部一小条 3px 的指示条 —— 原版 ab-mobile-nav 的做法。
 */
.ab-tabs.v-bottom-navigation {
    background: transparent !important;
    box-shadow: none;
    border: none;
    /*
     * 小白条：整条抬高一个安全区，浮板跟着往上走（下面那条 margin 也加了同样的量）。
     * 高度是 Vuetify 写死的内联样式，只能 !important 盖。
     */
    height: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
}

.ab-tabs :deep(.v-bottom-navigation__content) {
    height: 56px;
    margin: 0 var(--ab-gap) calc(var(--ab-gap) + env(safe-area-inset-bottom, 0px));
    border: 1px solid rgba(var(--v-theme-on-surface), .12);
    border-radius: var(--ab-radius);
    background: rgb(var(--v-theme-surface));
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -2px rgba(0, 0, 0, .1);
    overflow: hidden;
}

.ab-tabs :deep(.v-btn) {
    border-radius: 0;
    transition: transform var(--m-dur) var(--m-ease);
}

.ab-tabs :deep(.v-btn:active) {
    transform: scale(.95);
}

.ab-tabs :deep(.v-btn--active) {
    color: rgb(var(--v-theme-primary));
}

.ab-tabs :deep(.v-btn--active)::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 50%;
    width: 20px;
    height: 3px;
    border-radius: 999px;
    background: rgb(var(--v-theme-primary));
    transform: translateX(-50%);
}

/* v-btn--active 自带的那层底色会把「只有指示条」这件事糊掉 */
.ab-tabs :deep(.v-btn--active .v-btn__overlay) {
    opacity: 0;
}

.tab-label {
    font-size: 11px;
    line-height: 1.4;
}
</style>
