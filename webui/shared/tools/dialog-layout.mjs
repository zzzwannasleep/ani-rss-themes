/**
 * 版式体检：把每一个弹窗真的打开、每一页真的翻到，量里面有没有东西被容器裁掉。
 *
 *   pnpm run build:all -- --demo     # 先出演示产物，测的是真产物不是源码
 *   pnpm run test:layout             # 十一款 × 宽屏/手机 × 全部弹窗
 *   node webui/shared/tools/dialog-layout.mjs vue 1400   # 只跑一款一个宽度
 *
 * 为什么版式体检（mobile-audit）盖不住这一片：那一份拿**视口**当尺子。
 * 弹窗卡片自己是 overflow: hidden 的，被切掉的按钮永远跑不到视口外面去 ——
 * 于是视口那把尺子一次都没响过，而人眼看到的是「按钮只剩半截、右边没有留白」。
 * 这一份改拿**最近一个会裁剪的祖先**当尺子，量的就是人真正看到的那一刀。
 *
 * 逮到的第一个就是这么来的：AniEditDialog 的 <v-row> 直接摆在 <v-tabs-window-item> 里，
 * 而 v-row 自带 -12px 的负外边距（靠父级的 padding 抵消），v-window 又是裁剪容器 ——
 * 左边 12px 被切掉、滚也滚不出来，右边多出 12px 只能横滚才看得全。
 *
 * 没装 Chrome/Edge 就跳过并退出 0：这是辅助工具，不该卡住别人的构建。
 */

import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {join, extname, normalize, dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(HERE, '../../dist')
/* 端口避开 9222（DevTools 默认）、4173/9273（版式体检）、4174/9274（添加订阅体检） */
const PORT = 4175, CDP_PORT = 9275

/* 款式清单从 ids.ts 读，不在这儿再抄一遍 —— 抄了就会漏 */
const IDS_TS = await readFile(resolve(HERE, '../../src/presets/ids.ts'), 'utf8')
const ALL = [...IDS_TS.match(/PRESET_IDS\s*=\s*\[([^\]]*)]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
const PRESETS = process.argv[2] ? [process.argv[2]] : ALL
/* 宽屏和手机各一遍：手机上弹窗是全屏的，栅格断点也不一样，两边的毛病不是同一批 */
const WIDTHS = process.argv[3] ? [+process.argv[3]] : [1400, 390]
/*
 * 第三个参数：只跑名字里带这些字的场景（逗号分隔）。
 * 一整轮十一款要跑接近一小时，改完脚本再从头跑一遍纯属浪费 ——
 * 上一轮哪几格没量到，就只补那几格。
 */
const ONLY = process.argv[4] ? process.argv[4].split(',').map(s => s.trim()).filter(Boolean) : null

const CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const browser = CANDIDATES.find(p => existsSync(p))
if (!browser) {
    console.log('没找到 Chrome / Edge，跳过弹窗版式体检（设 CHROME_PATH 可指定）')
    process.exit(0)
}
if (!existsSync(join(DIST, PRESETS[0], 'index.html'))) {
    console.error(`dist/${PRESETS[0]} 不存在，先跑 pnpm run build:all -- --demo`)
    process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

/* 换款是靠换这个目录，所以它必须是 let */
let root = join(DIST, PRESETS[0])
const server = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0])
    /* 不给 Service Worker：它会横插进每一个请求，而且每换一款都要重装一遍 */
    if (p === '/sw.js') { res.writeHead(404); return res.end('no sw here') }
    try {
        const buf = await readFile(join(root, normalize(p)))
        res.writeHead(200, {'content-type': TYPES[extname(p)] || 'application/octet-stream'})
        res.end(buf)
    } catch {
        try {
            res.writeHead(200, {'content-type': 'text/html'})
            res.end(await readFile(join(root, 'index.html')))
        } catch { res.writeHead(404); res.end('x') }
    }
})
await new Promise(r => server.listen(PORT, '127.0.0.1', r))

