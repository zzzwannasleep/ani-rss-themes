/**
 * 设置页字段表。
 *
 * 121 个 Config 字段如果逐个手写 v-model 块，既冗长又容易把字段名敲错；
 * 这里用声明式描述 + 一个通用渲染器（SettingField.vue）来出表单。
 *
 * 字段归属取自上游各设置 .vue 的实际引用，字段说明取自 Java 实体的 @Schema 注解，
 * 都不是猜的（提取过程见 scratchpad/spec-settings.md）。
 */
import type {Config} from '@shared/types'

export type FieldType = 'switch' | 'text' | 'password' | 'number' | 'select' | 'textarea' | 'list'

export interface FieldDef {
    key: keyof Config & string
    label: string
    type: FieldType
    hint?: string
    placeholder?: string
    items?: {title: string; value: string | number}[]
    min?: number
    max?: number
    suffix?: string
    /** 不满足时整项不渲染 */
    when?: (c: Config) => boolean
    /** 渲染但置灰 */
    disabledWhen?: (c: Config) => boolean
    /** 返回非空字符串时，在控件下面挂一条警告（值本身合法但很可能不是用户想要的） */
    warn?: (c: Config) => string | false | undefined
}

/* 保存位置这类模板里必须至少有一个 ${...} 占位符，否则所有番剧会全下到同一个目录，
   而且这事要等下载完才发现。上游 Download.vue 用的就是这条正则。 */
const hasPlaceholder = (v?: string) => /\$\{[A-Za-z]+}/.test(v ?? '')
const templateWarn = (key: 'downloadPathTemplate' | 'ovaDownloadPathTemplate' | 'renameTemplate', label: string) =>
    (c: Config) => !hasPlaceholder(c[key]) && `${label}里没有 \${...} 占位符，所有剧集会落到同一个位置`

export interface SectionDef {
    title: string
    note?: string
    fields: FieldDef[]
}

/*
 * OpenList 上游 3.2.33（f160274）起在后端禁用了，自带界面把它置灰成「已停止支持」。
 * 这里不置灰只标注：备用界面也跑在 3.2.33 以前的后端上，那边它还能用，
 * 置灰了已经在用的人连当前值都显示不出来、也改不回去。
 */
const DOWNLOAD_TOOLS = [
    ...['qBittorrent', 'Transmission', 'Aria2'].map(v => ({title: v, value: v})),
    {title: 'OpenList（3.2.33 起已停止支持）', value: 'OpenList'},
]

/** OpenList 的离线下载 driver，取自上游 Download.vue 的 offlineList */
const OPENLIST_PROVIDERS = ['115 Open', '115 Cloud', '123 Open', '123Pan', 'Thunder', 'PikPak']
    .map(v => ({title: v, value: v}))

const TMDB_LANGS = [
    {title: '英语 (en-US)', value: 'en-US'},
    {title: '日语 (ja-JP)', value: 'ja-JP'},
    {title: '俄语 (ru-RU)', value: 'ru-RU'},
    {title: '汉语 (zh-CN)', value: 'zh-CN'},
    {title: '汉语 (zh-HK)', value: 'zh-HK'},
    {title: '汉语 (zh-SG)', value: 'zh-SG'},
    {title: '汉语 (zh-TW)', value: 'zh-TW'},
]

/* 键名 3.2.25 起是 bgmImageSize（以前叫 bgmImage，同版本默认值也从 large 换成了 medium）。
   两个键的兼容在 shared/api.ts 的 getConfig / setConfig 里做，这里只认新名字。 */
const BGM_IMAGE = ['small', 'grid', 'large', 'medium', 'common'].map(v => ({title: v, value: v}))

/* qb 添加任务时的 contentLayout，取值与 qBittorrent 自己的一致（上游 qBittorrent.vue）。
   3.2.18 之前后端写死 Original，所以老版本上改了也不生效 —— 但配置项本身存得下，
   不额外按版本藏起来。 */
const QB_CONTENT_LAYOUT = [
    {title: '原始', value: 'Original'},
    {title: '创建子文件夹', value: 'Subfolder'},
    {title: '不创建子文件夹', value: 'NoSubfolder'},
]

