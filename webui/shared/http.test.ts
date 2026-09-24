/**
 * toApiUrl 的回归测试。
 *
 * 存在的理由很具体：曾经 `url.pathname += path` 把 path 里自带的问号转义成 %3F
 * 塞进了路径，紧接着 `url.search = ...` 又把查询串清空 —— 18 个走 q() 的接口
 * （删订阅、批量启停、批量刮削、改订阅、搜番、删种、停止/重启……）参数全部送不到后端，
 * 而界面上什么都看不出来，按钮照点、请求照发，就是不生效。
 *
 * 这类错误不会有编译错误也不会抛异常，只能靠断言拦。
 *
 *   node --experimental-strip-types shared/http.test.ts
 */
import assert from 'node:assert/strict'

/** toApiUrl 读 location，Node 里先造一个 */
function at(href: string) {
    const u = new URL(href)
    ;(globalThis as {location?: unknown}).location = {
        protocol: u.protocol, host: u.host, pathname: u.pathname,
    }
}

// getBaseUrl() 每次调用都现读 location，所以换「当前页面」只要改这个对象，不用重新 import
at('http://ani.local:7789/index.html')
const {toApiUrl, http, setErrorHandler, posterUrl} = await import('./http.ts')

/* ── path 里自带查询串 ── */
assert.equal(toApiUrl('api/stop?status=0'), 'http://ani.local:7789/api/stop?status=0')
assert.equal(toApiUrl('api/deleteAni?deleteFiles=true'), 'http://ani.local:7789/api/deleteAni?deleteFiles=true')
assert.equal(toApiUrl('api/setAni?move=false'), 'http://ani.local:7789/api/setAni?move=false')

/* 问号绝不能出现在路径里 —— 这是当初那个 bug 的直接特征 */
for (const p of ['api/stop?status=0', 'api/batchEnable?value=true', 'api/scrape?force=1']) {
    const {pathname, search} = new URL(toApiUrl(p))
    assert.ok(!pathname.includes('%3F'), `${p}: 问号被转义进了路径 → ${pathname}`)
    assert.ok(search.length > 1, `${p}: 查询串丢了`)
}

/* ── 参数走 params 形参 ── */
assert.equal(toApiUrl('api/file', {filename: 'a+b/c=', s: 'tok'}),
    'http://ani.local:7789/api/file?filename=a%2Bb%2Fc%3D&s=tok')

/* ── 两种来源同时存在：显式 params 覆盖 path 里的同名值 ── */
assert.equal(toApiUrl('api/x?a=1&b=2', {b: '9'}), 'http://ani.local:7789/api/x?a=1&b=9')

/* ── 反代到子路径下仍要对 ── */
at('http://nas.local/ani-rss/index.html')
assert.equal(toApiUrl('api/stop?status=1'), 'http://nas.local/ani-rss/api/stop?status=1')

/* ── 中文和 & 必须转义，不能截断（上游裸拼模板串就栽在这） ── */
at('http://ani.local:7789/')
{
    const url = new URL(toApiUrl('api/searchBgm?name=' + encodeURIComponent('芙莉莲 & 你')))
    assert.equal(url.searchParams.get('name'), '芙莉莲 & 你')
}

/* ── postQuiet：老后端上探测 /api/webui/* 不能弹全局提示 ──
   ani-rss 没有这个端点时回的是 Spring 的 404 包（既没有 code 也没有 message），
   走普通 post 的话每次打开关于页都会弹一句「undefined」。 */
{
    // request() 一进来就读令牌，Node 里没有 localStorage，不补一个的话整段是白跑的
    ;(globalThis as {localStorage?: unknown}).localStorage = {getItem: () => null, setItem: () => {}, removeItem: () => {}}

    const errors: string[] = []
    setErrorHandler(m => void errors.push(m))
    globalThis.fetch = (async () => new Response(
        JSON.stringify({timestamp: 0, status: 404, error: 'Not Found', path: '/api/webui/getUpdate'}),
        // 端点不存在时 HTTP 状态码本身就是 404（后端自己的错误包才是恒 200），
        // 原来这里造的是 200，退回状态码那条路就测不到
        {status: 404, headers: {'Content-Type': 'application/json'}},
    )) as typeof fetch

    // Spring 那份 404 包里既没有 code 也没有 message：退回 HTTP 状态码和 error 字段，
    // 否则弹出来是「undefined」，调用方也没法靠 404 认出「这版后端还没这个端点」
    await assert.rejects(() => http.postQuiet('api/webui/getUpdate'),
        (e: Error & {code: number}) => e.name === 'ApiError' && e.code === 404 && e.message === 'Not Found')
    assert.deepEqual(errors, [], `postQuiet 不该弹提示，却弹了：${errors}`)

    await assert.rejects(() => http.post('api/webui/getUpdate'))
    assert.equal(errors.length, 1, '普通 post 仍然要弹提示')
}

