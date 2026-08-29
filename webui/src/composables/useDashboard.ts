import {computed, onActivated, onDeactivated} from 'vue'
import type {Ani} from '@shared/types'
import {useAniStore} from '@/stores/ani'
import {useTorrentsStore} from '@/stores/torrents'
import {useConfigStore} from '@/stores/config'

/**
 * 总览页的数据层。
 *
 * 十一款界面的总览长得完全不一样（海报条 / 玻璃面板 / 文档首页 / M3 卡 / 系统属性 /
 * 博客横幅 / 关于本机 / 资源监控挂件），
 * 但要看的东西是同一批：多少订阅、今天更新了什么、谁在下、谁停更了。
 * 数据放这儿，每款只写「怎么摆」—— 加一个指标，十一款一起有。
 */

export function useDashboard() {
    const ani = useAniStore()
    const torrents = useTorrentsStore()
    const config = useConfigStore()

    /* activated 而不是 mounted：总览在 keep-alive 里，切走时不销毁，
       用 onBeforeUnmount 停不掉轮询 */
    onActivated(() => {
        if (!ani.all.length) void ani.reload()
        void config.load()
        // 总览的下载卡片不需要 3 秒级实时性，慢一点省几十次请求
        torrents.startPolling(8000)
    })
    onDeactivated(() => torrents.stopPolling())

    /** 首屏还没拿到订阅时为 true —— 骨架屏看这个，不是看 loading（刷新时不该整页变灰） */
    const firstLoad = computed(() => ani.loading && !ani.all.length)

    /*
     * 「今天更新」直接取 byWeek 的第一组：后端返回 weekList 时已经把今天排在最前，
     * 自己按 Date().getDay() 再算一遍反而会和列表页对不上（时区、以及后端对
     * 「今天还没到更新点」的处理，都在服务端那一份逻辑里）。
     *
     * 禁用的订阅要滤掉：它今天不会下任何东西，摆在「今天更新」里是假消息。
     * 上游 3.2.23 也把首页改成了同一个口径（`1c74ed0`）。
     */
    const todayGroup = computed(() => ani.byWeek[0] ?? {label: '', items: [] as Ani[]})
    const todayLabel = computed(() => todayGroup.value.label)
    const today = computed(() => todayGroup.value.items.filter(a => a.enable))

    /** 最近下载过的，倒序；从未下载的不参与 */
    const recent = computed(() =>
        [...ani.all]
            .filter(a => a.lastDownloadTime)
            .sort((a, b) => (b.lastDownloadTime ?? 0) - (a.lastDownloadTime ?? 0)))

    /*
     * 「疑似停更」不能直接读 ani.procrastinating —— 那不是状态，是开关。
     *
     * 上游 AniUtil 新建订阅时就 .setProcrastinating(true)，ani.js 的默认模板里也写着 true，
     * 编辑框里它是一个叫「摸鱼检测」的勾选框。拿它当「已停更」筛，结果是每一条启用中的
     * 订阅都被报成停更 —— 正在下的也一样，因为它压根不表示这个意思。
     *
     * 后端也没有存「这条停更了」：ItemsUtil.procrastinating() 算完只发一条通知
     * （NotificationStatusEnum.PROCRASTINATING）就完了，不写回订阅。所以只能在前端算。
     *
     * 口径照抄后端那段：
     *  - 全局开关 config.procrastinating 关掉 → 整个功能不存在，一条都不报
     *  - 订阅自己的开关关掉 → 跳过（剧场版默认就是关的，BgmUtil 里设的）
     *  - 阈值取 config.procrastinatingDay（后端默认 14 天）
     *  - 已经下完的不算：还差集数才谈得上「等更新」
     *
     * 后端量的是 RSS 里最新一条的 pubDate，前端拿不到（得一条条 previewAni），
     * 用 lastDownloadTime 代替 —— 没有新集发布就没有新的下载，两者只差一个下载耗时。
     * 从没下过的一条也不报：刚加进来的订阅会立刻被打成停更，那是噪音不是信号。
     */
    const stalled = computed(() => {
        if (config.config.procrastinating === false) return []
        const limit = config.config.procrastinatingDay ?? 14
        const now = Date.now()
        return ani.all
            .filter(a => a.enable
                && a.procrastinating !== false
                && !a.ova
                && !!a.lastDownloadTime
                && !(a.totalEpisodeNumber && (a.currentEpisodeNumber ?? 0) >= a.totalEpisodeNumber)
                && (now - a.lastDownloadTime!) / 864e5 >= limit)
            .sort((x, y) => (x.lastDownloadTime ?? 0) - (y.lastDownloadTime ?? 0))
    })

    const stats = computed(() => [
        {key: 'total', label: '订阅总数', value: ani.total, icon: 'mdi-television-play', to: '/subscriptions'},
        {key: 'enabled', label: '已启用', value: ani.enabledCount, icon: 'mdi-check-circle-outline', to: '/subscriptions'},
        {key: 'downloading', label: '下载中', value: torrents.downloading.length, icon: 'mdi-download', to: '/downloads'},
        {key: 'seeding', label: '做种中', value: torrents.seeding.length, icon: 'mdi-upload', to: '/downloads'},
    ])

    /** 下载器没连上时 torrents.error 有值，几款界面都要据此换文案 */
    const downloadsHint = computed(() => (torrents.error ? '下载器未连接' : '当前没有下载任务'))

    return {ani, torrents, config, firstLoad, todayLabel, today, recent, stalled, stats, downloadsHint}
}

export type Dashboard = ReturnType<typeof useDashboard>
export type {Ani}
