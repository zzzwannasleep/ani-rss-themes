/**
 * ani-rss 接口层。
 *
 * 与后端的约定全部在这里，两个 WebUI 共用，UI 层不许自己拼 URL、自己塞请求头。
 *
 * 约定来源（上游 test 分支实读，非推测）：
 *  - 响应恒为 Result<T> = {code, message, data, t}；code 是**业务码不是 HTTP 状态码**，
 *    200~299 才算成功。见 ani/rss/entity/web/Result.java
 *  - 令牌明文放 Authorization 头，没有 Bearer 前缀。见 ani-rss-ui/src/js/api.js
 *  - 令牌存 localStorage 的 'authorization' 键 —— 特意和上游用同一个键：
 *    同源共享，在自带界面登录过的人切过来就已经是登录态，不必再登一次。
 *  - t 是服务端毫秒时间戳，和本地差超过 30 分钟说明有一边时钟不对，只告警不拦截。
 */

const TOKEN_KEY = 'authorization'

export function getToken(): string {
    return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(v: string): void {
    if (v) localStorage.setItem(TOKEN_KEY, v)
    else localStorage.removeItem(TOKEN_KEY)
}

/**
 * 接口根地址。
 *
 * 取当前页面所在**目录**，让整套东西在反代的任意子路径下都能用（/ani-rss/ 之类）。
 * 上游同名函数直接用 location.pathname 拼，页面以 /x/index.html 打开时会拼出
 * /x/index.htmlapi/...；这里把末段文件名去掉，避开那个洞。
 */
export function getBaseUrl(): string {
    const {protocol, host, pathname} = location
    const dir = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]*$/, '')
    return `${protocol}//${host}${dir}`
}

/**
 * 拼一个带查询参数的接口地址。
 *
 * path 里可以自带查询串（api.ts 的 q() 就是这么拼的），必须先把它拆出来 ——
 * `url.pathname += 'api/stop?status=0'` 会把问号转义成 %3F 塞进**路径**，
 * 拼出 /api/stop%3Fstatus=0：路由匹配不上，参数也永远读不到。
 * 而下一行 `url.search = ...` 又会把仅有的查询串清掉。
 * 这两下叠在一起，18 个走 q() 的接口（删订阅、批量启停、批量刮削、改订阅、
 * 搜番、删种、停止/重启……）的参数全都送不到后端。
 */
export function toApiUrl(path: string, params: Record<string, string> = {}): string {
    const [pathname, query = ''] = path.split('?')
    const url = new URL(getBaseUrl())
    url.pathname += pathname
    const search = new URLSearchParams(query)
    // 显式传进来的覆盖 path 里自带的同名参数
    for (const [k, v] of Object.entries(params)) search.set(k, v)
    url.search = search.toString()
    return url.toString()
}

/**
 * UTF-8 安全的 base64。
 * 直接 btoa 遇到中文会抛 InvalidCharacterError，番剧名基本全是中文，绕不开。
 * 和上游 base64Encode 行为一致（标准 base64，非 URL-safe；靠 URLSearchParams 转义）。
 */
export function base64Encode(s: string): string {
    const bytes = new TextEncoder().encode(s)
    let bin = ''
    // 不用 String.fromCharCode(...bytes)：番剧名不长，但展开成参数列表对长字符串会爆栈，
    // 而这个函数也用在文件路径上，路径可以很长
    bytes.forEach(b => {
        bin += String.fromCharCode(b)
    })
    return btoa(bin)
}

/**
 * 封面图地址。
 * 这类地址用在 <img src> 上，设不了请求头，所以令牌只能走查询参数 s —— 上游如此，照办。
 */
export function proxyImage(imgUrl: string): string {
    // 和 toApiFile 同一个道理：已经自带内容的地址原样返回，别再套一层代理
    if (/^(data:|blob:)/.test(imgUrl)) return imgUrl
    return toApiUrl('api/proxyImage', {imgUrl: base64Encode(imgUrl), s: getToken()})
}

/**
 * 番剧站给的封面地址，去掉它自己那层「裁成正方形」的缩放参数。
 *
 * Mikan 在列表里发的是 `xxx.jpg?width=400&height=400&format=webp` —— 同时给了宽和高，
 * 它的图床就按这个框**中心裁**一刀。原图是 850×1200 的竖版海报，裁成 400×400 之后
 * 上下已经被切掉一大截；我们这边的封面框又是 54×74（3:4），再 object-fit: cover 一次，
 * 左右还要再切掉四分之一。两刀叠起来，剩下的连半张海报都不到 —— 就是「mikan 的封面
 * 只剩四分之三、占不满」的由来。
 *
 * AniBT 和 AnimeGarden 直接给 bgm 的原图（本来就是竖版海报），所以那两家没这个毛病。
 *
 * 只删 height，保留（或补上）width：Mikan 的图床给了 width 就按原比例算高
 * —— 实测 `?width=300&format=webp` 回的是 300×424，正是原图的 850:1200。
 * 不整个删掉缩放是因为原图有 260KB，一屏三十张就是 8MB。
 *
 * 认地址而不是认来源：别处要是也拿到这种带方框参数的图，一样归这里管。
 */
