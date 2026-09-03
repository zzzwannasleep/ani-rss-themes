/**
 * 日志的两版兼容层。纯函数，不依赖任何 UI 框架。
 *
 * 上游 3.2.28（`6db60f0` 优化日志）改了 `/api/logs` 回的形状：
 * `Log` 新加一个 `ts`（毫秒时间戳），`message` 从此只剩正文（外加堆栈）。
 * 3.2.27 及以前没有 `ts`，时间粘在 `message` 头上，一整条长这样：
 *
 * ```
 * 2026-08-29 17:16:30 INFO [main] ani.rss.task.RssTask - 订阅刷新完成，新增 2 条待下载
 * ```
 *
 * 对我们是双向的一件事：老版本上那一截里的级别、线程、类名在界面上各有各的位置，
 * 是重复显示的；而新版本上什么都不做的话，**时间会整个消失** —— 它原来就藏在那一截里。
 *
 * 备用界面是丢进任意版本的 `config/webui/` 里跑的，挑不了后端版本，所以两种都得认：
 * 进来先归一成「`ts` + 纯正文」一种形状，过滤和渲染只写一套。
 * 判据是**字段在不在**，不是版本号 —— 同一个版本号上游重推过（见 `github.ts` 开头那段）。
 */
import type {Log} from './types'

/*
 * 老格式的头：`日期 级别 [线程] 类名 - `，对应 3.2.27 的 LogUtil 里那句
 * `StrFormatter.format("{} {} [{}] {} - {}", date, level, threadName, loggerName, msg)`。
 * 线程名允许带空格（`RMI TCP Connection(2)-localhost`），所以中括号那段用 `[^\]]`
 * 而不是 `\S` 去吃；类名是包路径，没有空格。
 */
const LEGACY_HEAD = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) \S+ \[[^\]]*] \S+ - /

/** 老形状 → 新形状。已经有 `ts` 的（3.2.28+）原样放行，认不出头的也原样放行，不猜 */
export function normalizeLog(log: Log): Log {
    if (log.ts) return log
    const message = log.message ?? ''
    const head = LEGACY_HEAD.exec(message)
    if (!head) return log
    const [y, mo, d, h, mi, s] = head.slice(1).map(Number)
    return {
        ...log,
        /* 后端那串是本地时间（DatePattern.NORM_DATETIME_PATTERN，不带时区），按本地时区还原 */
        ts: new Date(y, mo - 1, d, h, mi, s).getTime(),
        message: message.slice(head[0].length),
    }
}

const p = (n: number) => String(n).padStart(2, '0')

/** 毫秒 → `HH:mm:ss`。日志一行只放时分秒，年月日交给 title */
export function logTime(ts?: number): string {
    if (!ts) return ''
    const d = new Date(ts)
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 毫秒 → `yyyy-MM-dd HH:mm:ss`，口径同上游 `format.js` 的 `formatTime` */
export function logTimeFull(ts?: number): string {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${logTime(ts)}`
}