/* ── FormData 请求体：Content-Type 必须让浏览器自己写 ──
   multipart 的头里要带一段 boundary，手写成 'multipart/form-data' 就没有 boundary，
   后端一个字段都解不出来（上传界面包、导入配置、传封面三个端点全废）。
   同时请求体不能被 JSON.stringify 掉。 */
{
    let seen: RequestInit | undefined
    globalThis.fetch = (async (_u: unknown, init: RequestInit) => {
        seen = init
        return new Response(JSON.stringify({code: 200, message: '', data: null, t: Date.now()}),
            {headers: {'Content-Type': 'application/json'}})
    }) as unknown as typeof fetch

    const fd = new FormData()
    fd.append('file', new Blob(['x']), 'a.zip')
    await http.post('api/webui/upload', fd)
    const headers = seen?.headers as Record<string, string>
    assert.equal(headers['Content-Type'], undefined, 'FormData 不许自己设 Content-Type')
    assert.ok(seen?.body instanceof FormData, 'FormData 必须原样递给 fetch，不能被 JSON 化')

    // JSON 那条路照旧
    await http.post('api/setConfig', {a: 1})
    assert.equal((seen?.headers as Record<string, string>)['Content-Type'], 'application/json')
    assert.equal(seen?.body, '{"a":1}')
}

/* ── 信封里没有 code，但确实是成功的 ──
   已发布的 ani-rss 里 /api/upload 回的是 `new Result<>().setMessage("上传完成")`，
   那个空构造器不填 code。按「2xx 才算成功」判的话，传封面每次都弹一句「上传完成」
   当报错，回来的相对路径还被丢掉，封面就永远换不上。
   放行的条件卡死在自家信封上：HTTP 2xx + 有 t（后端每个 Result 都盖的时间戳）。
   上面那份 Spring 404 包用的是 timestamp、HTTP 也是 404，两条都不满足，照旧当错误。 */
{
    const errors: string[] = []
    setErrorHandler(m => void errors.push(m))
    globalThis.fetch = (async () => new Response(
        JSON.stringify({message: '上传完成', data: '3/3abc.png', t: Date.now()}),
        {headers: {'Content-Type': 'application/json'}},
    )) as typeof fetch

    assert.equal(await http.post('api/upload', new FormData()), '3/3abc.png')
    assert.deepEqual(errors, [], `成功的包不该弹提示，却弹了：${errors}`)

    // 同样没有 code，但 HTTP 不是 2xx —— 这种照旧当错误，别把网关的错误页当成功
    globalThis.fetch = (async () => new Response(
        JSON.stringify({message: 'boom', data: null, t: Date.now()}),
        {status: 502, headers: {'Content-Type': 'application/json'}},
    )) as typeof fetch
    await assert.rejects(() => http.post('api/upload', new FormData()),
        (e: Error & {code: number}) => e.code === 502)
}

