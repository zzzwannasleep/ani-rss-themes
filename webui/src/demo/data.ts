import type {About, Ani, Config, Log, TorrentsInfo} from '@shared/types'
import BANGUMI from './bangumi.json'

/**
 * 演示数据。只给 GitHub Pages 的预览构建用（VITE_DEMO=1），
 * 正式产物里这个文件不会被打包 —— main.ts 里的引用在 __DEMO__ 为 false 时被摇掉。
 *
 * 番剧本身是真的：bangumi.json 是 tools/fetch-demo-data.mjs 从 Bangumi 的公开日历
 * 抓下来的当季番，真标题、真封面、真评分、真的按星期分布。
 * 原来这里是一批编出来的名字加现画的渐变海报 —— 一眼假，而且试不出真用起来是什么样：
 * 真实番剧名有长有短、有中日混排、有一串括号后缀，卡片会被撑成什么样，编的名字试不出来。
 *
 * 订阅状态那部分仍然是编的（字幕组、进度、上次下载时间、RSS 地址）——
 * 那些属于每个人自己的 ani-rss，公开日历里没有，也不该去碰用户的实例。
 * 编的部分一律由番剧 id 派生，刷新页面不会跳。
 */

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const SUBGROUPS = ['喵萌奶茶屋', '桜都字幕组', 'LoliHouse', 'Lilith-Raws', 'ANi', '北宇治字幕组']

/** 用种子派生一个稳定的伪随机数，免得每次刷新数据都在跳 */
function rnd(seed: string, max: number): number {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
    return h % max
}

/* 每 8 部里挑一部当「很久没更新」的：总览上的「疑似停更」是真会出现的状态，
   演示数据要是全都在 3 天内下过，那张卡永远是「字幕组都很勤快」，看不出长什么样。
   停更判定要求「没下完」，所以这几部的进度也一并压到总集数以下。 */
const STALE = (i: number) => i % 8 === 3

/** 演示用的三个季度，跟着当前年份走，免得过一年就成了「历史数据」 */
const Y = new Date().getFullYear()
const SEASONS = [`${Y}-01`, `${Y}-04`, `${Y}-07`]

function makeAni(b: typeof BANGUMI[number], i: number): Ani {
    const id = String(b.id)
    // 公开日历不给总集数（全是 0），按常见的季番长度派生一个
    const total = b.eps || [12, 13, 24][rnd(id + 'a', 3)]
    const cur = STALE(i) ? Math.max(1, total - 4) : rnd(id + 'b', total + 1)
    const idleDays = STALE(i) ? 18 + rnd(id + 'e', 26) : rnd(id + 'e', 3)
    return {
        id,
        title: b.title,
        jpTitle: b.jp,
        subgroup: SUBGROUPS[rnd(id + 'g', SUBGROUPS.length)],
        season: 1,
        currentEpisodeNumber: cur,
        totalEpisodeNumber: total,
        enable: i % 7 !== 3,
        ova: i % 17 === 5,
        // 评分是真的；日历里偶尔为 0（新番还没人打分），那就不显示
        score: b.score || 0,
        // 封面是 bgm 的公开图床，直接给完整地址：toApiFile 会原样返回带协议的地址
        cover: b.cover,
        image: b.cover,
        pinyin: '', pinyinInitials: '',
        /* 真实的 themoviedbName 长这样：「XXX (2026) [tmdbid=287028]」，和标题不一样。
           照抄标题的话列表第二行就是第一行的复读，看着像渲染坏了 */
        themoviedbName: `${b.jp || b.title} (${new Date().getFullYear()}) [tmdbid=${b.id}]`,
        bgmUrl: `https://bgm.tv/subject/${b.id}`,
        /* 放送日期。真实数据里是完整日期，季度筛选只比到年月 ——
           全塞进同一季的话那个下拉根本不会出现，等于没测到 */
        releaseDate: `${SEASONS[i % SEASONS.length]}-${String((i % 27) + 1).padStart(2, '0')}`,
        /* 主 RSS 地址。原来这个字段是空的，于是编辑订阅里那一栏在演示站永远是空白，
           而它恰恰是这个表单最重要的一行 */
        url: `https://example.invalid/rss?bangumiId=${b.id}`,
        // 摸鱼检测的开关，默认开 —— 它不是「已停更」，别拿它当状态用
        procrastinating: true,
        lastDownloadTime: Date.now() - idleDays * 864e5 - rnd(id + 'f', 20) * 3600_000,
        /* 「这几集不要下」。原来一条都没有，于是预览面板里的「禁止」标记、
           整行压暗、标题上那个「N 集不下载」全在演示产物上不出现 —— 量不到 */
        notDownload: i % 3 === 1 ? [2, 5] : [],
        standbyRssList: i % 5 === 0
            ? [{label: '桜都字幕组', url: 'https://example.invalid/rss?sub=sakurato', offset: 0},
                {label: 'ANi', url: 'https://example.invalid/rss?sub=ani', offset: 0}]
            : [],
    } as unknown as Ani
}

