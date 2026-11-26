/**
 * 通知配置：11 种类型各自的字段表。
 * 字段名与 NotificationConfig（57 个字段）逐一对应，取自后端实体，不是猜的。
 * 第 11 种 ASTRBOT 是上游 3.2.58（62f613b）加的，字段跟着 3.2.59（f470cb9）补了图片开关。
 */
import type {NotificationConfig} from '@shared/types'

export type NType =
    | 'TELEGRAM' | 'MAIL' | 'WEB_HOOK' | 'ASTRBOT' | 'BARK' | 'SERVER_CHAN'
    | 'SHELL' | 'SYSTEM' | 'FILE_MOVE' | 'EMBY_REFRESH' | 'OPEN_LIST_UPLOAD'

export interface NField {
    key: keyof NotificationConfig & string
    label: string
    type: 'text' | 'password' | 'number' | 'switch' | 'select' | 'textarea' | 'list'
    hint?: string
    items?: {title: string; value: string | number}[]
}

export const N_TYPES: {value: NType; title: string; icon: string}[] = [
    {value: 'TELEGRAM', title: 'Telegram', icon: 'mdi-send'},
    {value: 'MAIL', title: '邮件', icon: 'mdi-email-outline'},
    {value: 'WEB_HOOK', title: 'Webhook', icon: 'mdi-webhook'},
    {value: 'ASTRBOT', title: 'AstrBot', icon: 'mdi-robot-outline'},
    {value: 'BARK', title: 'Bark', icon: 'mdi-bell-outline'},
    {value: 'SERVER_CHAN', title: 'Server 酱', icon: 'mdi-message-badge-outline'},
    {value: 'SHELL', title: 'Shell', icon: 'mdi-console'},
    {value: 'SYSTEM', title: '系统通知', icon: 'mdi-monitor'},
    {value: 'FILE_MOVE', title: '文件移动', icon: 'mdi-folder-move-outline'},
    {value: 'EMBY_REFRESH', title: 'Emby 刷新', icon: 'mdi-play-network-outline'},
    {value: 'OPEN_LIST_UPLOAD', title: 'OpenList 上传', icon: 'mdi-cloud-upload-outline'},
]

/** 触发时机。后端 NotificationStatusEnum 的全部取值 */
export const N_STATUS: {value: string; title: string}[] = [
    {value: 'DOWNLOAD_START', title: '开始下载'},
    {value: 'DOWNLOAD_END', title: '下载完成'},
    {value: 'OMIT', title: '检测到遗漏'},
    {value: 'ERROR', title: '发生错误'},
    {value: 'COMPLETED', title: '番剧完结'},
    {value: 'PROCRASTINATING', title: '疑似停更'},
]