const proc = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${join(process.env.TEMP || '/tmp', 'ani-rss-dialog-layout')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars',
    '--disable-extensions', '--no-proxy-server', '--disable-background-networking',
    '--disable-sync', '--disable-features=Translate,MediaRouter',
    'about:blank',
], {stdio: 'ignore'})

const die = msg => { console.error(msg); server.close(); proc.kill(); process.exit(1) }

let target
for (let i = 0; i < 80; i++) {
    try {
        /* 先认人：不是无头的那台就不碰 —— 宁可报错，也不要去动用户自己开着的浏览器 */
        const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
        if (!/Headless/i.test(ver['User-Agent'] || '')) {
            die(`127.0.0.1:${CDP_PORT} 上是另一台浏览器（${ver.Browser}），不是体检自己起的那台。`)
        }
        const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
        target = list.find(t => t.type === 'page')
        if (target) break
    } catch { /* 还没起来 */ }
    await sleep(250)
}
if (!target) die('无头浏览器没起来')

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('连不上调试端口 —— 多半是上一次跑剩的进程还占着，杀掉再来')), 15000)
    ws.addEventListener('open', () => { clearTimeout(t); res() }, {once: true})
    ws.addEventListener('error', () => { clearTimeout(t); rej(new Error('调试端口连接出错')) }, {once: true})
}).catch(e => die(e.message))

let seq = 0
const pending = new Map()
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
/* 每条命令都带超时：页面里的点击万一不落地，这边不能无限等 —— 端口不放，下一次直接跑不起来 */
const send = (method, params = {}, ms = 25000) => new Promise((res, rej) => {
    const id = ++seq
    const timer = setTimeout(() => { pending.delete(id); rej(new Error(`${method} 超时 ${ms}ms`)) }, ms)
    pending.set(id, m => {
        clearTimeout(timer)
        m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)
    })
    ws.send(JSON.stringify({id, method, params}))
})
const ev = async (expression, wait = 400) => {
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || '执行失败')
    await sleep(wait)
    return r.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
/* 十一款轮流从同一个地址发出去，文件名带哈希不会撞，但 index.html 会 */
await send('Network.setCacheDisabled', {cacheDisabled: true})

const PROBE = await readFile(join(HERE, 'dialog-layout-probe.js'), 'utf8')

/*
 * 注进页面的小工具。
 *
 * 入口按钮是各款自己画的：同一颗「合集下载」，acg 那款写成文字「合集」，
 * 麦金塔那款是「合集…」，其余几款只有 title。所以找元素一律「title 或者正文，命中一个就算」。
 */