export const ANI_LIST: Ani[] = BANGUMI.map(makeAni)

/**
 * previewAni 的返回。
 *
 * 接口约定是 {downloadPath, items, omitList}，原来演示这边直接回了一个 Ani 数组，
 * 形状对不上，预览面板在演示站里永远是空的 —— 而这个面板恰恰是操作最多的一个。
 */
export function previewAni(ani: {title?: string; subgroup?: string; currentEpisodeNumber?: number}) {
    const total = ani.currentEpisodeNumber ?? 8
    const groups = ['桜都字幕组', 'LoliHouse', 'ANi', '喵萌奶茶屋']
    return {
        downloadPath: `/downloads/anime/${ani.title ?? '演示番剧'}/Season 1`,
        items: Array.from({length: total}, (_, i) => {
            const ep = i + 1
            const g = groups[i % groups.length]
            return {
                title: `[${g}] ${ani.title ?? '演示番剧'} - ${String(ep).padStart(2, '0')} [1080p][简繁内封].mkv`,
                reName: `${ani.title ?? '演示番剧'} S01E${String(ep).padStart(2, '0')}.mkv`,
                /* 真的是四十位十六进制。原来给的是 `demo-hash-3` 这种，
                   那一列到底会不会把表挤爆、要不要截断，在演示产物上量不出来 */
                infoHash: (ep * 0x9e3779b1).toString(16).padStart(8, '0').repeat(5).slice(0, 40),
                // 「复制种子链接」这一列要有东西可复制
                torrent: `https://example.invalid/torrent/${ep}.torrent`,
                episode: ep,
                formatSize: `${(0.9 + (i % 4) * 0.25).toFixed(2)} GB`,
                length: Math.round((0.9 + (i % 4) * 0.25) * 1024 ** 3),
                /* 上游 WebUI 读 local，生成的类型里叫 hasDownloaded —— 两个都发，
                   预览面板那边 `local ?? hasDownloaded` 无论后端用哪个名字都对得上 */
                local: ep <= total - 2,
                hasDownloaded: ep <= total - 2,
                master: i % 5 !== 3,          // 偶尔命中备用 RSS，那一列才有东西可看
                subgroup: g,
                /* 原来是空串，于是「发布时间」这一列在演示产物上永远是「—」，
                   宽度够不够、换不换行一样量不出来 */
                pubDate: new Date(Date.now() - (total - ep) * 7 * 86400_000).toISOString().slice(0, 10),
            }
        }),
        omitList: total > 5 ? [3] : [],
    }
}

/** 第 i 部排在周几（0=周一）。用日历里真实的播出日，不再自己摊平 —— 真实分布本来就不均匀 */
const dayOf = (i: number) => (BANGUMI[i]?.weekday ?? 1) - 1