export const N_FIELDS: Record<NType, NField[]> = {
    TELEGRAM: [
        {key: 'telegramBotToken', label: 'Bot Token', type: 'password'},
        {key: 'telegramChatId', label: 'Chat ID', type: 'text', hint: '可用下方「获取会话」按钮拉取'},
        {key: 'telegramTopicId', label: '话题 ID', type: 'number', hint: '群组话题模式才需要'},
        {key: 'telegramApiHost', label: 'API 地址', type: 'text', hint: '自建反代时填写'},
        {key: 'telegramFormat', label: '消息格式', type: 'select', items: [
            {title: 'Markdown', value: 'Markdown'},
            {title: 'MarkdownV2', value: 'MarkdownV2'},
            {title: 'HTML', value: 'HTML'},
        ]},
        {key: 'telegramImage', label: '附带封面图', type: 'switch'},
    ],
    MAIL: [
        {key: 'mailSMTPHost', label: 'SMTP 服务器', type: 'text'},
        {key: 'mailSMTPPort', label: 'SMTP 端口', type: 'number'},
        {key: 'mailFrom', label: '发件地址', type: 'text'},
        {key: 'mailPassword', label: '密码 / 授权码', type: 'password'},
        {key: 'mailAddressee', label: '收件地址', type: 'text'},
        {key: 'mailSSLEnable', label: '启用 SSL', type: 'switch'},
        {key: 'mailTLSEnable', label: '启用 TLS', type: 'switch'},
        {key: 'mailImage', label: '附带封面图', type: 'switch'},
    ],
    WEB_HOOK: [
        {key: 'webHookUrl', label: '地址', type: 'text'},
        {key: 'webHookMethod', label: '请求方法', type: 'select', items: [
            {title: 'POST', value: 'POST'},
            {title: 'GET', value: 'GET'},
            {title: 'PUT', value: 'PUT'},
        ]},
        {key: 'webHookHeader', label: '请求头', type: 'textarea', hint: '一行一个，形如 Key: Value'},
        {key: 'webHookBody', label: '请求体', type: 'textarea', hint: '支持消息模版变量'},
    ],
    /*
     * AstrBot（上游 3.2.58 / 3.2.59）。走它的 OpenAPI：地址 + 密钥 + 目标会话 UMO。
     * 发图片要在 AstrBot 那边给这枚 Key 开 file 权限，否则只有文字过去 ——
     * 这是后端的行为，提示写在这儿，省得人去翻源码。
     */
    ASTRBOT: [
        {key: 'astrBotHost', label: '服务地址', type: 'text', hint: '形如 http://astrbot:6185'},
        {key: 'astrBotApiKey', label: 'API Key', type: 'password', hint: 'abk_ 开头；要带封面图需在 AstrBot 侧开 file 权限'},
        {key: 'astrBotUmo', label: '目标 UMO', type: 'text', hint: '在目标会话里发 /sid 获取'},
        {key: 'astrBotImage', label: '附带封面图', type: 'switch'},
    ],
    BARK: [
        {key: 'barkServerUrl', label: '服务器地址', type: 'text'},
        {key: 'barkDeviceKeys', label: '设备 Key', type: 'list'},
        {key: 'barkGroup', label: '分组', type: 'text'},
        {key: 'barkLevel', label: '提醒级别', type: 'select', items: [
            {title: '主动', value: 'active'},
            {title: '时效性', value: 'timeSensitive'},
            {title: '被动', value: 'passive'},
            {title: '重要警告', value: 'critical'},
        ]},
        {key: 'barkVolume', label: '音量', type: 'number', hint: '重要警告级别下生效，0~10'},
        {key: 'barkUseMarkdown', label: '使用 Markdown', type: 'switch'},
    ],
    SERVER_CHAN: [
        {key: 'serverChanType', label: '版本', type: 'select', items: [
            {title: 'Server 酱', value: 'SERVER_CHAN'},
            {title: 'Server 酱³', value: 'SERVER_CHAN_3'},
        ]},
        {key: 'serverChanSendKey', label: 'SendKey', type: 'password'},
        {key: 'serverChan3ApiUrl', label: 'API 地址', type: 'text', hint: 'Server 酱³ 才需要'},
        {key: 'serverChanTitleAction', label: '标题携带动作', type: 'switch'},
    ],
    SHELL: [
        {key: 'shell', label: '脚本', type: 'textarea', hint: '消息内容通过环境变量传入'},
        {key: 'aliveLimit', label: '最长执行时间', type: 'number', hint: '秒，超时后强制结束'},
    ],
    SYSTEM: [
        {key: 'systemMsg', label: '发送系统通知', type: 'switch', hint: '仅桌面端有效'},
    ],
    FILE_MOVE: [
        {key: 'fileMoveTarget', label: '目标位置', type: 'text'},
        {key: 'fileMoveOvaTarget', label: '剧场版目标位置', type: 'text'},
        {key: 'fileMoveCopyModel', label: '复制而非移动', type: 'switch'},
        {key: 'fileMoveDeleteOldEpisode', label: '删除旧集', type: 'switch'},
    ],
    EMBY_REFRESH: [
        {key: 'embyHost', label: 'Emby 地址', type: 'text'},
        {key: 'embyApiKey', label: 'API Key', type: 'password'},
        {key: 'embyRefreshViewIds', label: '媒体库 ID', type: 'list', hint: '留空表示全部；可用下方按钮拉取'},
        {key: 'embyDelayed', label: '延迟刷新', type: 'number', hint: '秒'},
        {key: 'embyRefresh', label: '启用刷新', type: 'switch'},
    ],
    OPEN_LIST_UPLOAD: [
        {key: 'openListUploadHost', label: 'OpenList 地址', type: 'text'},
        {key: 'openListUploadApiKey', label: 'API Key', type: 'password'},
        {key: 'openListUploadPath', label: '上传路径', type: 'text'},
        {key: 'openListUploadOvaPath', label: '剧场版上传路径', type: 'text'},
        {key: 'openListUploadDeleteLocalFile', label: '上传后删除本地文件', type: 'switch'},
        {key: 'openListUploadDeleteOldEpisode', label: '删除旧集', type: 'switch'},
    ],
}
