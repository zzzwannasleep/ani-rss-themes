/**
 * ani-rss 数据模型（TypeScript）
 *
 * 自动生成，请勿手改 —— 由 scratchpad/gen-types.mjs 从上游 test 分支的 Java 实体抽出。
 * 上游加字段时重跑生成器，diff 即本次接口变更。
 *
 * 说明：
 *  - 所有字段都标成可选。后端是 Gson 序列化 Lombok @Data，null 字段直接不出现在 JSON 里，
 *    标必填会让调用处到处 ! 断言，反而掩盖真实的空值。
 *  - Date 经 DateAdapter 序列化为 'yyyy-MM-dd' 字符串。
 *  - 内部类展平成「外层+内层」，如 BgmInfo.Images → BgmInfoImages。
 */

/** About —— 关于 */
export interface About extends UpdateInfo {
    /** 版本 */
    version?: string
}

/** Ani —— 订阅 */
export interface Ani {
    sort?: number
    /** id */
    id?: string
    /** 不在页面显示 */
    mikanTitle?: string
    /** RSS URL */
    url?: string
    exists?: boolean
    /** 备用rss */
    standbyRssList?: StandbyRss[]
    /** 标题 */
    title?: string
    /** 日语标题 来源于BGM */
    jpTitle?: string
    /** 剧集偏移 */
    offset?: number
    /** 发布日期 */
    releaseDate?: string
    /** 年度 */
    year?: number
    /** 月 */
    month?: number
    /** 日 */
    date?: number
    /** 星期 1表示周日，2表示周一 */
    weekLabel?: string
    /** 季度 */
    season?: number
    /** 封面本地保存位置 */
    cover?: string
    /** 图片 https:// */
    image?: string
    /** 字幕组 */
    subgroup?: string
    /** 匹配 */
    match?: string[]
    /** 排除 */
    exclude?: string[]
    /** 是否启用全局排除 */
    globalExclude?: boolean
    /** 剧场版 or OVA */
    ova?: boolean
    /** 拼音 */
    pinyin?: string
    /** 拼音 */
    pinyinInitials?: string
    /** 启用 */
    enable?: boolean
    /** 当前集数 */
    currentEpisodeNumber?: number
    /** 总集数 */
    totalEpisodeNumber?: number
    themoviedbName?: string
    type?: string
    bgmUrl?: string
    /** 自定义下载位置 */
    customDownloadPath?: boolean
    /** 自定义下载位置 */
    customDownloadPathTemplate?: string
    /** 评分 */
    score?: number
    /** 自定义集数获取规则 */
    customEpisode?: boolean
    /** 自定义集数获取规则 */
    customEpisodeStr?: string
    /** 自定义集数获取规则 groupIndex */
    customEpisodeGroupIndex?: number
    /** 遗漏检测 */
    omit?: boolean
    /** 只下载最新集 */
    downloadNew?: boolean
    /** 不进行下载的集 */
    notDownload?: number[]
    /** tmdb 相关信息 */
    tmdb?: unknown
    /** 自动上传 */
    upload?: boolean
    /** 摸鱼 */
    procrastinating?: boolean
    /** 自定义重命名模版 */
    customRenameTemplateEnable?: boolean
    /** 自定义重命名模版 */
    customRenameTemplate?: string
    /** 自定义优先保留开关 */
    customPriorityKeywordsEnable?: boolean
    /** 自定义优先保留关键词列表 */
    customPriorityKeywords?: string[]
    /** 上次下载完成时间 */
    lastDownloadTime?: number
    /** 自定义上传 */
    customUploadEnable?: boolean
    /** 自定义上传 */
    customUploadPathTarget?: string
    /** 消息通知 */
    message?: boolean
    /** 完结迁移 */
    completed?: boolean
    /** 自定义完结迁移 */
    customCompleted?: boolean
    /** 自定义完结迁移 */
    customCompletedPathTemplate?: string
    /** 自定义标签开关 */
    customTagsEnable?: boolean
    /** 单个订阅自定义标签 */
    customTags?: string[]
}

/** AniBT */
export interface AniBT {
    currentSeason?: string
    requestedSeason?: string
    availableSeasons?: string[]
    byWeekday?: AniBTByWeekday[]
}

/** AniBTByWeekday */
export interface AniBTByWeekday {
    animes?: AniBTAnime[]
    weekday?: number
    weekdayLabel?: string
}

/** AniBTAnime */
export interface AniBTAnime {
    animeId?: string
    bgmId?: string
    cover?: string
    rating?: number
    title?: AniBTTitle
    format?: string
    exists?: boolean
    rssReleaseCount?: number
}

