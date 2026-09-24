/**
 * WebUI 主题定义。
 *
 * 与仓库里那 17 份 Element Plus 主题的根本差别：
 * 那些是贴在 ani-rss 自己的 DOM 上的，换个版本、换个设置就可能散架；
 * 这里的 DOM 和类名是我们自己的，主题只依赖 Vuetify 的公开类名和一组自有变量，
 * 不再赌别人的内部结构。
 *
 * 一款主题分三层，逐层可选：
 *   colors —— 交给 Vuetify，参与它的对比度计算（on-surface 之类是算出来的，必须走它）
 *   vars   —— 字体、圆角、阴影这些 Vuetify 管不到的，用 CSS 变量表达
 *   css    —— 背景、纹理、动效等装饰层，原样注入
 */

export interface ThemeColors {
    background: string
    surface: string
    'surface-variant': string
    primary: string
    secondary?: string
    success?: string
    warning?: string
    error?: string
    info?: string
    /**
     * 覆盖 Vuetify 自动推算的前景色。
     *
     * Vuetify 推的是非黑即白，深色主题里那些本身很亮的语义色（亮绿的 success、
     * 亮黄的 warning）会拿到**纯黑**。M3 用的是「同色相压到 tone 20」，不是黑 ——
     * 需要时在这里钉死，理由见 registry.ts 开头「on-*」那段。
     */
    'on-background'?: string
    'on-surface'?: string
    'on-primary'?: string
    'on-secondary'?: string
    'on-success'?: string
    'on-warning'?: string
    'on-error'?: string
    'on-info'?: string
}

export interface ThemeVars {
    /** 正文字体栈 */
    font?: string
    /** 标题字体栈，缺省跟随正文 */
    fontTitle?: string
    /** 等宽字体栈（日志、代码） */
    fontMono?: string
    /** 卡片圆角 */
    radius?: string
    /** 按钮 / 药丸控件圆角 */
    radiusPill?: string
    /** 输入框圆角 */
    radiusInput?: string
    /** 面板阴影 */
    shadow?: string
    /** 字间距，窄体大写风格会用到 */
    letterSpacing?: string
    /** 面板毛玻璃强度；0 表示不模糊（低端设备可调） */
    panelBlur?: string
    /** 面板底色透明度，带壁纸的主题靠它透出背景 */
    surfaceAlpha?: string
}

export interface ThemeDef {
    id: string
    name: string
    /** 一句话说明长什么样，显示在主题选择器里 */
    desc: string
    /**
     * 明暗归属：
     *  'auto'  跟随系统，需要同时给 light / dark 两套色
     *  'dark'  只在深色下成立（透明度是按一个方向调的，反过来会糊）
     *  'light' 同理
     */
    base: 'auto' | 'light' | 'dark'
    light?: ThemeColors
    dark?: ThemeColors
    vars?: ThemeVars
    /** 装饰层 CSS。会被原样注入，作用域限定在 html[data-ani-theme="<id>"] 下 */
    css?: string
    /** 需要联网拉壁纸的主题标记出来，让用户知道会产生外部请求 */
    remote?: boolean
    /**
     * 整屏铺壁纸的主题。页面设置里会多出「背景模糊」「浅色白纱」两个滑块，
     * 数值以 --ani-wp-blur / --ani-wp-filter / --ani-wp-veil 写到 <html> 上，
     * 主题的 css 自己决定接到哪（见 registry.ts 里 acg 那段）。
     */
    wallpaper?: boolean
}