/* ── 改过名的端点：新名字 404 才退回老名字 ──
   上游 3.2.37 把 exportConfig / importConfig 改名成 exportBackup / importBackup，老名字删了。
   备用界面挑不了后端版本，两边都得能用。要拦的是三种静默出错：
   老后端上只打新名字（404 当报错弹出来）、新名字真报错却又去打老名字（错误被 404 盖掉）、
   以及试新名字时的 404 也弹了一句提示。 */
{
    const errors: string[] = []
    setErrorHandler(m => void errors.push(m))
    const env = (code: number, message = '', data: unknown = null) =>
        new Response(JSON.stringify({code, message, data, t: Date.now()}),
            {headers: {'Content-Type': 'application/json'}})

    // 老后端：新名字是 404 信封（HTTP 200），老名字成功
    let hits: string[] = []
    globalThis.fetch = (async (u: string) => {
        const p = new URL(u).pathname
        hits.push(p)
        return p.endsWith('/importBackup') ? env(404, '404 Not Found !') : env(200, '导入成功')
    }) as unknown as typeof fetch
    await http.postRenamed(['api/importBackup', 'api/importConfig'], new FormData())
    assert.deepEqual(hits, ['/api/importBackup', '/api/importConfig'])
    assert.deepEqual(errors, [], `试新名字的 404 不该弹提示，却弹了：${errors}`)

    // 新后端：一次就中，不许再去碰老名字
    hits = []
    globalThis.fetch = (async (u: string) => (hits.push(new URL(u).pathname), env(200))) as unknown as typeof fetch
    await http.postRenamed(['api/importBackup', 'api/importConfig'], new FormData())
    assert.deepEqual(hits, ['/api/importBackup'])

    // 新名字真报错（不是 404）：原样弹、原样抛，不去打老名字
    hits = []
    globalThis.fetch = (async (u: string) => (hits.push(new URL(u).pathname), env(500, '导入格式异常'))) as unknown as typeof fetch
    await assert.rejects(() => http.postRenamed(['api/importBackup', 'api/importConfig'], new FormData()),
        (e: Error & {code: number}) => e.code === 500)
    assert.deepEqual(hits, ['/api/importBackup'])
    assert.deepEqual(errors, ['导入格式异常'])

    // 两个名字都没有：最后那个 404 要照常提示，不能一声不吭
    errors.length = 0
    globalThis.fetch = (async () => env(404, '404 Not Found !')) as unknown as typeof fetch
    await assert.rejects(() => http.postRenamed(['api/a', 'api/b']))
    assert.deepEqual(errors, ['404 Not Found !'])

    /* 文件端点：成功是字节流（不套信封），失败是信封 */
    errors.length = 0
    hits = []
    let auth: string | undefined
    ;(globalThis as {localStorage?: unknown}).localStorage = {getItem: () => 'tok', setItem: () => {}, removeItem: () => {}}
    globalThis.fetch = (async (u: string, init: RequestInit) => {
        const p = new URL(u).pathname
        hits.push(p)
        auth = (init.headers as Record<string, string>).Authorization
        if (p.endsWith('/exportBackup')) return env(404, '404 Not Found !')
        return new Response(new Blob(['PK']), {headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'inline; filename="ani-rss.backup.3.2.28.zip"',
        }})
    }) as unknown as typeof fetch
    const got = await http.fileRenamed(['api/exportBackup', 'api/exportConfig'])
    assert.deepEqual(hits, ['/api/exportBackup', '/api/exportConfig'])
    assert.equal(got.filename, 'ani-rss.backup.3.2.28.zip', '文件名要照后端给的存（带版本号）')
    assert.equal(await got.blob.text(), 'PK')
    assert.equal(auth, 'tok', '令牌走请求头，不再进查询串')
    assert.ok(!hits.some(h => h.includes('s=')))
    assert.deepEqual(errors, [])

    // 信封说成功却没给文件：当错误，别存一个空文件下来
    globalThis.fetch = (async () => env(200)) as unknown as typeof fetch
    await assert.rejects(() => http.fileRenamed(['api/exportBackup']))
    assert.deepEqual(errors, ['服务端没有返回文件'])
    ;(globalThis as {localStorage?: unknown}).localStorage = {getItem: () => null, setItem: () => {}, removeItem: () => {}}
}

/* ── posterUrl：Mikan 那层「裁成正方形」的缩放参数必须摘掉 ──
   Mikan 列表里发的是 ?width=400&height=400，它的图床按这个框中心裁一刀；
   原图是 850×1200 的竖版海报，裁完再被我们 3:4 的封面框裁第二刀，剩不下半张。
   只删 height、保留 width，Mikan 就按原比例算高（实测 width=300 回 300×424）。 */
{
    const mikan = 'https://mikanani.me/images/Bangumi/202604/b6a83131.jpg?width=400&height=400&format=webp'
    const fixed = new URL(posterUrl(mikan))
    assert.equal(fixed.searchParams.get('height'), null, 'height 必须摘掉，否则还是方的')
    assert.equal(fixed.searchParams.get('width'), '300')
    assert.equal(fixed.searchParams.get('format'), 'webp', '别把人家其它参数一起弄丢')
    assert.equal(fixed.pathname, '/images/Bangumi/202604/b6a83131.jpg')

    // 没有查询串的（bgm 原图就是这样）原样返回，别平白给人加参数
    const bgm = 'https://lain.bgm.tv/pic/cover/l/aa/bb/1234_x.jpg'
    assert.equal(posterUrl(bgm), bgm)

    // 只给了一边的本来就保比例，不要多事
    const oneSide = 'https://mikanani.me/images/Bangumi/202604/x.jpg?width=200&format=webp'
    assert.equal(posterUrl(oneSide), oneSide)
}

console.log('✓ toApiUrl 全部断言通过')
console.log('✓ postQuiet 静默行为断言通过')
console.log('✓ FormData 请求体断言通过')
console.log('✓ 缺 code 的成功包断言通过')
console.log('✓ 改名端点回退断言通过')
console.log('\u2713 posterUrl 断言通过')
