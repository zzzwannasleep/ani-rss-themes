import {watch, watchEffect} from 'vue'
import {useTheme} from 'vuetify'
import {applyTheme} from '@shared/themes/apply'
import {THEME_MAP} from '@shared/themes/registry'
import {usePrefsStore} from '@/stores/prefs'
import {fillForeground} from '@/plugins/vuetify'

/**
 * 主题总管：把「选了哪款主题」+「当前明暗」翻译成 Vuetify 的主题名和一层装饰 CSS。
 *
 * 分两条路是有原因的：配色必须交给 Vuetify（它要据此推算 on-surface 这类前景色），
 * 而字体、圆角、背景 Vuetify 管不到，只能走 CSS 变量和注入样式。
 */
export function useThemeManager() {
    const theme = useTheme()
    const prefs = usePrefsStore()

    /*
     * 当前明暗写到 <html data-ani-mode>。
     *
     * 皮肤的装饰层（壁纸、压暗层、细边）在两个方向上要给不一样的值，而它是一段
     * 注入的 CSS，看不见 Vuetify 的主题名 —— 主题名挂在 .v-application 上，
     * 而壁纸和压暗层画在 body 的两个伪元素上，够不着。挂一个属性在 html 上最省事：
     * 皮肤里写 `html[data-ani-mode="light"] { … }`，scope() 会把它合并成
     * `html[data-ani-theme="acg"][data-ani-mode="light"]`，两边都收得住。
     * 没选皮肤时也要写 —— 各预设自己的 preset.css 同样按这个属性分方向。
     */
    const markMode = (m: 'light' | 'dark') => (document.documentElement.dataset.aniMode = m)

    function sync() {
        const def = prefs.themeId ? THEME_MAP.get(prefs.themeId) : undefined

        if (!def) {
            // 没选主题：回到内置的 light / dark
            applyTheme(null)
            markMode(prefs.resolved)
            theme.change(prefs.resolved)
            return
        }

        /*
         * 有些主题只在一个方向成立（透明度是按一个方向调的，反过来会糊），
         * 这时忽略用户的明暗选择，强制用它成立的那一套 —— 上游那 17 款里有 7 款是这样。
         */
        const mode = def.base === 'auto' ? prefs.resolved : def.base
        markMode(mode)
        const colors = mode === 'dark' ? def.dark : def.light
        const name = `ani-${def.id}-${mode}`

        if (colors) {
            /*
             * 在内置主题之上合并，而不是新造一份：
             * Vuetify 的 Colors 有十几个必填键（on-surface、surface-bright 等大多是它自己算的），
             * 主题只声明关心的那几个，其余原样继承，缺键不会导致组件取到 undefined。
             */
            const inherited = theme.themes.value[mode]
            /* fillForeground：皮肤只给底色时补上对应的前景色，
               不补的话 Vuetify 会拿它自己那套（浅色主题里 surface-variant 是深灰）的
               on- 值来配，浅底浅字 / 深底深字 */
            theme.themes.value[name] = fillForeground({
                ...inherited,
                dark: mode === 'dark',
                colors: {...inherited.colors, ...colors},
            })
            theme.change(name)
        } else {
            theme.change(mode)
        }

        applyTheme(def)
    }

    watch(() => [prefs.themeId, prefs.resolved], sync, {immediate: true})

    /*
     * 壁纸的模糊和白纱（ani-rss-themes#3）。只写 --ani-wp-* 这组自有变量，
     * 不直接写 --ani-bg-filter —— 内联样式压过一切样式表，写了就把别的皮肤自己的背景滤镜也盖掉了。
     *
     * 为 0 的时候写 none，不写 blur(0px)：那个「等于没效果」的值照样让浏览器给这层
     * 铺满视口的固定层单建合成层（见 base.css 里 body::before 那段），白纱同理整层不渲染。
     */
    watchEffect(() => {
        const s = document.documentElement.style
        const blur = Math.max(0, Number(prefs.wallpaperBlur) || 0)
        const veil = Math.min(1, Math.max(0, Number(prefs.wallpaperVeil) || 0))
        s.setProperty('--ani-wp-blur', `${blur}px`)
        s.setProperty('--ani-wp-filter', blur ? `blur(${blur}px)` : 'none')
        s.setProperty('--ani-wp-veil', String(veil))
        s.setProperty('--ani-wp-veil-display', veil ? 'block' : 'none')
    })

    /*
     * 手机地址栏、以及装到主屏之后的状态栏，颜色取自 <meta name="theme-color">。
     * index.html 里写死的那条只是首屏兜底 —— 十一款配色差得远，
     * 一个值总有八款对不上，白底的地址栏配 win98 的银灰或者 acg 的深色都很脏。
     * 跟着当前皮肤的 surface 走：顶栏用的就是它。
     */
    watchEffect(() => {
        const c = theme.current.value.colors
        const v = c.surface || c.background
        if (!v) return
        let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        if (!meta) {
            meta = document.createElement('meta')
            meta.name = 'theme-color'
            document.head.append(meta)
        }
        meta.content = v
    })
}
