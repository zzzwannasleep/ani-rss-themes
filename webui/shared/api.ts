/**
 * ani-rss 接口封装。
 *
 * 一个端点一个函数，命名与上游 ani-rss-ui/src/js/http.js 保持一致，方便两边对照排查。
 * 与上游的差异只有一处但很重要：**查询参数一律走 URLSearchParams 转义**。
 * 上游是裸模板串拼接（`api/searchBgm?name=${name}`），番剧名里有 & 就会截断，
 * getSubtitles 传 base64 时里面的 '+' 还会被服务端解成空格。
 *
 * 端点清单来源：从 test 分支源码实抽并自校验，共 72 个，成表在 webui/spec-api.md ——
 * 用 shared/tools/extract-api.mjs 对着上游源码重跑就能更新，
 * 它会核对「抽出来的」和「源码里声明的」是不是一一对上，对不上直接失败。
 * 其中 file / proxyImage 这两个走 <img src>、设不了请求头的在 http.ts 里，不在这份。
 */
import {md5} from 'js-md5'
import {http, toApiUrl, getToken, base64Encode} from './http'
import type {
    About, Ani, AniBT, AniBTGroup, AniBTQueryDTO, AnimeGardenGroup, AnimeGardenWeek,
    BgmInfo, BgmMe, CollectionInfo, Config, EmbyViews, ImportAniDataDTO, Item, ListAni,
    Log, Login, Mikan, MikanGroup, MikanSeason, NotificationConfig, PlayItem,
    PlayItemSubtitles, ProxyTest, RssToAniDTO, ThemoviedbVO, TorrentsInfo, UpdateInfo,
} from './types'

/** 把查询参数拼到路径上，值一律转义 */
function q(path: string, params: Record<string, unknown>): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) sp.append(k, String(v))
    }
    const s = sp.toString()
    return s ? `${path}?${s}` : path
}

/**
 * 单文件的 multipart 请求体。字段名固定是 file —— 后端三个上传端点
 * （importBackup / upload / webui/upload）都写死了 @RequestParam("file")。
 *
 * 这几个上传原来各自手写 fetch，绕开了接口层：出错既不弹提示、403 也不会跳登录，
 * 传错文件时页面上一点反应都没有。现在统一走 http.post，FormData 由 request 识别。
 */
function filePart(file: File): FormData {
    const fd = new FormData()
    fd.append('file', file)
    return fd
}

/* ==================== 配置 ==================== */

/**
 * bgmImage 是 bgmImageSize 在 3.2.25 以前的名字。types.ts 由生成器照当前源码产出，
 * 已经没有这个键了，所以在这里单独声明 —— 别写回 types.ts，下次重跑会被覆盖掉。
 */
type LegacyConfig = Config & {bgmImage?: string}

export async function getConfig() {
    const c = await http.post<LegacyConfig>('api/config')
    // 3.2.25 以下回的是老键，统一成新键给界面用（见下面 setConfig 的说明）
    if (c.bgmImageSize === undefined) c.bgmImageSize = c.bgmImage
    return c as Config
}

/**
 * 保存配置。
 * login.password 必须是 MD5；留空表示不修改密码，这时不能把空串也 MD5 一遍
 * （空串的 MD5 是个有效摘要，会把密码真的改成空密码）。
 *
 * BGM 封面质量这个字段上游 3.2.25 把名字从 bgmImage 改成了 bgmImageSize
 * （`4f20b6d`，默认值同时从 large 改成 medium）。后端两边都是「有这个键就收，没有就不动」，
 * 所以两个键一起发：老后端认前者，新后端认后者，不用去嗅版本号。
 * 少发一个的后果是静默的 —— 界面上选了新值，落到后端的还是旧值，没有任何报错。
 */
export function setConfig(config: Config) {
    const c: LegacyConfig = JSON.parse(JSON.stringify(config))
    if (c.login) {
        c.login.username = c.login.username?.trim()
        const pwd = c.login.password?.trim()
        c.login.password = pwd ? md5(pwd) : ''
    }
    if (c.bgmImageSize !== undefined) c.bgmImage = c.bgmImageSize
    return http.post<void>('api/setConfig', c)
}

