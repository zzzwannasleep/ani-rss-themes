/**
 * 「添加订阅」这条链路的行为体检。
 *
 *   pnpm run build:all -- --demo     # 先出演示产物，测的是真产物不是源码
 *   pnpm run test:dialogs            # 十一款轮流跑
 *   node webui/shared/tools/dialog-check.mjs synology   # 只跑一款
 *
 * 为什么单独有这么一个东西：这条链路的毛病不长在样式上，长在**状态跟着人跑**上 ——
 * 界面看着一切正常，发出去的请求是错的。vue-tsc 看不出来，版式体检（mobile-audit）
 * 也看不出来，它只量尺寸。已经栽过两次，都是同一个形状：
 *
 *   一、Mikan / AniBT / AnimeGarden 共用同一个 SourceBrowserDialog 实例（切来源只是改 prop），
 *       上一家的列表留在原地。三家的 Item.key 语义还不一样（Mikan 是番剧页地址，
 *       另外两家是番剧 id），于是点一部番会发出
 *       `api/aniBTGroup?bgmId=https://mikanani.me/Home/Bangumi/xxx` ——
 *       后端原样转给 anibt.net，那边回 400。
 *       更阴的是另一半：如果那部番在 Mikan 那边已经展开过，字幕组缓存直接命中，
 *       一个请求都不发，界面上安安静静摆着**上一家的字幕组**。
 *   二、从列表挑回来的 Bgm 条目 / 字幕组 / 匹配规则只存了一份，
 *       切到另一栏手填地址再解析，这三样会一起递过去 ——
 *       建出来的订阅指着 B 的 RSS，名字季度集数却是 A 的。
 *       上游 3.2.48 把这条路整个改掉了：挑完直接进「确认订阅信息」队列，
 *       手填那一栏再也拿不到上一家挑剩的东西 —— 所以场景二改成量**新路的两个落点**。
 *
 * 场景三查的是另一件事：队列里那一步的「预览」在不在。
 * 它一度被和「其他」一起藏掉了（理由是「新建的还没入库」）—— 而 api/previewAni
 * 是把整条订阅放在请求体里发的，入没入库不相干，恰恰是这一步最需要先看一眼：
 * 字幕组和匹配规则刚挑完，这条规则能命中几集、文件落到哪个目录，得先看再入库。
 *
 * 场景五量的是这一轮新做的那条路本身（上游 3.2.48 的 BatchAdditionView）：
 * 勾多个字幕组 → 一次交出去 → 队列里逐条过 → 撞名时问一次「覆盖」。
 * 撞名那一档在演示站上永远走不到（假后端一律回成功），所以这里的 fetch 包装层
 * 会按需伪造一次「订阅标题重复」—— 那是整条链路里最贵、也最容易被写错的分支。
 *
 * 不看像素、不比截图，只把 window.fetch 包一层记流水，最后核对 URL 和请求体。
 *
 * 十一款都跑而不是只跑一款：这几条走的是同一批共用组件，但入口按钮是各款自己画的 ——
 * 同一颗「添加订阅」，群晖那款叫「新增」，麦金塔那款叫「新建订阅…」。
 * 只测一款的话，另外八款的入口什么时候断了都不知道。
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
/* 端口避开 9222（DevTools 默认）和 4173/9273（版式体检），两个工具可以同时跑 */
const PORT = 4174, CDP_PORT = 9274

