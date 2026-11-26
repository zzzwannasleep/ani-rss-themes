/**
 * 质感设计 · Material 3 —— 动效层
 *
 * themes/material.css 的伴生脚本。给 <html> 加上 md-motion，打开那份 CSS 末尾
 * 「动效层」那一段，再补四件 CSS 做不到的事：
 *
 *   1. 真涟漪   —— 按指针落点扩散。CSS 拿不到点击坐标，纯 CSS 版只能从正中扩散。
 *   2. 顶栏升起 —— 列表滚起来时顶栏染色 + 抬到 elevation 2（M3 top app bar on-scroll）。
 *   3. 卡片入场 —— 进视口才淡入上浮，同一批错峰 40ms（M3 emphasized-decelerate）。
 *   4. 动态取色 —— 拿「页面设置」里那个取色器的值当种子，现算整套 M3 配色
 *                  （primary / secondary / tertiary / neutral 四条色调轨）。
 *                  没动过取色器就保持 baseline 紫，一行都不改。
 *
 * ── 约束 ──────────────────────────────────────────────────────────────────
 * 1. 零依赖、零外部请求。所有色彩换算在本文件里做完，不拉任何 CDN。
 * 2. 只加类名和一层内联变量，不改 DOM 结构，不动 ani-rss 的任何逻辑。
 *    清空自定义 JS 框刷新一下就全部还原。
 * 3. 系统开了「减弱动态效果」时，涟漪和入场不启动，只保留动态取色（那是配色不是动画）。
 *
 * 单独装这份 JS 而不装 themes/material.css 是没有意义的：CSS 里没有 md-motion
 * 那一段，加了类名也没东西可开。
 *
 * MIT，本文件为原创实现，不含第三方代码。
 */