/** listAni 的返回：按星期分组，今天排在最前 —— 与后端行为一致 */
export function listAni() {
    const today = new Date().getDay()          // 0 = 周日
    const order = Array.from({length: 7}, (_, i) => (today === 0 ? 6 : today - 1 + i) % 7)
    return {
        total: ANI_LIST.length,
        /* 后端会把订阅里出现过的季度算成候选给前端，季度筛选的下拉就吃这个字段 */
        releaseDateList: [...SEASONS].reverse(),
        weekList: order.map((w, idx) => ({
            weekLabel: WEEK[w] + (idx === 0 ? '（今天）' : ''),
            items: ANI_LIST.filter((_, i) => dayOf(i) === w),
        })).filter(g => g.items.length),
    }
}

export const TORRENTS: TorrentsInfo[] = ANI_LIST.slice(0, 5).map((a, i) => ({
    name: `[${a.subgroup}] ${a.title} - ${String(a.currentEpisodeNumber).padStart(2, '0')} [1080p].mkv`,
    hash: `hash-${i}`,
    progress: [1, 0.62, 0.31, 1, 0.08][i],
    size: 1_200_000_000 + i * 300_000_000,
    state: (i === 0 || i === 3 ? 'uploading' : 'downloading') as TorrentsInfo['state'],
    /* 真实下载器里 ani-rss 会给自己管的种子打标，混着手动加的种子时靠这个分辨。
       演示站不给标签的话，那一栏永远是空的，看不出它长什么样 */
    tagList: i === 4 ? [] : ['ani-rss', a.subgroup ?? ''].filter(Boolean),
    savePath: `/downloads/${a.title}/Season ${a.season ?? 1}`,
} as unknown as TorrentsInfo))

/* 日志里的番剧名跟着真实数据走 —— 写死的名字和列表里对不上，一眼就露馅 */
const LOG_SEED: Log[] = [
    {level: 'INFO', loggerName: 'ani.rss.Demo', threadName: 'main', message: '演示模式：这些日志是内置的假数据'},
    {level: 'INFO', loggerName: 'ani.rss.task.RssTask', threadName: 'rss-1', message: '订阅刷新完成，新增 2 条待下载'},
    {
        level: 'WARN', loggerName: 'ani.rss.task.RssTask', threadName: 'rss-1',
        message: `「${ANI_LIST[2]?.title ?? '演示番剧'}」本周没有匹配到新剧集`,
    },
    {
        level: 'INFO', loggerName: 'ani.rss.download.Qbittorrent', threadName: 'dl-2',
        message: `下载完成：${ANI_LIST[3]?.title ?? '演示番剧'} - 07`,
    },
    {level: 'ERROR', loggerName: 'ani.rss.Demo', threadName: 'main', message: '演示模式下所有写操作都不会真的执行'},
]

/*
 * 铺到 60 条 —— 一定要装不下一屏。
 *
 * 原来只给 5 条，日志框的 scrollHeight 和 clientHeight 一样大，压根滚不起来。
 * 结果是「自动滚到最后一行」这件事在演示产物上既复现不了也体检不了：
 * 切走再切回来 scrollTop 被浏览器抹成 0 的那个毛病，就是这么一直没被发现的。
 * 行号写在每条前面，末尾那条标出来 —— 全是一模一样的行的话，
 * 「有没有真的停在最后一行」肉眼和探针都分不出来。
 */
export const LOGS: Log[] = Array.from({length: 60}, (_, i) => {
    const seed = LOG_SEED[i % LOG_SEED.length]
    const tail = i === 59 ? '（最后一行）' : ''
    return {
        ...seed,
        /* 照 3.2.28 的形状给：ts 单独一个字段，message 只有正文。
           不给 ts 的话时间那一列在演示产物上永远是空的 —— 版式体检也就永远量不到它。
           每条隔 3 秒往前排，最后一条落在「现在」 */
        ts: Date.now() - (59 - i) * 3000,
        message: `#${String(i + 1).padStart(2, '0')} ${seed.message}${tail}`,
    }
})

