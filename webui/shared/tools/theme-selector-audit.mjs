#!/usr/bin/env node
/**
 * 主题选择器体检
 *
 * legacy/themes/*.css 是「给 ani-rss 自带界面换皮」的样式表，它靠类名挂到上游的 DOM 上。
 * 上游一改版类名就没了，主题不会报错，只是静悄悄不生效 —— 界面看着「主题好像没装上」。
 * 这个脚本把「主题里用到、上游已经没有」的类名算出来；改动前后各跑一次就能看见差量。
 *
 * 用法：node shared/tools/theme-selector-audit.mjs [upstreamSrcDir]
 * 上游源码默认取 shared/tools/upstream/ani-rss-ui/src（gen-types 那次 clone 下来的）。
 * 退出码 0 = 干净，1 = 有失效选择器。
 */
import {readFileSync, readdirSync, statSync} from 'node:fs'
import {join, relative, resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const themesDir = join(repo, 'legacy/themes')
const upSrc = resolve(process.argv[2] || join(here, 'upstream/ani-rss-ui/src'))

/* ---------- 1. 上游真实存在的类名 ---------- */
const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p, out)
        else if (/\.(vue|css|js|ts|html)$/.test(name)) out.push(p)
    }
    return out
}

const upstream = new Set()

/* .vue 里 class="a b c" 和 :class="{'a': x}" 的键 */
for (const file of walk(upSrc)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/class="([^"]*)"/g)) {
        for (const cls of m[1].split(/[\s{}:'",[\]()?]+/)) {
            if (/^-?[_a-zA-Z][\w-]*$/.test(cls)) upstream.add(cls)
        }
    }
    for (const m of text.matchAll(/:class="([^"]*)"/g)) {
        for (const q of m[1].matchAll(/['"]([\w-]+)['"]\s*:/g)) upstream.add(q[1])
    }
    /* 组件自己 scoped style 里写的选择器 */
    if (file.endsWith('.vue') || file.endsWith('.css')) {
        for (const sel of selectorsOf(text)) upstream.add(sel)
    }
}

/**
 * 只取「规则头」里的类名 —— 按 } 切成块，取每块最后一个 { 之前的那段。
 * 这样 url(https://lain.bgm.tv/...) 和字符串里的点不会被当成类选择器，
 * 也不会把 .com / .woff2 这种域名后缀算进来。
 */
function selectorsOf(text) {
    const out = []
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const block of clean.split('}')) {
        const brace = block.lastIndexOf('{')
        if (brace < 0) continue
        const head = block.slice(0, brace)
        /* 声明块里也可能有 url()，规则头里出现的一律不算 */
        for (const m of head.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) out.push(m[1])
    }
    return out
}

/* ---------- 2. 主题里用到、上游没有的 ---------- */
/**
 * autobangumi.css 那份是照 Auto_Bangumi 的界面写的（.ab-ui / .sidebar / .topbar / .card-*），
 * 目标根本不是 ani-rss 的 DOM，不能按同一把尺子量。
 */
const SKIP_PREFIX = /^(ab|sidebar|topbar|card|bangumi|page-bangumi|page-title|search|layout|empty-guide|group-badge|current|disabled|gs|dialog-fade|msg|toast)/

const report = new Map()

for (const name of readdirSync(themesDir).filter((n) => n.endsWith('.css'))) {
    const text = readFileSync(join(themesDir, name), 'utf8')
    for (const cls of selectorsOf(text)) {
        if (cls.startsWith('el-') || cls.startsWith('is-')) continue   // Element Plus 运行时类
        if (cls.startsWith('pv-')) continue                            // 预览页自己的
        if (cls.startsWith('md-')) continue                            // material-motion.js 运行时加的
        if (upstream.has(cls)) continue
        if (name === 'autobangumi.css' && SKIP_PREFIX.test(cls)) continue
        if (name === 'genshin-login.css' && /^gs/.test(cls)) continue
        if (!report.has(cls)) report.set(cls, new Map())
        const per = report.get(cls)
        per.set(name, (per.get(name) || 0) + 1)
    }
}

/* ---------- 3. 输出 ---------- */
const rows = [...report.entries()]
    .map(([cls, per]) => ({cls, files: per.size, hits: [...per.values()].reduce((a, b) => a + b, 0)}))
    .sort((a, b) => b.files - a.files || b.hits - a.hits || a.cls.localeCompare(b.cls))

const themeCount = readdirSync(themesDir).filter((n) => n.endsWith('.css')).length
const totalHits = rows.reduce((n, r) => n + r.hits, 0)

console.log(`上游源码：${relative(repo, upSrc)}（类名 ${upstream.size} 个）`)
console.log(`主题文件：${themeCount} 份\n`)

if (!rows.length) {
    console.log('✓ 主题里用到的类名，上游全都还在。')
} else {
    const pad = (s, n) => String(s).padEnd(n)
    console.log(pad('已失效的选择器', 28) + pad('出现在', 10) + '处数')
    console.log('-'.repeat(48))
    for (const r of rows) console.log(pad('.' + r.cls, 28) + pad(r.files + ' 份主题', 10) + r.hits)
    console.log('-'.repeat(48))
    console.log(`${rows.length} 个类名已失效，共 ${totalHits} 处引用。`)
}

process.exitCode = rows.length ? 1 : 0