(function () {
    'use strict'

    /* ==================== 配置 ==================== */

    // 会起涟漪的东西。范围克制些 —— M3 的 state layer 只给可点的控件。
    const RIPPLE_SEL = [
        '.el-button',
        '.el-tabs__item',
        '.el-collapse-item__header',
        '.el-select-dropdown__item',
        '.el-dialog__headerbtn',
        '.list-week-title',
    ].join(',')

    const HEADER_SEL = '.app-nav'          // M3 顶栏 ↔ 现在的左侧导航栏（见 ani-rss 的 MainLayoutView.vue）
    const CARD_SEL = '.grid-container .el-card'   // 只给首页订阅卡片做入场，弹窗里的不碰

    const STAGGER = 40                    // 同一批卡片的错峰间隔（ms）
    const ENTER_FALLBACK = 1500           // 兜底：这么久还没被 IO 判定可见就直接显出来
    const FLAG = '__aniMaterialMotion'    // 重复注入的标志位

    /* ==================== 重复注入防护 ==================== */

    // ani-rss 的自定义 JS 框在某些路径下会被执行两次；第二次直接退出，
    // 否则涟漪监听器会叠加，一次点击冒两个圆。
    if (window[FLAG]) return
    window[FLAG] = true

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    document.documentElement.classList.add('md-motion')

    /* ==================== 1. 涟漪 ==================== */

    /**
     * 从落点扩散的 M3 ripple。
     *
     * 半径取「落点到四角的最远距离」，这样无论点在哪都能铺满整个控件；
     * 元素本身加 md-ripple-host（overflow:hidden）来裁形状，
     * 圆角是 border-radius: inherit 拿到的，所以胶囊按钮上不会露出方角。
     */
    function ripple(e) {
        const host = e.target.closest && e.target.closest(RIPPLE_SEL)
        if (!host || host.classList.contains('is-disabled')) return

        host.classList.add('md-ripple-host')

        // 涟漪那个 span 是 absolute 的，需要宿主是定位元素才不会飞走。
        // 但只能给本来就 static 的补 —— 弹窗关闭 X 是 absolute 挂在弹窗角上的，
        // 一旦被改成 relative 就会掉回文档流、跳到标题「设置」后面，
        // 而且是在 pointerdown 的瞬间跳，鼠标底下就空了，那一下点击直接丢失。
        if (getComputedStyle(host).position === 'static') host.classList.add('md-ripple-anchor')

        const box = host.getBoundingClientRect()
        const x = e.clientX - box.left
        const y = e.clientY - box.top
        const r = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y))

        const span = document.createElement('span')
        span.className = 'md-ripple'
        span.style.cssText =
            'left:' + (x - r) + 'px;top:' + (y - r) + 'px;' +
            'width:' + (r * 2) + 'px;height:' + (r * 2) + 'px'
        host.appendChild(span)

        // 松手（或指针离开、或被别的东西抢走）才开始淡出，长按就一直亮着 —— M3 就是这个手感
        let done = false
        const fade = () => {
            if (done) return
            done = true
            span.classList.add('is-out')
            span.addEventListener('transitionend', () => span.remove(), {once: true})
            setTimeout(() => span.remove(), 600)   // transitionend 偶尔不来，兜一下
            document.removeEventListener('pointerup', fade)
            document.removeEventListener('pointercancel', fade)
        }
        document.addEventListener('pointerup', fade)
        document.addEventListener('pointercancel', fade)
    }

    if (!reduced) document.addEventListener('pointerdown', ripple, true)

    /* ==================== 2. 顶栏滚动升起 ==================== */

    // 列表在哪个容器里滚是 ani-rss 说了算（可能是 window，也可能是 .list-container），
    // 所以在捕获阶段监听全局 scroll —— scroll 不冒泡但会捕获，一条监听全接住。
    function onScroll(e) {
        const header = document.querySelector(HEADER_SEL)
        if (!header) return
        const t = e.target
        const top = (t === document || t === document.documentElement || t === window)
            ? window.scrollY
            : (t.scrollTop || 0)
        header.classList.toggle('md-scrolled', top > 4)
    }

    document.addEventListener('scroll', onScroll, {capture: true, passive: true})

    /* ==================== 3. 卡片错峰入场 ==================== */

    const seen = new WeakSet()
    let batch = 0
    let batchTimer = 0

    const io = ('IntersectionObserver' in window) && !reduced ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return
            io.unobserve(entry.target)
            entry.target.style.transitionDelay = (batch++ * STAGGER) + 'ms'
            entry.target.classList.add('is-in')
        })
        // 同一批（同一次回调里进视口的）才错峰，隔一帧就重新从 0 数，
        // 否则往下滚久了延迟会累积到几秒
        clearTimeout(batchTimer)
        batchTimer = setTimeout(() => { batch = 0 }, 100)
    }, {rootMargin: '0px 0px -5% 0px'}) : null

    function collect() {
        if (!io) return
        document.querySelectorAll(CARD_SEL).forEach(el => {
            if (seen.has(el)) return
            seen.add(el)
            el.classList.add('md-enter')
            io.observe(el)
            // 卡片可能落在折叠起来或者根本不滚动的容器里，IO 永远不触发就白屏了
            setTimeout(() => el.classList.add('is-in'), ENTER_FALLBACK)
        })
    }

    /* ==================== 4. 动态取色（Material You） ==================== */

    /* sRGB ↔ OKLab。M3 官方用的是 HCT，这里用 OKLCh 近似：
       两者都是感知均匀空间，色调轨的观感差别肉眼基本看不出来，
       但 HCT 要带一整套 CAM16 实现，为了一个配色不值当。 */

    const f2s = v => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
    const s2f = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)

    function hexToOklch(hex) {
        const n = parseInt(hex.slice(1), 16)
        const r = s2f((n >> 16 & 255) / 255)
        const g = s2f((n >> 8 & 255) / 255)
        const b = s2f((n & 255) / 255)

        const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
        const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
        const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

        const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
        const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
        const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s

        return {L: L, C: Math.hypot(A, B), h: Math.atan2(B, A)}
    }

    function oklchToRgb(L, C, h) {
        const A = C * Math.cos(h)
        const B = C * Math.sin(h)

        const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3)
        const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3)
        const s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3)

        return [
            f2s(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            f2s(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            f2s(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
        ]
    }

    const inGamut = rgb => rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4)

    const hexOf = rgb => '#' + rgb.map(v => {
        const n = Math.round(Math.max(0, Math.min(1, v)) * 255)
        return n.toString(16).padStart(2, '0')
    }).join('').toUpperCase()

    /**
     * 一条色调轨：固定色相与彩度，只按 tone(0~100) 走明度。
     *
     * 两处容易写错、这里都绕过去了：
     * 1. M3 的 tone 是 CIE L*，不是 OKLab 的 L。直接拿 t/100 当 L 会整体偏暗一档
     *    （tone 40 会做出 L* 28 的颜色）。所以先 L* → Y，再 cbrt(Y) 得灰阶的 OKLab L
     *    —— OKLab 那三行系数对中性灰刚好加起来是 1，所以这一步是精确的。
     * 2. 彩度不能按明度硬收（那样 tone 98 的 surface 会被抽成纯灰，M3 那点淡紫就没了），
     *    而是二分找当前明度下 sRGB 还装得下的最大彩度 —— 也就是 HCT 的 gamut mapping。
     */
    function tone(h, chroma) {
        return t => {
            const y = t > 8 ? Math.pow((t + 16) / 116, 3) : t / 903.3
            const L = Math.cbrt(y)

            if (inGamut(oklchToRgb(L, chroma, h))) return hexOf(oklchToRgb(L, chroma, h))

            let lo = 0, hi = chroma
            for (let i = 0; i < 12; i++) {
                const mid = (lo + hi) / 2
                if (inGamut(oklchToRgb(L, mid, h))) lo = mid; else hi = mid
            }
            return hexOf(oklchToRgb(L, lo, h))
        }
    }

    // M3 的四条轨：primary 用种子色相，tertiary 转 60°，neutral 两条几乎抽干彩度
    function schemeFrom(seedHex, dark) {
        const seed = hexToOklch(seedHex)
        const h = seed.h
        const P = tone(h, Math.max(seed.C, 0.13))
        const S = tone(h, 0.045)
        const T = tone(h + Math.PI / 3, 0.075)
        const N = tone(h, 0.012)
        const V = tone(h, 0.024)

        return dark ? {
            'primary': P(80), 'on-primary': P(20),
            'primary-container': P(30), 'on-primary-container': P(90),
            'secondary': S(80), 'on-secondary': S(20),
            'secondary-container': S(30), 'on-secondary-container': S(90),
            'tertiary': T(80), 'on-tertiary': T(20),
            'tertiary-container': T(30), 'on-tertiary-container': T(90),
            'surface': N(6), 'on-surface': N(90),
            'surface-variant': V(30), 'on-surface-variant': V(80),
            'surface-container-lowest': N(4), 'surface-container-low': N(10),
            'surface-container': N(12), 'surface-container-high': N(17),
            'surface-container-highest': N(22),
            'outline': V(60), 'outline-variant': V(30),
            'inverse-surface': N(90), 'inverse-on-surface': N(20), 'inverse-primary': P(40),
        } : {
            'primary': P(40), 'on-primary': P(100),
            'primary-container': P(90), 'on-primary-container': P(10),
            'secondary': S(40), 'on-secondary': S(100),
            'secondary-container': S(90), 'on-secondary-container': S(10),
            'tertiary': T(40), 'on-tertiary': T(100),
            'tertiary-container': T(90), 'on-tertiary-container': T(10),
            'surface': N(98), 'on-surface': N(10),
            'surface-variant': V(90), 'on-surface-variant': V(30),
            'surface-container-lowest': N(100), 'surface-container-low': N(96),
            'surface-container': N(94), 'surface-container-high': N(92),
            'surface-container-highest': N(90),
            'outline': V(50), 'outline-variant': V(80),
            'inverse-surface': N(20), 'inverse-on-surface': N(95), 'inverse-primary': P(80),
        }
    }

    const KEYS = Object.keys(schemeFrom('#6750A4', false))
    let lastSeed = ''
    let lastDark = null

    /**
     * 种子色只认「页面设置」那个取色器写在 <html> 上的内联值。
     * 没动过取色器就读不到，此时保持 material.css 里的 baseline 紫 —— 那才是 M3 原版。
     */
    function applyScheme() {
        const root = document.documentElement
        const seed = root.style.getPropertyValue('--el-color-primary').trim()
        const dark = root.classList.contains('dark')

        if (!/^#[0-9a-f]{6}$/i.test(seed)) {
            if (lastSeed) {                       // 取色器被清空，撤掉之前铺的那一层
                KEYS.forEach(k => root.style.removeProperty('--md-' + k))
                lastSeed = ''
            }
            return
        }
        if (seed === lastSeed && dark === lastDark) return

        const scheme = schemeFrom(seed, dark)
        KEYS.forEach(k => root.style.setProperty('--md-' + k, scheme[k]))
        lastSeed = seed
        lastDark = dark
    }

    /* ==================== 串起来 ==================== */

    // <html> 的 class（明暗）和 style（取色器）变了要重算配色；
    // 列表里新插的卡片要接着做入场。两件事都攒到下一帧，一次做完。
    let pending = false
    function sync() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
            pending = false
            applyScheme()
            collect()
        })
    }

    new MutationObserver(sync).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
    })

    sync()
})()