/** 设置页要的完整配置。字段太多，只给会被显示的那些，其余交给控件的默认值 */
export const CONFIG = {
    downloadPath: '/downloads/anime',
    host: '', port: 0,
    sortType: 'SCORE',
    /* 后端 ConfigUtil 的默认值。下拉框空着在演示站上看着像坏了 */
    qbContentLayout: 'Original',
    rename: true, delete: false,
    /* 给两条渠道：空列表的话通知那一页只有一个空状态，
       渠道编辑弹窗（以及里面「获取会话 / 获取媒体库」这两个候选选择器）根本走不到 */
    notificationConfigList: [
        {
            notificationType: 'TELEGRAM', name: 'Telegram', enable: true, retry: 3, sort: 0,
            comment: '主力通知', statusList: ['DOWNLOAD_START', 'DOWNLOAD_END', 'ERROR'],
            telegramBotToken: '', telegramChatId: '', telegramTopicId: -1,
            telegramFormat: 'Markdown', telegramImage: true, telegramApiHost: '',
        },
        {
            notificationType: 'EMBY_REFRESH', name: 'Emby 刷新', enable: false, retry: 1, sort: 1,
            comment: '入库后通知 Emby 扫一遍', statusList: ['DOWNLOAD_END'],
            embyHost: '', embyApiKey: '', embyRefreshViewIds: [], embyDelayed: 10,
        },
    ],
    customTags: [],
    /* 捐赠那一页得有个像样的状态才看得出组件长什么样。给「试用中」——
       它把徽章、解锁清单、状态条、订单号输入全都渲染出来，覆盖面最广。
       注意 verifyExpirationTime 为 true 是「还在有效期内」，不是「已过期」 */
    tryOut: true, verifyExpirationTime: true, expirationTime: Date.now() + 14 * 864e5,
} as unknown as Config

/*
 * 更新说明得是真的 Markdown，把标题 / 列表 / 行内代码 / 围栏代码块 / 表格 / 引用 / 链接
 * 全用上一遍。原来这里是空的 —— 于是两张「更新内容」卡在演示产物上根本不渲染，
 * 版式体检也就永远量不到它们，和当初日志只有 5 条、滚都滚不起来是同一类事。
 */
const DEMO_NOTES = [
    '## 更新内容',
    '',
    '- 修好了**备用 RSS** 和主 RSS 挤在一页里分不开的问题',
    '- 番剧浏览器从编辑订阅点进去时，`AniBT` / `AnimeGarden` 不再拿 Mikan 的搜索词去查',
    '- 日志页切走再切回来会停在最顶上，现在会贴着最后一行',
    '',
    '### 升级说明',
    '',
    '> 更新会先清空 `config/webui/` 再解压，自己往里放过的文件请先备份。',
    '',
    '```bash',
    'systemctl restart ani-rss',
    '```',
    '',
    '| 平台 | 装法 |',
    '|---|---|',
    '| Linux / NAS | 跑 `install.sh` |',
    '| Windows | 跑 `install.ps1` |',
    '',
    '完整改动见 [提交记录](https://github.com/) ——- 这是演示数据，链接不指向任何地方。',
].join('\n')

export const ABOUT: About = {
    version: '演示版',
    latest: '演示版',
    update: false,
    autoUpdate: false,
    markdownBody: DEMO_NOTES,
}

/** 界面自己那一段更新说明。演示里两段都要有，否则「哪段是谁的」这件事就没法看 */
export const WEBUI_ABOUT: About = {
    latest: '演示版',
    update: false,
    autoUpdate: false,
    markdownBody: DEMO_NOTES,
}


/* ────────── 番剧浏览器（Mikan / AniBT / AnimeGarden）的假数据 ────────── */

/* 三家的返回结构不一样，但演示要的东西一样：按星期分的番剧 + 每部番的字幕组。
   番剧浏览器里也用真数据 —— 那一屏就是「这一季有什么」，摆一堆编的名字等于没做 */