export const clearCache = () => http.post<void>('api/clearCache')
export const ping = () => http.get<unknown>('api/ping')
/**
 * 代理测试。**url 必须 base64**：后端 ConfigService.testProxy 第一行就是
 * `url = Base64.decodeStr(url)`，传明文进去解出来是一串乱码，请求发不出去，
 * 界面上只看到「测试失败」，看不出是自己把参数传错了。
 */
export const testProxy = (url: string, config: Config) =>
    http.post<ProxyTest>(q('api/testProxy', {url: base64Encode(url)}), config)
export const trackersUpdate = (config: Config) => http.post<string>('api/trackersUpdate', config)
export const downloadLoginTest = (config: Config) => http.post<void>('api/downloadLoginTest', config)
export const testIpWhitelist = () => http.post<void>('api/testIpWhitelist')

/* ==================== 登录 ==================== */

/** 登录。密码传 MD5 摘要，不是明文（后端 Login.password 注解写明「密码 (MD5摘要)」） */
export const login = (user: Login) =>
    http.post<string>('api/login', {...user, password: md5(user.password || '')})

/* ==================== 订阅 ==================== */

export const listAni = () => http.post<ListAni>('api/listAni')
export const addAni = (ani: Ani) => http.post<void>('api/addAni', ani)
/** move=true 时后端会把已下载的文件一并移动到新路径 */
export const setAni = (move: boolean, ani: Ani) => http.post<void>(q('api/setAni', {move}), ani)
export const deleteAni = (deleteFiles: boolean, ids: string[]) =>
    http.post<void>(q('api/deleteAni', {deleteFiles}), ids)
export const refreshAll = () => http.post<void>('api/refreshAll')
export const refreshAni = (ani: Ani) => http.post<void>('api/refreshAni', ani)
export const refreshCover = (ani: Ani) => http.post<string>('api/refreshCover', ani)
/** 预览订阅：返回下载位置、匹配到的资源项、以及推断出的遗漏集数 */
export const previewAni = (ani: Ani) =>
    http.post<{downloadPath: string; items: Item[]; omitList: number[]}>('api/previewAni', ani)
export const rssToAni = (dto: RssToAniDTO) => http.post<Ani>('api/rssToAni', dto)
export const downloadPath = (ani: Ani) => http.post<{downloadPath: string}>('api/downloadPath', ani)
export const importAni = (dto: ImportAniDataDTO) => http.post<void>('api/importAni', dto)

/* 批量操作 */
export const batchEnable = (value: boolean, ids: string[]) => http.post<void>(q('api/batchEnable', {value}), ids)
export const batchScrape = (force: boolean, ids: string[]) => http.post<void>(q('api/batchScrape', {force}), ids)
export const updateTotalEpisodeNumber = (force: boolean, ids: string[]) =>
    http.post<void>(q('api/updateTotalEpisodeNumber', {force}), ids)

/* ==================== 评分 / 刮削 ==================== */

/** 取当前用户在 Bangumi 上给这部番的个人评分（1~10 整数），与列表里的公开评分不是一回事 */
export const rate = (ani: Ani) => http.post<number | null>('api/rate', ani)
/** 提交个人评分。传 ani.score，返回服务端确认后的分值 */
export const setRate = (ani: Ani) => http.post<number | null>('api/setRate', ani)
export const scrape = (force: boolean, ani: Ani) => http.post<void>(q('api/scrape', {force}), ani)

/* ==================== 番剧源 ==================== */

/* 三个源都返回「按星期分组的番剧列表」，字段名各叫各的：
   Mikan 是 {seasons, weeks[].items}，AniBT 是 {availableSeasons, byWeekday[].animes}，
   AnimeGarden 直接就是 Week[]。SourceBrowserDialog 把它们归一成同一个形状。 */