/** AniBTTitle */
export interface AniBTTitle {
    chinese?: string
    chineseTraditional?: string
    english?: string
    primary?: string
    romaji?: string
}

/** AniBTGroup */
export interface AniBTGroup {
    bgmId?: string
    groupId?: string
    slug?: string
    name?: string
    status?: string
    lastUpdatedAt?: number
    items?: AniBTItem[]
    rss?: string
    groupRegex?: GroupRegex
}

/** AniBTItem */
export interface AniBTItem {
    episodeKey?: string
    language?: string[]
    magnet?: string
    publishedAt?: number
    releaseId?: string
    resolution?: string
    subtitle?: string
    title?: string
    size?: number
    formatSize?: string
}

/** AnimeGardenWeek */
export interface AnimeGardenWeek {
    weekLabel?: string
    subjects?: AnimeGardenSubject[]
}

/** AnimeGardenSubject */
export interface AnimeGardenSubject {
    id?: string
    name?: string
    keywords?: string[]
    activedAt?: string
    isArchived?: string
    weekLabel?: string
    exists?: boolean
    score?: number
    cover?: string
}

/** AnimeGardenGroup */
export interface AnimeGardenGroup {
    id?: string
    name?: string
    lastUpdatedAt?: string
    items?: AnimeGardenItem[]
    rss?: string
    bgmId?: string
    groupRegex?: GroupRegex
}

/** AnimeGardenItem */
export interface AnimeGardenItem {
    id?: string
    provider?: string
    providerId?: string
    title?: string
    href?: string
    type?: string
    magnet?: string
    size?: number
    formatSize?: string
    createdAt?: string
    fetchedAt?: string
    subjectId?: string
    publisher?: AnimeGardenPublisher
    fansub?: AnimeGardenFansub
}

/** AnimeGardenPublisher */
export interface AnimeGardenPublisher {
    id?: string
    name?: string
    avatar?: string
}

/** AnimeGardenFansub */
export interface AnimeGardenFansub {
    id?: string
    name?: string
}

/** BgmEpisodes */
export interface BgmEpisodes {
    data?: BgmEpisodesBgmEpisode[]
    total?: number
    limit?: number
    offset?: number
}

/** BgmEpisodesBgmEpisode */
export interface BgmEpisodesBgmEpisode {
    airdate?: string
    name?: string
    nameCn?: string
    duration?: string
    desc?: string
    ep?: number
    sort?: number
    id?: string
    subjectId?: number
    comment?: number
    type?: number
    disc?: number
    durationSeconds?: number
}

/** BgmInfo —— Bgm番剧信息 */
export interface BgmInfo {
    id?: string
    url?: string
    /** 名称 */
    name?: string
    /** 中文名称 */
    nameCn?: string
    /** 集数 */
    eps?: number
    /** 时间 */
    date?: string
    /** 图片 */
    images?: BgmInfoImages
    /** 季度 */
    season?: number
    /** 平台 OVA/剧场版 */
    platform?: string
    tags?: BgmInfoTag[]
    infobox?: unknown[]
    rating?: BgmInfoRating
}

/** BgmInfoImages —— 封面图片 */
export interface BgmInfoImages {
    small?: string
    grid?: string
    large?: string
    medium?: string
    common?: string
}

/** BgmInfoTag —— 标签 */
export interface BgmInfoTag {
    name?: string
    count?: string
    totalCont?: string
}

/** BgmInfoRating —— 评分 */
export interface BgmInfoRating {
    /** 级别 */
    rank?: number
    /** 评分 */
    score?: number
    /** 评分数 */
    total?: number
    /** 各阶段评分数 */
    count?: Record<string, number>
}

/** BgmMe */
export interface BgmMe {
    avatar?: BgmMeAvatar
    id?: number
    sign?: string
    url?: string
    username?: string
    nickname?: string
    userGroup?: string
    regTime?: string
    email?: string
    timeOffset?: number
    expiresDays?: number
}

/** BgmMeAvatar */
export interface BgmMeAvatar {
    large?: string
    medium?: string
    small?: string
}

/** CollectionInfo —— 合集信息 */
export interface CollectionInfo {
    /** 种子文件 base64 */
    torrent?: string
    /** 订阅 */
    ani?: Ani
    /** bgm */
    bgmInfo?: BgmInfo
}