const is = (t: string) => (c: Config) => c.downloadToolType === t

/* ══════════════ 下载设置 ══════════════ */

export const DOWNLOAD_SECTIONS: SectionDef[] = [
    {
        title: '下载工具',
        fields: [
            {key: 'downloadToolType', label: '下载工具', type: 'select', items: DOWNLOAD_TOOLS},
            {key: 'downloadToolHost', label: '地址', type: 'text', placeholder: 'http://192.168.1.x:8080'},
            {
                key: 'downloadToolUsername', label: '用户名', type: 'text',
                when: c => !is('Aria2')(c),
            },
            {
                key: 'downloadToolPassword', label: '密码', type: 'password',
                when: c => !is('Aria2')(c) && !is('qBittorrent')(c),
            },
            // 同一个字段在不同下载器下叫法不同，上游就是这么处理的，跟着来免得用户对不上
            {key: 'downloadToolPassword', label: 'ApiKey', type: 'password', when: is('qBittorrent')},
            {key: 'downloadToolPassword', label: 'RPC 密钥', type: 'password', when: is('Aria2')},
            {key: 'provider', label: 'Driver', type: 'select', items: OPENLIST_PROVIDERS, when: is('OpenList')},
            {
                key: 'openListDownloadRetryNumber', label: '重试次数', type: 'number', min: 0,
                when: is('OpenList'),
            },
            {
                key: 'openListDownloadTimeout', label: '离线超时', type: 'number', min: 0, suffix: '分钟',
                when: is('OpenList'),
            },
        ],
    },
    {
        title: '保存位置',
        fields: [
            {
                key: 'downloadPathTemplate', label: '保存位置', type: 'text',
                warn: templateWarn('downloadPathTemplate', '保存位置'),
            },
            {
                key: 'ovaDownloadPathTemplate', label: '剧场版保存位置', type: 'text',
                warn: templateWarn('ovaDownloadPathTemplate', '剧场版保存位置'),
            },
        ],
    },
    {
        title: '下载行为',
        fields: [
            {key: 'downloadCount', label: '同时下载限制', type: 'number', min: 0, hint: '0 表示不限制'},
            {key: 'downloadRetry', label: '下载重试次数', type: 'number', min: 0},
            {key: 'delayedDownload', label: '延迟下载', type: 'number', min: 0, suffix: '分钟'},
            {key: 'delete', label: '自动删除已完成任务', type: 'switch'},
            {key: 'awaitStalledUP', label: '等待做种完毕', type: 'switch'},
            {key: 'deleteStandbyRSSOnly', label: '仅在主 RSS 更新后删除备用 RSS', type: 'switch'},
        ],
    },
    {
        title: 'qBittorrent',
        note: '下面几项数值里，“-1”表示禁用，“-2”表示使用 qBittorrent 的全局设置',
        fields: [
            {key: 'dlLimit', label: '下载速度限制', type: 'number', min: -2, suffix: 'KiB/s'},
            {key: 'upLimit', label: '上传速度限制', type: 'number', min: -2, suffix: 'KiB/s'},
            {key: 'ratioLimit', label: '分享率', type: 'number', min: -2},
            {key: 'seedingTimeLimit', label: '总做种时长', type: 'number', min: -2, suffix: '分钟'},
            {key: 'inactiveSeedingTimeLimit', label: '非活跃时长', type: 'number', min: -2, suffix: '分钟'},
            {key: 'qbContentLayout', label: '内容布局', type: 'select', items: QB_CONTENT_LAYOUT,
                hint: '种子内容外面要不要套一层文件夹，「原始」保持种子自带的结构'},
            {key: 'qbUseDownloadPath', label: '使用 qb 自身的保存路径', type: 'switch',
                hint: '未下载完成的放临时目录，并复制种子文件'},
        ],
    },
    {
        title: '优先保留',
        note: '同一集有多个版本时，命中关键词的会被保留',
        fields: [
            {key: 'priorityKeywordsEnable', label: '启用', type: 'switch'},
            {
                key: 'priorityKeywords', label: '关键词', type: 'list',
                disabledWhen: c => !c.priorityKeywordsEnable,
            },
        ],
    },
    {
        /* 上游「下载」页里有这一项（Download.vue 的 <el-form-item label="自定义标签">），
           我们之前只做了订阅级的标签（AniEditDialog），漏了这个全局的 —— 它是给所有
           下载任务统一打的标签，qBittorrent 那边靠它归类。 */
        title: '自定义标签',
        note: '给所有下载任务统一打的标签，与单条订阅自己的标签叠加',
        fields: [
            {key: 'customTags', label: '标签', type: 'list'},
        ],
    },
]