/** MikanController#mikan 返回的是 Mikan（seasons / weeks / totalItem），不是单个番剧 */
export const mikan = (text: string, season?: MikanSeason | null) =>
    http.post<Mikan>(q('api/mikan', {text}), season ?? {})
export const mikanGroup = (url: string) => http.post<MikanGroup[]>(q('api/mikanGroup', {url}))
/** AniBTController#aniBT 收的是整个 DTO（season / bgmUrl / title），不是查询参数 */
export const aniBT = (dto: AniBTQueryDTO) => http.post<AniBT>('api/aniBT', dto)
export const aniBTGroup = (bgmId: string) => http.post<AniBTGroup[]>(q('api/aniBTGroup', {bgmId}))
export const animeGardenList = (bgmUrl?: string) =>
    http.post<AnimeGardenWeek[]>(q('api/animeGardenList', {bgmUrl}))
export const animeGardenGroup = (bgmId: string) => http.post<AnimeGardenGroup[]>(q('api/animeGardenGroup', {bgmId}))

/* ==================== Bangumi ==================== */

export const getBgmTitle = (ani: Ani) => http.post<string>('api/getBgmTitle', ani)
export const searchBgm = (name: string) => http.post<BgmInfo[]>(q('api/searchBgm', {name}))
export const meBgm = (ani: Ani) => http.post<BgmMe>('api/meBgm', ani)
export const getAniBySubjectId = (id: string) => http.post<Ani>(q('api/getAniBySubjectId', {id}))

/* ==================== 合集 ==================== */

export const startCollection = (info: CollectionInfo) => http.post<void>('api/startCollection', info)
export const previewCollection = (info: CollectionInfo) => http.post<Item[]>('api/previewCollection', info)
export const getCollectionSubgroup = (info: CollectionInfo) => http.post<string>('api/getCollectionSubgroup', info)

/* ==================== TMDB ==================== */

export const getThemoviedbName = (ani: Ani) => http.post<ThemoviedbVO>('api/getThemoviedbName', ani)

/**
 * TMDB 的剧集组。
 * 类型不在 types.ts 里 —— 那份是从 ani-rss 自己的实体生成的，
 * 而 TmdbGroup 来自外部库 wushuo.tmdb.api，生成器扫不到，只能在这儿照着字段写一份。
 */
export interface TmdbGroup {
    id?: string
    name?: string
    /** 分组方式：播出顺序 / DVD 顺序 / 剧集组…… */
    typeName?: string
    groupCount?: number
    episodeCount?: number
}

/** 需要 ani.tmdb.id，没有先点「获取」拿到 TMDB 信息 */
export const getThemoviedbGroup = (ani: Ani) => http.post<TmdbGroup[]>('api/getThemoviedbGroup', ani)

/* ==================== 下载器 ==================== */

export const torrentsInfos = () => http.post<TorrentsInfo[]>('api/torrentsInfos')
export const deleteTorrent = (id: string, hash: string) => http.post<void>(q('api/deleteTorrent', {id, hash}))

/* ==================== 日志 ==================== */

export const logs = () => http.post<Log[]>('api/logs')
export const clearLogs = () => http.post<void>('api/clearLogs')

/* ==================== 通知 ==================== */

export const testNotification = (c: NotificationConfig) => http.post<void>('api/testNotification', c)
export const newNotification = () => http.post<NotificationConfig>('api/newNotification')
/** 后端 TelegramNotification.Message.Chat：给机器人发过消息的会话 */
export interface TgChat {
    id?: number | string
    firstName?: string
    lastName?: string
    username?: string
    type?: string
}

export const getTgUpdates = (c: NotificationConfig) => http.post<TgChat[]>('api/getTgUpdates', c)

/* ==================== Emby ==================== */

/*
 * 后端签名是 Result<List<EmbyViews>>，收的是 NotificationConfig 不是全局 Config ——
 * embyHost / embyApiKey 都存在通知配置上，传全局 Config 过去后端拿不到地址，
 * 这个按钮压根连不上 Emby。之前两处都写错了。
 */