const byWeekday = (w: number) => BANGUMI.filter(b => b.weekday === w + 1)

export function mikanList() {
    const y = new Date().getFullYear()
    return {
        seasons: [
            {year: y, season: '春', seasonLabel: `${y} 春`, select: true},
            {year: y, season: '冬', seasonLabel: `${y} 冬`, select: false},
            {year: y - 1, season: '秋', seasonLabel: `${y - 1} 秋`, select: false},
        ],
        weeks: WEEK.map((w, i) => ({
            weekLabel: w,
            items: byWeekday(i).map(b => ({
                bgmId: String(b.id),
                cover: b.cover,
                url: `https://mikanani.me/Home/Bangumi/${b.id}`,
                // 已经在订阅列表里的标成「已订阅」，和真实行为一致
                exists: b.id % 5 === 0,
                score: b.score,
                title: b.title,
                bgmUrl: `https://bgm.tv/subject/${b.id}`,
            })),
        })),
        totalItem: BANGUMI.length,
    }
}

export function aniBTList() {
    const y = new Date().getFullYear()
    return {
        currentSeason: `${y} 春`,
        requestedSeason: `${y} 春`,
        availableSeasons: [`${y} 春`, `${y} 冬`, `${y - 1} 秋`],
        byWeekday: WEEK.map((w, i) => ({
            weekday: i + 1,
            weekdayLabel: w,
            animes: byWeekday(i).map(b => ({
                animeId: String(b.id),
                bgmId: String(b.id),
                cover: b.cover,
                rating: b.score,
                title: {chinese: b.title, primary: b.jp || b.title, romaji: '', english: ''},
                exists: b.id % 6 === 0,
                rssReleaseCount: 3 + rnd(String(b.id), 20),
            })),
        })),
    }
}

export function animeGardenList() {
    return WEEK.map((w, i) => ({
        weekLabel: w,
        subjects: byWeekday(i).map(b => ({
            id: String(b.id),
            name: b.title,
            cover: b.cover,
            score: b.score,
            exists: b.id % 7 === 0,
            weekLabel: w,
        })),
    }))
}

/*
 * 三家的 RSS 地址各长各的样。形状抄的是上游「添加订阅」里那三个输入框的 placeholder。
 *
 * 原来三家共用一条 `https://example.invalid/rss/<把整个请求地址塞进去>/0`。
 * 它的坏处不在难看：从这样一条地址解析出来的订阅，`url` 里没有 `bangumiId`，
 * 于是「带着这条订阅去 Mikan 定位」那条路在演示产物上**根本走不到** ——
 * 走不到就体检不到，和当初日志只有 5 条、滚都滚不起来是同一类事。
 */
const RSS_SHAPE: Record<string, (id: string, i: number) => string> = {
    mikan: (id, i) => `https://mikanani.me/RSS/Bangumi?bangumiId=${id}&subgroupid=${100 + i}`,
    anibt: (id, i) => `https://anibt.net/rss/anime.xml?bgmId=${id}&groupSlug=sg-${i}`,
    garden: (id, i) => `https://api.animes.garden/feed.xml?subject=${id}&fansub=sg-${i}`,
}