/* 款式清单从 ids.ts 读，不在这儿再抄一遍 —— 抄了就会漏，表现是新加的那款静悄悄没被体检过 */
const IDS_TS = await readFile(resolve(HERE, '../../src/presets/ids.ts'), 'utf8')
const ALL = [...IDS_TS.match(/PRESET_IDS\s*=\s*\[([^\]]*)]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
const PRESETS = process.argv[2] ? [process.argv[2]] : ALL

const CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const browser = CANDIDATES.find(p => existsSync(p))
if (!browser) {
    console.log('没找到 Chrome / Edge，跳过添加订阅体检（设 CHROME_PATH 可指定）')
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
    /* 不给 Service Worker：它会横插进每一个请求，流水就不是界面自己发的了 */
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
    `--user-data-dir=${join(process.env.TEMP || '/tmp', 'ani-rss-dialog-check')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars',
    '--disable-extensions', '--no-proxy-server', '--disable-background-networking',
    '--disable-sync', '--disable-features=Translate,MediaRouter',
    'about:blank',
], {stdio: 'ignore'})

const die = (msg) => { console.error(msg); server.close(); proc.kill(); process.exit(1) }

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
    const t = setTimeout(() => rej(new Error('连不上调试端口')), 10000)
    ws.addEventListener('open', () => { clearTimeout(t); res() }, {once: true})
}).catch(e => die(e.message))

let seq = 0
const pending = new Map()
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++seq
    const t = setTimeout(() => rej(new Error('超时 ' + method)), 25000)
    pending.set(n, m => { clearTimeout(t); m.error ? rej(new Error(m.error.message)) : res(m.result) })
    ws.send(JSON.stringify({id: n, method, params}))
})
const ev = async (expression, wait = 400) => {
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || '脚本执行失败')
    await sleep(wait)
    return r.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Network.setCacheDisabled', {cacheDisabled: true})
await send('Emulation.setDeviceMetricsOverride', {width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false})

/*
 * 注进去的那套小工具。
 *
 * fetch 包在演示模式外面：演示模式本身就是把 window.fetch 换掉的（见 src/demo/index.ts），
 * 我们再包一层，记下的就是界面真正想发的东西。
 *
 * 可见判定不能用 offsetParent —— position: fixed 的元素（那颗「添加订阅」FAB）它恒为 null。
 */
const KIT = String.raw`(() => {
  window.__log = []
  const of = window.fetch
  /*
   * 撞名那一档：演示站上永远回成功，而「先失败 → 问一次 → 带 override 重发」
   * 正是这一轮新做的那条路里最容易写错的一支（少了 override 就永远覆盖不上，
   * 少了静默就变成「先弹红字再问要不要覆盖」两个提示打架）。
   * 把 __dupAdd 设成 N，接下来 N 次**不带 override** 的 addAni 回「订阅标题重复」。
   */
  window.__dupAdd = 0
  window.fetch = async (...a) => {
    const u = typeof a[0] === 'string' ? a[0] : a[0].url
    if (u.includes('/api/')) window.__log.push({url: u.replace(/^https?:\/\/[^/]+/, ''), body: a[1] && a[1].body})
    if (window.__dupAdd > 0 && u.includes('/api/addAni') && !/[?&]override=true/.test(u)) {
      window.__dupAdd--
      return new Response(JSON.stringify({code: 400, message: '订阅标题重复', data: null, t: Date.now()}),
        {headers: {'Content-Type': 'application/json'}})
    }
    return of(...a)
  }
  window.__vis = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length)
  window.__click = (sel, txt) => {
    const e = window.__vis(sel).filter(x => x.textContent.includes(txt))[0]
    if (!e) throw new Error('找不到：' + sel + ' / ' + txt)
    e.click()
    return true
  }
  /* 同一颗按钮十一款起了三个名字（添加订阅 / 新建订阅… / 新增），挨个试 */
  window.__clickOne = (sel, txts) => {
    for (const t of txts) {
      const e = window.__vis(sel).filter(x => x.textContent.includes(t))[0]
      if (e) { e.click(); return t }
    }
    throw new Error('找不到：' + sel + ' / ' + txts.join(' | '))
  }
  /* 弹窗会摞起来：编辑框上面还能再开一层番剧列表，而下面那层的按钮同样 querySelector 得到。
     不分层的话，点到的是背后那颗 —— 只改了 prop、没改 model，watch 一次都不响，
     表现是「一个请求都没发出去」，看着像入口坏了，其实是脚本点错了地方。 */
  window.__top = () => window.__vis('.v-overlay--active').slice(-1)[0] || document.body
  window.__topVis = sel => [...window.__top().querySelectorAll(sel)].filter(e => e.getClientRects().length)
  window.__topClick = (sel, txt) => {
    const e = window.__topVis(sel).filter(x => x.textContent.includes(txt))[0]
    if (!e) throw new Error('顶层找不到：' + sel + ' / ' + txt)
    e.click()
    return true
  }
  window.__topInput = () => {
    const i = window.__topVis('input')[0]
    return i ? i.value : null
  }
  window.__layers = () => window.__vis('.v-overlay--active').length
  window.__type = (sel, val) => {
    const el = window.__vis(sel)[0]
    if (!el) throw new Error('找不到输入框：' + sel)
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val)
    el.dispatchEvent(new Event('input', {bubbles: true}))
    return true
  }
  return 'ok'
})()`

/* 拼进页面里执行的，所以写成 JS 源码 */
const ADD_LABELS = "['添加订阅', '新建订阅', '新增']"

/* 关掉最上面那层弹窗。图标走 @mdi/js 的 svg 路径，DOM 里没有 mdi-close 类名可认，
   与其按 DOM 猜哪颗是关闭键，不如直接敲 Esc。 */
const esc = async () => {
    for (const type of ['keyDown', 'keyUp']) {
        await send('Input.dispatchKeyEvent', {type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27})
    }
    await sleep(800)
}

/*
 * 三家番剧列表收的**根本不是同一样东西**（上游三个组件的 show() 签名就摆在那儿）：
 *
 *   Mikan.show(ani)          → 内部抠成搜索词 `id: <bangumiId>`，它只有搜索框
 *   AniBT.show(bgmUrl)       → 只把 bgmUrl 给列表接口，搜索框全程留空
 *   AnimeGarden.show(bgmUrl) → 同上，它连搜索框都没有
 *
 * 拿一个值喂三家的后果分两种，而且第二种光看请求参数是看不出来的：
 *   · AniBT 会收到 `title: "id: 12345"` —— 它认的是 bgmId，按这个标题一部都搜不着；
 *   · AnimeGarden 的请求参数完全正确，但那串字进了搜索框，
 *     整季列表在**浏览器这边**被本地过滤成空。
 *
 * 所以判据是三件一起看：发出去的参数、搜索框里躺着什么、屏幕上还剩几张卡。
 */
const SOURCE_PROBES = [
    ['Mikan', (log, kw, tiles) => {
        const r = log.filter(x => x.url.startsWith('/api/mikan?')).pop()
        if (!r) return '没发 api/mikan'
        const text = new URLSearchParams(r.url.split('?')[1]).get('text') || ''
        if (!/^id: \d+$/.test(text)) return `text 应该是 \`id: <bangumiId>\`，实际 ${JSON.stringify(text)}`
        if (!/^id: \d+$/.test(kw || '')) return `搜索框里应该躺着同一个 id，实际 ${JSON.stringify(kw)}`
        return tiles > 0 ? '' : '列表是空的'
    }],
    ['AniBT', (log, kw, tiles) => {
        const r = log.filter(x => x.url === '/api/aniBT').pop()
        if (!r) return '没发 api/aniBT'
        const b = JSON.parse(r.body || '{}')
        if (!b.bgmUrl) return '请求体里没有 bgmUrl —— AniBT 就是靠它定位的'
        if (b.title) return `请求体里带了 title=${JSON.stringify(b.title)} —— AniBT 认 bgmId，按 Mikan 的搜索词搜不着`
        if (kw) return `搜索框里不该有东西，实际 ${JSON.stringify(kw)}`
        return tiles > 0 ? '' : '列表是空的'
    }],
    ['AnimeGarden', (log, kw, tiles) => {
        const r = log.filter(x => x.url.startsWith('/api/animeGardenList')).pop()
        if (!r) return '没发 api/animeGardenList'
        const u = new URLSearchParams(r.url.split('?')[1] || '').get('bgmUrl') || ''
        if (!/bgm\.tv\/subject\/\d+/.test(u)) return `bgmUrl 不对：${JSON.stringify(u)}`
        if (kw) return `搜索框里不该有东西，实际 ${JSON.stringify(kw)}`
        return tiles > 0 ? '' : '列表是空的 —— 搜索框里那串字把整季过滤没了？'
    }],
]