export const getEmbyViews = (c: NotificationConfig) => http.post<EmbyViews[]>('api/getEmbyViews', c)

/* ==================== 播放 ==================== */

export const playList = (ani: Ani) => http.post<PlayItem[]>('api/playList', ani)
/*
 * 内封字幕（从 mkv 容器里抽出来）。
 *
 * 目前没有调用方，且这是**有意**的：网页播放走的是 webplayer，它在本地拆容器时
 * 顺手就把内封轨拿到了，再让服务端抽一遍是多跑一趟。留着是因为它是后端契约的一部分，
 * 换播放器或做「下载字幕」时就要用上 —— 别把它当成漏做的功能又补一遍 UI。
 *
 * 文件路径要 base64；上游用裸拼接，base64 里的 '+' 会被解成空格，这里走 URLSearchParams
 */
export const getSubtitles = (filename: string) =>
    http.post<PlayItemSubtitles[]>(q('api/getSubtitles', {filename: base64Encode(filename)}))

/* ==================== 关于 / 维护 ==================== */

export const about = () => http.post<About>('api/about')

/*
 * 替代 WebUI 的在线更新（上游 test 分支 21dc44f 才有的两个端点）。
 *
 * 后端读 {configDir}/webui/webui.json 里的 owner/repo/version/filename，
 * 拿 GitHub 上 releases/latest 的 tag 跟 version 比，对得上 filename 的那个资产
 * 校验 size + sha256 后**整个删掉 webui 目录再解压**。所以：
 *  - 老版本 ani-rss 上这两个端点是 404，getUpdate 用 postQuiet 探测，失败就当不支持；
 *  - 返回的是 UpdateInfo：上游 e497071 把 About 里那堆更新字段抽成了它，
 *    About 现在是 `extends UpdateInfo` 再加一个 version —— 界面自己的版本号后端根本不知道，
 *    用构建期注入的 __VERSION__（与包里 webui.json 同源）。
 */
export const webuiGetUpdate = () => http.postQuiet<UpdateInfo>('api/webui/getUpdate')
export const webuiUpdate = () => http.post<void>('api/webui/update')

/*
 * 换界面 / 还原自带界面（上游 test 分支 94afa0b，3.2.17 起才有）。
 *
 * upload：收一个 zip，**根目录必须有 webui.json**（后端只用 ZipFile#getEntry 查这一个条目，
 * 多套一层目录就报「上传 WebUI 失败」），先删掉整个 {configDir}/webui 再解压过去。
 * 本仓库十一个发布包都是照这个形状打的，下下来直接选中就能传。
 *
 * delete：把 {configDir}/webui 整个删掉。静态资源的第二个来源是 classpath，
 * 目录一没，后端就退回 ani-rss 自带的那套界面 —— 这就是「还原」。
 *
 * 两个都用 postQuiet：老版本 ani-rss 上是 404（Spring 的 404 包里没有 message，
 * 全局提示会弹一句「undefined」），由调用方自己判断该说什么。
 */
export const webuiUpload = (file: File) => http.postQuiet<void>('api/webui/upload', filePart(file))
export const webuiDelete = () => http.postQuiet<void>('api/webui/delete')
export const update = () => http.post<void>('api/update')
export const stop = (status: number) => http.post<void>(q('api/stop', {status}))
/**
 * 校验爱发电订单号。
 *
 * 后端 AfdianController#verifyNo 收 Config 但**只读 outTradeNo 一个字段**，校验通过后自己把
 * outTradeNo / expirationTime / tryOut 写进服务端配置。所以这里只发订单号 ——
 * 原来整个 config 发过去，会把用户刚在「登录」页敲进去、还没保存的明文密码一起带上。
 *
 * 返回 Result<Void>，data 是空的。上游 UI 那句 `config.expirationTime = res.data` 是错的，
 * 别照抄 —— 真正的到期时间要等下次拉配置。
 */