export function posterUrl(imgUrl: string, width = 300): string {
    const i = imgUrl.indexOf('?')
    if (i < 0) return imgUrl
    const q = new URLSearchParams(imgUrl.slice(i + 1))
    // 只有「宽高都给了」才是在裁方框；单给一边的本来就保比例，不要多事
    if (!q.has('width') || !q.has('height')) return imgUrl
    q.delete('height')
    q.set('width', String(width))
    return imgUrl.slice(0, i) + '?' + q.toString()
}

/** 文件下载地址，同样用查询参数带令牌 */
export function toApiFile(filename: string): string {
    /* 已经是一个完整地址就原样返回，不再套一层 api/file。
       后端给的 cover 永远是服务器上的本地路径（Windows 下还带盘符），不可能长成 URL，
       所以这个判断在真实环境里是死代码。演示站需要它：<img src> 不走 fetch，
       拦不住，只能让数据直接给出能用的地址 —— 内联的 data: URI 或 bgm 图床的 https 地址。 */
    if (/^(data:|blob:|https?:)/i.test(filename)) return filename
    return toApiUrl('api/file', {filename: base64Encode(filename), s: getToken()})
}

export interface Result<T> {
    code: number
    message: string
    data: T
    t: number
}

/** 鉴权失效时的回调，由各 app 在启动时注册（跳登录页的方式两边不同） */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void): void {
    onUnauthorized = fn
}

/** 出错时给用户看的提示，由各 app 注册（vt 用 snackbar，qb 用 toast） */
let onError: ((msg: string) => void) | null = null

export function setErrorHandler(fn: (msg: string) => void): void {
    onError = fn
}

export class ApiError extends Error {
    readonly code: number

    // 不用 `constructor(public code, ...)` 这种参数属性：Node 的 --experimental-strip-types
    // 是纯剥类型、不做降级，遇到参数属性直接报错，这个模块就没法在 Node 里跑测试了
    constructor(code: number, message: string) {
        super(message)
        this.code = code
        this.name = 'ApiError'
    }
}

let skewWarned = false

/**
 * quiet：失败时不弹全局提示，只抛 ApiError 给调用方。
 * 给「这个后端有没有这个端点」这类探测用 —— 老版本 ani-rss 没有 /api/webui/*，
 * 回的是 {code: 404, message: "404 Not Found !"}，照常走全局提示就是
 * 每次打开关于页弹一句「404 Not Found !」，而这只是探测的正常结果。
 *
 * 'notFound'：只有 404 不提示，别的错误照弹。给改过名的端点先试新名字用（见 firstFound）——
 * 新端点真出错（导入包格式不对之类）得让人看见，不能跟着「没有这个端点」一起咽掉。
 */
type Quiet = boolean | 'notFound'

const silenced = (quiet: Quiet, code: number) => quiet === true || (quiet === 'notFound' && code === 404)

function authHeaders(): Record<string, string> {
    const token = getToken()
    return token ? {Authorization: token} : {}
}

async function request<T>(path: string, method: string, body?: unknown, quiet: Quiet = false): Promise<T> {
    const headers = authHeaders()
    /* FormData 的 Content-Type 必须让浏览器自己写：multipart 要带一段 boundary，
       手写成 multipart/form-data 就没有 boundary，后端一个字段都解不出来。
       所以这里只给 JSON 的情况设头，FormData 原样递给 fetch。 */
    const isForm = body instanceof FormData
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

    const res = await fetch(toApiUrl(path), {
        method,
        headers,
        body: body === undefined ? null : isForm ? body : JSON.stringify(body),
    })
    return unwrap<T>(res, quiet)
}

/** 按 Result 信封解一个响应：成功回 data，失败弹提示（除非 quiet）并抛 ApiError */
async function unwrap<T>(res: Response, quiet: Quiet): Promise<T> {
    // 后端正常情况下 HTTP 恒 200、错误码在包里；但静态资源 404 之类会走到这
    let json: Result<T>
    try {
        json = await res.json()
    } catch {
        throw new ApiError(res.status, `服务端返回了非 JSON 内容（HTTP ${res.status}）`)
    }

    // 时钟偏移只提醒一次，刷屏没有意义
    if (!skewWarned && Math.abs(Date.now() - Number(json.t)) > 30 * 60 * 1000) {
        skewWarned = true
        console.warn('[ani-rss] 与服务端时差超过 30 分钟，涉及时间的显示可能不准')
    }

    if (json.code >= 200 && json.code < 300) return json.data

    /* 没有 code 也可能是成功的。
       已发布的 ani-rss 里，/api/upload 走的是 `new Result<>().setMessage("上传完成")`,
       那个空构造器不填 code —— 包里 code 是 null，落到下面的错误分支，
       封面上传每次都弹一句「上传完成」当报错，返回的路径还被丢了。
       上游 3.2.18 之后的重构给空构造器补上了 200，但已经装在用户机器上的都还是老的。
       只认自家的信封：t 是后端给每个 Result 盖的时间戳，反代或别人家的 JSON 没有这一项。 */
    if (json.code == null && typeof json.t === 'number' && res.ok) return json.data

    /* 后端的错误包一定有 code 和 message，但**不是所有 JSON 都出自后端**。
       ani-rss 自己的 CustomExceptionHandler 把「没有这个端点」也包成了 {code: 404}
       （HTTP 仍是 200），所以老版本上探测 /api/webui/* 拿到的是正常信封 ——
       关于页就是靠这个 404 认出「这版 ani-rss 还没这个功能」的。
       但请求不一定走得到它：反代挡在前面、容器没起来、路径被别的东西接管，
       回来的可能是别人家的 JSON，两个字段都没有。照原样往下抛就是一个
       code=undefined、message=undefined 的 ApiError，提示弹出来是「undefined」。
       没有 code 就退回 HTTP 状态码，没有 message 就退回 error 字段。 */
    const code = typeof json.code === 'number' ? json.code : res.status
    const message = json.message || (json as {error?: string}).error || `HTTP ${res.status}`

    if (code === 403) {
        setToken('')
        onUnauthorized?.()
    }
    if (!silenced(quiet, code)) onError?.(message)
    throw new ApiError(code, message)
}