const KIT = String.raw`(() => {
  const vis = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length)
  window.__vis = vis

  /*
   * 点开第 n 部番 —— 已经展开的就别再点。
   * 演示构建会把第一部默认展开（SourceBrowserDialog 里那段 __DEMO__ 分支，为了让人一眼
   * 看到组名右边那颗「已订阅」）。照着老写法再点一次 .tile-head，收起来的正是刚展开的那部。
   */
  window.__openTile = n => {
    const t = vis('.tile')[n]
    if (!t) return 0
    if (t.classList.contains('open')) return 1
    const head = t.querySelector('.tile-head')
    if (!head) return 0
    head.click()
    return 1
  }
  const label = e => ((e.getAttribute('title') || '') + ' ' + (e.textContent || '')).replace(/\s+/g, ' ')
  /*
   * 按文字/title 点一颗按钮，给一串候选名，命中第一个。
   * 摆不下的那几款（vue / material…）把「合集下载」「导入订阅」收进标题栏的「⋯」里，
   * 所以直接找不到时把每个 ⋯ 依次召开再找一遍 —— 不这么做，这两个弹窗永远是「入口没走通」，
   * 看起来像跳过，实际是从来没量过。
   */
  const pick = txts => {
    for (const t of txts) {
      const e = vis('button, a, [role=button], .v-list-item').filter(x => label(x).includes(t))[0]
      if (e) { e.click(); return t }
    }
    return null
  }
  const hit = async (txts) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const direct = pick(txts)
    if (direct) return direct
    /* 图标是 SVG（见 plugins/vuetify.ts 用的 mdi-svg），没有 mdi-* 类名可认；
       菜单触发器身上的 aria-haspopup 是 Vuetify 自己加的，比认图标稳 */
    const dots = vis('[aria-haspopup="menu"]')
    for (const d of dots) {
      d.click()
      await sleep(400)
      const hit = pick(txts)
      if (hit) return hit
      document.body.click()
      await sleep(200)
    }
    throw new Error('找不到：' + txts.join(' | '))
  }
  /* 同 __act：promise 得有人引着，不然会被 GC 掉，报成 Promise was collected */
  window.__hit = (txts) => (window.__pending = hit(txts))
  window.__click = (sel, txt) => {
    const e = vis(sel).filter(x => x.textContent.includes(txt))[0]
    if (!e) throw new Error('找不到：' + sel + ' / ' + txt)
    e.click(); return true
  }
  /*
   * 一条订阅的动作：窄的那几款把大半收进「更多」菜单里，所以先在图标行上找，
   * 找不到就召出菜单再找。见 aniActions.ts —— 动作名十一款是同一份。
   */
  const act = async (title) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const direct = vis('[title]').filter(x => x.getAttribute('title').trim() === title)[0]
    if (direct) { direct.click(); return 'row' }
    /*
     * 行上那颗也可能是**带文字的按钮**而不是只有 title 的图标：
     * github 那款宽屏时把「视频列表 / 编辑 / 预览匹配结果」直接画成 Primer 风格的文字按钮，
     * 只认 title 的话会一路掉进后面翻菜单的分支 —— 那一款每行一个菜单，共 141 个。
     */
    const byText = vis('.v-btn, button, [role="button"]').filter(x => x.textContent.trim() === title)[0]
    if (byText) { byText.click(); return 'row' }
    /*
     * 候选菜单要逐个试，不能只开第一个。
     *
     * 「更多」这个名字页面上不止一处：标题栏那颗 ⋯ 装的是合集下载/导入订阅/多选，
     * 订阅行上那颗才装动作。github 那款标题栏的排在前面，只开第一个就永远开错，
     * 报出来是「菜单里也没有『编辑』」—— 看着像动作丢了，其实是开错了菜单。
     */
    const all = [...new Set([
      ...vis('[title]').filter(x => ['更多', '操作', '展开操作'].includes(x.getAttribute('title').trim())),
      ...vis('[aria-haspopup="menu"]'),
    ])]
    if (!all.length) throw new Error('图标行上没有「' + title + '」，也没有「更多」菜单')
    /*
     * 最多试五个。
     *
     * 「展开操作」这种是**每行一颗**，屏幕上一百多颗都很正常 ——
     * 一旦第一颗没命中就挨个往下开，一颗 600ms，直接把 25 秒的命令超时撞穿，
     * 报出来是「超时」，看着像页面卡死，其实是脚本自己在傻等。
     * 每一行的菜单装的是同一份动作（见 aniActions.ts），试头几个就够了。
     */
    const cands = all.slice(0, 5)
    for (const more of cands) {
      more.click()
      await sleep(400)
      /*
       * 菜单条目不止 .v-list-item 一种写法：win98 那款的右键菜单是自己画的
       * <li role="menuitem">，只认 .v-list-item 的话会一路「菜单里也没有」。
       * mobile-audit-actions.js 里也是三种一起认。
       */
      const item = vis('.v-overlay .v-list-item, .v-overlay [role="menuitem"], .v-overlay li')
          .filter(x => x.textContent.trim().includes(title))[0]
      if (item) { item.click(); return 'menu' }
      document.body.click()
      await sleep(200)
    }
    throw new Error('图标行和前 ' + cands.length + ' 个菜单里都没有「' + title + '」（共 ' + all.length + ' 个）')
  }
  /*
   * 用一个全局把 promise 引住再交出去。
   *
   * Runtime.evaluate 的 awaitPromise 等的是页面里那个 promise 对象，
   * 表达式求完值之后没人引用它，赶上一次 GC 就会被回收 ——
   * CDP 那边收到的是「Promise was collected」，看起来像点击失败，
   * 其实是这一步压根没跑完。挂到 window 上就不会被回收了。
   */
  window.__act = (title) => (window.__pending = act(title))
  /*
   * 关掉最上面那一层。
   * 不能按文字找「取消」——弹窗是 teleport 到 body 的，document 顺序里外层那个在前面，
   * 一按文字找就先命中外层的取消键，整个编辑框被关掉，接下来要量的东西全没了。
   * 直接点最上面那一层自己的按钮条里最后一颗之前的「取消」，找不到就发 Esc。
   */
  window.__esc = () => {
    const tops = vis('.v-overlay--active .v-overlay__content')
    const top = tops[tops.length - 1]
    const cancel = top && [...top.querySelectorAll('.v-card-actions .v-btn')]
        .find(b => /取消|关闭/.test(b.textContent))
    if (cancel) { cancel.click(); return 'btn' }
    for (const t of [document, window]) t.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))
    return 'esc'
  }
  return 'ok'
})()`