export const verifyNo = (outTradeNo: string) => http.post<void>('api/verifyNo', {outTradeNo})

/* ==================== 需要浏览器直接发起的请求 ==================== */
/* 这几个不走 fetch：要么是让浏览器自己下载文件，要么是给外部系统抄的地址。
   设不了请求头，所以令牌只能进查询串 —— 上游同样如此。 */

/** 下载日志的地址 */
export const downloadLogsUrl = () => toApiUrl('api/downloadLogs', {s: getToken()})

/** ICS 日历订阅地址。用的是配置里的 apiKey，不是登录令牌 —— 这地址要贴给日历软件长期使用 */
export const calendarIcsUrl = (apiKey: string) => toApiUrl('api/calendar.ics', {'api-key': apiKey})

/** Emby Webhook 回调地址，同样用 apiKey */
export const embyWebHookUrl = (apiKey: string) => toApiUrl('api/embyWebHook', {'api-key': apiKey})

/* ==================== 补充端点 ==================== */

/*
 * 导出 / 导入备份。
 *
 * 上游 3.2.37（53dfa23）把这两个端点从 ConfigController 挪进新的 BackupController，
 * 顺手改了名：exportConfig → exportBackup、importConfig → importBackup，老名字直接删了、
 * 没留别名。只认一边的话，另一边的后端上按钮照点，回来的是一句「404 Not Found !」。
 * 所以两个名字都带上，新的在前（见 http.ts 的 firstFound）。
 */

/** 导出备份：回 zip 本体和后端给的文件名（带版本号），由界面存盘 */
export const exportBackup = () => http.fileRenamed(['api/exportBackup', 'api/exportConfig'])

/** 导入备份：multipart 上传，不能用 JSON 那套。会整包覆盖设置、订阅和下载记录 */
export const importBackup = (file: File) =>
    http.postRenamed<void>(['api/importBackup', 'api/importConfig'], filePart(file))

/** Bangumi 授权回调：把 OAuth 返回的 code 交给后端换 token */
export const bgmOauthCallback = (code: string) => http.post<void>(q('api/bgm/oauth/callback', {code}))

/**
 * 上传文件：存进 {configDir}/files/ 并返回相对路径。自定义封面走的就是这个。
 *
 * 曾经还带一个 type='getBase64'，让后端只回 base64 不落盘。那个开关在上游
 * 3.2.18 之后的重构里被拆走了（另起 /api/uploadAndReadToBase64 和 /api/uploadAndRead），
 * 跟着换端点就得按后端版本分叉，而「把文件读成 base64」浏览器自己就干得了 ——
 * 合集那处已经改成本地读（见 CollectionDialog），这里只留落盘这一个用途。
 * 落盘这一路两个版本的签名一样，不用挑版本。
 */
export const upload = (file: File) => http.post<string>('api/upload', filePart(file))

/**
 * 上传并读回文本 / base64，不落盘（3.2.18 起，就是上面那个 type 开关拆出来的两个端点）。
 *
 * 我们这边没有调用点：读本地文件浏览器自己就能干（FileReader），
 * 走一趟后端只是多一次往返，还多一个「后端得够新」的前提。
 * 之所以还是封装出来，是因为这份文件对着 spec-api.md 一一对应 ——
 * 缺一个就得每次核对时重新确认是漏了还是故意不接。
 */
export const uploadAndRead = (file: File) => http.post<string>('api/uploadAndRead', filePart(file))
export const uploadAndReadToBase64 = (file: File) =>
    http.post<string>('api/uploadAndReadToBase64', filePart(file))

/**
 * 用户在「页面设置」里填的自定义 CSS / JS 的地址（免鉴权）。
 *
 * 这两个端点是 ani-rss 既有的换肤通道 —— 现有那 17 款主题就是通过它注入的。
 * 我们的 WebUI 也从这里读，用户填过的东西不用再填一遍。
 */
export const customCssUrl = () => toApiUrl('api/custom.css')
export const customJsUrl = () => toApiUrl('api/custom.js')