/* ══════════════ 基本设置（9 个折叠面板） ══════════════ */

export const BASIC_SECTIONS: SectionDef[] = [
    {
        title: '页面设置',
        note: '外观、主题色与显示项在本 WebUI 里即时生效，存在浏览器本地',
        fields: [
            {
                key: 'sortType', label: '排序方式', type: 'select', items: [
                    {title: '评分', value: 'SCORE'},
                    {title: '拼音', value: 'PINYIN'},
                    {title: '下载时间', value: 'DOWNLOAD_TIME'},
                ],
            },
            {key: 'customCss', label: '自定义 CSS', type: 'textarea',
                hint: '与 ani-rss 自带界面共用同一份，现有主题可直接沿用'},
            {key: 'customJs', label: '自定义 JS', type: 'textarea'},
        ],
    },
    {
        title: '添加订阅',
        fields: [
            {key: 'downloadNew', label: '只下载最新集', type: 'switch'},
            {key: 'titleYear', label: '标题带年份', type: 'switch'},
            {key: 'offset', label: '自动推断剧集偏移', type: 'switch'},
            {key: 'bgmJpName', label: 'BGM 日语标题', type: 'switch'},
            {key: 'tmdbId', label: '标题带 tmdbId', type: 'switch'},
            {key: 'tmdbIdPlexMode', label: 'Plex 命名方式', type: 'switch', disabledWhen: c => !c.tmdbId},
            {key: 'tmdb', label: '使用 TMDB 标题', type: 'switch'},
            {key: 'tmdbAnime', label: '仅获取动漫', type: 'switch'},
            {key: 'tmdbOriginalName', label: '使用原标题', type: 'switch'},
            {key: 'tmdbRomaji', label: '优先获取罗马音', type: 'switch'},
            {key: 'tmdbLanguage', label: 'TMDB 语言', type: 'select', items: TMDB_LANGS},
            // 这两个上游是互斥的：开一个另一个就置灰
            {key: 'enabledExclude', label: '默认启用全局排除', type: 'switch', disabledWhen: c => !!c.importExclude},
            {key: 'importExclude', label: '默认导入全局排除', type: 'switch', disabledWhen: c => !!c.enabledExclude},
            {key: 'bgmImageSize', label: '封面质量', type: 'select', items: BGM_IMAGE},
            {key: 'customEpisode', label: '自定义集数规则', type: 'switch'},
            {key: 'customEpisodeStr', label: '集数正则', type: 'text', disabledWhen: c => !c.customEpisode},
            {key: 'customEpisodeGroupIndex', label: '捕获组序号', type: 'number', min: 0,
                disabledWhen: c => !c.customEpisode},
            {key: 'upload', label: '默认开启自动上传', type: 'switch'},
            {key: 'replace', label: '允许替换重名订阅', type: 'switch'},
        ],
    },
    {
        title: '重命名设置',
        fields: [
            {key: 'rename', label: '自动重命名', type: 'switch'},
            {key: 'renameSleepSeconds', label: '重命名间隔', type: 'number', min: 0, suffix: '秒'},
            {key: 'maxFileNameLength', label: '最大文件名长度', type: 'number', min: 0, hint: '不含 .mkv / .mp4 等后缀'},
            {key: 'renameTemplate', label: '重命名模版', type: 'text'},
            {key: 'renameDelYear', label: '剔除年份', type: 'switch', hint: '如 (2024)'},
            {key: 'renameDelTmdbId', label: '剔除 tmdbId', type: 'switch', hint: '如 [tmdbid=242143]'},
            {key: 'subtitleIndependentFolderEnabled', label: '字幕独立文件夹', type: 'switch'},
            {key: 'subtitleIndependentFolderName', label: '字幕文件夹名', type: 'text',
                disabledWhen: c => !c.subtitleIndependentFolderEnabled},
        ],
    },
    {
        title: '刮削设置',
        fields: [
            {key: 'scrape', label: '自动刮削', type: 'switch'},
            {key: 'followDay', label: '追更天数', type: 'number', min: 0},
            {key: 'bangumiIniEnabled', label: '生成 bangumi.ini', type: 'switch'},
            {key: 'tmdbApi', label: 'TMDB API', type: 'text'},
            {key: 'tmdbApiKey', label: 'TMDB API Key', type: 'password'},
            {key: 'tmdbImage', label: 'TMDB 图片地址', type: 'text'},
        ],
    },
    {
        title: 'RSS 设置',
        fields: [
            {key: 'rss', label: 'RSS 总开关', type: 'switch'},
            {key: 'rssSleepMinutes', label: 'RSS 间隔', type: 'number', min: 1, suffix: '分钟'},
            {key: 'rssTimeout', label: 'RSS 超时', type: 'number', min: 1, suffix: '秒'},
            {key: 'fileExist', label: '文件已下载自动跳过', type: 'switch'},
            {key: 'autoDisabled', label: '完结后自动禁用订阅', type: 'switch'},
            {key: 'completed', label: '完结迁移', type: 'switch'},
            {key: 'completedPathTemplate', label: '完结迁移位置', type: 'text', disabledWhen: c => !c.completed},
            {key: 'updateTotalEpisodeNumber', label: '自动更新总集数', type: 'switch'},
            {key: 'forceUpdateTotalEpisodeNumber', label: '强制更新总集数', type: 'switch',
                disabledWhen: c => !c.updateTotalEpisodeNumber},
            {key: 'skip5', label: '跳过 x.5 集', type: 'switch'},
            {key: 'omit', label: '检测遗漏集数', type: 'switch'},
            {key: 'procrastinating', label: '摸鱼检测', type: 'switch'},
            {key: 'procrastinatingDay', label: '摸鱼天数', type: 'number', min: 1, suffix: '天',
                disabledWhen: c => !c.procrastinating},
            {key: 'procrastinatingMasterOnly', label: '仅主 RSS 参与摸鱼检测', type: 'switch',
                disabledWhen: c => !c.procrastinating},
            {key: 'standbyRss', label: '备用 RSS', type: 'switch'},
            {key: 'copyMasterToStandby', label: '添加订阅时复制主 RSS 到备用', type: 'switch',
                disabledWhen: c => !c.standbyRss},
            /* 共存模式是「同一集留多个字幕组的版本」，靠的就是备用源；
               总开关关着的时候上游这一项也是禁用的 */
            {key: 'coexist', label: '多字幕组共存模式', type: 'switch',
                disabledWhen: c => !c.standbyRss},
        ],
    },
    {
        title: 'Trackers',
        fields: [
            {key: 'autoTrackersUpdate', label: '自动更新 Trackers', type: 'switch'},
            {key: 'trackersUpdateUrls', label: '更新地址', type: 'textarea'},
        ],
    },
    {
        title: 'Bangumi',
        fields: [
            {key: 'bgmApi', label: 'Bangumi API', type: 'text'},
            {
                key: 'bgmTokenType', label: 'Token 方式', type: 'select', items: [
                    {title: '手动填写', value: 'INPUT'},
                    {title: 'OAuth 授权', value: 'AUTO'},
                ],
            },
            {key: 'bgmToken', label: 'Token', type: 'password', when: c => c.bgmTokenType !== 'AUTO'},
            {key: 'bgmAppID', label: 'App ID', type: 'text', when: c => c.bgmTokenType === 'AUTO'},
            {key: 'bgmAppSecret', label: 'App Secret', type: 'password', when: c => c.bgmTokenType === 'AUTO'},
            {key: 'bgmRedirectUri', label: '回调地址', type: 'text', when: c => c.bgmTokenType === 'AUTO'},
        ],
    },
    {
        title: '其他',
        fields: [
            {key: 'mikanHost', label: 'Mikan Host', type: 'text'},
            {key: 'githubToken', label: 'GitHub Token', type: 'password'},
            {key: 'logsMax', label: '最大日志条数', type: 'number', min: 0},
            {key: 'autoUpdate', label: '自动更新', type: 'switch'},
            {key: 'autoStart', label: '开机自启', type: 'switch'},
            {key: 'debug', label: 'DEBUG 日志', type: 'switch'},
            {key: 'apiKey', label: 'API Key', type: 'text', hint: 'ICS 日历与 Emby Webhook 用的就是它'},
        ],
    },
]

