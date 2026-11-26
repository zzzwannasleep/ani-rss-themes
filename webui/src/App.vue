<script setup lang="ts">
import {watch} from 'vue'
import {useRouter} from 'vue-router'
import {useDisplay} from 'vuetify'
import {setErrorHandler, setUnauthorizedHandler} from '@shared/http'
import {usePrefsStore} from '@/stores/prefs'
import {useUiStore} from '@/stores/ui'
import {useThemeManager} from '@/composables/useThemeManager'
import {useCustomAssets} from '@/composables/useCustomAssets'
import SnackbarHost from '@/components/common/SnackbarHost.vue'
import DefaultLoginNotice from '@/components/common/DefaultLoginNotice.vue'

/** 演示构建才有的角标，正式产物里这个常量是 false，整块被摇掉 */
const isDemo = __DEMO__

/*
 * 角标在手机上换短文案。
 *
 * 整句「演示模式 · 数据是假的」有 151px 宽，390px 的屏上从左边一路盖到 163px ——
 * 设置页保存条上的「放弃改动」就从 155px 开始，实测被压掉 8px。
 * 换成四个字缩到 90px 左右，谁也不挨着。用 xs（<600）而不是 mobile ——
 * mobile 的门槛是 1280，平板上没必要缩这个词。
 */
const {xs} = useDisplay()

const prefs = usePrefsStore()
const ui = useUiStore()
const router = useRouter()

// 主题（内置明暗 + 11 款皮肤）统一由它接管
useThemeManager()
// ani-rss 自定义 CSS/JS 框的内容，默认不加载
useCustomAssets()

// 强调色：写成 CSS 变量，改色不必重新构建
watch(() => prefs.accent, v => {
  document.documentElement.style.setProperty('--ani-accent', v)
}, {immediate: true})

/*
 * 接口层是纯 TS，不认识 Vue 的路由和提示组件，所以在这里把两个回调注册进去。
 * 403 时接口层已经清了令牌，这里只负责把人送到登录页。
 */
setErrorHandler(msg => ui.error(msg))
setUnauthorizedHandler(() => {
  const cur = router.currentRoute.value
  if (cur.name !== 'login') void router.replace({name: 'login', query: {redirect: cur.fullPath}})
})
</script>

<template>
  <v-app>
    <router-view/>
    <SnackbarHost/>
    <!-- 上游 3.2.62 的 isDefault：还在用出厂账号密码就提醒一次，十一款共用这一处 -->
    <DefaultLoginNotice/>

    <!-- 演示站：数据是假的，写操作不会真的执行，得说清楚 -->
    <v-chip v-if="isDemo" class="demo-badge" color="warning" size="small" variant="flat">
      <v-icon icon="mdi-flask-outline" size="14" start/>
      {{ xs ? '演示数据' : '演示模式 · 数据是假的' }}
    </v-chip>
  </v-app>
</template>

<style scoped>
/*
 * 演示徽标钉在左下角。它是给演示站看的提示，不该盖住页面内容 ——
 * 有底部操作条的页面自己给徽标让出这一截宽度（见 SettingsView 的 .save-bar）。
 */
.demo-badge {
    position: fixed;
    left: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    z-index: 9999;
    pointer-events: none;
    opacity: .82;
}

/*
 * 手机上左下角是导航的地盘 —— material/acg 摆底部导航条、液态玻璃摆悬浮胶囊，
 * 徽标钉在 12px 正好压在上面（实测每页都压住 26px 高一条）。
 * 抬到 96px 以上：够让开最高的那条（液态玻璃的胶囊连边距 88px）。
 * 没有底部导航的 vue / github 两款抬上去也只是浮高一点，不挡任何东西。
 * win98 那款的任务栏在任何宽度下都在，这条规则够不着它 —— 它自己在 preset.css 里再抬一次。
 *
 * 断点跟 Vuetify 的 mobile 对齐 —— 它默认是 lg(1280)，不是 600。
 * 写 600 的话平板横屏拿到的是手机外壳、徽标却按宽屏摆，照样压。
 */
@media (max-width: 1279.98px) {
    .demo-badge {
        bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    }
}

</style>
