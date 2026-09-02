<script setup lang="ts">
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * M3 外壳：宽屏是左侧「导航栏杆」（navigation rail，只有图标和短标签），
 * 窄屏是底部导航条。这是 Material 3 明确规定的响应式导航模式 ——
 * 不是同一个抽屉换个宽度，两者的交互重心完全不同。
 */
const {mobile} = useDisplay()
const s = useShell()
</script>

<template>
  <v-app-bar :elevation="0" color="surface" density="comfortable">
    <v-app-bar-title class="title-lg">{{ s.title.value }}</v-app-bar-title>

    <v-text-field
        v-if="s.showSearch.value && !mobile"
        v-model="s.ani.keyword"
        class="search"
        clearable
        density="compact"
        hide-details
        :placeholder="s.searchHint.value"
        prepend-inner-icon="mdi-magnify"
        rounded="pill"
        variant="solo-filled"
        flat
    />

    <v-spacer/>

    <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" variant="text" @click="s.cycleTheme"/>
    <v-btn icon="mdi-logout" title="退出登录" variant="text" @click="s.logout"/>
  </v-app-bar>

  <!-- 宽屏：导航栏杆常驻，不可收起 —— M3 的 rail 本身就是收起态 -->
  <v-navigation-drawer v-if="!mobile" :width="88" permanent rail rail-width="88">
    <v-list class="pt-4" nav>
      <v-list-item
          v-for="n in s.nav.value"
          :key="n.to"
          :active="s.isActive(n.to)"
          :to="n.to"
          class="rail-item text-center"
      >
        <!-- 不挂 badge：栏杆只有 88px，带数字的 badge 会压在图标上把自己盖掉一半；
             而且「一共 22 条订阅」是状态不是提醒，M3 的 badge 是留给后者的 -->
        <v-icon :icon="n.icon" size="24"/>
        <div class="rail-label">{{ n.label }}</div>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <!-- 手机上底部垫了 72px 给导航条让位，整屏高度的页面（设置/日志）要把它扣掉。
       再加一条 safe-area-inset-bottom：全面屏那根小白条压在导航条上，
       Vuetify 按 height 属性算的 --v-layout-bottom 里没有它，只能自己补 -->
  <v-main :style="mobile ? {'--ani-page-bottom': 'calc(72px + env(safe-area-inset-bottom, 0px))'} : undefined">
    <div v-if="s.showSearch.value && mobile" class="pa-3 pb-0">
      <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                    placeholder="搜索订阅" prepend-inner-icon="mdi-magnify" rounded="pill"
                    variant="solo-filled" flat/>
    </div>
    <!-- keep-alive：切走再切回来不重新挂载 —— 列表不重新渲染、滚动位置还在、
         日志和下载器也不必重新拉一遍。4 个刚好装下总览/订阅/下载器/日志。

         没有套 <transition>：它和 keep-alive 一起用会死锁 —— 离场的组件被
         移进 keep-alive 的隐藏容器，leave 过渡永远收不到结束事件，
         out-in 就一直等在那儿，整个路由卡死在上一页。页面自己的入场动效还在。 -->
    <router-view v-slot="{Component}">
      <keep-alive :max="4">
        <component :is="Component"/>
      </keep-alive>
    </router-view>
    <!-- 底部导航挡住内容尾巴，给一段安全垫 -->
    <div v-if="mobile" :style="{height: 'calc(72px + env(safe-area-inset-bottom, 0px))'}"/>
  </v-main>

  <v-bottom-navigation v-if="mobile" :elevation="2" grow>
    <v-btn v-for="n in s.nav.value" :key="n.to" :active="s.isActive(n.to)" :to="n.to" rounded="0">
      <v-icon :icon="n.icon"/>
      <span class="text-caption mt-1">{{ n.label }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
/* M3 的 title-large：22px / 400。用 rem 是为了跟随用户的浏览器字号设置 */
.title-lg {
    flex: 0 1 auto;
    min-width: 0;
    font-size: 1.375rem;
    font-weight: 400;
    letter-spacing: 0;
}

/* 能长能短：不给 flex 基准的话，窄屏下输入框会被压到只剩放大镜图标 */
.search {
    flex: 1 1 200px;
    min-width: 0;
    max-width: 420px;
}

.rail-item {
    border-radius: 16px !important;
    padding: 12px 4px !important;
    margin-bottom: 6px;
}

.rail-label {
    font-size: .7rem;
    margin-top: 4px;
    line-height: 1.1;
}

/*
 * 小白条（iOS 全面屏的 home indicator）。
 *
 * Vuetify 把高度写成内联样式（VBottomNavigation.js 里的 `height: convertToUnit(height)`），
 * 类选择器盖不过去，所以这条要 !important。整条抬高一个安全区、内容再往上垫同样高度：
 * 条子的底色一直铺到屏幕底边（不抬的话小白条底下会露出一条页面内容），
 * 按钮却停在小白条上面 —— 按钮的 height:100% 算的是内容盒，垫多少就让多少。
 */
.v-bottom-navigation {
    height: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
}

.v-bottom-navigation :deep(.v-bottom-navigation__content) {
    padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