const open = async () => {
    /* 先去 about:blank 再回来：只有片段不同的地址是同文档跳转，不会重新加载 ——
       换款是靠换静态目录的，文档不重载就等于把同一款量了十一遍 */
    await send('Page.navigate', {url: 'about:blank'})
    await sleep(200)
    await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/index.html#/subscriptions`})
    await sleep(2600)
    await ev(KIT)
}

/**
 * 跑一款。返回这一款的问题清单。
 *
 * 请求流水攒着不直接打：十一款全绿时那是三百行噪音；哪一款红了再把它那份摊开，
 * 一眼就能看出发出去的到底是什么。
 */
async function checkPreset(id) {
    root = join(DIST, id)
    const bad = []
    const trace = []
    const note = (s) => trace.push('    ' + s)
    const step = async (label, expr, wait) => {
        note('· ' + label)
        return ev(expr, wait)
    }
    const dump = (log, cut) => log.forEach(r =>
        note(r.url + (r.body ? '  ⟵ ' + (cut ? r.body.slice(0, 160) : r.body) : '')))

    try {
        /* ══ 场景一：看完一家再看另一家 ══ */
        await open()
        note('▶ 场景一：浏览 Mikan → 点开一部番 → 切到 AniBT → 点开一部番')
        await step('打开「添加订阅」', `window.__clickOne('button', ${ADD_LABELS})`, 900)
        await step('浏览 Mikan 番剧列表', `window.__click('button.browse', 'Mikan')`, 2600)
        await step('点开第一部番', `(window.__vis('.tile-head')[0].click(), 1)`, 2000)
        await step('关掉列表', `window.__click('.browser .v-card-title .v-btn', '')`, 900)
        await step('切到 AniBT 一栏', `window.__click('.v-tab', 'AniBT')`, 900)
        await step('浏览 AniBT 番剧列表', `window.__click('button.browse', 'AniBT')`, 3000)
        /* 故意点第二部：第一部在 Mikan 那边展开过，缓存命中的话一个请求都不发 —— 那正是 bug 的另一半 */
        await step('点开第二部番', `(window.__vis('.tile-head')[1].click(), 1)`, 2000)

        const log1 = await ev('window.__log', 0)
        dump(log1)
        if (!log1.some(r => r.url === '/api/aniBT'))
            bad.push('切到 AniBT 后没重新拉列表 —— 屏幕上还是 Mikan 那一批番')
        const grp = log1.map(r => r.url).filter(u => u.includes('aniBTGroup'))
        if (!grp.length)
            bad.push('在 AniBT 里点开番剧没发 aniBTGroup —— 命中了 Mikan 留下的字幕组缓存')
        grp.filter(u => !/[?&]bgmId=\d+(&|$)/.test(u))
            .forEach(u => bad.push('bgmId 不是番剧 id —— ' + u))

        /*
         * 走到「挑完一个字幕组、队列弹窗已经开着」那一步。
         * 后面三个场景都从这儿分叉，抄四遍迟早有一遍会漂。
         */
        const toQueue = async (tile = 0) => {
            await step('打开「添加订阅」', `window.__clickOne('button', ${ADD_LABELS})`, 900)
            await step('浏览 Mikan 番剧列表', `window.__click('button.browse', 'Mikan')`, 2600)
            await step(`点开第 ${tile + 1} 部番`, `(window.__vis('.tile-head')[${tile}].click(), 1)`, 2000)
            await step('第一个字幕组点「添加」', `window.__click('.group .v-btn', '添加')`, 900)
            await step('版本弹窗点「确定」', `window.__click('.v-card-actions .v-btn', '确定')`, 2600)
        }

        /* ══ 场景二：挑回来的东西只进队列，漏不到手填那一栏 ══ */
        await open()
        note('▶ 场景二：Mikan 挑一个字幕组 → 进队列 → 关掉 → 切到 AniBT 手填地址 → 解析')
        await toQueue()

        const log2 = await ev('window.__log', 0)
        dump(log2, true)
        const picked = log2.filter(r => r.url.includes('rssToAni')).map(r => JSON.parse(r.body || '{}')).pop()
        if (!picked) {
            bad.push('挑完一个字幕组之后没发 rssToAni —— 队列没起来，还是老的第二步？')
        } else {
            if (!String(picked.url).includes('mikanani.me')) bad.push('队列解析的不是刚挑的那条地址 —— ' + picked.url)
            if (!picked.bgmUrl) bad.push('挑回来的那条没带 bgmUrl —— 后端认不出番剧名和季度')
            if (!picked.subgroup) bad.push('挑回来的那条没带字幕组')
        }
        const chips = await ev(`window.__vis('.queue-tab').length`, 0)
        if (!chips) bad.push('挑完一个字幕组没有进「确认订阅信息」队列')

        await esc()
        await step('重新打开「添加订阅」', `window.__clickOne('button', ${ADD_LABELS})`, 900)
        await step('切到 AniBT 一栏', `window.__click('.v-tab', 'AniBT')`, 900)
        await step('手填一条 AniBT 地址',
            `window.__type('textarea', 'https://anibt.net/rss/anime.xml?bgmId=999999&groupSlug=zzz')`, 700)
        await step('点「解析」', `window.__click('.v-btn', '解析')`, 2600)

        const log2b = await ev('window.__log', 0)
        dump(log2b, true)
        const hand = log2b.filter(r => r.url.includes('rssToAni')).map(r => JSON.parse(r.body || '{}')).pop()
        if (!hand) {
            bad.push('手填地址后没发 rssToAni —— 脚本没走通，按钮文案改了？')
        } else {
            if (!String(hand.url).includes('anibt.net')) bad.push('最后解析的不是手填那条地址 —— ' + hand.url)
            for (const k of ['bgmUrl', 'subgroup', 'match']) {
                const v = hand[k]
                if (v && (!Array.isArray(v) || v.length))
                    bad.push(`手填的 AniBT 地址带上了 Mikan 那次挑的 ${k} —— ${JSON.stringify(v)}`)
            }
        }
        await esc()

        /* ══ 场景三：队列里那一步也要能预览 ══ */
        await open()
        note('▶ 场景三：队列里的编辑框 → 点「预览」')
        await toQueue()

        const hasPreview = await ev(
            `window.__topVis('.v-card-actions .v-btn').some(b => b.textContent.includes('预览'))`, 0)
        if (!hasPreview) {
            bad.push('队列里的编辑框没有「预览」—— 上游 Ani.vue 底下那颗是不分新建和编辑的')
        } else {
            await step('点「预览」', `window.__topClick('.v-card-actions .v-btn', '预览')`, 2400)
            const log3 = await ev('window.__log', 0)
            dump(log3, true)
            const pv = log3.filter(r => r.url.includes('previewAni'))
            if (!pv.length) bad.push('点了「预览」但没发 previewAni')
            else if (!JSON.parse(pv[0].body || '{}').url) bad.push('previewAni 的请求体里没有 RSS 地址')
            const shown = await ev(`window.__vis('.v-card-title').some(t => t.textContent.includes('预览 ·'))`, 0)
            if (!shown) bad.push('预览面板没打开')

            /* 全选一下把操作条召出来 —— 「删除种子」要拿订阅 id 去下载器里找任务，
               这条订阅还没入库、没有 id，那颗不该出现 */
            await step('预览表头全选', `(window.__vis('thead input')[0].click(), 1)`, 700)
            const canDel = await ev(`window.__vis('.v-btn').some(b => b.textContent.includes('删除种子'))`, 0)
            if (canDel) bad.push('新建订阅的预览里出现了「删除种子」—— 这条订阅还没有 id，删的不知道是谁的种子')
        }

        /* ══ 场景四：从队列里的编辑框点开三家番剧列表，各家收到的定位条件不能串 ══
         *
         * 走的是「挑一个组 → 进队列」这条路，落地的编辑框就是 AniEditDialog 本体
         * （新建和编辑是同一个组件，队列里那个只是没有外层的 v-dialog），
         * 所以这里量到的同时也是「编辑订阅」那条路。
         * 不去订阅列表上找「编辑」按钮：那颗是十一款各画各的，认文案迟早认岔。
         */
        await open()
        note('▶ 场景四：队列里的编辑框 → 主 RSS / 备用 RSS 两排各点开三家番剧列表')
        await toQueue()

        const base = await ev('window.__layers()', 0)
        for (const where of ['主 RSS', '备用 RSS']) {
            if (where === '备用 RSS') {
                try {
                    await step('切到「备用 RSS」一页', `window.__topClick('.v-tab', '备用')`, 900)
                } catch (e) {
                    bad.push('编辑框里没有「备用 RSS」这一页 —— ' + e.message)
                    break
                }
            }
            for (const [name, probe] of SOURCE_PROBES) {
                await ev('window.__log = []', 0)
                try {
                    await step(`${where} → 点「${name}」`,
                        `window.__topClick('.v-btn', ${JSON.stringify(name)})`, 2800)
                } catch (e) {
                    bad.push(`${where} 那排点不开「${name}」—— ${e.message}`)
                    continue
                }
                const log4 = await ev('window.__log', 0)
                const kw = await ev('window.__topInput()', 0)
                const tiles = await ev(`window.__topVis('.tile').length`, 0)
                const why = probe(log4, kw, tiles)
                if (why) {
                    dump(log4, true)
                    note(`  搜索框=${JSON.stringify(kw)} 卡片=${tiles}`)
                    bad.push(`${where} → ${name}：${why}`)
                }
                await esc()
                /* 关不干净的话，下一轮会点到背后那层，量出来的东西就不是这一家的了 */
                const now = await ev('window.__layers()', 0)
                if (now !== base) bad.push(`关掉「${name}」番剧列表后还剩 ${now} 层弹窗（该是 ${base} 层）`)
            }
        }

        /* ══ 场景五：这一轮新做的那条路 —— 勾几个组一次交出去、撞名问一次 ══
         *
         * 三件事一起量：
         *  · 同一部番勾两个字幕组要合成**一条**订阅（第二个进备用 RSS），
         *    而备用源得跟着请求一起交上去（3.2.48 的 RssToAniDTO.standbyRssList）；
         *  · 勾完要进队列，不是就地入库；
         *  · 撞名时先问一次，点了「覆盖」才带 override=true 重发。
         *    第三件在演示站上永远走不到（假后端一律回成功），所以靠 __dupAdd 伪造一次。
         */
        await open()
        note('▶ 场景五：勾两个字幕组 → 下一步 → 撞名 → 覆盖')
        await step('打开「添加订阅」', `window.__clickOne('button', ${ADD_LABELS})`, 900)
        await step('浏览 Mikan 番剧列表', `window.__click('button.browse', 'Mikan')`, 2600)
        await step('点开第一部番', `(window.__vis('.tile-head')[0].click(), 1)`, 2000)
        await step('勾第一个字幕组', `(window.__vis('.group input[type=checkbox]')[0].click(), 1)`, 900)
        await step('版本弹窗点「确定」', `window.__click('.v-card-actions .v-btn', '确定')`, 900)
        await step('勾第二个字幕组', `(window.__vis('.group input[type=checkbox]')[1].click(), 1)`, 900)
        await step('版本弹窗点「确定」', `window.__click('.v-card-actions .v-btn', '确定')`, 900)
        await step('点「下一步」', `window.__click('.basket .v-btn', '下一步')`, 2600)

        const log5 = await ev('window.__log', 0)
        dump(log5, true)
        const batchReq = log5.filter(r => r.url.includes('rssToAni')).map(r => JSON.parse(r.body || '{}')).pop()
        if (!batchReq) {
            bad.push('勾完点「下一步」之后没发 rssToAni')
        } else if (!(batchReq.standbyRssList || []).length) {
            bad.push('同一部番勾了两个字幕组，备用 RSS 没跟着一起交上去（3.2.48 的 standbyRssList）')
        }
        const tabs5 = await ev(`window.__vis('.queue-tab').length`, 0)
        if (tabs5 !== 1) bad.push(`同一部番的两个字幕组该合成一条，实际进了 ${tabs5} 条`)

        await ev('window.__dupAdd = 1', 0)
        await step('点「添加」', `window.__topClick('.v-card-actions .v-btn', '添加')`, 1600)
        const asked = await ev(
            `window.__topVis('.v-card-title').some(t => t.textContent.includes('订阅重复'))`, 0)
        if (!asked) {
            bad.push('撞名时没有问一次「订阅重复」—— 没识别出那两句话，或者直接报错了')
        } else {
            await step('点「覆盖原订阅」', `window.__topClick('.v-card-actions .v-btn', '覆盖原订阅')`, 2200)
            const log5b = await ev('window.__log', 0)
            dump(log5b, true)
            const adds = log5b.filter(r => r.url.includes('addAni'))
            if (adds.length < 2) bad.push(`覆盖只发了 ${adds.length} 次 addAni，应该先失败一次再带 override 重发`)
            if (!adds.some(r => /[?&]override=true/.test(r.url)))
                bad.push('点了覆盖但重发时没带 override=true —— 覆盖永远不生效')
        }
        const left = await ev(`window.__vis('.queue-tab').length`, 0)
        if (left) bad.push(`覆盖之后队列里还剩 ${left} 条 —— 加成功的那条该从队列里消失`)
    } catch (e) {
        bad.push('脚本没走通：' + e.message)
    }

    if (bad.length) {
        console.log(`\n✗ ${id}`)
        trace.forEach(t => console.log(t))
        bad.forEach(b => console.error(`  ✗ ${b}`))
    } else {
        console.log(`✓ ${id}`)
    }
    return bad
}

let broken = 0
for (const id of PRESETS) broken += (await checkPreset(id)).length ? 1 : 0

console.log('')
if (broken) console.error(`添加订阅体检不通过：${broken} / ${PRESETS.length} 款有问题`)
else console.log(`✓ ${PRESETS.length} 款全部通过：换来源之后没有一样东西是上一家的，`
    + `挑回来的东西只进队列、漏不到手填那一栏，队列里能预览，三家番剧列表收到的定位条件没串，`
    + `同一部番勾多个组会合成一条并带上备用 RSS，撞名时问一次、覆盖才带 override`)

ws.close(); proc.kill(); server.close()
process.exit(broken ? 1 : 0)