/** Config —— 设置 */
export interface Config {
    /** Mikan Host */
    mikanHost?: string
    /** tmdbApi */
    tmdbApi?: string
    /** tmdbApiKey */
    tmdbApiKey?: string
    tmdbImage?: string
    /** 仅获取动漫 */
    tmdbAnime?: boolean
    /** 下载工具 */
    downloadToolType?: string
    /** 下载重试次数 */
    downloadRetry?: number
    /** 下载工具 地址 */
    downloadToolHost?: string
    /** 下载工具 用户名 */
    downloadToolUsername?: string
    /** 下载工具 密码 */
    downloadToolPassword?: string
    /** qb下载时，使用qb自身的保存路径配置(未下载完成的使用临时目录，复制种子文件) */
    qbUseDownloadPath?: boolean
    /** qb下载时的内容布局 <ul> <li>Original：原始布局</li> <li>Subfolder：创建子文件夹</li> <li>NoSubfolder：不创建子文件夹</li> </ul> */
    qbContentLayout?: string
    /** 分享率 */
    ratioLimit?: number
    /** 总做种时长 */
    seedingTimeLimit?: number
    /** 非活跃时长 */
    inactiveSeedingTimeLimit?: number
    /** 下载路径 */
    downloadPathTemplate?: string
    /** 剧场版下载路径 */
    ovaDownloadPathTemplate?: string
    /** 自定义标签 */
    customTags?: string[]
    priorityKeywordsEnable?: boolean
    /** 优先保留关键词列表 */
    priorityKeywords?: string[]
    /** 校验登录IP */
    verifyLoginIp?: boolean
    /** 延迟下载 */
    delayedDownload?: number
    /** RSS 间隔(分钟) */
    rssSleepMinutes?: number
    /** 重命名间隔(秒) */
    renameSleepSeconds?: number
    /** 自动重命名 */
    rename?: boolean
    /** rss开关 */
    rss?: boolean
    /** rss 超时时间 秒 */
    rssTimeout?: number
    /** 文件已下载自动跳过 */
    fileExist?: boolean
    /** 等待做种完毕 */
    awaitStalledUP?: boolean
    /** 自动删除已完成任务 */
    delete?: boolean
    /** 仅在主RSS更新后删除备用RSS */
    deleteStandbyRSSOnly?: boolean
    /** 自动推断剧集偏移 */
    offset?: boolean
    /** 获取标题时带上年份 */
    titleYear?: boolean
    /** 自动禁用已完结番剧的订阅 */
    autoDisabled?: boolean
    /** 自动跳过 x.5 集数 */
    skip5?: boolean
    /** 备用RSS */
    standbyRss?: boolean
    /** 多字幕组共存模式 */
    coexist?: boolean
    /** 最大日志条数 */
    logsMax?: number
    /** DEBUG */
    debug?: boolean
    /** 仅启用主rss摸鱼检测 */
    procrastinatingMasterOnly?: boolean
    /** 代理是否开启 */
    proxy?: boolean
    /** 代理host */
    proxyHost?: string
    /** 代理端口 */
    proxyPort?: number
    /** 代理用户名 */
    proxyUsername?: string
    /** 代理密码 */
    proxyPassword?: string
    /** 同时下载数量限制 */
    downloadCount?: number
    /** 登录信息 */
    login?: Login
    /** 禁止多端登录 */
    multiLoginForbidden?: boolean
    /** 登录有效时间/小时 */
    loginEffectiveHours?: number
    /** 全局排除 */
    exclude?: string[]
    /** 默认导入全局排除 */
    importExclude?: boolean
    /** 默认启用全局排除 */
    enabledExclude?: boolean
    /** BGM日语标题 */
    bgmJpName?: boolean
    /** tmdb */
    tmdb?: boolean
    /** 获取标题时带有tmdbId */
    tmdbId?: boolean
    /** 剧集标题是否支持plex命名方式 */
    tmdbIdPlexMode?: boolean
    /** tmdb 语言 */
    tmdbLanguage?: string
    /** 获取罗马音 */
    tmdbRomaji?: boolean
    /** TMDB原标题 */
    tmdbOriginalName?: boolean
    /** 开启ip白名单 */
    ipWhitelist?: boolean
    /** ip白名单 */
    ipWhitelistStr?: string
    /** 检测遗漏集数 */
    omit?: boolean
    /** bgmTokenType <p> INPUT or AUTO */
    bgmTokenType?: BgmTokenTypeEnum
    /** bgmToken */
    bgmToken?: string
    /** bgmAppID */
    bgmAppID?: string
    /** bgmAppID */
    bgmAppSecret?: string
    /** bgmRefreshToken */
    bgmRefreshToken?: string
    /** bgmRedirectUri */
    bgmRedirectUri?: string
    /** api key */
    apiKey?: string
    /** 只下载最新集 */
    downloadNew?: boolean
    /** 仅允许内网ip访问 */
    innerIP?: boolean
    /** 重命名模版 */
    renameTemplate?: string
    /** 重命名时剔除 年份 如 (2024) */
    renameDelYear?: boolean
    /** 重命名时剔除 tmdbId [tmdbid=242143] */
    renameDelTmdbId?: boolean
    /** 自动更新 trackers */
    autoTrackersUpdate?: boolean
    /** Trackers更新地址 */
    trackersUpdateUrls?: string
    /** 消息模版 */
    notificationTemplate?: string
    /** 自动更新 自动更新 */
    autoUpdate?: boolean
    /** 版本 */
    version?: string
    /** 获取BGM封面图片质量 */
    bgmImageSize?: string
    /** 自定义CSS */
    customCss?: string
    /** 自定义JS */
    customJs?: string
    /** 自定义集数获取规则 */
    customEpisode?: boolean
    /** 自定义集数获取规则 */
    customEpisodeStr?: string
    /** 自定义集数获取规则 groupIndex */
    customEpisodeGroupIndex?: number
    /** OpenList driver */
    provider?: string
    /** 添加行订阅是是否开启自动上传 */
    upload?: boolean
    /** 上传速度限制 */
    upLimit?: number
    /** 下载速度限制 */
    dlLimit?: number
    /** 捐赠过期时间 */
    expirationTime?: number
    /** 爱发电订单号 */
    outTradeNo?: string
    /** 捐赠或试用是否过期 */
    verifyExpirationTime?: boolean
    /** 试用 */
    tryOut?: boolean
    /** 摸鱼 */
    procrastinating?: boolean
    /** 摸鱼天数 */
    procrastinatingDay?: number
    /** GithubToken */
    githubToken?: string
    /** 自动更新总集数信息 */
    updateTotalEpisodeNumber?: boolean
    /** 强制更新总集数信息 */
    forceUpdateTotalEpisodeNumber?: boolean
    /** OpenList 离线超时 分钟 */
    openListDownloadTimeout?: number
    /** OpenList 下载重试次数 */
    openListDownloadRetryNumber?: number
    /** 设置备份 */
    configBackup?: boolean
    /** 备份天数 */
    configBackupDay?: number
    /** 番剧完结迁移 */
    completed?: boolean
    /** 番剧完结迁移位置 */
    completedPathTemplate?: string
    /** 通知 */
    notificationConfigList?: NotificationConfig[]
    /** 添加订阅时自动复制主rss至备用rss */
    copyMasterToStandby?: boolean
    /** 排序方式 */
    sortType?: AniSortTypeEnum
    /** 代理列表 */
    proxyList?: string
    /** 刮削开关 */
    scrape?: boolean
    followDay?: number
    bangumiIniEnabled?: boolean
    /** 重名的订阅将允许被替换 */
    replace?: boolean
    /** 最大文件名长度 不包含后缀 如: .mkv .mp4 */
    maxFileNameLength?: number
    /** 限制尝试次数 */
    limitLoginAttempts?: boolean
    /** 构建信息 */
    gitInfo?: GitInfo
    reverseProxyTrustIpListEnabled?: boolean
    reverseProxyTrustIpList?: string[]
    subtitleIndependentFolderEnabled?: boolean
    subtitleIndependentFolderName?: string
    bgmApi?: string
    autoStart?: boolean
    allowCors?: boolean
    uuid?: string
    jwtKey?: string
    tokenId?: string
}

