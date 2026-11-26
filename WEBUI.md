# ani-rss 替代 WebUI

给 [ani-rss](https://github.com/wushuo894/ani-rss) 做的十一套完整前端，整个替换掉自带界面 —— 不是换肤。

上游在 `test` 分支（2026-08-19，commit `a79d482`）加了「备用 webui」：把文件放进 `{configDir}/webui/`，
后端就优先从那里取静态资源。这十一套就是给那个目录用的。

**👉 [在线预览](https://zzzwannasleep.github.io/ani-rss-themes/webui/)** —— 十一款都能点开试，数据是内置的假数据。

| id | 首页 | 订阅主视图 | 导航形态 | 动作语言 |
| --- | --- | --- | --- | --- |
| `acg` 二次元 | 今天更新的横向海报条 | 海报墙：整张是图，字压在图上，操作悬停浮出 | 宽屏图标栏 / 窄屏底部导航，半透明浮在壁纸上 | 弹（末端过冲），悬停抬起 + 主色光晕 |
| `liquid-glass` 液态玻璃 | 三块大玻璃板，封面当背景透出来 | 横躺玻璃板，宽屏两列 | 悬浮玻璃胶囊（不占布局） | 飘（长时长阻尼曲线），悬停提亮高光边 |
| `vue` Vue 文档 | 文档站首页：hero + feature 卡 + 表格 | 细线分隔的行清单 | 左侧**分组**侧栏 + 居中正文 | 几乎不动，只淡入，悬停换底色 |
| `github` GitHub | 没有首页，打开就是清单 | 带边框的清单，行内状态点 | 顶栏 + 一排 tab，无侧栏 | 没有动效，层级靠 1px 边框（Primer 就这样） |
| `material` Material 3 | 大标题 + tonal 指标卡 + 横向轨道 | M3 卡片网格（带集数进度线），可切表格 | 导航栏杆 / 底部导航 + 扩展 FAB | M3 emphasized 曲线，反馈是 state layer 不是位移 |
| `win98` Windows 98 | 一页「系统属性」：几个分组框 + 一格一格的进度条 | 资源管理器的详细信息视图：一行一条、点表头排序、右键出菜单 | 整个应用是一扇窗（标题栏 + 菜单栏 + 左侧窗格），底下钉一条带开始菜单的任务栏 | 一帧都没有，反馈只有「立体边框翻个面」 |
| `argon` Argon | 博客首页：渐变横幅 + 一排数字药丸 + 文章流 | 一列大圆角宽卡，左缩略图右正文，鼠标一过整张浮起来 | 毛玻璃顶栏上一排胶囊，窄屏换汉堡抽屉；正文限宽居中 | 位移最大的一款：抬 6px、阴影铺开一倍，in-out 曲线 |
| `macintosh` 经典 Macintosh | 「关于本机」：一个图标 + 四条斜纹计量杠 + Finder 列表 | Finder 图标视图：一格一张封面，名字压在名牌上，选中整块反白 | 屏幕顶上一条苹果菜单栏（不属于任何窗）+ 窗内一排纸片标签 | 一帧都没有，反馈只有「黑白对调」 |
| `synology` 群晖 DSM | 资源监控挂件：健康条 + 环形表 + 数字方块 + 两块列表 | 套件中心卡片：左封面右信息，动作按钮折成 2×2 | 顶部深色任务栏 + 九宫格主菜单，窗内左侧栏；窗口按钮在右 | 后台的手感：150ms 淡入淡出，不抬起 |
| `ab` AutoBangumi | 放送日历：一周七列，今天那列点主色 | 番剧墙：5:7 海报，名字在图外面；悬停整图蒙暗 + 一颗圆按钮 | 顶栏 / 侧栏 / 内容各是一张浮起的圆角板，窄屏侧栏变悬浮底栏 | 快而短：150ms ease-out，抬 2px，一点回弹都没有 |
| `mp` MoviePilot | Materio 统计卡（左边一条主色竖线）+ 横向海报轨道 | 2:3 海报，悬停整张罩深灰紫渐变，类型和评分压在两个角上 | 260px 竖侧栏，选中项是右半边的药丸 + 紫渐变；顶栏滚动才糊毛玻璃 | 180ms + cubic-bezier(.2,.8,.2,1)，悬停抬 4px |

**不是十一套配色。** 首页、订阅页、卡片形态、导航、连动效曲线都不一样；
但底下是同一份接口层、状态层、弹窗和设置页 —— 一处修好十一款同时好。

其中 `ab` / `mp` 是照着 [Auto_Bangumi](https://github.com/EstrellaXD/Auto_Bangumi) 和
[MoviePilot](https://github.com/jxxghp/MoviePilot) 的前端源码复刻的：断点、圆角、阴影、
栅格最小列宽、海报比例、动效时长这些数都是从它们的 `var.scss` / `_variables.scss` 里读出来的，
不是照着截图描的。两个上游都是 MIT，这里复刻的是观感，代码一行没抄。

实现上是**一套源码 + 十一个预设**：`webui/src/presets/<id>/` 各出一个外壳（`Shell.vue`）、
一个总览页（`DashboardView.vue`）、一个订阅页（`SubsView.vue`）、一份控件默认值（`defaults.ts`）
和一份动作签名（`preset.css`），构建时用 `VITE_PRESET` 选一款。
复制十一份源码那种「十一款」，改一个 bug 要改十一次。

动效不是每款各写一遍：`src/styles/motion.css` 只定义**有哪些动作**（入场、悬停、按下、
骨架屏），曲线和时长全走 CSS 变量，各款的 `preset.css` 改写变量。
所以十一款共用同一批类名，动起来却是十一种手感。

页面之间没有整页过渡：路由组件套在 `<keep-alive>` 里，切走再切回来不重新挂载 ——
列表不用重新渲染、滚动位置还在、日志和下载器也不必重新拉一遍。`<transition>` 和
keep-alive 一起用会死锁（离场组件被移进 keep-alive 的隐藏容器，leave 过渡永远收不到
结束事件，`out-in` 就一直等在那儿，路由卡死在上一页），所以整页淡入淡出这一层直接不要，
入场动效留在页面内部的卡片和列表上。

## 安装

### 一行装好（推荐）

Linux / macOS / NAS / Docker 宿主机：

```bash
curl -fsSL https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.ps1 | iex
```

脚本会问两件事：webui 目录在哪、装哪一款（序号或 id 都行），然后自己下载解压。
**在线播放器包含在每个包里**，不用单独选。
填配置目录也行 —— 认出 `config.v2.json` 后会自动补上 `webui/`。
已有内容会先备份成 `webui.bak.<时间戳>`。

非交互（脚本自动化用）：

```bash
curl -fsSL .../install.sh | bash -s -- --dir /vol1/docker/ani-rss/config/webui --ui vue -y
```

```powershell
$env:ANIRSS_WEBUI_DIR='D:\ani-rss\config\webui'; $env:ANIRSS_UI='vue'
irm .../install.ps1 | iex
```

### 手动装

[Releases](https://github.com/zzzwannasleep/ani-rss-themes/releases) 里十一个包，一款一个，**挑一个**解压到 `webui/`：

| 压缩包 | 下载 | 解压后 |
|---|---|---|
| `ani-rss-webui-acg.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-liquid-glass.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-vue.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-github.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-material.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-win98.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-argon.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-macintosh.zip` | ~15 MB | ~43 MB |
| `ani-rss-webui-synology.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-ab.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-mp.zip` | ~14 MB | ~42 MB |

界面本体只有 1.6 MB（`macintosh` / `win98` 多 0.5 MB，那是点阵字体），其余全是播放器的 wasm。**每个包都自带播放器** ——
在线播放本来就是 ani-rss 的功能，我们只是把它自带的播放器换成支持 ASS 特效字幕和 HDR 的那个；
拆成两个包只会让人少装一个，然后以为坏了。

```
{configDir}/webui/
├── index.html
├── webui.json             版本信息，ani-rss 靠它检查并在线更新这套界面
├── manifest.json          装到手机主屏用的清单
├── sw.js                  离线兜底，只缓存界面自己，不碰 /api/
├── favicon.ico            标签页图标；图形取自上游 ani-rss，见 webui/ICONS.md
├── icon-*.png             主屏图标（192 / 512 / maskable / apple-touch）
├── assets/
└── player/
    └── play.html
```

`{configDir}` 的确定顺序（`ConfigUtil.getConfigDir()`）：环境变量 `CONFIG` → 当前工作目录下的
`config/` → Windows/macOS 为 `~/ani-rss`，其他系统为 `config`。

放完**刷新页面**就生效。ani-rss 3.2.15 以前静态资源那条链是带缓存的（`resourceChain(true)`），
放进去的文件要重启才认；3.2.15 起改成了不缓存，刷新就够。**3.2.15 以下仍然要重启。**
想换回自带界面，把 `webui/` 清空或改名（3.2.17 起可以直接在网页上点，见下）。

> qBittorrent 的替代 WebUI 要求产物根目录下有 `public/` 子目录，**ani-rss 没有这个要求**，文件直接放 `webui/` 根下。

### 之后的更新：设置 → 关于

装好一次以后就不用再下压缩包了。「设置 → 关于」里第二张卡就是这套界面自己：
左边是当前版本号，右边是「已是最新」或者「有新版本 x.y.z」，有新版时下面多一颗
**更新界面到 x.y.z** —— 点了后端去 GitHub 取对应的包，校验大小和 sha256，
**清空 `config/webui/` 再解压**，完事页面自己刷新，这一路不用重启 ani-rss。

两个前提：ani-rss 得是带 `/api/webui/*` 的版本（3.2.16 起），包里的 `webui.json` 不能删。
往 `config/webui/` 里放过自己的文件的话先备份 —— 更新是整个目录换掉。

`webui.json` 只有一份，就在包的根目录：在线更新读 `config/webui/webui.json`，
上传界面时后端查的也是 `ZipFile#getEntry("webui.json")` —— 同一个位置。

> 有过一版 3.2.17 的构建把它找去了 `config/webui/webui/`（`new File(webuiDir, "webui/webui.json")`，
> 而 `webuiDir` 本身就是 `config/webui`，多了一级），装在那种镜像上后端一律回「无 WebUI 更新」。
> 上游 `81f43b5` 已经改回来了，同一个版本号重新推的，重新拉一次镜像即可。

#### 后端查不了的时候，界面自己查

关于页把三种情况分开说，不再一律甩一句「当前 ani-rss 不支持在线更新界面」：

| 状态 | 什么情况 | 界面怎么做 |
|---|---|---|
| `ok` | 后端查得到 | 照旧，有新版给「更新界面到 x.y.z」，下载解压都在服务器上跑 |
| `unsupported` | 3.2.16 以前，压根没这两个端点（回 `{code: 404}`） | 只显示版本号，提示去 Releases 手动装 |
| `broken` | 有端点，但后端找不到 `webui.json` | 界面**自己**去 `api.github.com` 问一次，照样显示「有新版本 x.y.z」和更新内容，主按钮换成「下载 x.y.z 的包」 |

`broken` 这一档现在主要是两种人：镜像还是那版路径写错的 3.2.17，
或者 `config/webui/` 是自己攒的、里面没有 `webui.json`。两种都不该看到「不支持」。

备胎只查版本、不下载：GitHub 的发布资产最终落在 `release-assets.githubusercontent.com`，
那个响应**不带 `Access-Control-Allow-Origin`**（实测 302 之后的 206 里没有这个头），
浏览器 `fetch` 拿不到；`api.github.com` 本身是带 CORS 的，所以查得动。
下载只能让浏览器自己去（`<a>` 导航不受同源策略管），下完在「更换界面」里传上去。

备胎读的也是 `config/webui/webui.json`（自己这个源上的静态文件，不走接口），
owner / repo / filename 都在里面，所以十一款各查各的包，不会串。

关于页上有**两段**更新内容，各归各的：「ani-rss 更新内容」是上游那个程序的，
「〈款名〉WebUI 更新内容」才是这套界面的。两段都常显，不再要求「有新版才显示」——
以前挂在那个条件上，而版本号长期不涨，于是界面那段一次都没露过面，
页面上唯一看得见的「更新内容」是 ani-rss 那一段，看着就像界面在拿别人的更新充数。

正文按 Markdown 渲染（标题、列表、代码块、表格、引用、链接都认）。
渲染器是自己写的一小段（`webui/shared/markdown.ts`），不引 marked / markdown-it：
正文是 GitHub Release 里别人写的内容、跨网来的，那两个库都得再配一个 DOMPurify
才敢塞进 `v-html`，两个依赖 ~50KB 还要乘以十一款。这段的做法反过来 ——
**先把整段转义成纯文本，再往里加自己生成的标签**，所以不存在「漏过滤了某个标签」，
因为压根没有过滤这一步。协议白名单只放行 `http(s)` / `mailto` / 站内路径，
`javascript:` 之类连 `href` 都不给。`shared/markdown.test.ts` 里有 15 条注入用例。

### 在网页里换界面 / 还原（ani-rss 3.2.17 起）

上游 `test` 分支 3.2.17 加了两个端点（`/api/webui/upload`、`/api/webui/delete`），
「设置 → 关于 → 更换界面」这张卡就是它们：

- **上传并切换** —— 选一个界面压缩包传上去，后端先清空 `config/webui/` 再解压。
  下载来的十一个包直接选中就行，不用解压、不用登服务器、不用碰 Docker 卷。
  校验只看一条：zip 的**根目录**里得有 `webui.json`，多套一层目录会被拒（「上传 WebUI 失败」）。
  包大小上限是后端的 `spring.servlet.multipart.max-file-size` = 50MB，十一个包都在 15MB 上下。
- **还原自带界面** —— 把 `config/webui/` 整个删掉。静态资源的第二个来源是 jar 里的 classpath，
  目录一没就退回 ani-rss 自带的那套界面。想换回来再传一次包。

两个动作都是「整套文件被换掉」，所以点完会先把 service worker 连缓存一起卸掉再刷新 ——
不卸的话它还挂在这个源上拦请求，断网时会拿旧界面的 `index.html` 顶替新界面。

老版本 ani-rss 上这两个端点是 404，按钮照样显示，点了会直说「需要 3.2.17 及以上」。
**故意不跟着「检查更新」那块一起隐藏** —— 这两件事是分开的：更新检查要读得到 `webui.json`，
换界面不用。有过一版 3.2.17 的构建正是「更新检查坏了但换界面好使」，
跟着藏的话按钮恰好在最需要它的那个版本上看不见。

### 装到手机主屏

十一款都是 PWA。手机浏览器打开后：

- **Android / Chrome**：菜单 →「添加到主屏幕」或地址栏里的安装按钮
- **iOS / Safari**：分享 →「添加到主屏幕」

装上之后没有地址栏，状态栏颜色跟着当前皮肤走，十一款各是各的。
Service Worker 只兜界面本身：`/api/` 一个都不缓存（订阅状态、下载进度是活数据，
缓存一次就是骗人），带哈希的 `assets/` 走缓存优先，`index.html` 走网络优先、
断网才退回缓存 —— 所以升级后打开就是新版，不用手动清缓存。

> **必须是 https 或 localhost。** 局域网 IP 直连（`http://192.168.x.x:7789`）下
> 浏览器不给 Service Worker，安装按钮也不出现 —— 这是浏览器的硬规矩，不是这边没做。
> 想在手机上装，前面挂个带证书的反代。

### 自己构建

```bash
pnpm -C webui install --frozen-lockfile
pnpm -C webui run build:all -- --only vue     # 不带 --only 就是十一款全建
node webui/shared/tools/pack.mjs vue --player ../webplayer/dist
```

单款产物在 `webui/dist/<id>/`，组装结果在 `dist-webui/<id>/`。
推上 `main` 会由 GitHub Actions 自动构建并发布上面那十一个包。
Release 的标签就是版本号本身（`1.0.37`，不带前缀）—— 包里的 `webui.json`、
关于页显示的那个号、Release 的 tag，三者是同一个数，ani-rss 拿它跟 tag 比对来判断有没有新版。

**补丁位由 CI 自己涨**：`大.小` 取自 `webui/package.json`，补丁位换成
GitHub 的 `run_number`，于是每推一次 main 就是一个更大的新版本号。
以前直接用 `package.json` 里那个手写常量，结果每次都发同一个 `1.0.2` ——
两个数永远相等，装过一次的人此后再也收不到更新提示。
想发大小版本就改 `package.json`（比如 `1.1.0`），补丁位它自己接着涨。

发布说明开头会自动列出**自上一个版本 tag 以来的提交**（`## 更新内容（自 x.y.z 以来）`），
底下才是安装说明。关于页上那段「WebUI 更新内容」读的就是这份正文 ——
以前从头到尾只有安装说明，装十次看到的是同一段话，「这一版改了什么」一个字都没有。

## 开发

```bash
cd webui
VITE_PRESET=github VITE_API_TARGET=http://<你的 ani-rss> pnpm run dev
pnpm run typecheck
pnpm run build:all -- --demo    # 十一款演示构建（假数据，Pages 预览用的就是它）
pnpm test                       # 主题 / 接口地址 / 外部播放器的断言
pnpm run test:mobile            # 手机宽度版式体检，要先有 --demo 产物
pnpm run test:dialogs           # 添加订阅那条链路的行为体检，十一款轮流跑，同样要先有 --demo 产物
pnpm run test:layout            # 弹窗/页面的裁剪与按钮间距体检，也要先有 --demo 产物
```

`test:layout` 的尺子和 `test:mobile` 不是同一把：那一份拿视口量，这一份拿「最近一个会裁剪的祖先」量，
另外还查同一行相邻两颗按钮之间有没有 8px 缝。**这两份的门限是分开写的**
（mobile 认 4px、layout 认 8px，8px 是 M3 的最小档），所以按钮间距只能往 8px 上靠 ——
vue 那款的订阅行 `.actions` 原来写 4px，过了 mobile、每次 layout 必红 28 处，现在对齐到 8。
判据细节见 [`webui/shared/tools/README.md`](webui/shared/tools/README.md)。

`test:mobile` 用无头 Chrome/Edge 跑十一款 × 360/390/414 × 13 条路由，
只认可判定的事实：整页横向滚动、元素伸出视口、可点元素不足 36px、
固定元素压住按钮、相邻两颗按钮之间不足 4px（贴成一条，分不出是两颗）、
控件里的短文本放不下（占位文字被截、chip 里的字漫出框外）、
点阵字那两款的字号是不是都落在 12 的整数倍上（不在格上就发虚，见下面「字体」一节），
以及订阅页上「一条订阅的八个动作」是不是一个都没丢 ——
最后这条是拿真点击验的：图标行上看得见的 ∪「更多」菜单里点得到的，两边并起来必须齐。
它防的是最贵也最静默的一类 bug：拿 CSS 把图标行里多出来的按钮 `display: none`，
而菜单是按「一颗没藏」算的，藏掉的那颗于是哪儿都不在 —— 「编辑」这么消失过两次。手机上的毛病看截图很难认（「按钮被顶出去 11px」和「有点挤」长得一样），
vue-tsc 和单元测试又完全看不见 CSS，所以单开一份。
本机没装浏览器时它直接跳过并返回 0，不会卡住别人。

`test:dialogs` 查的不是长相，是**发出去的请求对不对**，外加**新做的那条队列走不走得通**。
它只做一件事 —— 把 `window.fetch` 包一层记流水，真点一遍下面五条路，再核对 URL 和请求体：

- 浏览 Mikan → 点开一部番 → 切到 AniBT → 点开一部番：列表要重拉，`bgmId` 必须是番剧 id
- Mikan 挑一个字幕组 → 进队列 → 关掉 → 切到 AniBT 手填地址 → 解析：
  上一次挑的 Bgm 条目 / 字幕组 / 匹配规则一样都不许跟过来
- 队列里那一步必须有「预览」，且里面不该出现「删除种子」——
  那要拿订阅 id 去下载器里找任务，这条还没入库
- 从队列里的编辑框点开三家番剧列表：各家收到的定位条件不能串（主 RSS / 备用 RSS 两排各一遍）
- 同一部番勾两个字幕组 → 「下一步」：该合成**一条**订阅，第二个进备用 RSS
  并跟着 `standbyRssList` 一起交上去；撞名时要先问一次「订阅重复」，
  点了「覆盖原订阅」才带 `override=true` 重发

最后一条里的撞名分支在演示站上永远走不到（假后端一律回成功），所以那个 fetch 包装层
会按需伪造一次「订阅标题重复」—— 那是整条链路里最贵也最容易写错的一支：
少了 `override` 就永远覆盖不上，少了静默就变成「先弹红字、再问要不要覆盖」两个提示打架。

前两条防的是同一类毛病：**状态跟着人跑**。三家番剧源共用同一个弹窗实例，
上一家的东西留在原地就会拿 Mikan 的地址去 AniBT 取字幕组，后端原样转出去、对面回 400。
这类毛病界面上一点看不出来：列表照常显示，坏的是发出去的请求。
上游 3.2.48 之后「挑完直接进队列」把第二条那个形状整个消掉了，
所以它改成量新路的两个落点（挑回来的那条只进队列、手填那一栏拿不到上一家的东西）。

十一款都跑：五条路走的是同一批共用组件，但入口按钮是各款自己画的 ——
同一颗「添加订阅」，群晖那款叫「新增」，麦金塔那款叫「新建订阅…」。
只测一款，另外十款的入口什么时候断了都不知道。

> 换款之前必须先跳 `about:blank`。`Page.navigate` 到一个只有**片段**不同的地址
> （上一轮停在 `#/login`，下一轮要去 `#/`）会被当成同文档跳转：不重新加载，只改 hash。
> 而每一款是靠换静态目录发出去的 —— 文档不重载，等于把同一款量了九遍，还九次全绿。
> 这种「假绿」比报错危险得多，它看着像做过了。一款一款分开跑时碰不到，所以藏了很久。

`VITE_PRESET` 不给默认是 `vue`。**后端地址走环境变量，不写进仓库**（也可以放进不进版本控制的
`webui/.env.local`）—— 地址、端口这类东西一旦硬编码进去，之后就没人会去清了。

## 字体是带在包里的

三款界面的身份系在一款具体的字上，而那三款字**在用户机器上基本都不存在**：

| 界面 | 要的字 | 不带的话实际用到的 |
| --- | --- | --- |
| `vue` | Inter（VitePress 的字） | 系统 UI 字体 —— 装了 Inter 的人少之又少 |
| `material` | Roboto（M3 的字重和字距全照它定） | 系统 UI 字体 —— 只有安卓自带 Roboto |
| `win98` / `macintosh` | 12px 点阵中西文 | 手机上是系统黑体，一点不像 1998 年 |

所以这三份字随产物发，放在 `webui/src/fonts/`，`@font-face` 写在**预设**的 `preset.css` 里 ——
只有用得上的那一款的产物里才有它，不会十一个包各背一份。
皮肤只在字体栈里点名，两边靠字体族名对上。

拉丁那两份只带拉丁（各 40~50 KB，可变字重）：中文那份要 5 MB 以上，
而 VitePress 和 M3 的中文版本来也是把汉字交给系统字体的。

点阵那份 537 KB，`win98` 和 `macintosh` 共用。选它不选 98.css 那份 6 KB 的
Pixelated MS Sans Serif，是因为**中文版 Windows 98 的界面字根本不是 MS Sans Serif** ——
那是英文版的；中文版整套界面用的是 12px 宋体点阵，连里面的英文数字也是宋体的点阵拉丁。
而且那份字是按 11px 设计的，中文点阵字是 12px 一格，拼在一起必有一边不在整数像素上，
1px 宽的笔画一放大就糊成灰。方舟像素 12px 是「一格正好一个像素」，中西文同一套网格。

代价是这两款的**字号只能取 12 的整数倍**，于是全站只有 12px 这一个字号 ——
这既是硬约束，也正好是原版的样子（那个年代的界面本来就只有一个字号，
层级靠粗体和位置分）。粗体也不用浏览器合成（合成 = 把 1px 笔画抹粗 = 发虚），
改成「错开一像素再描一遍」，那正是当年点阵字加粗的做法。
`pnpm run test:mobile` 里有一条专门查这个：字号除以 12 不是整数就报出来。

## 几个绕不开的约束

这些不是风格选择，是上游机制决定的：

- **必须 hash 路由。** 后端用 `registry.addResourceHandler("/**")` 把 `webui` 挂成静态目录，
  没有 SPA fallback —— 直接访问 `/settings` 或在该路径刷新一律 404。`#/settings` 则永远只请求 `index.html`。
- **`base` 必须是相对路径。** 反代挂在子路径下时，绝对路径的 `/assets/...` 会 404。
- **接口地址相对当前页面目录**，不硬编码 `/api`，同样是为了子路径反代。
- **登录密码传 MD5**，不是明文（`Login.password` 的注解写明「密码 (MD5摘要)」）。
  设置页里改密码同理，留空表示不修改 —— 空串的 MD5 是个合法摘要，会把密码真改成空。
- **令牌有三套用法**：常规请求走 `Authorization` 头（无 `Bearer` 前缀）；
  封面图和文件下载这类设不了请求头的走 `?s=<token>`；
  ICS 日历和 Emby Webhook 走 `?api-key=<配置里的 apiKey>`，因为那是给外部系统长期用的，登录令牌会过期。
- **令牌存 `localStorage['authorization']`**，与自带界面同键 —— 在自带界面登录过的人切过来就已经是登录态。

页面显示偏好（`show-score` / `show-week` / `show-last-download-time` / `max-content-width` /
`startup-page` / `cover-click-action`）也沿用上游同名的键，切换界面时设置不丢。
`show-playlist` 那个键在上游 3.2.52 被删掉了（视频列表入口改成常驻），我们跟着删。
`max-content-width` 的默认值跟着上游从 1600 提到 3200（超宽屏上 1600 之外全是空边）——
已经存过值的浏览器不受影响，那是本人自己拉过的宽度。

`startup-page` 是上游 3.2.20 加的「启动页」。它只有 `/home`（总览）和 `/subscriptions` 两个值，
我们这边默认是空串 —— 「跟随当前界面的落地页」。写死一个路径会把预设之间的差异抹平：
github 那款没有总览，落地页本来就是订阅列表。从自带界面切过来时 `/home` 翻译成 `/dashboard`，
落到没有总览的预设上则回落到该款自己的落地页。

## 功能覆盖

后端 71 个接口（24 个 controller）全部封装，界面侧对齐上游 70 个 `.vue`：

- 登录、Bangumi OAuth 回调；还在用出厂账号密码时登录后提醒一次（上游 3.2.62 的 `isDefault`）
- 订阅：列表（海报/表格、按星期分组、拼音与首字母搜索）、增删改、批量启用/禁用/刮削/更新总集数
- 添加订阅五个来源：RSS 地址、Bangumi 搜索、Mikan、AniBT、AnimeGarden —— **全部汇进同一个「确认订阅信息」队列**
  （见下面「添加入口只有一个」）
- 番剧列表里每个字幕组的组名右边标「已订阅」——**主 RSS 与备用 RSS 都算**，悬停额外给出是哪条订阅。
  URL 先归一（去尾斜杠、scheme/host 小写），否则同一个组会因为两边的写法差一个斜杠而漏判。
  这标记在「添加订阅 → 某站 → 浏览番剧列表 → 展开一部番」里面 —— 演示站上会自动展开第一部，
  否则五层点下来才看得到，谁都以为它没生效
- 订阅编辑四个标签页（基本 / 备用 RSS / 自定义 / 其它），含自定义集数规则、路径、上传、完结迁移、重命名模版、标签、优先保留
- 预览匹配结果（含遗漏集数推断）、合集下载、导入订阅、封面重抓、Bangumi 评分、视频列表
- 下载器任务（可见时轮询，3 秒）、删除任务
- 日志（可见时轮询、时间/级别/类名列、级别与类名多选过滤、跟随最新、下载、清空）
- 设置 8 个标签页 / 基本设置 9 个折叠面板 / 通知 11 种类型（含 AstrBot）
- 备份导入导出、缓存清理、检查更新、重启与停止服务

### 播放

在线播放用 [webplayer](https://github.com/zzzwannasleep/webplayer)（LinWeb）。

它不是又一个 `<video>` 皮肤：容器在浏览器本地被拆开、重新封装成 fragmented MP4 交给 MSE，
编码码流原封不动，零转码。所以 **mkv 能放**，ASS 特效字幕由 jassub（libass 的 wasm 移植）
完整渲染，PGS 图形字幕走 libpgs，HDR / Dolby Vision 也在。

它是独立的静态站，不打进本 WebUI 的产物（那要连 wasm 一起 vendor，还会丢掉它自己的播放界面），
而是并排放在 `webui/player/` 下，由本界面的 `#/play` 路由整屏 iframe 引入。
两边同源，所以 webplayer README 里对 Emby 场景强调的混合内容与 CORS 两道墙，在这里天然不存在。

#### 装它

不用单独装 —— 十一个发布包里都带着。自己构建见 `webui/shared/tools/pack.mjs` 的 `--player` 参数。

**体积**：播放器下载 13 MB、解压后 40 MB —— 其中 `vendor/ffmpeg-core.wasm` 独占 31 MB（音频转码用），
`jassub-worker*.wasm` 各 2 MB（ASS 渲染），`anime4k.js` 3.4 MB。界面本体只有 1.6 MB。

### 已知没做的

- **没有在真实 ani-rss 实例上跑过。** 类型检查、构建、主题自检都过了，接口签名逐个对着后端源码核过，
  但端到端联调没做 —— 手上没有可连的实例。

## 类型是生成的，不是手抄的

`webui/shared/types.ts`（77 个 interface / 11 个枚举）由 `webui/shared/tools/gen-types.mjs`
从上游 Java 实体直接抽取，带字段数自校验：生成结果和源码里的 `private` 字段数对不上就直接失败。

这么做是因为 `Config` 有 121 个字段、`Ani` 55 个、`NotificationConfig` 52 个 —— 手抄必错。
实际开发中这套自校验揪出过 4 个静默丢字段的解析 bug（注解里的嵌套括号会吞掉整个字段、
类注释会吞掉每个类的第一个字段等），全都不报错、只是少东西。

上游改了字段就重跑一次生成器，diff 即本次接口变更。用法见 [`webui/shared/tools/README.md`](webui/shared/tools/README.md)。

最近一次重跑对的是上游 `0444b79`（**3.2.63**，2026-11-22），接口面 diff 出四处，端点数没动（还是 71）：

- **`Config.offsetType` + `OffsetTypeEnum`**（3.2.56 `598c689`「新增自动偏移类型，可跟随 Bangumi 自动偏移」）。
  原来只有一个是非题（`Config.offset`），现在拆成两套算法：`AUTO_OFFSET` 按 RSS 最小集数本地对齐，
  `BGM_OFFSET` 跟着 Bangumi 条目的放送日期算。设置页「添加订阅」里多一格下拉，
  挂在「自动推断剧集偏移」下面并跟着它置灰 —— 总开关关着的时候选哪种算法没有意义。
  老后端上没有这个键，读出来是 `undefined`，控件显示为空，保存时原样传回，那边忽略。
- **AstrBot 通知**（3.2.58 `62f613b`「增加 AstrBot 通知」+ 3.2.59 `f470cb9`「支持发送图片」）。
  `NotificationTypeEnum` 多一个 `ASTRBOT`，`NotificationConfig` 多四个字段：
  `astrBotHost` / `astrBotApiKey` / `astrBotUmo` / `astrBotImage`。
  走它的 OpenAPI，发图片要在 AstrBot 那边给这枚 Key 开 `file` 权限（否则只有文字过去，那是后端的行为）。
  通知页从 10 种类型变成 11 种，字段表在 `notificationSchema.ts`，和其余十种同一套渲染器。
- **`Login.isDefault`**（3.2.62 `4332062`「增加修改默认登录信息提示」）。后端拿它标记
  「用户名密码还是出厂那组」。上游是在主壳里弹一次对话框、可以「不再提醒」；
  我们那处写在 `components/common/DefaultLoginNotice.vue`，挂在 `App.vue` 上 —— 十一款外壳各写一遍不合适。
  「不再提醒」**沿用上游的 localStorage 键**（`hide-default-login-reminder`），
  两套界面切着用，关过一次就是关过。设置页保存后 `isDefault` 变 false、`config` 重拉，对话框自己消失。
  老后端没这个字段，`undefined === true` 不成立，一次都不弹 —— 3.2.5x 上的用户不会每次登录被拦一下。
- **AnimeGarden 封面接口换了图床**（3.2.58 `47e160d`）：后端不再从 `bgmCover` 缓存里取，
  直接拼 `https://bgm.animes.garden/bangumi/subject/{id}/poster.jpeg?quality=small`。
  我们这边的 `posterUrl()` 只处理「宽高都给了」的方框裁剪参数（Mikan 那种），新地址带的是
  `quality=small`，原样交给 `api/proxyImage` —— 不用改，但记一笔免得下次有人以为漏了。

同一区间里其余几条是纯后端（3.2.53 MCP 支持编辑删除订阅、3.2.55 `BGM 日期解析`、
3.2.54 `优化重命名`、3.2.57 `优化偏移`、3.2.60 安装脚本、3.2.61 播放器懒加载），
界面侧没有要跟的接口。上游 3.2.61 把自带播放器改成动态 `import()` 以缩小首屏包体 ——
我们走的是 webplayer（独立的静态站，`#/play` 整屏 iframe），这条路本来就不背它的包。

上一轮（`c5ca167`，**3.2.52**）接口面 diff 出六处 —— 那一轮上游的
WebUI 交互改动很大，接口面的变化多半是那些改动的下游：

- **`addAni` 多了 `override` 参数**（3.2.48 `9000616`）。以前「重名怎么办」是设置里一个全局开关
  （`Config.replace`），现在是添加那一步撞名才问一次；`Config.replace` / `Config.copyMasterToStandby`
  两个字段被删了。兼容做在 `shared/api.ts`：`addAni(ani, override)` 多带一个查询参数，
  老后端（Spring 不管多出来的查询参数）忽略它、行为退回原来的全局开关；
  那两个键在设置页里留着并标注「3.2.48 前 / 3.2.52 前」—— 老后端上它们还在生效。
  撞名时问的那一次在 `AniBatchDialog`，重发仍失败会直说「需要 3.2.48 及以上」，
  不把同一句「订阅标题重复」再弹一遍让人以为没点着。
- **`api/getSubtitles` 与 `PlayItem.subtitles` 被删**（3.2.46 `d6f20f3`「WASM 播放器」）。
  上游换成 movi-player 之后，容器在浏览器本地拆开，字幕轨由播放器自己顺手取，
  服务端再抽一遍是白跑一趟。我们走的是 webplayer，同一个道理 —— 所以这份封装直接删掉。
  但播放列表里「同一集有简繁两条外挂字幕，先挑一条」是靠 `PlayItem.subtitles` 的，
  3.2.46 以前的后端照旧会带回来：那份形状补在 `shared/api.ts` 的 `LegacySubtitle` 里
  （别写回 `types.ts`，下次重跑生成器会被覆盖），新后端上这个列表恒为空，
  选字幕那一步自然不出现。
- **`RssToAniDTO` 多了 `standbyRssList`**（3.2.48 `bd69f45`）。同一部番挑了好几个字幕组时，
  一次把「主源 + 备用源」整份交上去。我们两边都给：DTO 上带一份（新后端认），
  返回值上没有就自己补一份（老后端认不了这个键）—— 补是幂等的。
- **`Item` 多了 `torrentPath`**（3.2.42 `db375d7`，种子从内存挪到文件之后才有的位置）。
  预览面板的种子那一列多了一颗「位置」，点开弹窗看整条路径 —— 那一列只有 150px，
  路径上百个字符塞进去会把「改名后」挤没。
- **`CollectionInfo.torrent` 收掉了磁力链接**（3.2.38 `b4fc29a`），只收 `.torrent` 的 base64。
  合集下载框里那个「种子文件 / 磁力链接」二选一整个去掉 —— 磁力要先在服务端 DHT 上把
  元数据捞回来才认得出里面有哪些集，慢的时候几十秒，而「预览命中哪些集」正是这个框存在的理由。
  磁力链接仍然可以从「其它 RSS」那条路进来。
- **OpenList 下载器整个删除**（3.2.44 `fdb3afe`）：`OpenList.java` / `OpenListUtil.java` /
  `MagnetTorrentUtil.java` 连类一起没了，`Config` 上的 `provider` / `openListDownloadTimeout` /
  `openListDownloadRetryNumber` 和 `OpenListTaskInfo` 一起消失。设置页里那一支仍然只标注不置灰，
  标注改成「3.2.44 起已移除」—— 3.2.44 以前的后端上它还能用，置灰了已经在用的人连当前值都看不见。

端点数从 72 变成 71：`getSubtitles` 没了，`addAni` 多了个参数不算新端点。

### 添加入口只有一个（这一轮借的那处交互）

上游 3.2.48（`bd69f45`「优化订阅添加流程」）把原来那套「每个来源各写一遍批量添加」
收成了一个多标签弹窗。以前（我们和上游都是）是这样：

```
选几个字幕组 → 点「批量添加」→ 一个进度条 → 全加完 → location.reload()
```

问题在于**中间那一段什么都看不见**：哪一条解析失败了、规则挑错没有、标题刮成了哪一部，
全都要等入库之后回到列表里才发现，而那时候删了重加更麻烦。

现在所有新增订阅的路都汇进 `AniBatchDialog`：

- 每个字幕组是一条标签，**串行**解析（并发一堆 rssToAni 等于把后端同时按在好几个
  RSS 站上，被限速就是整批都废），标签上挂着状态（加载中 / 待确认 / 失败）；
- 解析好的直接摆出完整的订阅编辑框 —— 标题、季度、匹配规则、备用源都能当场改，
  点「添加」才入库，这一条从队列里消失、自动切到下一条；
- 失败只废掉那一条，后面的照常往下走，失败的那条可以「重试」或「跳过」；
- 撞名时问一次「覆盖原订阅」（覆盖会把原来那条删掉再建，所以套的是危险确认那一层）。

配套的两处：**手填 RSS 和 Bangumi 搜索也走同一个队列**（单条），不再各走各的第二步；
**勾复选框时会先弹「选择要下载的版本」**——以前勾了就直接进篮子，挑的规则没有任何地方能选，
于是批量加进去的订阅一律「全部版本」，一集下好几遍，而单条添加是有这一步的。

实现上，`AniEditDialog` 多了一个 `embedded` 开关：置上就不出外层的 `v-dialog`，
把表单本体交给队列弹窗摆进每个标签页里（上游是把 `Ani.vue` 和 `EditAni.vue` 拆成两个文件，
我们多一个开关就够，不用再加一层纯转发的组件）。队列本身在 `useAniScreen` 里，
十一款界面共用那一份 —— 入口按钮是各款自己画的，队列长一样。

顶上那条队列是**自己排的，不用 `v-tabs`**。刚跟 3.2.52 那一版用过一次，一天就看出问题：
Vuetify 的 `.v-tab` 其实是 `.v-btn`，`min-width: 90px` 写在 `.v-tab.v-tab.v-btn`（(0,3,0)）上，
组件自己那条 `.queue-tab` 加 scoped 也才 (0,2,0)，改不动；内容又包在不收缩的
`.v-btn__content` 里，番剧标题一律 nowrap —— 宽度钉死、内容缩不动，字就漫出按钮盒子
压到隔壁那条上，看着像「标题糊在一起」。条数再多一点，后面的被这些宽盒子挤出可视区
（slide-group 只在有箭头时才替你挪），点都点不到。

现在是 flex 胶囊 + 横滚容器：名字 `ellipsis`、条与条之间 8px、每条上限 260px，
溢出的部分由容器滚过去 —— 滚轮（竖向滚一格转成横向）、中键按住拖、两端箭头三条路，
切到哪一条就把它滚进视野；键盘 Tab 进来后左右键 / Home / End 换条。
1 条时不显示箭头（没什么可翻的），手机上加到 40px 高、横滑交给浏览器原生手势。
`.queue-tab` 这个类名没换 —— `test:dialogs` 靠它数队列里有几条。

「订阅布局」那个卡片/封面二选一也去掉了（3.2.40 `62a27b7` 上游删的 `subscriptionViewMode`），
封面菜单补上「刮削 / 强制刮削」（同一提交加的），「显示视频列表入口」这个开关跟着上游删掉 ——
视频列表本来就是订阅上最常点的一项，藏起来之后大多数人再也想不起来它存在。
「点击封面」的默认值也跟着上游从「换封面」改成「编辑订阅」（3.2.38 `656ef14`）：
换封面是低频动作，点封面十次有九次是想改订阅。

#### 这一轮**没**跟的几处

都是上游界面自己的版式调整，我们的实现本来就不一样、体检也都是绿的，硬跟只会把
十一款已经成立的东西拆开重排。列在这儿是让下一轮知道「不是漏了，是看过了」：

- `62a27b7` / `c7e91f6` / `8c77fac` 的「优化封面展示」：上游把 `备用RSS` / `更新时间`
  从海报下方的渐变里挪出来、压成封面底下一排 `el-tag`，另加一个 `ova`/`tv` 标签。
  我们的海报卡渐变里放的是「集数 · 字幕组」，本来就没有那两样挤在一起的问题；
  上游那排标签和它们语义重复，照搬会变成同一件事写两遍。
- `90e67a0` / `fb2df49` / `62398ca` 的移动端版式：总览指标卡窄屏排两列、搜索框占整行、
  备用 RSS 表格限宽。这三处我们各是各的写法，`test:mobile`（十一款 × 三档宽度 × 13 条路由）
  和 `test:layout`（390px）都没报出问题 —— 没有毛病就不改。
- `36230b4` / `c8d06d8` 的下载列表：上游把卡片底部的标签条和体积行重新排了一遍。
  我们的下载页是「宽屏表格 + 窄屏卡片」两套，本来就是另一个形状。
- `e2891b8` 排除布局、`AboutView` / `AfdianView` 的按钮排布、`SettingsItem` 的 `labelWidth`：
  上游用的是 Element Plus 的网格和 `margin`，我们这边是 Vuetify 的 `d-flex` / `ga-*`，
  对应的问题（按钮贴成一条、标签宽度不够）我们的体检里都有专门的规则在管。

另外两处是后端默认值，界面这边不用动：`e34893f` 把新装的默认
`renameDelYear` / `renameDelTmdbId` 从 `false` 翻成 `true`（老配置不受影响），
`249f7fe` 把默认配置的构造从 `ConfigUtil` / `AniUtil` 挪进了 `DefaultConfigFactory` / `DefaultAniFactory`。

上一轮（`3e33b7f`，**3.2.37**）接口面 diff 出两处：

- 导出 / 导入备份改名（3.2.37 `53dfa23`）：`exportConfig` / `importConfig` 挪进新的
  `BackupController`，改叫 `exportBackup` / `importBackup`，老名字直接删了、没留别名 ——
  只认一边，另一边的后端上点「导出」「导入」就是一句「404 Not Found !」。
  兼容做在 `shared/http.ts`：`postRenamed` / `fileRenamed` 先打新名字，回 404 才打老名字，
  认的是端点在不在、不是版本号；只有试新名字时那一下 404 不提示，新端点真报错照常弹。
  导出顺带从 `<a href="...?s=令牌">` 改成 fetch 拿 zip 再存盘：令牌回到请求头，
  出错走全局提示，不再在新标签页里摊开一段 JSON。断言在 `shared/http.test.ts`。
  「自动备份」那两项跟着上游从「其他」挪进了「备份」面板。
- `CollectionInfo.torrent` 从「种子 base64」变成「种子 base64 或磁力链接」（3.2.34 `6b7dde8`，
  后端看开头是不是 `magnet:?` 分流）。合集下载框加了「种子文件 / 磁力链接」切换。

另外两处界面侧跟着上游改的：设置里「代理设置」「登录设置」改叫「代理」「安全」（3.2.36）。
OpenList 那一支当时是「3.2.33 起在后端禁用」，标注成「已停止支持」——
到 3.2.44 上游连类一起删了，标注跟着改成「已移除」（见上面那一轮）。
上游 3.2.29 的「点击封面」（编辑订阅 / 视频列表 / 编辑封面）也跟了，键沿用它的 `cover-click-action`。
十一款的封面长在不同地方（整张海报、左侧缩略图、套件图标、Finder 图标……），各自接到
`useAniScreen` 的 `coverClick` 上，多选模式下点封面仍是勾选。默认值随预设：
macintosh / mp 原本点封面就是打开编辑，默认「编辑订阅」保住手感；其余跟上游默认 ——
上游 3.2.38 把它的默认从「换封面」改成了「编辑订阅」，这里跟着改（见上面那一轮）。
github 那款是纯文字清单，没有封面，设置里不出这一项。

上一轮（`f4d3530`，**3.2.28**）整个接口面只 diff 出一处：

- `Log` 多了 `ts`（毫秒时间戳），同时 `message` 里那截 `日期 级别 [线程] 类名 - ` 没了，
  只剩正文（3.2.28 `6db60f0`）。**升级完时间会整个消失** —— 我们界面上级别和类名各有各的列，
  时间原来是混在正文里显示的，没人给它单独留过位置。
  兼容做在 `shared/logs.ts`：`normalizeLog()` 认字段不认版本号，老形状进来先把头削掉、
  时间还原成 `ts`，下游只写一套；日志页新加一列时间，认不出时间的行留空、宽度照占。
  断言在 `shared/logs.test.ts`（`node --run test:logs`）。

再上一轮（`3845c8e`，**3.2.27**）的四处，兼容都还在代码里，一并留档：

- `Config.bgmImage` 改名成 `bgmImageSize`，默认值同时从 `large` 换成 `medium`（3.2.25）。
  **这是唯一会静默失效的一处** —— 老键名后端不再认，界面上选了新值也存不进去，还不报错。
  兼容做在 `shared/api.ts`：读的时候 `bgmImageSize ?? bgmImage`，写的时候两个键一起发，
  老后端认前者、新后端认后者，不用嗅版本号。
- 登录改成 JWT：`Config` 多了 `jwtKey` / `tokenId`，`Login` 掉了 `ip` / `key`（3.2.18）。
  客户端契约没变（`POST /api/login` 拿 token，`Authorization` 头带回去），
  唯一的行为差异是 token 不再随请求续期 —— `loginEffectiveHours` 到点就掉线。
  `jwtKey` 后端读配置时会清空、写配置时会置 null，界面侧不用管。
- `ProxyTest` 多了 `title`，同时后端不再把站点标题拼进 `message`（3.2.23）—— 代理测试的提示改读 `title`。
- `Config.qbContentLayout`（3.2.18）我们早就有了，这轮只是注释跟着源码更新。

再往前一轮（对 `81f43b5`）的变更：`About` 里那堆更新字段被抽成了独立的 `UpdateInfo`
（`About` 现在是 `extends UpdateInfo` 再加一个 `version`），另外多了一个 `WebUI`
（`owner` / `repo` / `version` / `filename`）—— 正是 `webui.json` 的形状。
所以 `webuiGetUpdate()` 的返回类型从 `About` 改成了 `UpdateInfo`，
`shared/github.ts` 里那个 `WebuiMeta` 也不再手写字段，直接 `Required<WebUI>`。

端点数用 `shared/tools/extract-api.mjs` 同样核过：72 个 / 24 个 controller，
和源码里声明的路径一一对上，`/api/webui/*` 那四个都在。3.2.37 总数没变，只是备份那两个换了名字、换了 controller。
3.2.27 那轮多出来的两个是 `/api/uploadAndRead` 和 `/api/uploadAndReadToBase64`：
3.2.18 把 `/api/upload?type=getBase64` 那个开关拆成了独立端点。
我们两个都封装了但都不调用 —— 把本地文件读成文本或 base64 浏览器自己就行，
走一趟后端只是多一次往返，还多一个「后端得够新」的前提。
抽出来的表就是 [`webui/spec-api.md`](webui/spec-api.md)（方法 / 路径 / 鉴权 / 返回 / 入参），
和 `types.ts` 一样入库 —— 下次同步重跑一遍，diff 就是这一轮上游动了什么。

## 主题

11 款，在 **设置 → 基本设置 → 页面设置 → 主题** 里选。前 6 款从仓库原有的 CSS 主题迁过来，后 5 款是新写的：

| id | 名字 | 长什么样 |
|---|---|---|
| `acg` | 二次元 | 随机壁纸 + 玻璃药丸，每次刷新换图（联网） |
| `liquid-glass` | 液态玻璃 | 复刻 Apple WWDC25，胶囊控件按下回弹 |
| `vue` | Vue 文档 | VitePress 配色，顶部绿紫晕染 |
| `github` | GitHub | Primer 配色与字栈，贡献热力图格子 |
| `material` | Material Design 3 | Roboto，全圆角胶囊 |
| `win98` | Windows 98 | 银灰双层斜角，靛蓝标题栏，方角滚动条，一格一格的进度条（只在浅色下成立） |
| `argon` | Argon | 大圆角、软阴影、胶囊按钮，顶上一团很淡的主色晕染 |
| `macintosh` | 经典 Macintosh | 只有黑白：条纹标题栏、1px 黑边、硬投影、斜纹进度条（只在浅色下成立） |
| `synology` | 群晖 DSM | 干净的白面板、细灰边、DSM 蓝，桌面是蓝绿渐变壁纸 |
| `ab` | Auto_Bangumi | Soft Ink 紫：填充式控件、聚焦才长描边，Tailwind 那套软阴影 |
| `mp` | MoviePilot | Materio 紫：紫底紫面，12px 圆角卡，三层叠出来的软阴影 |

原来那些 `.css` 主题文件一个没动，只是挪进了 `legacy/`，给 ani-rss 自带界面换肤照用。

迁移带过来的是设计决策本身（字体栈、主色、圆角尺度、背景与装饰），不是原来的选择器 —— 类名体系已换成 Vuetify。
每款从 12~60KB 缩到几十行：原来要逐个覆盖 Element Plus 的上百个组件，现在 DOM 是自己的，
变量到组件的接线统一由 `webui/shared/themes/base.css` 完成。

**这一层的意义不只是省代码。** 原来的主题是贴在 ani-rss 自己的 DOM 上的，
换个版本、换个「页面设置」就可能散架；现在主题只依赖 Vuetify 的公开类名和一组自有变量，不再赌别人的内部结构。

「二次元」会向第三方公共接口请求壁纸，在选择器里标了「联网」，介意就选别的八款。
它的背景模糊和浅色下的白纱在「页面设置」里拉滑块调（默认 6px / 30%，都拉到 0 是原图），只存本机。

三个 JS 附加件没有迁：

- `legacy/js/autobangumi.js` —— 它的作用是把 AutoBangumi 的界面渲染到 ani-rss 上。现在 DOM 本来就是我们的，
  这个需求消失了，AutoBangumi 变成一款普通主题。
- `legacy/js/material-motion.js` —— 涟漪 Vuetify 自带；动态取色（种子色现算 M3 全套配色）没迁。
- `legacy/js/genshin-login.js` —— 登录页的 three.js 场景，独立且体量大，没迁。

## 目录

```
webui/
├── shared/                十一款共用，不含 UI 组件
│   ├── http.ts            传输层：Result 拆包、令牌、子路径自适应
│   ├── api.ts             71 个端点的具名封装（含几处老后端的兼容声明）
│   ├── types.ts           从 Java 实体生成
│   ├── format.ts          体积/时间/集数格式化
│   ├── player.ts          webplayer 接入：地址拼装与部署探测
│   ├── vite-mdi-svg.ts    构建期插件：扫源码，只把用到的图标打进产物（省 700KB）
│   ├── themes/            主题系统 + 11 款主题 + 自检
│   └── tools/             类型/接口生成器、产物组装、手机版式与弹窗体检
├── public/                原样拷进产物：站点图标、manifest、Service Worker（图标出处见 ICONS.md）
├── src/
│   ├── fonts/             随产物发的三份字体（点阵 / Inter / Roboto），选型见那儿的 README
│   ├── presets/<id>/      十一款各自的外壳、总览页、订阅页、控件默认值、动作签名
│   ├── styles/motion.css  动效底座：动作定义在这里，曲线由各款覆盖
│   ├── components/        弹窗、设置项、卡片、骨架屏 —— 十一款共用
│   │   └── ani/           订阅相关的弹窗与卡片；batch.ts 是「确认订阅信息」队列的类型与拼装
│   ├── views/             下载器/日志/设置/登录/播放 —— 十一款共用
│   ├── stores/            订阅、下载、日志、配置、偏好
│   ├── composables/       外壳逻辑、订阅页逻辑、主题管理
│   └── demo/              演示模式：拦掉请求用假数据顶上（只进预览构建）
├── preview-index.html     Pages 上的十一款选择页
└── tools/build-all.mjs    一口气构建十一款

legacy/                    旧的 CSS + JS 主题，给 ani-rss 自带界面换肤
├── themes/*.css           17 款
├── js/*.js                3 个附加件
├── preview/ + index.html  预览站（Pages 的根就是它）
└── fonts/
```

## 预览站是怎么发布的

`.github/workflows/pages.yml` 把 `legacy/` 铺回站点根、十一款演示构建放进 `/webui/<id>/`。

之所以改成用 Actions 发布而不是「从分支根目录发布」：仓库拆成两半之后，
线上必须保留 `/themes/xxx.css` 这个地址 —— 用户 `@import` 的就是它，换地址等于把已经装好的人的主题弄没。
（直连仓库的 githack / jsDelivr 链接不在此列，那类地址要加上 `legacy/`。）

演示构建带 `VITE_DEMO=1`：`src/demo/` 会把 `fetch` 换成一个只认识 `api/` 的假服务端，
封面是现画的 SVG，写操作一律「成功但什么也没做」。正式产物里这些代码会被整块摇掉，
CI 里也有一条检查：正式包里出现演示数据就直接失败。

首页（`webui/preview-index.html`）是**九张卡一屏排完**的 3×3：卡片里跑的是真界面
（iframe 装的就是隔壁那份演示产物，按 1280 宽渲染再整体缩到卡片宽度），
每张卡右上角一颗 **⤓ zip** 直接指向 `releases/latest/download/ani-rss-webui-<id>.zip` ——
不用先跳 Releases 再从十一个包里找自己那个。

「一屏」不是调像素调出来的：第一屏是一个 `min-height: 100dvh` 的 flex 列，
网格 `flex:1` 吃掉标题之后剩下的全部高度，三行均分，卡片里缩略图再吃掉剩下的 ——
所以文字多一行只是缩略图矮一点，第九张卡不会被挤到屏幕外。
`pnpm run test:preview` 在三档分辨率下量这件事，顺带盯着列数、下载地址，
以及「缩略图 iframe 有没有被建出来」（这一页的脚本挂了是一点迹象都没有的）。

## 许可

MIT。与 ani-rss 官方无隶属关系；十一款界面只是参照了各自的设计语言，
与 Vue、GitHub、Google、Apple、Microsoft、Synology、Auto_Bangumi、MoviePilot
以及 Argon 主题作者均无关联。两个复刻款照搬的是观感，不含上游任何代码；两个上游项目都是 MIT。

随产物发的三份字体各自带原始许可（`webui/src/fonts/OFL-*.txt`），都是 SIL Open Font License 1.1：
[方舟像素字体](https://github.com/TakWolf/ark-pixel-font)（TakWolf）、
[Inter](https://github.com/rsms/inter)（The Inter Project Authors）、
[Roboto](https://github.com/googlefonts/roboto)（Google）。
