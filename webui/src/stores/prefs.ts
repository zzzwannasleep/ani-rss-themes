import {defineStore} from 'pinia'
import {ref, watch} from 'vue'
import meta from '@preset/meta'

/**
 * 外观与页面偏好。
 *
 * localStorage 的键**特意沿用上游那几个**（show-score / show-week / max-content-width …）：
 * 同源共享，在自带界面上调好的显示偏好切过来就还在，不用重设一遍。
 * 只有主题模式是本 WebUI 新增的键，上游用的是 vueuse 的 useColorMode，语义对不上。
 */
function persisted<T>(key: string, def: T) {
    const raw = localStorage.getItem(key)
    let init = def
    if (raw !== null) {
        try {
            init = JSON.parse(raw) as T
        } catch {
            init = raw as unknown as T   // 上游有些键存的是裸字符串，不是 JSON
        }
    }
    const r = ref<T>(init)
    watch(r, v => localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v)), {deep: true})
    return r
}

export const usePrefsStore = defineStore('prefs', () => {
    /* ── 主题 ── */
    const mode = persisted<'light' | 'dark' | 'system'>('ani-webui-theme', 'system')
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const resolved = ref<'light' | 'dark'>('dark')

    const recompute = () => {
        resolved.value = mode.value === 'system' ? (mq.matches ? 'dark' : 'light') : mode.value
    }
    // 系统偏好变化只在「跟随系统」时生效，用户手动选过就不该被系统覆盖
    mq.addEventListener('change', () => mode.value === 'system' && recompute())
    watch(mode, recompute, {immediate: true})

    /* ── 强调色（与上游同键，上游把它内联写在 <html> 上）── */
    const accent = persisted<string>('--el-color-primary', '#409eff')

    /* ── 页面显示项，对应上游「基本设置 → 页面设置」那几个复选框 ── */
    const showScore = persisted<boolean>('show-score', true)
    const showWeek = persisted<boolean>('show-week', true)
    const showPlaylist = persisted<boolean>('show-playlist', true)
    const showLastDownloadTime = persisted<boolean>('show-last-download-time', true)
    /** 上游强制不小于 1200，跟着来，否则从自带界面切过来会突然变窄 */
    const maxContentWidth = persisted<number>('max-content-width', 1600)

    /**
     * 启动页（上游 3.2.20 加的，键同样沿用它的 `startup-page`）。
     *
     * 空串 = 跟随当前界面的落地页。**默认必须是空串，不能写死某个路径**：
     * 落地页本来就随预设变（github 那款没有总览，落地页是订阅列表），
     * 写死一个路径等于把这个差异抹平，而这正是十一款界面里能一眼看出来的一处。
     *
     * 上游只有 /home 和 /subscriptions 两个选项，其中 /home 是它的总览 ——
     * 对应我们的 /dashboard，读的时候翻译一下（见 router/index.ts）。
     */
    const startupPage = persisted<string>('startup-page', '')
    /*
     * 上游用的是 useLocalStorage('startup-page', '/home')，vueuse 读一次就把默认值写回去了 ——
     * 打开过自带界面的浏览器里这个键必定是 '/home'，不是空的。路由那边认得它（会翻成落地页），
     * 但设置页下拉框的选项里没有这个值，匹配不上就显示成空白，看着像设置丢了。
     * 这里统一成我们的写法。写回去也不会影响上游：'/dashboard' 不在它的白名单里，它照样回落到 /home。
     */
    if (startupPage.value === '/home') startupPage.value = meta.dashboard ? '/dashboard' : ''

    /**
     * 选中的皮肤 id，空串表示不启用（Vuetify 原生观感）。
     * 默认给当前预设自带的那一款 —— 每款界面的外壳都是照着自家皮肤画的，
     * 首次打开就该是完整的样子，而不是先看到一版没上皮肤的半成品。
     */
    const themeId = persisted<string>('ani-webui-theme-id', meta.theme)

    /**
     * 是否加载 ani-rss「自定义 CSS/JS」框里的内容（api/custom.css、api/custom.js）。
     * 默认关：那里通常存的是针对 Element Plus 写的主题，在本 WebUI 里选择器一条都匹配不上，
     * 默认加载只会白白多两个请求。想为新界面写样式的人可以打开，入口还是同一个。
     */
    const loadCustomAssets = persisted<boolean>('ani-webui-load-custom', false)

    /* ── 本 WebUI 新增 ── */
    const cardSize = persisted<'small' | 'medium' | 'large'>('ani-webui-card-size', 'medium')
    /* 初值跟着预设走，和上面的皮肤同一个道理：Win98 那款的订阅页就是资源管理器的
       详细信息视图，首次打开却给一墙海报的话，这款界面最像它的地方一次都露不出来 */
    const viewMode = persisted<'grid' | 'list'>('ani-webui-view-mode', meta.defaultView ?? 'grid')
    /**
     * 侧栏收起来只剩图标。
     *
     * 记在本地：这是「我这块屏幕上想怎么摆」，不是账号设置 ——
     * 同一个人在 13 寸笔记本上想收起来、在外接显示器上想摊开，
     * 存到后端反而两边互相踩。有侧栏的那几款外壳共用这一个开关，
     * 换一款界面不用重新收一次。
     */
    const sidebarCollapsed = persisted<boolean>('ani-webui-sidebar-collapsed', false)

    return {
        mode, resolved, accent, themeId, loadCustomAssets,
        showScore, showWeek, showPlaylist, showLastDownloadTime, maxContentWidth, startupPage,
        cardSize, viewMode, sidebarCollapsed,
    }
})