const ADD = `['添加订阅', '新建订阅', '新增']`

/*
 * 每一条场景从一次干净的加载开始 —— 上一条卡在半路不会连累下一条，
 * 报出来的位置也就一定是它自己的。
 *
 * step 的第四项是「量一次并起个名」，留空表示这一步只是过路。
 */
const SCENES = [
    {
        name: '添加订阅', route: '/subscriptions',
        steps: [
            ['打开添加订阅', `window.__hit(${ADD})`, 900, 'Mikan 页'],
            ['切 AniBT', `window.__click('.v-tab', 'AniBT')`, 600, 'AniBT 页'],
            ['切 AnimeGarden', `window.__click('.v-tab', 'AnimeGarden')`, 600, 'AnimeGarden 页'],
            ['切其它 RSS', `window.__click('.v-tab', '其它 RSS')`, 600, '其它 RSS 页'],
            ['切 Bangumi', `window.__click('.v-tab', 'Bangumi')`, 600, 'Bangumi 页'],
        ],
    },
    {
        name: '番剧列表', route: '/subscriptions',
        steps: [
            ['打开添加订阅', `window.__hit(${ADD})`, 900],
            ['浏览 Mikan 列表', `window.__click('button.browse', 'Mikan')`, 2800, '列表'],
            ['展开第一部番', `window.__openTile(0)`, 1800, '展开字幕组'],
            ['第一个字幕组点添加', `window.__click('.group .v-btn', '添加')`, 900, '挑版本'],
        ],
    },
    {
        /*
         * 「确认订阅信息」那一层（上游 3.2.48 起所有新增订阅都汇到这里）。
         *
         * 它跟别的弹窗不一样：里面嵌着**整个订阅编辑框**（AniEditDialog 的 embedded 模式），
         * 也就是「弹窗里再摆一个四页标签的表单」。这种套法最容易出的就是
         * 「里面那层被外面那层的 padding / 圆角 / overflow 啃掉一块」——
         * 而 v-window 本身就是裁剪容器，所以正好是这一份体检的取景框。
         */
        name: '确认订阅信息', route: '/subscriptions',
        steps: [
            ['打开添加订阅', `window.__hit(${ADD})`, 900],
            ['浏览 Mikan 列表', `window.__click('button.browse', 'Mikan')`, 2800],
            ['展开第一部番', `window.__openTile(0)`, 1800],
            ['第一个字幕组点添加', `window.__click('.group .v-btn', '添加')`, 900],
            ['版本弹窗点确定', `window.__click('.v-card-actions .v-btn', '确定')`, 2600, '基本'],
            ['切自定义', `window.__click('.v-tab', '自定义')`, 700, '自定义'],
            ['切其它', `window.__click('.v-tab', '其它')`, 700, '其它'],
            ['回基本再点预览', `(window.__click('.v-tab', '基本'), 1)`, 700],
            ['点预览', `window.__click('.v-card-actions .v-btn', '预览')`, 2600, '预览'],
        ],
    },
    {
        /*
         * 队列里摆着两条时量一次。标签条是横向滚动的，每条上还挂着状态字和关闭键 ——
         * 一条的时候永远量不出「挤」，两条才看得出那颗 × 有没有被挤出可视区。
         */
        name: '确认订阅信息 · 两条队列', route: '/subscriptions',
        steps: [
            ['打开添加订阅', `window.__hit(${ADD})`, 900],
            ['浏览 Mikan 列表', `window.__click('button.browse', 'Mikan')`, 2800],
            ['展开第一部番', `window.__openTile(0)`, 1800],
            ['勾第一个字幕组', `(window.__vis('.group input[type=checkbox]')[0].click(), 1)`, 800],
            ['版本弹窗点确定', `window.__click('.v-card-actions .v-btn', '确定')`, 800],
            /* 一次只展开一部：展开第二部时第一部那块已经被 v-if 拿掉了，
               所以下面取 [0] 拿到的确实是第二部的字幕组 */
            ['展开第二部番', `window.__openTile(1)`, 1800],
            ['勾第二部的第一个组', `(window.__vis('.group input[type=checkbox]')[0].click(), 1)`, 800],
            ['版本弹窗点确定', `window.__click('.v-card-actions .v-btn', '确定')`, 800],
            ['点下一步', `window.__click('.basket .v-btn', '下一步')`, 2600, '两条队列'],
        ],
    },
    {
        name: '编辑订阅', route: '/subscriptions',
        steps: [
            ['点编辑', `window.__act('编辑')`, 1400, '基本'],
            ['切自定义', `window.__click('.v-tab', '自定义')`, 700, '自定义'],
            ['切其它', `window.__click('.v-tab', '其它')`, 700, '其它'],
        ],
    },
    {
        /*
         * 备用 RSS 那一行（名称 + 地址 + 偏移 + 三颗图标按钮）默认是空的，
         * 演示数据里也没有 —— 不点一下「手填一条」把它变出来，这一行永远没被量过。
         * 「有很多按钮、按钮被窗口挡住」最容易出在这种「不换行的一排控件」上。
         */
        name: '备用 RSS 一行', route: '/subscriptions',
        steps: [
            ['点编辑', `window.__act('编辑')`, 1400],
            /* 备用 RSS 从「基本」页里搬出来单开了一页，不先切过去就点不到「手填一条」 */
            ['切备用 RSS 页', `window.__click('.v-tab', '备用 RSS')`, 700, '空的时候'],
            ['手填一条备用 RSS', `window.__hit(['手填一条'])`, 800, ''],
        ],
    },
    {name: '视频列表', route: '/subscriptions', steps: [['点列表', `window.__act('列表')`, 2000, '']]},
    {name: '预览匹配结果', route: '/subscriptions', steps: [['点预览', `window.__act('预览匹配结果')`, 2600, '']]},
    {name: '更换封面', route: '/subscriptions', steps: [['点更换封面', `window.__act('更换封面')`, 1600, '']]},
    {name: '评分', route: '/subscriptions', steps: [['点评分', `window.__act('评分')`, 1400, '']]},
    {name: '删除订阅', route: '/subscriptions', steps: [['点删除', `window.__act('删除')`, 1400, '']]},
    {
        name: '合集下载', route: '/subscriptions',
        steps: [['打开合集下载', `window.__hit(['合集下载', '合集'])`, 1400, '']],
    },
    {
        name: '导入订阅', route: '/subscriptions',
        steps: [['打开导入订阅', `window.__hit(['导入订阅', '导入'])`, 1400, '']],
    },
    {
        /* 编辑框里还套着两个小弹窗，各自有自己的按钮条 */
        name: '编辑订阅的小弹窗', route: '/subscriptions',
        steps: [
            ['点编辑', `window.__act('编辑')`, 1400],
            ['按 TmdbId 反查', `window.__hit(['按 TmdbId 反查'])`, 800, '按 TmdbId 获取'],
            ['关掉它', `window.__esc()`, 700],
            /* 直接点那颗按钮，不走 __hit：它找不到时会把页面上每个菜单挨个召开一遍，
               在这个已经开着两层弹窗的场合又慢又容易卡住 */
            ['选择剧集组', `window.__click('.v-btn', '选择')`, 2400, '选择剧集组'],
        ],
    },
    {
        name: '删除下载任务', route: '/downloads',
        steps: [['点第一条的删除', `window.__hit(['删除任务'])`, 900, '']],
    },
    {
        name: '通知编辑', route: '/settings/notification',
        steps: [['点第一条通知的编辑', `window.__hit(['编辑'])`, 1400, '']],
    },
    {
        name: '重启服务确认', route: '/settings/about',
        steps: [['点重启服务', `window.__hit(['重启服务'])`, 900, '']],
    },
    {
        name: '清空日志确认', route: '/logs',
        steps: [['点清空日志', `window.__hit(['清空日志', '清空'])`, 900, '']],
    },

    /*
     * ── 页面 ──
     *
     * 上面全是弹窗。而「登录设置右边的开关被切掉 4px」是**页面上**的裁剪 ——
     * 探针原来只扫 .v-overlay，十八轮体检从来没把页面放进过取景框，
     * 于是这条一次都没量过，看着却和「量过了没问题」一模一样。
     * 设置页八个标签逐个翻：每一个都是一个独立的 v-tabs-window-item，
     * 里面的控件贴着哪条边只有翻过去才知道。
     */
    {
        name: '页面 · 订阅列表', route: '/subscriptions', page: true,
        steps: [['落地', `1`, 900, '']],
    },
    {
        name: '页面 · 下载', route: '/downloads', page: true,
        steps: [['落地', `1`, 1200, '']],
    },
    {
        name: '页面 · 日志', route: '/logs', page: true,
        steps: [['落地', `1`, 1200, '']],
    },
    {
        name: '页面 · 设置', route: '/settings/download', page: true,
        steps: [
            ['落地下载设置', `1`, 1200, '下载设置'],
            ['切基本设置', `window.__click('.v-tab', '基本设置')`, 900, '基本设置'],
            ['切全局排除', `window.__click('.v-tab', '全局排除')`, 800, '全局排除'],
            /* 这两个标签上游 3.2.36 改过名：代理设置 → 代理、登录设置 → 安全。
               工具这边一直没跟着改，于是这两页自那时起就没被量过（报的是「入口没走通」，
               看着像脚本问题，实际是取景框里少了两页）。 */
            ['切代理', `window.__click('.v-tab', '代理')`, 800, '代理'],
            ['切安全', `window.__click('.v-tab', '安全')`, 900, '安全'],
            ['切通知', `window.__click('.v-tab', '通知')`, 900, '通知'],
            ['切捐赠', `window.__click('.v-tab', '捐赠')`, 800, '捐赠'],
            ['切关于', `window.__click('.v-tab', '关于')`, 1200, '关于'],
        ],
    },
]