/**
 * 自动备份。上游 3.2.37（53dfa23）把这两项从「其他」挪到了备份那块，和导入导出放一起 ——
 * 找「备份」的人不会去「其他」里翻。字段名没变，新老后端都认。
 */
export const BACKUP_SECTION: SectionDef = {
    title: '自动备份',
    fields: [
        {key: 'configBackup', label: '设置自动备份', type: 'switch'},
        {key: 'configBackupDay', label: '备份保留天数', type: 'number', min: 1, suffix: '天',
            disabledWhen: c => !c.configBackup},
    ],
}

/* ══════════════ 其余标签页 ══════════════ */

export const EXCLUDE_SECTION: SectionDef = {
    title: '全局排除',
    note: '命中任一关键词的资源不会被下载。订阅里可以单独关掉全局排除。',
    fields: [{key: 'exclude', label: '排除关键词', type: 'list'}],
}

export const PROXY_SECTION: SectionDef = {
    title: '代理设置',
    fields: [
        {key: 'proxy', label: '启用代理', type: 'switch'},
        {key: 'proxyHost', label: '地址', type: 'text', disabledWhen: c => !c.proxy},
        {key: 'proxyPort', label: '端口', type: 'number', min: 1, max: 65535, disabledWhen: c => !c.proxy},
        {key: 'proxyUsername', label: '用户名', type: 'text', disabledWhen: c => !c.proxy},
        {key: 'proxyPassword', label: '密码', type: 'password', disabledWhen: c => !c.proxy},
        {key: 'proxyList', label: '代理列表', type: 'textarea', disabledWhen: c => !c.proxy},
    ],
}

