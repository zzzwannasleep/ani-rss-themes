import 'vuetify/styles'
import {h} from 'vue'
import {createVuetify, type IconProps, type IconSet, type ThemeDefinition} from 'vuetify'
import {aliases} from 'vuetify/iconsets/mdi'
import {zhHans} from 'vuetify/locale'
import {mdi as svgSet} from 'vuetify/iconsets/mdi-svg'
import PATHS from 'virtual:mdi-paths'
import {dark, defaults, light} from '@preset/defaults'

/**
 * 图标按名字取 SVG path。
 *
 * 模板里写的仍然是 'mdi-plus' 这种名字（组件默认值、Vuetify 自己的 $close 别名也都是名字），
 * 只是不再由字体渲染 —— PATHS 是构建期扫源码生成的，只含真正用到的那 80 多个。
 * 名字对不上就画一个空 path：宁可少一个图标，不能整页报错。
 */
const named: IconSet = {
    component: (props: IconProps) =>
        h(svgSet.component, {...props, icon: PATHS[props.icon as string] ?? ''}),
}

/**
 * Vuetify 实例。
 *
 * 这里只定义 Vuetify 认识的那部分（颜色 + 组件默认值）。字体、圆角、背景图这些
 * Vuetify 管不了的，由主题（shared/themes）用 CSS 变量补——两层加起来才是完整外观。
 * 之所以拆两层：颜色要参与 Vuetify 的对比度计算（on-surface 之类是算出来的），
 * 必须交给它；其余的交给它反而会被编译进产物，改一次要重新构建。
 *
 * light / dark / defaults 三样都来自当前预设 —— 十一款界面的控件密度和形状不一样，
 * 这一处换掉，整个 app 就换了一种气质，不必逐个组件调。
 */
/**
 * 文字透明度的档位。
 *
 * Vuetify 浅色主题把正文压到 87%、次要文字压到 60%（深色主题是 100% / 70%，本来就更宽）。
 * 界面里所有「淡一点的小字」——统计标签、表头、字幕组、时间、集数——都是在这之上
 * **再叠一层** opacity，两层一乘（.87 x .6）就掉到 2.5:1，浅色下基本读不出来；
 * 深色下白字掉一半仍然够亮，所以这毛病只在浅色暴露。
 *
 * 两边统一成同一档，浅色不再天生比深色淡一截。淡化层级仍由各处自己的 opacity 决定，
 * 只是不再从 .87 起跳。写在主题定义里而不是 CSS：Vuetify 运行时会往
 * `.v-theme--xxx` 上注入这几个变量，:root 里写多少都打不过它。
 */
const EMPHASIS = {
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 0.78,
    // 禁用态 .38 在浅色下几乎看不见
    'disabled-opacity': 0.5,
}

/** sRGB 相对亮度，只用来判断「这块底色算亮还是算暗」 */
function luminance(hex: string): number {
    const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}

/**
 * 补上缺的前景色。
 *
 * Vuetify 内建的 surface-variant 走的是 M2 那套：浅色主题里它是**深**灰、深色主题里是**浅**灰，
 * 配套的 on-surface-variant 也是照这个假设给的（浅色 #EEEEEE、深色 #000000）。
 * 各款预设都把 surface-variant 改成了和 surface 同侧的颜色，却没有跟着改 on- ——
 * 于是浅色下变成 #EEEEEE 的字压在 #f6f6f7 上、深色下是纯黑的字压在 #2e2e32 上，
 * 两边都是同色写同色，对比度 1.05。版本号、周几、「19 / 22」这类小药丸整个看不见。
 *
 * 所以：只要主题动了某个底色而没给对应的前景色，就按底色亮度补一个。
 * 这样加新主题的人仍然只需要给底色，不必记住 Vuetify 有哪些 on- 键。
 */
export function fillForeground<T extends ThemeDefinition>(t: T): T {
    const c = {...t.colors} as Record<string, string>
    const contrast = (a: string, b: string) => {
        const [x, y] = [luminance(a), luminance(b)]
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
    }
    /* 黑白挑对比度高的那个。Vuetify 自己是按亮度阈值挑的，
       #3fb950 这种中亮度的绿会被判给白字 —— 白字在它上面只有 2.5:1，黑字有 8.6:1 */
    const ink = (bg: string) => (contrast('#1a1a1c', bg) >= contrast('#ffffff', bg) ? '#1a1a1c' : '#ffffff')

    /* 面：主题动了底色却没给前景色，就按底色补 */
    for (const [bg, fg] of [['surface-variant', 'on-surface-variant'], ['surface', 'on-surface'],
        ['background', 'on-background']] as const) {
        if (c[bg] && !c[fg]) c[fg] = c['on-surface'] ?? ink(c[bg])
    }
    /* 语义色：按钮、药丸填的是这些色，字压在上面 */
    for (const k of ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const) {
        if (c[k] && !c[`on-${k}`]) c[`on-${k}`] = ink(c[k])
    }
    return {...t, colors: c} as T
}

const readable = (t: ThemeDefinition): ThemeDefinition =>
    fillForeground({...t, variables: {...t.variables, ...EMPHASIS}})

export default createVuetify({
    icons: {defaultSet: 'mdi', aliases, sets: {mdi: named}},

    /* 组件自带的那些文案（数据表分页的「Items per page」「1-5 of 5」、
       文件选择器、分页器的无障碍标签）默认是英文，整页中文里就它几处是英文。
       只挂中文一种语言，不带 fallback 的英文包一起打进去。 */
    locale: {locale: 'zhHans', messages: {zhHans}},

    theme: {
        // 初值随便给一个，真正的取值在 stores/prefs.ts 里按 localStorage + 系统偏好定
        defaultTheme: 'dark',
        themes: {light: readable(light), dark: readable(dark)},
    },
    /*
     * 标签栏的直角写在这儿，不在各款的 defaults 里。
     *
     * VTab 内部就是渲染一颗 VBtn，所以哪一款给 `VBtn: {rounded: 'pill'}`，
     * 标签就一起吃到药丸圆角 —— 而 rounded 出来的是 `.rounded-pill` 工具类，
     * 带 !important，CSS 那层怎么写都压不过去，只能在 defaults 这一层拦。
     * 标签自己没底色，平时看不出来；一悬停 / 一点下去，涌出来的水波纹和底色
     * 就是个圆头长条，嵌在一排靠下面那条指示线连起来的方标签中间。
     *
     * 放在 ...defaults 前面：哪一款真想要圆角标签，自己写 VTab 就能盖掉这条。
     */
    defaults: {VTab: {rounded: 0}, ...defaults},
})