/** EmbyViews —— Emby 媒体库 */
export interface EmbyViews {
    id?: string
    name?: string
}

/** EmbyWebHook —— EmbyWebHook */
export interface EmbyWebHook {
    title?: string
    description?: string
    date?: string
    event?: string
    severity?: string
    user?: EmbyWebHookUser
    server?: EmbyWebHookServer
    item?: EmbyWebHookItem
    playbackInfo?: EmbyWebHookPlaybackInfo
}

/** EmbyWebHookItem —— 项目信息 */
export interface EmbyWebHookItem {
    /** 文件路径 */
    path?: string
    /** 剧集名 */
    seriesName?: string
    /** 文件名 */
    fileName?: string
}

/** EmbyWebHookUser —— 用户信息 */
export interface EmbyWebHookUser {
    /** 用户 Id */
    id?: string
    /** 用户名称 */
    name?: string
}

/** EmbyWebHookServer —— 服务器信息 */
export interface EmbyWebHookServer {
    /** 服务器 Id */
    id?: string
    /** 服务器名称 */
    name?: string
    /** 服务器版本号 */
    version?: string
}

/** EmbyWebHookPlaybackInfo —— 播放信息 */
export interface EmbyWebHookPlaybackInfo {
    /** 是否播放完成 */
    playedToCompletion?: boolean
}