/** 字幕组列表。三家字段名不同，一次全给上，组件那边按名字取，多余的忽略 */
export function sourceGroups(source: 'mikan' | 'anibt' | 'garden', key: string) {
    /* Mikan 传进来的是番剧页地址（.../Home/Bangumi/456080），另外两家直接就是 bgmId */
    const id = /(\d+)\s*$/.exec(key)?.[1] ?? '0'
    const shape = RSS_SHAPE[source]
    const versions = [
        [{label: '简体', regex: 'CHS|简'}, {label: '1080P', regex: '1080'}],
        [{label: '繁体', regex: 'CHT|繁'}, {label: '1080P', regex: '1080'}],
        [{label: '简繁内封', regex: '简繁'}],
    ]
    return SUBGROUPS.slice(0, 3 + rnd(key, 3)).map((name, i) => ({
        subgroupId: `sg-${i}`,
        groupId: `sg-${i}`,
        label: name,
        name,
        rss: shape(id, i),
        bgmUrl: `https://bgm.tv/subject/${100000 + i}`,
        bgmId: `${100000 + i}`,
        updateDay: WEEK[i % 7],
        status: '连载中',
        lastUpdatedAt: Date.now() - i * 86400_000,
        /* 字幕组下面那张「最近发了什么」的列表要有东西，
           不然演示站上那个展开按钮根本不出现 */
        items: Array.from({length: 4}, (_, k) => ({
            title: `[${name}] ${BANGUMI[(i * 7 + k) % BANGUMI.length].title} - ${String(12 - k).padStart(2, '0')} [1080p][简繁内封].mkv`,
            magnet: `magnet:?xt=urn:btih:${'0'.repeat(32)}${i}${k}`,
            torrent: '',
            size: 1_100_000_000 + k * 40_000_000,
            formatSize: `${(1.1 + k * 0.04).toFixed(2)} GB`,
            createdAt: new Date(Date.now() - (k * 7 + i) * 86400_000).toISOString(),
        })),
        groupRegex: {
            tags: ['1080P', i % 2 ? '简体' : '繁体'],
            regexList: versions.slice(0, 2 + (i % 2)),
        },
    }))
}

/*
 * 视频列表。演示站原来这个接口直接回空数组 —— 于是「视频列表」「播放」「外部播放器」
 * 「字幕选择」这一整条线在演示站上一次都没被走到过，等于没验证。
 *
 * 前两集故意各带两条外挂字幕（简/繁），好让「多条字幕先选一条」那个弹窗露出来；
 * 后面几集只有一条，走默认路径。地址是假的，点播放会停在播放器的加载失败上，
 * 但列表、菜单、选择这几步都是真的。
 */
export function playList(ani: Ani) {
    const n = Math.min(ani.currentEpisodeNumber ?? 4, 6)
    const base = `/downloads/${ani.title ?? '演示番剧'}/Season ${ani.season ?? 1}`
    return Array.from({length: n}, (_, i) => {
        const ep = i + 1
        const name = `[${ani.subgroup ?? '字幕组'}] ${ani.title ?? ''} - ${String(ep).padStart(2, '0')} [1080p].mkv`
        const subs = i < 2
            ? [{name: '简体中文', url: `${base}/${ep}.chs.ass`, type: 'ass'},
                {name: '繁體中文', url: `${base}/${ep}.cht.ass`, type: 'ass'}]
            : [{name: '简体中文', url: `${base}/${ep}.chs.ass`, type: 'ass'}]
        return {
            title: `第 ${ep} 集`,
            name,
            filename: `${base}/${name}`,
            episode: ep,
            extName: 'mkv',
            lastModify: Date.now() - (n - i) * 864e5,
            formatSize: `${(1.1 + i * 0.2).toFixed(2)} GB`,
            subtitles: subs,
        }
    })
}

/** Telegram 会话候选：多给几个，「只取第一个」那种写法才会露馅 */
export const TG_CHATS = [
    {id: 123456789, firstName: '演示', lastName: '用户', username: 'demo_user', type: 'private'},
    {id: -1001234567890, firstName: '', lastName: '', username: 'ani_rss_group', type: 'supergroup'},
    {id: -1009876543210, firstName: '', lastName: '', username: 'ani_notify', type: 'channel'},
]

/** Emby 媒体库候选 */
export const EMBY_VIEWS = [
    {id: 'f137a2dd21bbc1b99aa5c0f6bf02a805', name: '动漫'},
    {id: '767bffe4f11c93ef34b805451a696a4e', name: '电影'},
    {id: 'a656b907eb3a73532e40e44b968d0225', name: '电视剧'},
]