async function goto(hash) {
    /* 先回 about:blank 再进去：只有片段不同的地址是同文档跳转，不重新加载 ——
       而换款是靠换静态目录的，文档不重载就等于把同一款量了十一遍，还十一次全绿 */
    await send('Page.navigate', {url: 'about:blank'})
    await sleep(150)
    /*
     * 落地一律先落在 #/，再用 location.hash 走过去。
     *
     * 直接开 index.html#/downloads 会停在 #/ —— 首帧那次导航赶在演示模式把令牌写进
     * localStorage 之前，路由守卫把它送去登录页，登录完再送回来就只剩根路由了。
     * 表现是「下载」「通知」这几条一路点空：脚本找不到按钮，看起来像入口改了名。
     * mobile-audit 里也是这么走的，照抄。
     */
    await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/index.html#/`})
    await sleep(2600)
    await ev(KIT)
    if (hash !== '/') await ev('location.hash = ' + JSON.stringify(hash), 1600)
    /* 真的到了才往下走 —— 停在别的路由上点出来的东西，量了也不是这一条要量的 */
    const at = String(await ev('location.hash', 0)).replace(/^#/, '')
    if (at !== hash) throw new Error(`没跳到 ${hash}，停在 ${at || '/'}`)
}

let bad = 0
let skipped = 0
for (const preset of PRESETS) {
    root = join(DIST, preset)
    for (const w of WIDTHS) {
        const mobile = w < 700
        await send('Emulation.setDeviceMetricsOverride',
            {width: w, height: mobile ? 844 : 1000, deviceScaleFactor: mobile ? 2 : 1,
                mobile, screenWidth: w, screenHeight: mobile ? 844 : 1000})
        await send('Emulation.setTouchEmulationEnabled', {enabled: mobile, maxTouchPoints: 5})
        console.log(`· ${preset} @${w}px …`)

        for (const scene of SCENES) {
            if (ONLY && !ONLY.some(k => scene.name.includes(k))) continue
            let where = ''
            try {
                await goto(scene.route)
                for (const [label, expr, wait, probeAs] of scene.steps) {
                    where = label
                    await ev(expr, wait)
                    if (probeAs === undefined) continue
                    /*
                     * 先确认真的有弹窗开着。
                     *
                     * 探针只量 .v-overlay--active 里的东西 —— 一个都没开着的时候它返回空数组，
                     * 而空数组和「量过了，没问题」长得一模一样。之前「通知编辑」那一条的选择器
                     * 在十一款里全是空点（列表根本不是 v-list-item），十八轮全绿，
                     * 实际一次都没量过。这种假绿比报错危险得多：它看着像做过了。
                     */
                    /* 三款自画窗框的没有 .v-main（群晖 / win98 / 麦金塔），
                       所以「落地了没有」只能问页面上有没有真的画出东西来 */
                    const open = await ev(scene.page
                        ? `window.__vis('.v-main, .v-application__wrap').length`
                        : `window.__vis('.v-overlay--active .v-overlay__content').length`, 0)
                    if (!open) throw new Error(scene.page
                        ? `「${label}」之后页面正文是空的，这一步没落地`
                        : `「${label}」之后一个弹窗都没开着，这一步是空点`)
                    const hits = await ev(PROBE, 0)
                    if (!hits.length) continue
                    bad += hits.length
                    const tag = probeAs ? `${scene.name} · ${probeAs}` : scene.name
                    console.log(`✗ ${preset} @${w}px ${tag}`)
                    for (const h of hits) console.log(`    ${h.k} ${h.px}px：${h.el}\n        装在 ${h.box}`)
                }
            } catch (e) {
                /*
                 * 走不通只记一笔，不算问题也不拖死整轮。
                 * 「合集下载」「导入订阅」这类入口不是每一款都摆在外面，找不到是正常的；
                 * 真断了会在添加订阅体检（dialog-check.mjs）里响。
                 */
                skipped++
                console.log(`  … ${preset} @${w}px ${scene.name}：走到「${where}」没走通（${e.message.split('\n')[0]}）`)
            }
        }
    }
}

console.log('')
if (bad) console.error(`版式体检不通过：共 ${bad} 处`)
else if (skipped) {
    /* 走不通 = 那个弹窗压根没被量过。它和「量过了没问题」长得一样，必须单独说清楚，
       不能混进那句「没有被裁掉的东西」里 —— 那就成了自己骗自己 */
    console.error(`量到的都没问题，但有 ${skipped} 处入口没走通（见上）—— 那几个弹窗这一轮没被量过`)
} else {
    const scenes = ONLY ? SCENES.filter(s => ONLY.some(k => s.name.includes(k))) : SCENES
    console.log(`✓ ${PRESETS.length} 款 × ${WIDTHS.length} 个宽度 × ${scenes.length} 个场景`
        + `（其中 ${scenes.filter(s => s.page).length} 个是页面）`
        + (ONLY ? `，只跑了：${scenes.map(s => s.name).join('、')}` : '')
        + '，每一个都真的翻到过，没有被裁掉的东西')
}

ws.close(); proc.kill(); server.close()
process.exit(bad ? 1 : 0)