/** GithubRelease */
export interface GithubRelease {
    id?: string
    nodeId?: string
    tagName?: string
    targetCommitish?: string
    name?: string
    url?: string
    assetsUrl?: string
    uploadUrl?: string
    htmlUrl?: string
    draft?: boolean
    immutable?: boolean
    prerelease?: boolean
    createdAt?: string
    updatedAt?: string
    publishedAt?: string
    author?: GithubAuthor
    assets?: GithubAssets[]
    body?: string
    message?: string
}

/** GithubAssets */
export interface GithubAssets {
    url?: string
    id?: string
    nodeId?: string
    name?: string
    label?: string
    uploader?: GithubUploader
    contentType?: string
    state?: string
    size?: number
    digest?: string
    downloadCount?: number
    createdAt?: string
    updatedAt?: string
    browserDownloadUrl?: string
}

/** GithubUploader */
export interface GithubUploader {
    login?: string
    id?: string
    nodeId?: string
    avatarUrl?: string
    gravatarId?: string
    url?: string
    htmlUrl?: string
    followersUrl?: string
    followingUrl?: string
    gistsUrl?: string
    starredUrl?: string
    subscriptionsUrl?: string
    organizationsUrl?: string
    reposUrl?: string
    eventsUrl?: string
    receivedEventsUrl?: string
    type?: string
    userViewType?: string
    siteAdmin?: boolean
}

/** GithubAuthor */
export interface GithubAuthor {
    login?: string
    id?: string
    nodeId?: string
    avatarUrl?: string
    gravatarId?: string
    url?: string
    htmlUrl?: string
    followersUrl?: string
    followingUrl?: string
    gistsUrl?: string
    starredUrl?: string
    subscriptionsUrl?: string
    organizationsUrl?: string
    reposUrl?: string
    eventsUrl?: string
    receivedEventsUrl?: string
    type?: string
    userViewType?: string
    siteAdmin?: boolean
}

/** GitInfo */
export interface GitInfo {
    branch?: string
    shortCommitId?: string
    commitId?: string
}

/** GroupRegex */
export interface GroupRegex {
    /** Regex */
    regexList?: GroupRegexRegexItem[][]
    tags?: string[]
}

/** GroupRegexRegexItem */
export interface GroupRegexRegexItem {
    label?: string
    regex?: string
}

/** Item —— 资源项 */
export interface Item {
    /** 标题 */
    title?: string
    /** 重命名 */
    reName?: string
    /** 种子 */
    torrent?: string
    /** infoHash */
    infoHash?: string
    /** 集数 */
    episode?: number
    /** 大小 */
    formatSize?: string
    /** 大小 */
    length?: number
    /** 已下载 */
    hasDownloaded?: boolean
    /** 主 rss */
    master?: boolean
    /** 字幕组 */
    subgroup?: string
    /** 发布时间 */
    pubDate?: string
}

/** ListAni */
export interface ListAni {
    releaseDateList?: string[]
    weekList?: ListAniWeekAni[]
    total?: number
}

/** ListAniWeekAni */
export interface ListAniWeekAni {
    weekLabel?: string
    items?: Ani[]
}

/** Log —— 日志 */
export interface Log {
    /** 日志信息 */
    message?: string
    /** 日志级别 */
    level?: string
    /** 类路径 */
    loggerName?: string
    /** 线程名 */
    threadName?: string
}

/** Login —— 登录 */
export interface Login {
    /** 用户名 */
    username?: string
    /** 密码 */
    password?: string
}

/** Mikan —— mikan */
export interface Mikan {
    seasons?: MikanSeason[]
    weeks?: MikanWeek[]
    totalItem?: number
}

/** MikanSeason —— 季度信息 */
export interface MikanSeason {
    /** 年 */
    year?: number
    /** 季度 */
    season?: string
    seasonLabel?: string
    select?: boolean
}

/** MikanWeek —— 星期信息 */
export interface MikanWeek {
    /** 星期 */
    weekLabel?: string
    /** 番剧 */
    items?: MikanInfo[]
}