/**
 * 端点改过名：依次试 paths，前面的回 404（「没有这个端点」）才试下一个。
 *
 * 备用界面是丢进任意版本的 config/webui/ 里跑的，挑不了后端；
 * 认的是端点在不在，不是版本号（同一个版本号上游重推过）。
 * 新名字放前面：新后端一次就中，老后端多一跳 404，代价只落在老版本上。
 */
const found = new Map<string, number>()

async function firstFound<T>(paths: string[], attempt: (path: string, quiet: Quiet) => Promise<T>): Promise<T> {
    /* 试出来哪个名字能用就记住，本页之内直接用它：
       老后端上导入备份每次都得先把整个 zip 传给新名字吃一个 404、再传第二遍，
       备份带着封面和种子，几十 MB 白传一遍。
       记住的那个也 404 了（没刷新页面，后端却升级了）就把记忆清掉、从头再试一轮。 */
    const key = paths.join('|')
    const start = found.get(key)
    if (start) {
        try {
            return await attempt(paths[start], 'notFound')
        } catch (e) {
            if (!(e instanceof ApiError) || e.code !== 404) throw e
            found.delete(key)
        }
    }
    for (let i = 0; ; i++) {
        const last = i === paths.length - 1
        try {
            const r = await attempt(paths[i], last ? false : 'notFound')
            found.set(key, i)
            return r
        } catch (e) {
            if (last || !(e instanceof ApiError) || e.code !== 404) throw e
        }
    }
}

/**
 * 取一个「回文件」的端点（导出备份这类）。
 *
 * 成功时后端直接写字节流、不套信封；失败时（令牌过期、没有这个端点）回的却是普通的
 * Result JSON。所以按 Content-Type 分流：JSON 当信封走 unwrap，其余当文件。
 *
 * 原来导出是一个 <a href="...?s=令牌">：令牌进了浏览器历史和反代日志，
 * 出错时新标签页里摊开一段 JSON，而老后端没有新端点时根本没法先探一下再退回。
 * 走 fetch 之后令牌回到请求头，错误走全局提示，也就能在 404 时换老名字。
 */
async function fetchFile(path: string, quiet: Quiet): Promise<{blob: Blob, filename: string}> {
    const res = await fetch(toApiUrl(path), {headers: authHeaders()})
    if ((res.headers.get('Content-Type') || '').includes('json')) {
        await unwrap(res, quiet)
        // 信封说成功却没给文件：不是这类端点该有的回应，别存一个空文件下来
        const message = '服务端没有返回文件'
        if (!quiet) onError?.(message)
        throw new ApiError(res.status, message)
    }
    if (!res.ok) {
        // 反代的 HTML 错误页之类。404 同样算「没有这个端点」，让 firstFound 去试老名字
        const message = `下载失败（HTTP ${res.status}）`
        if (!silenced(quiet, res.status)) onError?.(message)
        throw new ApiError(res.status, message)
    }
    // 后端给的是 `inline; filename="ani-rss.backup.3.2.37.zip"`，带版本号，照它的存
    const cd = res.headers.get('Content-Disposition') || ''
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
    return {blob: await res.blob(), filename: m ? decodeURIComponent(m[1]) : path.split('/').pop() || 'download'}
}

export const http = {
    get: <T>(path: string) => request<T>(path, 'GET'),
    post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body),
    put: <T>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
    del: <T>(path: string, body?: unknown) => request<T>(path, 'DELETE', body),
    /** 静默 POST：出错不弹提示，调用方自己兜（见 request 的 quiet） */
    postQuiet: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body, true),
    /** 改过名的 POST 端点，paths 新名字在前（见 firstFound） */
    postRenamed: <T>(paths: string[], body?: unknown) =>
        firstFound(paths, (p, quiet) => request<T>(p, 'POST', body, quiet)),
    /** 改过名的文件端点，同上 */
    fileRenamed: (paths: string[]) => firstFound(paths, fetchFile),
}