export const LOGIN_SECTIONS: SectionDef[] = [
    {
        title: '账号',
        note: '密码留空表示不修改',
        fields: [],   // 账号密码要特殊处理（提交时做 MD5），在组件里单独渲染
    },
    {
        title: '会话',
        fields: [
            {key: 'loginEffectiveHours', label: '登录有效时间', type: 'number', min: 1, suffix: '小时'},
            {key: 'multiLoginForbidden', label: '禁止多端登录', type: 'switch'},
        ],
    },
    {
        title: '访问控制',
        fields: [
            {key: 'innerIP', label: '仅允许内网 IP 访问', type: 'switch'},
            {key: 'verifyLoginIp', label: '校验登录 IP', type: 'switch'},
            {key: 'limitLoginAttempts', label: '限制尝试次数', type: 'switch',
                hint: '连续失败 30 次后封禁 24 小时'},
            {key: 'allowCors', label: '允许跨域', type: 'switch'},
            {key: 'ipWhitelist', label: '启用 IP 白名单', type: 'switch'},
            {key: 'ipWhitelistStr', label: 'IP 白名单', type: 'textarea', disabledWhen: c => !c.ipWhitelist},
            {key: 'reverseProxyTrustIpListEnabled', label: '信任反代来源 IP', type: 'switch'},
            {key: 'reverseProxyTrustIpList', label: '受信任的反代 IP', type: 'list',
                disabledWhen: c => !c.reverseProxyTrustIpListEnabled},
        ],
    },
]