/** MikanGroup —— 字幕组 */
export interface MikanGroup {
    /** 字幕组 id */
    subgroupId?: string
    /** 字幕组名称 */
    label?: string
    /** rss地址 */
    rss?: string
    /** BgmUrl */
    bgmUrl?: string
    /** 更新日 */
    updateDay?: string
    /** 资源项 */
    items?: MikanItem[]
    groupRegex?: GroupRegex
}

/** MikanItem */
export interface MikanItem {
    title?: string
    magnet?: string
    size?: number
    formatSize?: string
    createdAt?: string
    torrent?: string
}

/** MikanBgm */
export interface MikanBgm {
    mikanId?: string
    bgmId?: string
    score?: number
}

/** MikanInfo —— mikan 番剧信息 */
export interface MikanInfo {
    /** 番剧 id */
    bgmId?: string
    /** 封面 */
    cover?: string
    /** mikan url */
    url?: string
    /** 已存在 */
    exists?: boolean
    /** 评分 */
    score?: number
    /** 标题 */
    title?: string
    /** BGM */
    bgmUrl?: string
    /** 字幕组 */
    groups?: MikanGroup[]
}

/** NotificationConfig */
export interface NotificationConfig {
    /** 启用 */
    enable?: boolean
    /** 重试次数 */
    retry?: number
    /** 备注 */
    comment?: string
    /** 通知模版 */
    notificationTemplate?: string
    /** 通知类型 */
    notificationType?: NotificationTypeEnum
    /** 邮箱 smtp */
    mailSMTPHost?: string
    /** 邮箱 端口 */
    mailSMTPPort?: number
    /** 邮箱 发件人 */
    mailFrom?: string
    /** 邮箱 密码 */
    mailPassword?: string
    /** 邮箱 SSL */
    mailSSLEnable?: boolean
    /** 邮箱 TLS */
    mailTLSEnable?: boolean
    /** 邮箱 收件人 */
    mailAddressee?: string
    /** 邮箱 发送图片 */
    mailImage?: boolean
    /** server酱类型：server酱和server酱3 */
    serverChanType?: ServerChanTypeEnum
    /** server酱 sendKey */
    serverChanSendKey?: string
    /** server酱3 apiUrl */
    serverChan3ApiUrl?: string
    /** server酱 标题事件 */
    serverChanTitleAction?: boolean
    /** 系统通知 */
    systemMsg?: boolean
    /** telegram bot token */
    telegramBotToken?: string
    /** telegram chat_id */
    telegramChatId?: string
    /** telegram topic id */
    telegramTopicId?: number
    /** telegram Api Host */
    telegramApiHost?: string
    /** telegram 发送图片 */
    telegramImage?: boolean
    /** telegram 格式 */
    telegramFormat?: string
    /** webHookMethod */
    webHookMethod?: string
    /** webHookUrl */
    webHookUrl?: string
    /** webHookHeader */
    webHookHeader?: string
    /** webHookBody */
    webHookBody?: string
    /** emby扫描媒体库 */
    embyRefresh?: boolean
    /** emby地址 */
    embyHost?: string
    /** emby api密钥 */
    embyApiKey?: string
    /** emby扫描媒体库 */
    embyRefreshViewIds?: string[]
    /** emby延迟扫描 */
    embyDelayed?: number
    shell?: string
    /** 存活限制 秒 */
    aliveLimit?: number
    /** 文件移动目标位置 */
    fileMoveTarget?: string
    /** 文件移动目标位置 OVA */
    fileMoveOvaTarget?: string
    /** 文件移动时删除旧的同集视频 */
    fileMoveDeleteOldEpisode?: boolean
    /** 文件移动 复制模式 */
    fileMoveCopyModel?: boolean
    /** OpenList Host */
    openListUploadHost?: string
    /** OpenList ApiKey */
    openListUploadApiKey?: string
    /** OpenList 上传位置 */
    openListUploadPath?: string
    /** OpenList OVA/剧场版 上传位置 */
    openListUploadOvaPath?: string
    /** OpenList 上传完成后删除本地文件 */
    openListUploadDeleteLocalFile?: boolean
    /** OpenList 删除同及文件 */
    openListUploadDeleteOldEpisode?: boolean
    barkServerUrl?: string
    barkDeviceKeys?: string[]
    barkGroup?: string
    barkUseMarkdown?: boolean
    barkLevel?: string
    barkVolume?: number
    /** 通知 状态 */
    statusList?: NotificationStatusEnum[]
    /** 顺序 */
    sort?: number
}

