import type {ThemeDef} from './types'

/**
 * 11 款主题。
 *
 * 前 6 款由仓库里的 Element Plus 主题迁移而来：带过来的是设计决策本身
 * （字体栈、主色、圆角尺度、背景与装饰），不是原来的选择器 —— 类名体系已经换成 Vuetify。
 * 后 3 款（Argon / 经典 Macintosh / 群晖 DSM）照着各自的原型新写，没有对应的旧 CSS。
 *
 * 迁移后每款从 12~60KB 缩到几十行：原来要逐个覆盖 Element Plus 的上百个组件，
 * 现在 DOM 是自己的，接线统一由 base.css 完成，主题只需给出「长什么样」。
 */

/* 常用字体栈，多款主题共用 */
/*
 * ── 关于 on-* 那几个键 ──
 *
 * Vuetify 会给每个颜色自动推一个前景色，规则是「白字够清楚就用白，否则用黑」
 * （util/colorUtils.js 的 getForeground）。浅色模式下这套没问题：主色够深，一律白字。
 * 深色模式下就不对了 —— 深色主题的 primary / success / warning 本身就是亮色
 * （#42d392 这种），推出来是**纯黑**。纯黑压在饱和的蓝绿红上看着是把字凿进去的，
 * 十一款一起这么干，整个界面都透着一股廉价。
 *
 * M3 不这么配：它的深色 on-primary 是 #381e72 —— 同一个色相压到 tone 20 的深紫，不是黑。
 * 所以下面凡是 Vuetify 会推出纯黑的地方，都显式钉一个「同色相的深色」。
 * 对比度全部在 6.4:1 以上（AA 线是 4.5），比纯黑低但远够用，而且和底色是一套颜色。
 *
 * 浅色模式一处都不用写：那边推出来本来就是白字，正是要的效果。
 */
const CN = '"PingFang SC", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei"'
const MONO = 'ui-monospace, "JetBrains Mono", "Cascadia Mono", "Sarasa Mono SC", Consolas, monospace'

/*
 * 点阵字的排版规矩。win98 和 macintosh 两款共用 —— 它们用的是同一份 12px 点阵中西文
 * （src/fonts/，选型理由见那儿的 README），约束也就完全一样，抄两遍迟早会漂。
 *
 * 核心只有一条：**字号必须落在 12 的整数倍上**。
 * 点阵字的笔画只有 1 个像素宽，字号一旦不在它自己的网格上，浏览器就得把 1px 的黑线
 * 拉成 1.08px —— 拉出来是两条灰边，整屏字发虚。而 Vuetify 的字号是 .75/.875/1rem 这些
 * 倍数，根字号取多少都凑不出「全是 12 的整数倍」。
 *
 * 这不只是将就：1998 年前后的界面本来就只有一个字号，标题、正文、按钮、状态栏全是 8~9pt，
 * 层级靠粗体和位置分，不靠字号。所以「只有一档」既是点阵字的硬约束，也是原版的样子。
 *
 * 第一版是把带字的组件挨个列出来的，结果被 test:mobile 当场抓到三处漏网
 * （日志行、捐赠卡里的 b 和 em）—— 它们不是 Vuetify 组件，是我们自己页面里的元素，
 * 列表永远追不上。所以改成「全都要，除了图标」：v-icon 的大小就是靠 font-size 传的，
 * 一并改掉的话一屏图标全变成 12px 见方，除它以外没有第二个例外。
 */
const PIXEL_TYPO = `
.v-application,
.v-application *:not(.v-icon):not(.v-icon *) {
    font-size: 12px !important;
    letter-spacing: 0;
}

/*
 * 行高只在根上给一次，让它往下继承。
 * 不跟着 font-size 一起 !important 铺到每个元素：那会把「多行标题」和「单行标签」压成一样，
 * 而这份字的上升 + 下降正好是 1600/1200 —— 12px 字配 16px 行高就是它自己的网格。
 */
.v-application {
    line-height: 16px;
}

/*
 * 点阵字没有粗体，浏览器只好自己合成一个：把笔画整体抹粗。
 * 1px 的点阵笔画一抹就成了 1.3px 的灰条，正是「字看着糊」最主要的来源。
 *
 * 关掉合成，改用当年点阵字真正的加粗做法：整个字错开一个像素再描一遍。
 * 描出来仍然是实心像素，一点不糊，而且这就是那个年代屏幕上「粗体」的样子。
 */
* {
    font-synthesis: none;
}

b, strong,
.font-weight-bold, .font-weight-medium, .font-weight-black,
.v-card-title,
.v-tab--selected,
.v-table > .v-table__wrapper > table > thead > tr > th {
    font-weight: 400;
    text-shadow: 1px 0 0 currentColor;
}

/*
 * 别让浏览器给点阵字做抗锯齿 —— 灰边一上，整套「一个像素就是一个像素」就没了。
 * Firefox 没有对应开关（-moz-osx-font-smoothing 只在 macOS 上管用），
 * 它那边会略微发灰，但字形和网格仍然是对的。
 */
.v-application {
    -webkit-font-smoothing: none;
    font-smooth: never;
}
`

/** 二次元壁纸源（横屏 / 竖屏） */
const ACG_PC = 'https://www.loliapi.com/acg/pc/'
const ACG_MP = 'https://www.loliapi.com/acg/pe/'

