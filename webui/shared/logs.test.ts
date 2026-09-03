/**
 * 日志两版兼容的断言。
 *
 *   node --experimental-strip-types shared/logs.test.ts
 *
 * 这里错了都不报错，只是界面上少点东西 —— 而「少点东西」和「本来就没有」长得一模一样：
 * 头削不掉，时间和级别在每行正文里再重复一遍；头削过了头，正文被吃掉一段。
 */
import assert from 'node:assert/strict'

const {normalizeLog, logTime, logTimeFull} = await import('./logs.ts')

const at = (y: number, mo: number, d: number, h: number, mi: number, s: number) =>
    new Date(y, mo - 1, d, h, mi, s).getTime()

/* ── 3.2.27 及以前：时间粘在 message 头上 ── */
{
    const got = normalizeLog({
        message: '2026-08-29 17:16:30 INFO [main] ani.rss.task.RssTask - 订阅刷新完成，新增 2 条待下载',
        level: 'INFO', loggerName: 'ani.rss.task.RssTask', threadName: 'main',
    })
    assert.equal(got.ts, at(2026, 8, 29, 17, 16, 30), '老格式那串是本地时间，不能当 UTC 解')
    assert.equal(got.message, '订阅刷新完成，新增 2 条待下载', '头要整截削掉，只留正文')
}

/* 线程名带空格：Tomcat / RMI 的线程名就长这样，用 \S 吃中括号那段会漏掉 */
{
    const got = normalizeLog({
        message: '2026-08-29 09:00:01 WARN [RMI TCP Connection(2)-localhost] ani.rss.Sub - 没匹配到新剧集',
        level: 'WARN',
    })
    assert.equal(got.ts, at(2026, 8, 29, 9, 0, 1))
    assert.equal(got.message, '没匹配到新剧集')
}

/* 正文里还有 ` - `：只削头，后面的原样留着 */
{
    const got = normalizeLog({
        message: '2026-01-02 03:04:05 INFO [dl-2] ani.rss.download.Qbittorrent - 下载完成：某番 - 07',
    })
    assert.equal(got.message, '下载完成：某番 - 07', '第二个分隔符不是头，不能跟着削')
}

/* 堆栈跟在正文后面（addThrowableMsg 是往同一个串上追加的），换行之后的都要留住 */
{
    const got = normalizeLog({
        message: '2026-01-02 03:04:05 ERROR [main] ani.rss.Boot - 启动失败\njava.io.IOException: x\n\tat ani.rss.Boot.main',
    })
    assert.ok(got.message?.startsWith('启动失败\njava.io.IOException'), '堆栈不能被削掉')
}

/* ── 3.2.28+：已经有 ts，原样放行 ── */
{
    const raw = {ts: 1767290645000, message: '订阅刷新完成', level: 'INFO', loggerName: 'ani.rss.X'}
    assert.deepEqual(normalizeLog(raw), raw, '新形状不该被再动一次')
}

/* ── 认不出的形状：不猜，原样放行 ── */
for (const message of [
    '订阅刷新完成，新增 2 条待下载',                       // 没有头
    '2026-08-29 17:16:30 订阅刷新完成',                    // 只有日期，没有 级别/线程/类名
    '2026-08-29 17:16 INFO [main] ani.rss.X - 少了秒',     // 时间不完整
    '',
]) {
    const got = normalizeLog({message})
    assert.equal(got.ts, undefined, `不该给「${message}」编一个时间出来`)
    assert.equal(got.message, message, '认不出就一个字都别动')
}

/* ── 时间格式 ── */
{
    const ts = at(2026, 8, 29, 7, 6, 5)
    assert.equal(logTime(ts), '07:06:05', '个位数要补零，否则一列时间对不齐')
    assert.equal(logTimeFull(ts), '2026-08-29 07:06:05')
    /* 老后端 + 认不出的行 = 没有 ts，那一列留空，不能显示「1970-01-01」或者 NaN */
    assert.equal(logTime(undefined), '')
    assert.equal(logTime(0), '')
    assert.equal(logTimeFull(undefined), '')
}

console.log('✓ logs.test.ts 全过')