/** OpenListFileInfo */
export interface OpenListFileInfo {
    name?: string
    size?: number
    isDir?: boolean
    modified?: string
    created?: string
    path?: string
}

/** OpenListTaskInfo */
export interface OpenListTaskInfo {
    id?: string
    name?: string
    creator?: string
    creatorRole?: number
    state?: OpenListTaskInfoState
    status?: string
    progress?: number
    startTime?: string
    endTime?: string
    totalBytes?: string
    error?: string
}

/** OpenListTaskInfoState */
export type OpenListTaskInfoState = 'Pending' | 'Running' | 'Succeeded' | 'Canceling' | 'Canceled' | 'Error' | 'Failing' | 'Failed' | 'Waiting_for_Retry' | 'Preparing_to_Retry'

/** PlayItem —— 视频列表 */
export interface PlayItem {
    /** 显示标题 */
    title?: string
    /** 路径+文件名 bash64 */
    filename?: string
    /** 文件名 */
    name?: string
    /** 最后修改日期 */
    lastModify?: number
    /** 集数 */
    episode?: number
    /** 文件大小 */
    formatSize?: string
    /** 扩展名 */
    extName?: string
    subtitles?: PlayItemSubtitles[]
}

/** PlayItemSubtitles */
export interface PlayItemSubtitles {
    html?: string
    name?: string
    url?: string
    content?: string
    type?: string
}

/** ProxyTest —— 代理测试 相应体 */
export interface ProxyTest {
    /** 标题 */
    title?: string
    /** 状态码 */
    status?: number
    /** 耗时 */
    time?: number
}

/** StandbyRss */
export interface StandbyRss {
    /** 字幕组 */
    label?: string
    /** url */
    url?: string
    /** 剧集偏移 */
    offset?: number
}

/** TryOut */
export interface TryOut {
    enable?: boolean
    renewal?: boolean
    day?: number
    message?: string
}

/** UpdateInfo */
export interface UpdateInfo {
    latest?: string
    downloadUrl?: string
    update?: boolean
    autoUpdate?: boolean
    sha256?: string
    size?: number
    formatSize?: string
    /** 更新内容 */
    markdownBody?: string
    /** 发布时间 */
    date?: string
}

/** WebUI */
export interface WebUI {
    owner?: string
    repo?: string
    version?: string
    filename?: string
}

/** AniBTQueryDTO */
export interface AniBTQueryDTO {
    season?: string
    bgmUrl?: string
    title?: string
}

/** IdDTO */
export interface IdDTO {
    id?: string
}

/** ImportAniDataDTO */
export interface ImportAniDataDTO {
    filename?: string
    aniList?: Ani[]
    conflict?: ImportAniDataDTOConflict
}

/** ImportAniDataDTOConflict */
export type ImportAniDataDTOConflict = 'REPLACE' | 'SKIP'

/** RssToAniDTO */
export interface RssToAniDTO {
    url?: string
    type?: string
    bgmUrl?: string
    subgroup?: string
    enable?: boolean
}

/** ThemoviedbDTO */
export interface ThemoviedbDTO {
    tmdbId?: string
    title?: string
    ova?: boolean
}

/** ThemoviedbVO */
export interface ThemoviedbVO {
    themoviedbName?: string
    tmdb?: unknown
}

/** Aria2RpcBody */
export interface Aria2RpcBody {
    id?: string
    jsonRpc?: string
    method?: string
    params?: unknown[]
}

/** Aria2TorrentsInfo */
export interface Aria2TorrentsInfo {
    result?: Aria2TorrentsInfoTorrent[]
}

/** Aria2TorrentsInfoBittorrent */
export interface Aria2TorrentsInfoBittorrent {
    info?: Aria2TorrentsInfoBittorrentInfo
}

/** Aria2TorrentsInfoBittorrentInfo */
export interface Aria2TorrentsInfoBittorrentInfo {
    name?: string
}

/** Aria2TorrentsInfoTorrent */
export interface Aria2TorrentsInfoTorrent extends TorrentsInfo {
    bittorrent?: Aria2TorrentsInfoBittorrent
    /** HASH */
    infoHash?: string
    /** 标签 */
    gid?: string
    /** 已下载大小 */
    completedLength?: number
    /** 大小 */
    totalLength?: number
    /** 下载位置 */
    dir?: string
    /** 状态 */
    status?: string
    /** 文件列表 */
    files?: Aria2TorrentsInfoFileEntity[]
}