export const THEMES: ThemeDef[] = [
    {
        id: 'acg',
        name: '二次元',
        desc: '随机壁纸，玻璃药丸，卡片浮起，每次刷新换图',
        /*
         * 两个方向都成立，但「怎么让字站得住」这件事两边的做法不一样。
         *
         * 深色：一层压暗层把整张壁纸按下去，白字压在上面。
         * 浅色：遮挡主要交给卡片 —— 卡片加厚到 .96，正文就串不到壁纸的颜色；
         *   直接落在图上的那几个标题（总览的「今天」「下载中」、订阅页的星期）
         *   自己带一圈白光晕，见 presets/acg/preset.css。
         *   背景上只铺一层**薄**白纱 + 轻模糊，浓淡由页面设置里的滑块定。
         *   原来这层是一点都不铺的（白纱铺到 .6 以上壁纸只剩个影子），但一点不铺
         *   卡片又跟图搅在一起、找不出来（ani-rss-themes#3）。默认 .3 + 6px 是两头的折中，
         *   拉到 0 就回到原图。
         *
         * 细边两边也要翻：深色是白线，浅色要翻成深线。
         * 都在下面的 css 里按 data-ani-mode 分开给。
         */
        base: 'auto', remote: true, wallpaper: true,
        light: {
            background: '#e9eefb', surface: '#ffffff', 'surface-variant': '#dde5f6',
            primary: '#2657bf', success: '#2f6849', warning: '#795714', error: '#b12424', info: '#525e77',
        },
        dark: {
            background: '#0f1420', surface: '#18202e', 'surface-variant': '#232c3d',
            primary: '#7fa9ff', success: '#66c894', warning: '#e8b955', error: '#ef8181', info: '#9aa8bf',
            /* 深色下这几个色本身是亮的，字要暗但不用纯黑 —— 见本文件开头「on-*」那段 */
            'on-success': '#123523', 'on-warning': '#402e07',
        },
        vars: {
            font: `"HarmonyOS Sans SC", ${CN}, sans-serif`,
            radius: '14px', radiusPill: '999px', radiusInput: '10px',
            panelBlur: '18px', surfaceAlpha: '.7',
        },
        css: `
/* 壁纸：横竖屏各取一个源，竖屏用竖版图，免得整张被裁掉 */
:root {
    --ani-bg-image: url("${ACG_PC}");
    /* 压暗层要够重：壁纸是随机的，遇到亮色图时正文和小标题会整段读不出来 */
    --ani-bg-scrim: linear-gradient(rgba(8,12,22,.58), rgba(8,12,22,.76));
}
@media (orientation: portrait) {
    :root { --ani-bg-image: url("${ACG_MP}"); }
}

/*
 * 背景模糊：页面设置里的滑块（--ani-wp-*，由 useThemeManager 写到 <html> 上）。
 * 模糊会把图的边缘往里吃掉一圈，四边露出底色；不用 scale 放大去盖 ——
 * 放大多少得看屏幕多宽，手机上 20px 要放 1.1 倍、宽屏 1.02 就够 ——
 * 直接把这层往外撑出两倍模糊半径，任何宽度都刚好盖住。
 */
:root { --ani-bg-filter: var(--ani-wp-filter, none); }
body::before { inset: calc(var(--ani-wp-blur, 0px) * -2); }
.v-card { border: 1px solid rgba(255,255,255,.34); }
/*
 * 这里原来是「.v-btn:hover { box-shadow: 0 0 16px rgba(127,169,255,.5) }」——
 * 一圈蓝色外发光。删掉了：按钮本身不发亮，光却从边缘往外洇，看着不是「这块能点」，
 * 是「这块脏了」。而且它落在**每一颗**按钮上，一屏十几处同时洇，比不做还差。
 * 悬停反馈交给 Vuetify 自己那层状态色就够，那层贴着按钮的形状，不外溢。
 */
.v-btn:hover { border-color: rgba(255,255,255,.5); }

/*
 * 浅色的那一半：**遮罩主要挪到卡片上，背景只铺一层可调的薄纱**。
 *
 * 深色那边靠一层压暗层把整张壁纸按下去，白字才站得住。浅色不走这条路 ——
 * 厚白纱会把壁纸洗得只剩个影子，而这一款的主角就是那张图。
 * 所以正文的可读性由卡片自己负责，卡片一厚，就再也不会被壁纸的颜色串上来；
 * 背景那层纱只管把图往后推一点，让卡片从图里跳出来（ani-rss-themes#3），
 * 浓淡交给用户。落在图上的那几个标题另有交代，见 presets/acg/preset.css 里那圈光晕。
 */
html[data-ani-mode="light"] body::after {
    /* 压暗层换成一层白纱，浓淡由页面设置的滑块给（--ani-wp-veil）。
       拉到 0 时整层不渲染（display: none），不是把颜色设成透明 —— 那样它还是一层
       铺满视口的固定层，每次滚动都要跟着重新合成一遍，理由同本文件里 body::before 那段。
       颜色取浅色 background 往白里再提一档，纱是冷白的，和卡片的底色一个方向。 */
    display: var(--ani-wp-veil-display, none);
    background: rgba(244, 247, 255, var(--ani-wp-veil, 0));
}

html[data-ani-mode="light"] {
    /* 外壳（顶栏、侧栏、底部导航）继续当玻璃使：上面只有图标和一行标题，
       透一点不影响读，壁纸从它后面走过去正是这一款要的 */
    --ani-surface-alpha: .8;
    /* 卡片按不透明处理：正文、表格、日志都压在上面，壁纸透上来就是干扰。
       留 .96 而不是 1 —— 边缘还留着一点点玻璃的意思，但颜色已经串不上来了 */
    --ani-card-alpha: .96;
}
html[data-ani-mode="light"] .v-card { border-color: rgba(16,24,48,.14); }
html[data-ani-mode="light"] .v-btn:hover { border-color: rgba(16,24,48,.3); }
`,
    },

    {
        id: 'liquid-glass',
        name: '液态玻璃',
        desc: '复刻 Apple WWDC25，胶囊控件按下回弹',
        base: 'auto',
        light: {
            background: '#eceaf6', surface: '#ffffff', 'surface-variant': '#e3e0f2',
            primary: '#4442e2', success: '#1c692f', warning: '#845000', error: '#b50a00', info: '#00618a',
        },
        dark: {
            background: '#0d0d14', surface: '#17171f', 'surface-variant': '#22222e',
            primary: '#8d8aff', success: '#32d74b', warning: '#ffd60a', error: '#ff453a', info: '#64d2ff',
            /* 深色下这几个色本身是亮的，字要暗但不用纯黑 —— 见本文件开头「on-*」那段 */
            'on-success': '#0a3d12', 'on-warning': '#473b00', 'on-info': '#003347',
        },
        vars: {
            font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI Variable Text", ${CN}, sans-serif`,
            radius: '22px', radiusPill: '999px', radiusInput: '999px',
            panelBlur: '22px', surfaceAlpha: '.66',
        },
        css: `
/* 高饱和网格渐变：玻璃是靠「把背后的细节抹掉」被认出来的，
   背后只有平滑渐变的话，模糊前后长得一模一样 */
body::before {
    background-image:
        radial-gradient(46% 52% at 10% 12%, rgba(120,90,255,.55), transparent 70%),
        radial-gradient(44% 48% at 88% 18%, rgba(255,110,180,.5), transparent 70%),
        radial-gradient(50% 50% at 50% 92%, rgba(80,200,255,.5), transparent 70%),
        repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px),
        repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px);
    filter: none; transform: none;
    animation: lg-drift-a 30s ease-in-out infinite alternate;
}
@keyframes lg-drift-a { to { background-position: 3% 2%, -3% 3%, 2% -3%, 0 0, 0 0; } }

/* 边缘折射带 + 外阴影。
   只写内阴影的话卡片看着是「陷进背景里」的，和「玻璃浮在渐变上」正好相反 ——
   浮起来这件事只能靠外阴影表达。上边框比下边框亮，是光从上方来的意思。 */
.v-card {
    border: 1px solid rgba(255,255,255,.3);
    border-top-color: rgba(255,255,255,.5);
    box-shadow: 0 14px 40px rgba(0,0,0,.2),
                inset 0 1px 0 rgba(255,255,255,.45),
                inset 0 -1px 0 rgba(255,255,255,.14);
}
/* 按下回弹；悬停先把高光边提亮，桌面端才有「这块能点」的预告 */
.v-btn { transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .28s cubic-bezier(.32,.72,0,1); }
.v-btn:hover { box-shadow: inset 0 0 0 1px rgba(255,255,255,.45); }
.v-btn:active { transform: scale(.95); }
`,
    },

    {
        id: 'vue',
        name: 'Vue 文档',
        desc: 'VitePress 配色，绿松石主色，顶部霓虹晕染',
        base: 'auto',
        light: {
            background: '#ffffff', surface: '#ffffff', 'surface-variant': '#f6f6f7',
            primary: '#2b7352', secondary: '#35495e', success: '#2a7453', warning: '#9b5505',
            error: '#c12a1d', info: '#3451b2',
            'on-background': '#3c3c43', 'on-surface': '#3c3c43',
        },
        dark: {
            background: '#1b1b1f', surface: '#202127', 'surface-variant': '#2e2e32',
            primary: '#42d392', secondary: '#647eff', success: '#42d392', warning: '#f0b429',
            error: '#f66f81', info: '#a8b1ff',
            'on-background': '#dfdfd6', 'on-surface': '#dfdfd6',
            /* 深色下这几个色本身是亮的，字要暗但不用纯黑 —— 见本文件开头「on-*」那段 */
            'on-primary': '#0c3b26', 'on-success': '#0c3b26',
            'on-warning': '#443103', 'on-info': '#000747',
        },
        vars: {
            font: `Inter, "Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", ${CN}, sans-serif`,
            fontMono: `"Fira Code", ${MONO}`,
            radius: '8px', radiusPill: '20px', radiusInput: '8px',
            shadow: '0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.06)',
        },
        css: `
/* VitePress 首屏那团绿紫渐变：只压在顶部，往下很快化开。
   刻意不用 filter: blur() —— 那是铺满视口的固定层，每次滚动都要整屏重新栅格化，
   没有 GPU 的机器上会卡住主线程。渐变本身给足过渡段，观感是一样的。 */
body::before {
    background-image: radial-gradient(72% 48% at 50% -6%,
        rgba(66,211,146,.34) 0%, rgba(66,211,146,.22) 22%,
        rgba(100,126,255,.2) 48%, rgba(100,126,255,.08) 66%, transparent 82%);
    filter: none; transform: none;
}
/* 文档站的分隔感来自细线，不来自阴影 */
.v-card { border: 1px solid rgba(128,128,128,.22); }
.v-app-bar { border-bottom: 1px solid rgba(128,128,128,.22); }
/* 侧栏当前项做成 Vue 文档里那种淡底高亮 */
.v-list-item--active { background: color-mix(in srgb, currentColor 10%, transparent); }
`,
    },

    {
        id: 'github',
        name: 'GitHub',
        desc: 'Primer 配色与字栈，贡献热力图格子',
        base: 'auto',
        light: {
            background: '#f6f8fa', surface: '#ffffff', 'surface-variant': '#eaeef2',
            primary: '#085fc6', success: '#187131', warning: '#865900', error: '#bd1f2a', info: '#57606a',
        },
        dark: {
            background: '#0d1117', surface: '#161b22', 'surface-variant': '#21262d',
            primary: '#4493f8', success: '#3fb950', warning: '#d29922', error: '#f85149', info: '#8b949e',
        },
        vars: {
            font: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", ${CN}, sans-serif`,
            fontMono: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`,
            radius: '6px', radiusPill: '6px', radiusInput: '6px',
        },
        css: `
/* 贡献热力图格子：只在底层铺一层，很淡 */
body::before {
    background-image:
        repeating-linear-gradient(90deg, rgba(64,196,99,.10) 0 10px, transparent 10px 13px),
        repeating-linear-gradient(0deg, rgba(64,196,99,.10) 0 10px, transparent 10px 13px);
    filter: none; transform: none; opacity: .5;
}
.v-card { border: 1px solid rgba(128,128,128,.28); box-shadow: none !important; }
/* Primer 的圆角是 6px 且到处都是 6px，没有大圆角容器 */
.v-list-item--active { border-radius: 6px; }
`,
    },

    {
        id: 'material',
        name: 'Material Design 3',
        desc: 'Roboto，全圆角胶囊，按下起涟漪',
        base: 'auto',
        light: {
            background: '#fef7ff', surface: '#fffbfe', 'surface-variant': '#e7e0ec',
            primary: '#6750a4', secondary: '#625b71', success: '#386a20', warning: '#7d5260',
            error: '#b3261e', info: '#49454f',
        },
        dark: {
            background: '#1c1b1f', surface: '#211f26', 'surface-variant': '#49454f',
            primary: '#d0bcff', secondary: '#ccc2dc', success: '#b7f397', warning: '#efb8c8',
            error: '#f2b8b5', info: '#cac4d0',
            /* 这四个直接抄 M3 深色基线：on-primary #381e72、on-secondary #332d41、
               on-error #601410 —— Google 自己就不用纯黑，用的是同色相压到 tone 20。
               success / info 基线里没有对应角色，按同一个构造法推。 */
            'on-primary': '#381e72', 'on-secondary': '#332d41', 'on-error': '#601410',
            'on-success': '#1b4106', 'on-warning': '#3b0c1a', 'on-info': '#241f28',
        },
        vars: {
            font: `Roboto, "Roboto Flex", ${CN}, sans-serif`,
            radius: '16px', radiusPill: '999px', radiusInput: '4px',
            shadow: '0 1px 3px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.15)',
        },
        css: `
/* M3 的 state layer：hover 时叠一层主色 */
.v-btn::before { background: currentColor; }
.v-list-item--active { border-radius: 999px; }
/* 大圆角容器，M3 的招牌 */
.v-navigation-drawer { border-radius: 0 16px 16px 0; }
`,
    },

    {
        id: 'win98',
        name: 'Windows 98',
        desc: '银灰双层斜角，靛蓝标题栏，方角滚动条，一格一格的进度条',
        /*
         * 只有浅色。1998 年没有深色模式，整套立体感是「光从左上来」这一个假设推出来的：
         * 高光白、阴影灰、暗边黑，四个值一翻面，凸起和凹陷就同时不成立了。
         * 与其给一套自己编的深色 Win98，不如老实说这一款只在浅色下成立。
         */
        base: 'light',
        light: {
            /* 银灰是底色不是背景色。青绿桌面只属于 win98 那款外壳（它自己画），
               别的外壳选了这款皮肤，得到的是一整片「对话框脸」而不是刺眼的青绿 */
            background: '#c0c0c0', surface: '#c0c0c0', 'surface-variant': '#dfdfdf',
            primary: '#000080', secondary: '#808080', success: '#008000',
            warning: '#808000', error: '#800000', info: '#000080',
            'on-background': '#000000', 'on-surface': '#000000',
        },
        vars: {
            /*
             * 12px 点阵，字体文件由 win98 那款外壳带（src/presets/win98/preset.css 里的 @font-face），
             * 这里只负责在字体栈里点名。选型见 src/fonts/README.md —— 一句话：中文版 Win98
             * 的界面字是 12px 宋体点阵，不是英文版那个 MS Sans Serif，连英文数字也是点阵的。
             *
             * 后面那串系统字体不是摆设：别款外壳配这张皮肤时点阵字不在产物里，
             * 得有东西接住。Windows 上是 Tahoma（MS Sans Serif 的直系后继），中文回落宋体。
             */
            font: `"Ark Pixel 12px", "MS Sans Serif", Tahoma, Verdana, "Microsoft YaHei", SimSun, sans-serif`,
            /* 日志也用同一份点阵字：方舟像素的数字是等宽的（每个 6px），
               时间戳照样对得齐，而换成 Lucida Console 会在一屏里出现两种字 */
            fontMono: `"Ark Pixel 12px", "Lucida Console", "Courier New", ${MONO}`,
            radius: '0px', radiusPill: '0px', radiusInput: '0px',
            shadow: 'none',
        },
        css: `
/*
 * 界面字号：Win98 用的是 8pt ≈ 11px。Vuetify 的字号全是 rem，
 * 把根字号压到 14px，正文正好落在 12px 上下，接近原版的密度。
 * 不敢再往下压 —— 13px 会让 text-caption 掉到 10px，手机上读不动。
 */
:root {
    font-size: 14px;

    --w98-face: #c0c0c0;
    --w98-hi: #ffffff;
    --w98-light: #dfdfdf;
    --w98-shade: #808080;
    --w98-dark: #0a0a0a;

    /* 凸起 / 按下 / 下沉的白井 / 窗口外框，四种斜角 */
    --w98-out: inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;
    --w98-in: inset -1px -1px #ffffff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080;
    --w98-well: inset -1px -1px #ffffff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
    --w98-win: inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px #808080, inset 2px 2px #ffffff;
}

/* 选中就是靛蓝铺满，没有半透明 */
::selection { background: #000080; color: #ffffff; }
${PIXEL_TYPO}


/*
 * ── 立体感 ──
 * 用 inset box-shadow 而不是 border：border 会占布局宽度，
 * 每个控件都得为它重算一遍内边距；box-shadow 画在内容盒里，不动布局。
 */
.v-card,
.v-sheet.v-sheet--rounded,
.v-toolbar,
.v-navigation-drawer,
.v-expansion-panel {
    background: #c0c0c0 !important;
    box-shadow: var(--w98-win) !important;
}

/* ── 按钮 ── */
.v-btn {
    background: #c0c0c0 !important;
    color: #000000 !important;
    box-shadow: var(--w98-out) !important;
    border-radius: 0 !important;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
}
/* 图标按钮也是方的 —— base.css 给所有主题的图标按钮兜了 50%，这一款不要 */
.v-btn--icon { border-radius: 0 !important; }
/* Win98 没有 hover 态，也没有涟漪：反馈只有「按下去翻个面」这一种 */
.v-btn__overlay, .v-btn__underlay, .v-ripple__container { display: none !important; }
.v-btn:active { box-shadow: var(--w98-in) !important; }
/* 按下时内容跟着挪一像素，这一下才是「按进去了」的来源 */
.v-btn:active .v-btn__content { transform: translate(1px, 1px); }
/* 破坏性动作仍然要认得出来。底色不能变（银灰是这一款的全部），改字色 */
.v-btn.bg-error, .v-btn.text-error { color: #800000 !important; }
/* 默认按钮：Win98 给它多一圈黑边，回车落在哪儿一眼看得见 */
.v-btn.bg-primary { outline: 1px solid #0a0a0a; outline-offset: -3px; }
/* 对话框按钮条上的按钮宽度 75px 起 —— 当年的标准尺寸。
   只管对话框：列表里那些图标按钮给下限会把整行撑爆 */
.v-card-actions > .v-btn { min-width: 75px; }
.v-btn--disabled { text-shadow: 1px 1px 0 #ffffff; }

/* ── 输入框：下沉的白井 ── */
.v-field {
    background: #ffffff !important;
    border-radius: 0 !important;
    box-shadow: var(--w98-well) !important;
}
/* filled 变体自带的底色层和下划线都去掉，井壁由上面那圈斜角负责 */
.v-field__overlay { display: none; }
.v-field__outline::before, .v-field__outline::after { display: none; }

/* ── 开关做成勾选框的形状：Win98 没有开关，只有勾选框 ── */
.v-switch .v-switch__track {
    border-radius: 0;
    opacity: 1;
    background: #ffffff !important;
    box-shadow: var(--w98-well);
}
.v-switch .v-switch__thumb {
    border-radius: 0;
    background: #c0c0c0 !important;
    box-shadow: var(--w98-out);
}

/* ── 列表与菜单：高亮是反白 ── */
.v-list { background: #c0c0c0 !important; border-radius: 0; }
.v-overlay__content > .v-list { box-shadow: var(--w98-out); padding: 2px; }
.v-list-item { border-radius: 0 !important; }
.v-list-item__overlay { display: none; }
.v-list-item--active, .v-list-item:hover { background: #000080; color: #ffffff; }

/* ── 标签页：当年的 tab 是一排凸起的纸片 ── */
.v-tab.v-tab {
    background: #c0c0c0;
    box-shadow: inset 1px 1px #ffffff, inset 2px 0 #dfdfdf, inset -1px -1px #0a0a0a;
    border-radius: 0;
    margin-right: 2px;
    text-transform: none;
    letter-spacing: 0;
    min-width: 0;
}
.v-tab .v-tab__slider { display: none; }
/* 选中的那片纸在最前面：脸更亮，底边那道黑线去掉 —— 它是「和下面的面板连成一体」的意思 */
.v-tab--selected {
    background: #dfdfdf;
    box-shadow: inset 1px 1px #ffffff, inset 2px 0 #dfdfdf, inset -1px 0 #0a0a0a;
    font-weight: 700;
}

/*
 * ── 进度条：一格一格的方块，不是一条连续的杠 ──
 *
 * 用遮罩挖出格子之间的缝，而不是自己画一层 currentColor 的条纹：
 * Vuetify 给进度条上色是加一个 .bg-success 之类的类，那个类同时把 color 设成
 * on-success（白色）—— 拿 currentColor 画，画出来的是一排白方块压在浅色底上，
 * 等于没有进度条。遮罩不碰颜色，它上什么色就是什么色。
 */
.v-progress-linear { border-radius: 0 !important; }
.v-progress-linear__determinate {
    -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 6px, rgba(0,0,0,0) 6px 8px);
    mask-image: repeating-linear-gradient(90deg, #000 0 6px, rgba(0,0,0,0) 6px 8px);
}

/* ── 对话框 = 一扇窗：外框加厚，标题条染成靛蓝 ── */
.v-dialog > .v-overlay__content > .v-card {
    padding: 3px;
    background: #c0c0c0 !important;
    box-shadow: var(--w98-win) !important;
}
.v-dialog > .v-overlay__content > .v-card > .v-card-title {
    padding: 3px 6px !important;
    background: linear-gradient(90deg, #000080, #1084d0);
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
}

/* 提示气泡是那种淡黄底黑边的便条 */
.v-tooltip > .v-overlay__content {
    background: #ffffe1 !important;
    color: #000000 !important;
    border: 1px solid #0a0a0a;
    border-radius: 0;
}

/*
 * ── 滚动条 ──
 * 16px 宽、两头带箭头按钮、滑道是 50% 网点 —— 认出 Win98 的第二眼就在这儿。
 * Firefox 不认这套伪元素，给它一对配色兜底，至少不是默认的圆角细条。
 */
* { scrollbar-color: #c0c0c0 #dfdfdf; }
::-webkit-scrollbar { width: 16px; height: 16px; }
::-webkit-scrollbar-track {
    background-color: #c0c0c0;
    background-image: repeating-conic-gradient(#ffffff 0% 25%, #c0c0c0 0% 50%);
    background-size: 2px 2px;
}
::-webkit-scrollbar-thumb { background: #c0c0c0; box-shadow: var(--w98-out); }
::-webkit-scrollbar-corner { background: #c0c0c0; }
::-webkit-scrollbar-button:single-button {
    width: 16px; height: 16px;
    background-color: #c0c0c0;
    box-shadow: var(--w98-out);
    background-repeat: no-repeat;
    background-position: center;
    background-size: 8px 8px;
}
::-webkit-scrollbar-button:single-button:vertical:decrement {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M4 2 L7 6 L1 6 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:vertical:increment {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 2 L7 2 L4 6 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:horizontal:decrement {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M2 4 L6 1 L6 7 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:horizontal:increment {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M6 4 L2 1 L2 7 Z'/%3E%3C/svg%3E");
}
`,
    },

    {
        id: 'argon',
        name: 'Argon',
        desc: '博客的样子：大圆角、软阴影、胶囊按钮，鼠标一过整张卡浮起来',
        base: 'auto',
        light: {
            background: '#f5f6f7', surface: '#ffffff', 'surface-variant': '#eef0f3',
            primary: '#0084ff', secondary: '#5a6a7a', success: '#00a06b',
            warning: '#b06f00', error: '#d64545', info: '#3f7fd0',
        },
        /* 深色不是把浅色反过来，用的是 One Dark 那组灰蓝 —— Argon 的暗色模式就照它来。
           纯黑底会让大圆角卡片的边缘整个消失：卡和背景都是黑的，只剩阴影，而阴影在黑底上看不见 */
        dark: {
            background: '#21252b', surface: '#282c34', 'surface-variant': '#31363f',
            primary: '#4da3ff', secondary: '#9aa6b2', success: '#4fd396',
            warning: '#e5c07b', error: '#e06c75', info: '#61afef',
            /* 深色下这几个色本身是亮的，字要暗但不用纯黑 —— 见本文件开头「on-*」那段 */
            'on-success': '#0d3a25', 'on-warning': '#3d2b0b',
        },
        vars: {
            font: `"HarmonyOS Sans SC", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ${CN}, sans-serif`,
            fontMono: MONO,
            radius: '16px', radiusPill: '999px', radiusInput: '12px',
            shadow: '0 2px 12px rgba(0,0,0,.06)',
        },
        css: `
/* 顶上一团很淡的主色晕染，往下很快化开 —— Argon 首页横幅底下那层光。
   刻意不用 filter: blur()：那是铺满视口的固定层，每次滚动都要整屏重新栅格化 */
body::before {
    background-image: radial-gradient(64% 42% at 50% -8%,
        rgba(0,132,255,.16) 0%, rgba(0,132,255,.08) 40%, transparent 74%);
    filter: none; transform: none;
}

/*
 * 这一款的分隔全靠「一块底色 + 大圆角 + 软阴影」，全站找不到第二根 1px 的线。
 * 所以卡片不给边框，只给阴影；边框一上来就把柔和的边缘切成硬的，立刻不是这一款了。
 */
.v-card { border: none; }

/* 输入框是浅灰填充块，聚焦时换成主色描边 —— Argon 的搜索框就是这样 */
.v-field--variant-solo-filled .v-field__overlay { opacity: 1; background: rgba(128,128,128,.1); }
.v-field--focused .v-field__overlay { background: rgba(0,132,255,.08); }

/* 列表当前项：淡主色底 + 主色字，不用填满的色块 */
.v-list-item--active { background: rgba(var(--v-theme-primary), .12); color: rgb(var(--v-theme-primary)); }

/* 选中文字也跟着主色走，别用浏览器默认的那抹蓝 */
::selection { background: rgba(0,132,255,.24); }
`,
    },

    {
        id: 'macintosh',
        name: '经典 Macintosh',
        desc: '黑白两色，条纹标题栏，方窗硬阴影，选中就整块反白（只在浅色下成立）',
        /*
         * 只有浅色。那个年代的 Mac 屏幕是 1 位黑白，整套观感建立在「白纸上印黑字」这一个前提上：
         * 条纹标题栏、1px 黑边、硬投影，全是印刷的语言。反过来做成深色，
         * 得到的是一套自己编的东西，跟麦金塔没关系了。
         */
        base: 'light',
        light: {
            /* 银灰是窗体的脸。桌面那片 50% 网点由预设自己画（见 Shell.vue），
               别的外壳选了这张皮肤，得到的是一整片「窗户脸」而不是一片灰点 */
            background: '#dddddd', surface: '#ffffff', 'surface-variant': '#eeeeee',
            primary: '#000000', secondary: '#666666', success: '#005522',
            warning: '#7a5c00', error: '#990000', info: '#000066',
            'on-background': '#000000', 'on-surface': '#000000',
        },
        vars: {
            /*
             * Chicago 是苹果的字，不能带；也没有任何一款带中文的 Chicago 替代品。
             * 所以用和 win98 同一份 12px 点阵（字体文件由 macintosh 那款外壳带），
             * 靠「错开一像素再描一遍」把它加粗到 Chicago 的厚度 —— 见 PIXEL_TYPO 里那段。
             * 两款共用一份字不是偷懒：1990 年代的屏幕字本来就都是点阵，
             * 区别在字重和排版，不在「是不是点阵」。
             */
            font: `"Ark Pixel 12px", Chicago, Geneva, "MS Sans Serif", "Microsoft YaHei", SimSun, sans-serif`,
            fontMono: `"Ark Pixel 12px", Monaco, "Courier New", ${MONO}`,
            /* 窗和面板是方的；只有按钮是圆角矩形 —— System 7 的按钮就是这个形状 */
            radius: '0px', radiusPill: '8px', radiusInput: '0px',
            shadow: 'none',
        },
        css: `
:root {
    font-size: 14px;

    --mac-ink: #000000;
    --mac-paper: #ffffff;
    --mac-face: #dddddd;
    --mac-face-2: #eeeeee;
    --mac-shade: #999999;
}
${PIXEL_TYPO}
/* 选中是整块反白 —— System 7 没有半透明，也没有淡蓝底 */
::selection { background: #000000; color: #ffffff; }

/*
 * ── 一切都是「白纸 + 1px 黑边」──
 * 用 box-shadow 画边而不是 border：border 会占布局宽度，每个控件都得为它重算内边距；
 * box-shadow 画在内容盒里，不动布局。硬投影也走同一条属性，一次写完。
 */
.v-card,
.v-sheet.v-sheet--rounded,
.v-toolbar,
.v-navigation-drawer,
.v-expansion-panel {
    background: #ffffff !important;
    box-shadow: 0 0 0 1px #000000 !important;
}

/* ── 按钮：圆角矩形，1px 黑边，按下整个反白 ── */
.v-btn {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: 0 0 0 1px #000000 !important;
    text-transform: none;
    letter-spacing: 0;
}
/* 图标按钮也不是圆的 —— 这一款只有一种圆角（8px 的圆角矩形）。
   base.css 给所有主题的图标按钮兜了 50%，这一款要撤掉，
   否则弹窗右上角那颗关闭键是全站唯一一个圆的东西 */
.v-btn--icon { border-radius: 8px !important; }
/* 涟漪和悬停叠层都去掉：这一款的反馈只有「反白」这一种，没有中间态 */
.v-btn__overlay, .v-btn__underlay, .v-ripple__container { display: none !important; }
.v-btn:active { background: #000000 !important; color: #ffffff !important; }
/* 默认按钮多一圈边 —— System 7 就是用双线圈出「回车落在这儿」 */
.v-btn.bg-primary { box-shadow: 0 0 0 1px #000000, 0 0 0 3px #ffffff, 0 0 0 4px #000000 !important; }
.v-btn.bg-primary:active { background: #000000 !important; color: #ffffff !important; }
/* 破坏性动作认得出来：底色不能变（黑白是这一款的全部），改字色 */
.v-btn.bg-error, .v-btn.text-error { color: #990000 !important; }
.v-btn--disabled { color: #999999 !important; }

/* ── 输入框：白底黑框，聚焦时边加粗到 2px ── */
.v-field {
    background: #ffffff !important;
    box-shadow: 0 0 0 1px #000000 !important;
}
.v-field--focused { box-shadow: 0 0 0 2px #000000 !important; }
.v-field__overlay { display: none; }
.v-field__outline::before, .v-field__outline::after { display: none; }

/* ── 开关做成勾选框：那个年代没有开关，只有打勾的方框 ── */
.v-switch .v-switch__track {
    border-radius: 0;
    opacity: 1;
    background: #ffffff !important;
    box-shadow: 0 0 0 1px #000000;
}
.v-switch .v-switch__thumb {
    border-radius: 0;
    background: #000000 !important;
    box-shadow: none;
}

/* ── 列表与菜单：高亮是反白，菜单本身是白纸 + 黑边 + 硬投影 ── */
.v-list { background: #ffffff !important; border-radius: 0; }
.v-overlay__content > .v-list {
    box-shadow: 0 0 0 1px #000000, 2px 2px 0 rgba(0,0,0,.55);
    padding: 2px;
}
.v-list-item { border-radius: 0 !important; }
.v-list-item__overlay { display: none; }
.v-list-item--active, .v-list-item:hover { background: #000000; color: #ffffff; }

/* ── 标签页：一排纸片，选中的那片和下面的面板连成一体 ── */
.v-tab.v-tab {
    background: #dddddd;
    box-shadow: 0 0 0 1px #000000;
    border-radius: 6px 6px 0 0;
    margin-right: 3px;
    text-transform: none;
    letter-spacing: 0;
    min-width: 0;
}
.v-tab .v-tab__slider { display: none; }
.v-tab--selected { background: #ffffff; }

/*
 * ── 进度条：黑白斜条纹 ──
 * 当年的进度条是一条爬满 45 度斜纹的黑条。用遮罩挖出白缝，不自己画一层 currentColor 的条纹：
 * Vuetify 给进度条上色是加一个 .bg-success 之类的类，那个类同时把 color 设成白色，
 * 拿 currentColor 画会得到一排白条压在浅底上，等于没有进度条。遮罩不碰颜色。
 */
.v-progress-linear { border-radius: 0 !important; box-shadow: 0 0 0 1px #000000; }
.v-progress-linear__determinate {
    background: #000000 !important;
    -webkit-mask-image: repeating-linear-gradient(45deg, #000 0 4px, rgba(0,0,0,0) 4px 7px);
    mask-image: repeating-linear-gradient(45deg, #000 0 4px, rgba(0,0,0,0) 4px 7px);
}

/* ── 对话框 = 一扇窗：条纹标题栏 + 硬投影 ── */
.v-dialog > .v-overlay__content > .v-card {
    padding: 2px;
    background: #dddddd !important;
    box-shadow: 0 0 0 1px #000000, 3px 3px 0 rgba(0,0,0,.5) !important;
}
.v-dialog > .v-overlay__content > .v-card > .v-card-title {
    padding: 4px 8px !important;
    color: #000000;
    text-align: center;
    /* 标题栏的横条纹：1px 黑线隔 1px 白 */
    background: repeating-linear-gradient(0deg, #000000 0 1px, #ffffff 1px 2px);
    box-shadow: 0 0 0 1px #000000;
}
/* 标题的字要有块白底垫着，否则条纹会从字缝里穿过去，一个字都读不出来 */
.v-dialog > .v-overlay__content > .v-card > .v-card-title > * {
    background: #ffffff;
    padding-inline: 6px;
}

/*
 * 提示条（v-alert）也得是黑白的。
 *
 * Vuetify 的 tonal alert 会按语义色掺一块浅底 —— 在一套只有黑白的界面里，
 * 那块土黄是全屏唯一的彩色，比它想提醒的事情还显眼。
 * 改成白纸黑边，语义交给左边那个图标和文字本身，这也是当年提示框的样子。
 */
.v-alert {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: 0 0 0 1px #000000 !important;
}
.v-alert__underlay { display: none; }

/* 提示气泡也是白纸黑边，不是深色药丸 */
.v-tooltip > .v-overlay__content {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: 0 0 0 1px #000000, 2px 2px 0 rgba(0,0,0,.5);
    border-radius: 0;
}

/*
 * ── 滚动条 ──
 * 白道、黑边、方块滑块，两头各一颗箭头按钮。Firefox 不认这套伪元素，
 * 给它一对配色兜底，至少不是默认的圆角细条。
 */
* { scrollbar-color: #dddddd #ffffff; }
::-webkit-scrollbar { width: 15px; height: 15px; }
::-webkit-scrollbar-track { background: #ffffff; box-shadow: inset 0 0 0 1px #000000; }
::-webkit-scrollbar-thumb { background: #dddddd; box-shadow: inset 0 0 0 1px #000000; }
::-webkit-scrollbar-corner { background: #ffffff; }
::-webkit-scrollbar-button:single-button {
    width: 15px; height: 15px;
    background-color: #dddddd;
    box-shadow: inset 0 0 0 1px #000000;
    background-repeat: no-repeat;
    background-position: center;
    background-size: 7px 7px;
}
::-webkit-scrollbar-button:single-button:vertical:decrement {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M4 1 L7 6 L1 6 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:vertical:increment {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 2 L7 2 L4 7 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:horizontal:decrement {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4 L6 1 L6 7 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:horizontal:increment {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M7 4 L2 1 L2 7 Z'/%3E%3C/svg%3E");
}
`,
    },

    {
        id: 'synology',
        name: '群晖 DSM',
        desc: 'DSM 7 的配色：干净的白面板、细灰边、DSM 蓝，圆角只有一点点',
        base: 'auto',
        light: {
            background: '#e9edf1', surface: '#ffffff', 'surface-variant': '#f2f4f7',
            primary: '#0f6ecd', secondary: '#5a6673', success: '#2f9e54',
            warning: '#b57200', error: '#d0393e', info: '#3d84c6',
        },
        dark: {
            background: '#1b1e22', surface: '#25282d', 'surface-variant': '#30343a',
            primary: '#4d9ee8', secondary: '#9aa4b0', success: '#4cbf72',
            warning: '#e0a94a', error: '#e56a6e', info: '#6fb0e8',
            /* 深色下这几个色本身是亮的，字要暗但不用纯黑 —— 见本文件开头「on-*」那段 */
            'on-warning': '#3e2b09',
        },
        vars: {
            /* DSM 的字栈就是这套：先系统再 Roboto，中文交给 PingFang / 微软雅黑。
               它是个 NAS 管理后台，字体上没有任何主张，主张全在版式上 */
            font: `-apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, ${CN}, sans-serif`,
            fontMono: MONO,
            /* 圆角只有一点点：DSM 的窗、卡、按钮都是 4~8px，没有胶囊也没有大圆角 */
            radius: '8px', radiusPill: '4px', radiusInput: '4px',
            shadow: '0 1px 3px rgba(0,0,0,.10), 0 8px 24px rgba(0,0,0,.08)',
        },
        css: `
/*
 * 桌面底图：DSM 默认那张蓝绿抽象壁纸的意思，用渐变画。
 * 不去外网拉图 —— 这套界面装在 NAS 上，很多人的 NAS 根本不通外网，
 * 拉不到图就是一片纯色，比自己画的渐变还难看。
 */
body::before {
    background-image:
        radial-gradient(70% 60% at 18% 12%, rgba(30,120,200,.55), transparent 70%),
        radial-gradient(60% 55% at 86% 22%, rgba(20,160,170,.45), transparent 72%),
        radial-gradient(80% 70% at 50% 108%, rgba(10,40,80,.55), transparent 70%),
        linear-gradient(160deg, #14507f, #0d2b46);
    filter: none; transform: none;
}

/* DSM 的分隔线是实打实的 1px 灰线，不是阴影 —— 后台管理界面的层级都靠线 */
.v-card { border: 1px solid rgba(128,128,128,.24); }
.v-toolbar { border-bottom: 1px solid rgba(128,128,128,.24); }

/* 按钮是方角矩形，主按钮实心蓝，次按钮白底灰边 —— DSM 的按钮组就这两种 */
.v-btn { text-transform: none; letter-spacing: 0; font-weight: 400; }
.v-btn--variant-outlined { border-color: rgba(128,128,128,.44); }

/* 列表当前项：淡蓝底 + 左边一条蓝杠，这是 DSM 侧栏最好认的一处 */
.v-list-item--active {
    background: rgba(var(--v-theme-primary), .12);
    box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
    border-radius: 4px;
}

/* 输入框聚焦时是一圈蓝边，不是加粗下划线 */
.v-field--focused { box-shadow: 0 0 0 1px rgb(var(--v-theme-primary)); }

::selection { background: rgba(15,110,205,.28); }
`,
    },

    {
        id: 'ab',
        name: 'Auto_Bangumi',
        desc: 'Soft Ink 紫：填充式控件、聚焦才长描边，Tailwind 那套软阴影',
        base: 'auto',
        light: {
            background: '#fafafa', surface: '#ffffff', 'surface-variant': '#f1f4f8',
            primary: '#6c4ab6', secondary: '#64748b', success: '#22c55e',
            warning: '#f59e0b', error: '#ef4444', info: '#64748b',
        },
        dark: {
            background: '#0f172a', surface: '#1e293b', 'surface-variant': '#26334a',
            primary: '#8b6cc7', secondary: '#94a3b8', success: '#4ade80',
            warning: '#fbbf24', error: '#f87171', info: '#94a3b8',
            /* 这三个在深色下本身就亮，字要暗但不用纯黑 —— 见本文件开头「on-*」那段 */
            'on-success': '#0a2e17', 'on-warning': '#3a2606', 'on-error': '#3f0d0d',
        },
        vars: {
            /* AB 自己 public/fonts 下放的就是 Inter 的拉丁子集，中文交给系统字 */
            font: `Inter, -apple-system, ${CN}, system-ui, sans-serif`,
            fontMono: MONO,
            /* 三档圆角：控件 4、卡片 8、外壳容器 12（外壳那档由预设自己用） */
            radius: '8px', radiusPill: '4px', radiusInput: '4px',
            shadow: '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)',
        },
        css: `
/* 卡片是「描边 + 一层极淡阴影」，不是靠投影浮起来的 —— shadow-sm 那一档 */
.v-card {
    border: 1px solid rgba(128,128,128,.2);
    box-shadow: 0 1px 2px rgba(0,0,0,.05);
}

/* 选中项：主色的字压在主色的浅色底上，没有指示条 */
.v-list-item--active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), .14);
    border-radius: 8px;
}

/* Soft Ink 的招牌：平时一条边都没有，聚焦才长出主色描边 + 2px 光环 */
.v-field--focused { box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary)), 0 0 0 2px rgba(var(--v-theme-primary),.2); }

.v-btn { text-transform: none; letter-spacing: 0; font-weight: 500; }

::selection { background: rgba(108,74,182,.26); }
`,
    },

    {
        id: 'mp',
        name: 'MoviePilot',
        desc: 'Materio 紫：紫底紫面，12px 圆角卡，三层叠出来的软阴影',
        base: 'auto',
        light: {
            background: '#f4f5fa', surface: '#ffffff', 'surface-variant': '#f0f2f8',
            primary: '#8d51f9', secondary: '#8a8d93', success: '#56ca00',
            warning: '#ffb400', error: '#ff4c51', info: '#16b1ff',
            'on-background': '#3a3541', 'on-surface': '#3a3541',
        },
        dark: {
            /* 取它的 purple 皮肤（那才是 defaultTheme），不是那个近黑的 dark */
            background: '#28243d', surface: '#312d4b', 'surface-variant': '#3d3759',
            primary: '#8d51f9', secondary: '#8a8d93', success: '#56ca00',
            warning: '#ffb400', error: '#ff4c51', info: '#16b1ff',
            'on-background': '#e7e3fc', 'on-surface': '#e7e3fc',
            /*
             * MP 四套皮肤全都写死 on-primary 是白色。#8d51f9 上白字 4.5:1、黑字 4.7:1，
             * Vuetify 会挑黑的 —— 那就不是 MP 了，这一处按原版钉住。
             */
            'on-primary': '#ffffff', 'on-success': '#ffffff', 'on-warning': '#ffffff',
        },
        vars: {
            font: `Inter, ${CN}, -apple-system, "Segoe UI", Roboto, sans-serif`,
            fontMono: MONO,
            /* $border-radius-root 是 6px，所以 lg（卡片和输入框）= 12、默认（按钮）= 6 */
            radius: '12px', radiusPill: '6px', radiusInput: '12px',
            shadow: '0 4px 14px -4px rgba(20,18,33,.16), 0 4px 8px -4px rgba(20,18,33,.12)',
        },
        css: `
/* Materio 的边是「几乎看不见」那一档：app-surface-border-opacity 就是 .06 */
.v-card { border: 1px solid rgba(var(--v-theme-on-surface), .06); }

/* 选中项是紫色渐变（不是纯色填充）+ 一层 elevation 3，这是 MP 最好认的一处 */
.v-list-item--active {
    background: linear-gradient(270deg, rgb(var(--v-theme-primary)) 0%, #fff 300%);
    color: rgb(var(--v-theme-on-primary));
    border-radius: 12px;
    box-shadow: 0 4px 14px -4px rgba(20,18,33,.16), 0 4px 8px -4px rgba(20,18,33,.12);
}

.v-list-item--active .v-list-item__overlay { opacity: 0; }

/* 输入框聚焦垫一层 8% 主色底，边框也换成主色 */
.v-field--focused { background-color: rgba(var(--v-theme-primary), .08); }

.v-btn { text-transform: none; letter-spacing: 0; font-weight: 500; }

::selection { background: rgba(141,81,249,.28); }
`,
    },
]

export const THEME_MAP = new Map(THEMES.map(t => [t.id, t]))
