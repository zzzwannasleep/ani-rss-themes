import {createRouter, createWebHashHistory, type RouteRecordRaw} from 'vue-router'
import {getToken} from '@shared/http'
import meta from '@preset/meta'

/**
 * 订阅页与总览页的挂法随预设变：
 * 带总览的界面，落地页是总览；不带总览的（github 那款走的是「打开就干活」的路子），
 * 落地页直接就是订阅列表。总览页本身也是每款自己一份 —— 它是八款界面的落地页，
 * 共用一份的话「十一款不同界面」有一半时间看的是同一个屏幕。
 * 两种情况下订阅页的 name 都是 subscriptions —— 外壳靠这个名字判断要不要显示搜索框。
 *
 * ── 落地页必须有自己的路径，不能挂成空路径的子路由 ──
 *
 * 空路径的子路由（`{path: ''}`）在 vue-router 里是「和父级同一个路径」，
 * 而 RouterLink 判活时对这种情况有一条特判：子记录的路径等于父记录的路径时，
 * 改判**父记录**在不在当前匹配链里 —— 父记录是外壳，永远在。
 * 于是指向落地页的那个链接在每一页都是 active 的，后果有两种，都是眼睛能看见的：
 *
 *   · 侧栏同时亮两条 —— 「总览」和你正在看的那一页（ab / mp 就是这样）
 *   · 底部导航「总览」那格的字一直是主色 —— v-btn 的**上色**走的是
 *     router-link 自己的 isActive，外面传 :active 只改类名改不到色（acg 手机上就是这样）
 *
 * 所以落地页挂在 /dashboard（或 /subscriptions）上，根路径只留一条重定向。
 * 各外壳传 :active 仍然要留着：那是设置页 /settings/:tab 那种「子路径也算选中」用的。
 */
const subs = () => import('@preset/SubsView.vue')
const dash = () => import('@preset/DashboardView.vue')

/** 落地页的路径，导航表也从这儿取，两处别各写各的 */
export const HOME = meta.dashboard ? '/dashboard' : '/subscriptions'

/**
 * 用户在「页面设置」里选的启动页，没选（或选了这款界面没有的页）就回落到 HOME。
 *
 * 直接读 localStorage 而不是 usePrefsStore()：这段在路由解析期跑，
 * 而 pinia 是在 main.ts 里装的 —— 绕开这个先后顺序比去保证它更省事。
 * 键名与写入方（stores/prefs.ts 的 startupPage）必须一致。
 *
 * 白名单是必须的：值可能来自上游自带界面写的同一个键，也可能是用户手改的，
 * 不认识就当没设。redirect 指到不存在的路径会打到 404 兜底，而兜底又重定向回 '/' —— 死循环。
 */
const startupPaths = [HOME, '/subscriptions', '/downloads', '/logs']

function resolveStartup(): string {
    let v = localStorage.getItem('startup-page') ?? ''
    // 上游的总览叫 /home，我们叫 /dashboard；没有总览的预设上它就落回 HOME
    if (v === '/home') v = HOME
    return startupPaths.includes(v) ? v : HOME
}

const children: RouteRecordRaw[] = [
    {path: '', redirect: resolveStartup},
    ...(meta.dashboard ? [{path: 'dashboard', name: 'dashboard', component: dash}] : []),
    {path: 'subscriptions', name: 'subscriptions', component: subs},
]

/**
 * 离开某一页时记下它滚到哪儿了。
 *
 * 页面组件本身在 keep-alive 里，切回来 DOM 是原样的，但滚动条属于窗口不属于组件 ——
 * 不记的话回到订阅页会从头开始，翻了半天的位置白翻。按路由名存，
 * 设置页换标签（路径变、名字不变）不会被当成两页。
 */
const scrollTops = new Map<string, number>()

/**
 * 必须是 hash 路由。
 *
 * 上游 WebMvcConfig 把 webui 目录挂成静态资源目录，registry.addResourceHandler("/**")
 * 只按路径找真实文件，没有 SPA fallback —— 直接访问 /settings 或在该路径刷新一律 404。
 * 换成 #/settings 就永远只请求 index.html，服务端不需要任何配合。
 */
const router = createRouter({
    history: createWebHashHistory(),

    scrollBehavior(to, _from, savedPosition) {
        return savedPosition ?? {top: scrollTops.get(String(to.name)) ?? 0}
    },

    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/LoginView.vue'),
            meta: {public: true},
        },
        {
            // Bangumi 授权回调：上游是独立页面，这里做成免登录路由
            path: '/bgm-callback',
            name: 'bgm-callback',
            component: () => import('@/views/BgmCallbackView.vue'),
            meta: {public: true},
        },
        {
            // 播放页整屏铺开，不套 MainLayout —— webplayer 自带完整界面，
            // 外面再包一层抽屉和顶栏只会挤掉它的空间
            path: '/play',
            name: 'play',
            component: () => import('@/views/PlayerView.vue'),
        },
        {
            path: '/',
            component: () => import('@preset/Shell.vue'),
            children: [
                ...children,
                {path: 'downloads', name: 'downloads', component: () => import('@/views/DownloadsView.vue')},
                {path: 'logs', name: 'logs', component: () => import('@/views/LogsView.vue')},
                {path: 'settings/:tab?', name: 'settings', component: () => import('@/views/SettingsView.vue')},
            ],
        },
        // 没有兜底就会白屏
        {path: '/:pathMatch(.*)*', redirect: '/'},
    ],
})

router.beforeEach((to, from) => {
    scrollTops.set(String(from.name), window.scrollY)
    if (to.meta.public) return true
    if (getToken()) return true
    // 记住原本要去哪，登录后送回去。落地页本来就是登录后的默认去处，不用再记一遍
    return {name: 'login', query: to.fullPath === HOME ? {} : {redirect: to.fullPath}}
})

export default router