/** Aria2TorrentsInfoFileEntity */
export interface Aria2TorrentsInfoFileEntity {
    path?: string
}

/** qBittorrentTorrentsInfo */
export interface qBittorrentTorrentsInfo extends TorrentsInfo {
    /** 标签 */
    tags?: string
}

/** qBittorrentTorrentsInfoFileEntity */
export interface qBittorrentTorrentsInfoFileEntity {
    index?: number
    name?: string
    size?: number
    /** 1 允许下载。2 禁止下载 */
    priority?: number
}

/** TorrentsInfo —— 种子信息 */
export interface TorrentsInfo {
    id?: string
    /** hash */
    hash?: string
    /** 名称 */
    name?: string
    /** 状态 */
    state?: TorrentsStateEnum
    /** 分类 */
    category?: string
    /** 标签 */
    tagList?: string[]
    /** 已下载的大小 */
    completed?: number
    /** 大小 */
    size?: number
    /** 进度 */
    progress?: number
    /** 大小 */
    formatSize?: string
    /** 下载位置 */
    savePath?: string
    /** 文件列表 */
    filesSupplier?: unknown
}

/** TransmissionRpcBody */
export interface TransmissionRpcBody {
    id?: string
    jsonRpc?: string
    method?: string
    params?: Record<string, unknown>
}

/** TransmissionTorrentsInfo */
export interface TransmissionTorrentsInfo {
    result?: TransmissionTorrentsInfoResult
}

/** TransmissionTorrentsInfoResult */
export interface TransmissionTorrentsInfoResult {
    torrents?: TransmissionTorrentsInfoTorrent[]
}

/** TransmissionTorrentsInfoTorrent */
export interface TransmissionTorrentsInfoTorrent extends TorrentsInfo {
    /** HASH */
    hashString?: string
    /** 标签 */
    labels?: string[]
    /** 已下载大小 */
    haveValid?: number
    /** 大小 */
    totalSize?: number
    /** 下载位置 */
    downloadDir?: string
    /** 状态 */
    status?: number
    /** 已完成 */
    isFinished?: boolean
    /** 文件列表 */
    files?: TransmissionTorrentsInfoFileEntity[]
}

/** TransmissionTorrentsInfoFileEntity */
export interface TransmissionTorrentsInfoFileEntity {
    name?: string
}

/** AniSortTypeEnum */
export type AniSortTypeEnum = 'SCORE' | 'PINYIN' | 'DOWNLOAD_TIME'

/** Aria2MethodEnum */
export type Aria2MethodEnum = 'addTorrent' | 'addUri' | 'changeGlobalOption' | 'getGlobalStat' | 'removeDownloadResult' | 'tellActive' | 'tellStopped' | 'tellWaiting'

/** BgmTokenTypeEnum */
export type BgmTokenTypeEnum = 'INPUT' | 'AUTO'

/** NotificationStatusEnum */
export type NotificationStatusEnum = 'DOWNLOAD_START' | 'DOWNLOAD_END' | 'OMIT' | 'ERROR' | 'COMPLETED' | 'PROCRASTINATING'

/** NotificationTypeEnum */
export type NotificationTypeEnum = 'EMBY_REFRESH' | 'MAIL' | 'SERVER_CHAN' | 'SYSTEM' | 'TELEGRAM' | 'WEB_HOOK' | 'SHELL' | 'FILE_MOVE' | 'OPEN_LIST_UPLOAD' | 'BARK'

/** ServerChanTypeEnum */
export type ServerChanTypeEnum = 'SERVER_CHAN' | 'SERVER_CHAN_3'

/** TorrentsStateEnum */
export type TorrentsStateEnum = 'unknown' | 'forcedDL' | 'downloading' | 'forcedMetaDL' | 'metaDL' | 'stalledDL' | 'forcedUP' | 'uploading' | 'stalledUP' | 'checkingResumeData' | 'queuedDL' | 'queuedUP' | 'checkingUP' | 'checkingDL' | 'stoppedDL' | 'pausedDL' | 'stoppedUP' | 'pausedUP' | 'moving' | 'missingFiles' | 'error' | 'allocating'

/** TorrentsTagEnum */
export type TorrentsTagEnum = 'ANI_RSS' | 'RENAME' | 'STANDBY_RSS' | 'DOWNLOAD_COMPLETE'

/** TransmissionMethodEnum */
export type TransmissionMethodEnum = 'torrentAdd' | 'torrentGet' | 'torrentRemove' | 'torrentRenamePath' | 'torrentSet' | 'torrentSetLocation'

