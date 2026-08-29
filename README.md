# ani-rss-themes

给 [ani-rss](https://github.com/wushuo894/ani-rss) 换外观的两套东西，仓库也就分成两半：

| 目录 | 是什么 | 换掉的是 |
| --- | --- | --- |
| `legacy/` | 17 款自定义 CSS 主题（+ 3 个 JS 附加件） | 自带界面的**皮** —— 字体、按钮、背景 |
| `webui/` | 11 款完整的替代 WebUI（Vue 3 + Vuetify 3） | 自带界面**本身** —— 换页面结构、换交互 |

两条路互不相干，各用各的。

**👉 [CSS 主题在线预览](https://zzzwannasleep.github.io/ani-rss-themes/)** ·
**[WebUI 在线预览](https://zzzwannasleep.github.io/ani-rss-themes/webui/)**（十一款都能点开试）

## 十一款替代 WebUI

上游 `test` 分支加了「备用 webui」——把文件放进 `{configDir}/webui/` 就能整个替换掉自带界面。

| id | 名字 | 长什么样 |
| --- | --- | --- |
| `acg` | 二次元 | 壁纸打底的海报墙，外壳半透明浮在图上，窄屏走底部导航 |
| `liquid-glass` | 液态玻璃 | 导航是一枚悬浮的玻璃胶囊，内容是一张张横躺的大圆角卡 |
| `vue` | Vue 文档 | 文档站的路子：左侧分组导航 + 居中正文，靠细线分栏不靠阴影 |
| `github` | GitHub | Primer 的路子：深色顶栏 + 一排 tab，内容是一张带边框的清单 |
| `material` | Material Design 3 | 宽屏导航栏杆 + 窄屏底部导航，扩展 FAB 常驻右下 |
| `win98` | Windows 98 | 整个应用是一扇窗：标题栏、菜单栏、资源管理器窗格、状态栏，底下钉一条任务栏 |
| `argon` | Argon | 博客的排法：毛玻璃顶栏 + 居中正文栏 + 右侧小挂件，每条订阅是一张会浮起来的大圆角卡 |
| `macintosh` | 经典 Macintosh | 只有黑白：屏幕顶上的苹果菜单栏 + 条纹标题栏方窗，订阅页是 Finder 图标视图，界面字是 12px 点阵 |
| `synology` | 群晖 DSM | DSM 7 的桌面：顶部任务栏 + 九宫格主菜单，应用在一扇带左侧栏的窗里，总览是资源监控挂件 |
| `ab` | AutoBangumi | 照 [Auto_Bangumi](https://github.com/EstrellaXD/Auto_Bangumi) 复刻：顶栏、侧栏、内容各是一张浮起的圆角板，番剧卡 5:7、名字在图外面，落地页是一周七列的放送日历 |
| `mp` | MoviePilot | 照 [MoviePilot](https://github.com/jxxghp/MoviePilot) 复刻：260px 侧栏，选中项是右半边的药丸加一道紫色渐变，海报 2:3、悬停整张罩渐变，内容封在 1440px 里 |

**不是十一套配色，是十一种界面。** 导航形态、订阅页的呈现方式、控件密度都不一样 ——
但底下是同一份状态层、接口层和弹窗，一处修好十一款同时好。

一套响应式代码同时适配手机和 PC（不是另做的手机版）。后端 72 个接口全部接上，
上游 70 个 `.vue` 的功能面对齐。在线播放接的是
[webplayer](https://github.com/zzzwannasleep/webplayer) —— mkv、ASS 特效字幕、HDR 都能放，
**每个包里都自带**，不用单独装。

**一行装好**（脚本会问你 webui 目录在哪、装哪一款）：

```bash
curl -fsSL https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.sh | bash
```

Windows：`irm https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.ps1 | iex`

也可以去 [Releases](https://github.com/zzzwannasleep/ani-rss-themes/releases) 下压缩包手动解压。
装法、约束与已知取舍见 **[WEBUI.md](WEBUI.md)**。


## 安装

ani-rss 里：**设置 → 基础设置 → 页面设置 → 自定义 → CSS**，填一行：

```css
@import url("https://zzzwannasleep.github.io/ani-rss-themes/themes/paper.css");
```

把 `paper.css` 换成下表任意文件名。Pages 不通就走备用源 githack：

```css
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/legacy/themes/paper.css");
```

> 主题文件在仓库里已经挪进 `legacy/`，但 **Pages 地址没变** —— 发布时仍然铺在站点根的
> `themes/` 下，之前贴过 Pages 链接的不用改。直连仓库的 githack / jsDelivr 链接需要加上 `legacy/`。

保存刷新即可。**一次只放一个主题**，混着放会打架。不想依赖外部站点，就把 `.css` 全文复制粘进去。

## 主题一览

| 文件 | 名称 | 长什么样 | 明暗 |
| --- | --- | --- | --- |
| `paper.css` | 纸感极简 | 宋体标题，方角线框，稿纸横纹 | 跟随 |
| `neon.css` | 午夜霓虹 | 窄体全大写，切角扫光，透视网格 | 深色 |
| `sakura.css` | 樱花物语 | 圆体，药丸按钮，飘落花瓣 | 跟随 |
| `glass.css` | 云海玻璃 | 细体大字距，毛玻璃，流动极光 | 跟随 |
| `liquid-glass.css` | 液态玻璃 | 复刻 Apple WWDC25，胶囊控件按下回弹 | 跟随 |
| `terminal.css` | 绿光终端 | 等宽全大写，`[方括号]` 按钮，CRT 扫描线 | 深色 |
| `github.css` | 代码仓库 | Primer 字栈，贡献热力图格子 | 跟随 |
| `calendar.css` | 挂历 | 楷体 + DIN 数字，月历方格 | 跟随 |
| `material.css` | 质感设计 M3 | Roboto，全圆角胶囊，按下起涟漪 | 跟随 |
| `autobangumi.css` | AutoBangumi | Inter 字栈，填充式控件，海报网格 + 侧边导航 | 跟随 |
| `acg-wallpaper.css` | 二次元 · 随机壁纸 | 玻璃药丸，hover 光晕 | 跟随 |
| `acg-starry.css` | 二次元 · 星空夜 | 细线框，星芒外发光 | 深色 |
| `acg-peach.css` | 二次元 · 蜜桃樱 | 圆体，蜜桃渐变 | 浅色 |
| `acg-cyber.css` | 二次元 · 电子霓虹 | 双层描边，hover 抖动 | 深色 |
| `acg-glass.css` | 二次元 · 玻璃 | 玻璃质感，透明度可调 | 跟随 |
| `bing-mist.css` | 必应4K · 晨雾 | 衬线标题，摄影画册排法 | 浅色 |
| `bing-night.css` | 必应4K · 夜航 | DIN 冷峻，实心暗块 | 深色 |

后 7 款是随机壁纸主题（横竖屏自适应，每次刷新换图）。「深色 / 浅色」指该主题不跟随明暗切换 —— 透明度是按一个方向调的，反过来会糊。

<details>
<summary><b>玻璃有两款，别选错</b></summary>

`glass.css` 是 2020 年那套毛玻璃：均匀模糊、半透明白、1px 白边，偏淡偏轻。

`liquid-glass.css` 复刻的是 Apple WWDC25 的 Liquid Glass：边缘一条渐隐折射带（上下亮、左右暗，上缘偏冷下缘偏暖），顶缘一道弧光，控件全是胶囊形，按下 `scale(.95)` 弹簧回弹。背景用高饱和网格渐变 + 一层细网格 —— 玻璃是靠「把背后的细节抹掉」被认出来的，背后只有平滑渐变的话，模糊前后长得一模一样。

想省电就把文件开头的 `--lg-blur` 调小。
</details>

<details>
<summary><b>调参：背景太亮 / 太糊 / 卡</b></summary>

带壁纸的主题，文件开头都留了一组旋钮：

```css
--ani-bg-blur: 0px;      /* 背景模糊，觉得字不清楚就调 2~6px */
--ani-bg-scale: 1.04;    /* 轻微放大，避免模糊后边缘露白 */
--ani-bg-bright: 1;      /* 背景亮度，图太亮调 .85，太暗调 1.15 */
--ani-panel-blur: 18px;  /* 面板毛玻璃强度，卡设备调 0 */
```

- 壁纸压得太狠或太浅 → 改 `body::after` 那段蒙版的 alpha
- 想用自己的主题色 → 改 `--el-color-primary: xxx !important` 那行
- 换壁纸源 → 改 `background-image` 那两行（横屏一行、竖屏一行）

可用壁纸接口：

| 用途 | 地址 |
| --- | --- |
| 二次元 横屏 / 竖屏 | `https://www.loliapi.com/acg/pc/` · `/acg/pe/` |
| 二次元 备选源 | `https://t.alcy.cc/pc` · `https://t.alcy.cc/mp` |
| 必应 4K 横屏 | `https://bing.ee123.net/img/?date=random&size=UHD` |
| 必应 竖屏 | `https://bing.ee123.net/img/?date=random&size=1080x1920` |

alcy 还有 `/moe`、`/ycy`、`/ys` 等分类，列在 `themes/acg-cyber.css` 末尾。
</details>

<details>
<summary><b>预览页能干什么</b></summary>

https://zzzwannasleep.github.io/ani-rss-themes/

左上角换主题、切明暗、跳登录页。URL 参数可叠加后分享：`?t=neon.css`、`?dark=1`、`?login=1`。

右上角一键复制：GitHub 链接 / githack 链接 / CSS 全文。配了 JS 的主题会多出一个金色按钮（点一下拿 `import(…)` 一行，再点一下拿 JS 全文）。

**用的是真东西，不是截图也不是仿写：** Element Plus 样式表和 ani-rss 实际引用的是同一份；ani-rss 自己那层样式从上游热链，跟着它更新；DOM 结构、类名、图标 1:1 复刻；弹窗、下拉、标签页走 Element Plus 真实过渡；番剧数据取自 [Bangumi 每日放送](https://api.bgm.tv/calendar)。

**它是能操作的**，上游 28 个弹窗全部复刻：登录页、首页、添加/修改订阅、管理、日志、下载、设置八个标签页、Bangumi 授权、播放列表、正则测试、批量操作等。「页面设置」里的控件真的生效 —— 切明暗、取色器改强调色、最大宽度改布局、四个复选框真的控制评分/星期/视频列表/更新时间的显隐。

本地跑：

```bash
git clone https://github.com/zzzwannasleep/ani-rss-themes.git
cd ani-rss-themes && python -m http.server 8080
```

所有内容为演示数据，页面不连接任何 ani-rss 实例。目录构成与许可证见 [preview/NOTICE.md](preview/NOTICE.md)。
</details>

<details>
<summary><b>附加：AutoBangumi 完整界面（再配一份 JS）</b></summary>

这一款分两层，两层做的事完全不同：

| 装法 | 做什么 |
| --- | --- |
| 只填 CSS | 换配色、控件、弹窗、登录页 —— **一条都不碰 ani-rss 的布局** |
| CSS + JS | 直接把 AutoBangumi 的界面渲染出来：顶栏 + 侧边导航 + 海报墙 |

```css
/* CSS 框 */
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/themes/autobangumi.css");
```

```js
/* JS 框 */
import("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/legacy/js/autobangumi.js")
```

**不是「把 ani-rss 掰得像 AB」，是渲染 AB 本身。** 脚本照上游 webui 的 `.vue` 把 AutoBangumi 的 DOM 原样建出来 —— `.layout-container` / `.topbar` / `.topbar-brand` / `.search-trigger` / `.topbar-right` / `.sidebar` / `.page-title` / `.page-bangumi` / `.bangumi-grid` / `.card` / `.card-poster` / `.card-overlay`，类名、层级、尺寸、缓动全部取自对应 `.vue` 的 scoped 样式。ani-rss 自己的顶栏和列表整个收起来 —— 它继续跑、继续持有全部状态和事件，只是不再负责显示。

- **卡片是镜像**：从每张 ani-rss 卡取海报、标题、标签、评分、更新时间，用上游的 `.card` 结构重画。点卡片和浮层里的圆钮 = 点原来那颗按钮（原按钮只是被收起来了，事件处理器还是 ani-rss 自己的）
- **搜索**把输入转发给 ani-rss 的原生输入框（派发原生 `input` 事件，Vue 的 `v-model` 收得到），列表一变镜像跟着重画
- **弹窗不接管** —— 那些是 ani-rss 的真业务，CSS 已经把它们做成上游 `ab-modal` 的样子
- **登录页不接管** —— 上游的 `.login-card`（点阵 + 两团漂移色晕 + 毛玻璃）已经在 CSS 里 1:1 复刻过

**只做交集。** 侧栏每一项都对应 ani-rss 真实存在的一个按钮，认不到就不出现；上游有而 ani-rss 没有的（番剧日历、播放器、通知中心、多语言）一个都不造 —— 摆一个点不动的入口比没有更糟。反过来，ani-rss 独有的按上游的语言补：评分做成上游 `.group-badge` 那种主色角标，更新时间做成标题下的一行等宽小字。

**为什么 CSS 那层不碰布局。** 早先的版本是拿 CSS 去掰 ani-rss 的 DOM（把 `#header` 掰成 topbar、用 `display:contents` 把列表摊平、`!important` 盖掉 `#app` 的 `max-width`）。那是在赌 ani-rss 的内部结构 —— 换个版本、换个「页面设置」就散架。现在那些规则一条不剩：不装 JS 就是纯换肤，装了 JS 才有完整界面，两条路都不会把原界面掰坏。

**零依赖、零外部请求**（字体除外，见下），图标是内联 SVG。清空 JS 框刷新就还原。

**字体自带**：Inter Variable（latin + latin-ext 两个子集）收在仓库 `fonts/` 里，OFL-1.1 许可证同目录，CSS 里两条 `src` —— GitHub Pages 走不通自动落 githack。不依赖本机装没装 Inter，中文照旧交给 Noto Sans SC / 微软雅黑。

色板、圆角、阴影、缓动取自上游 `src/style/var.scss` 的原值；组件尺寸取自各 `.vue` 的 scoped 样式；下拉框和开关这两个走 Naive UI 的控件，尺寸是在跑起来的实例上量的计算值。
</details>

<details>
<summary><b>附加：Material 3 动效增强（再配一份 JS）</b></summary>

`themes/material.css` 单装就是完整主题。里面还留了一层动效规则，全部关在 `html.md-motion` 底下 —— 不装 JS 时一条也不匹配。装上 `js/material-motion.js` 就开了：

| 装法 | 涟漪 | 顶栏 | 卡片入场 | 配色 |
| --- | --- | --- | --- | --- |
| 只填 CSS | 从按钮正中扩散 | 一直平的 | 无 | M3 baseline 紫 |
| CSS + JS | 从指针落点扩散，长按不消 | 滚起来就染色 + 抬起 | 进视口才浮上来，错峰 40ms | 取色器给什么种子色就现算整套 |

```css
/* CSS 框 */
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/themes/material.css");
```

```js
/* JS 框 */
import("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/legacy/js/material-motion.js")
```

**动态取色**：ani-rss 的取色器把 `--el-color-primary` 以内联样式写在 `<html>` 上，主题用 `!important` 盖住后它就失效了。这份 JS 把它读回来当种子，按 M3 四条色调轨现算 26 个配色变量铺回去 —— 取色器又生效了，而且改的是整套配色不只强调色。换算用 OKLCh 近似 HCT（两者都是感知均匀空间，观感差别肉眼基本看不出，但 HCT 要带一整套 CAM16 实现，不值当）。拿 baseline 的 `#6750A4` 跑回去得到 `#634CA0` / `#1C1B21`，和官方 `#6750A4` / `#1D1B20` 基本重合。

**不联网、零依赖**，只加类名和一层内联变量，不改 DOM。清空 JS 框刷新就还原。系统开了「减弱动态效果」时只留取色，不启动画。

`themes/material-motion.css` 本身没有样式，两行 `@import` 指回 `material.css` —— 存在只是为了预览页能单独选到「配 JS 的那一版」。
</details>

<details>
<summary><b>附加：原神启动（登录页专用，CSS + JS 两件套）</b></summary>

把登录页改成《原神》启动器那一屏。两个文件可以只装一个，一起装最完整：

| 文件 | 填在哪 | 管什么 |
| --- | --- | --- |
| `themes/genshin-login.css` | 自定义 **CSS** | 登录窗口：白色圆角卡片、右上角「×」、金色点缀、通栏「点击登录」 |
| `js/genshin-login.js` | 自定义 **JS** | 卡片后面那片天：渐变天空、云海、极光、星尘、悬空桥柱，相机往前推 |

```css
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/themes/genshin-login.css");
```

```js
import("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/legacy/js/genshin-login.js")
```

- **只管登录页**，列表页一行不碰 —— 可以和上面任意主题叠着用。也因此不跟随明暗，启动器那个弹窗本来就只有白色。
- **单装 CSS 也成立**：背后是一层按真实渲染取色的渐变兜底；装了 JS 就被真的天空盖住。
- **要流量**：首次进登录页拉 three.js 约 600 KB + Draco 约 200 KB + 模型贴图约 3 MB，之后走缓存。移动网络上不便宜，介意就只装 CSS。
- **要 WebGL2**；系统开了「减弱动态效果」时不建三维场景，CSS 兜底天空接管。
- 卡片宽度、金色、按钮底色在文件开头的 `--gs-*` 里。
- 「忘记密码」只装 CSS 时是个伪元素（样子在但点不了，CSS 造不出链接），装了 JS 才变成真链接。
- **资产只引用不转存**，本仓库不放米哈游任何文件。移植来源与声明见 [js/NOTICE.md](js/NOTICE.md)。
</details>

<details>
<summary><b>已知点 / 排障</b></summary>

- **流量**：必应两款默认拉 UHD 真 4K，一张 3~5MB。把 `size=UHD` 改成 `size=1920x1080` 降到 300KB 左右。
- **主题色会被接管**：取色器是内联写在 `<html>` 上的，所以主题里必须用 `!important` 才盖得住。想用自己的颜色改那行。
- **毛玻璃卡顿**：`--ani-panel-blur` 调 `0`。
- **动画**：花瓣、极光、CRT 闪烁都包了 `prefers-reduced-motion`，系统开了「减少动态效果」自动静止。
- **字体**：全走系统字体栈，零 CDN，断网照常。本机装了 JetBrains Mono / 思源宋体这类会自动命中。
- **`!important` 别删**：订阅卡片、封面、评分是 Vue scoped 样式（带 `[data-v-]`），权重比普通 class 高。
- **壁纸不换**：随机度取决于接口侧，浏览器缓存住同一张是正常的，Ctrl+F5 强刷会换。
- **接口挂了**：表现是没有背景图（配色照常成立），换上面表里另一个源即可。
- **组件跑色**：ani-rss 大版本更新后多半是 `--el-*` 变量名变了，对着 Element Plus 改一下即可。当前按 Vue 3 + Element Plus 2.x 写。
</details>

## 免责声明

- 本仓库是**第三方个人项目**，与 ani-rss 官方、Element Plus、米哈游、Bangumi 及各壁纸接口的提供方**均无隶属或背书关系**。ani-rss 是 [wushuo894](https://github.com/wushuo894/ani-rss) 的作品，本仓库只提供外观样式。
- 主题**只改外观**，不修改 ani-rss 程序、不读写你的订阅数据、不上传任何信息。出问题清空自定义 CSS/JS 框并刷新即可完全还原。
- 壁纸主题会向**第三方公共接口**发起图片请求（地址见上），这些接口的可用性、内容与隐私政策**不由本仓库控制**。介意就用纯 CSS 那 9 款主题。
- 「原神启动」是**非商业同人移植**，《原神》相关名称、商标、美术资产的权利归米哈游所有；本仓库不转存任何官方文件，仅热链引用。权利方如认为不妥，提 issue 即撤。
- 本仓库按**现状（AS IS）**提供，不作任何明示或默示担保。ani-rss 版本更新可能导致样式失效。使用风险自负。

## License

MIT
