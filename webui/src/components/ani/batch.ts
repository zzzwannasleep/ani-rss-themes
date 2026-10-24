/**
 * 「确认订阅信息」队列的公共类型与拼装。
 *
 * 单独一个模块是为了避开循环引用：番剧列表（SourceBrowserDialog）要把挑好的东西
 * 交出去，而队列弹窗（AniBatchDialog）里摆的又是订阅编辑框（AniEditDialog），
 * 而编辑框里又能再点开番剧列表。类型和纯函数放这儿，三个组件都只依赖它。
 */
import type {Ani, RssToAniDTO, StandbyRss} from '@shared/types'

/** 从番剧列表挑回来的一组：一个字幕组 + 它上面选好的匹配规则 */
export interface PickedGroup {
    /** 「同一部番」的判定依据：Mikan 是番剧页地址，另两家是番剧 id */
    animeKey: string
    animeTitle?: string
    url: string
    bgmUrl?: string
    subgroup: string
    match: string[]
}

/** 一条待确认的订阅：要么已经解析好了，要么给一份请求让后端解析 */
export interface BatchRequest {
    /** 标签上先显示什么。解析出来后优先显示番剧标题 */
    label?: string
    /** 已经解析好的订阅（Bangumi 搜索那条路直接给的就是这个），给了就不再请求 rssToAni */
    ani?: Ani
    /** 还没解析的：交给 api/rssToAni */
    dto?: RssToAniDTO
    /**
     * 挑好的匹配规则。rssToAni 的 DTO 里没有 match 这个字段（后端不认），
     * 所以规则是客户端贴回返回值上的 —— 不贴的话挑了「简中」照样会把繁中一起下。
     */
    match?: string[]
    /** 同一部番的其它字幕组，作为备用 RSS 一起提交 */
    standby?: StandbyRss[]
}

/**
 * 把篮子里的选择按番剧归拢成队列条目。
 *
 * 同一部番勾了多个字幕组时，第一个当主 RSS、其余进备用列表 —— 和上游一样
 * （上游是从 rss 地址里抠 bangumiId 来分组，这里挑的时候就知道是哪一部了）。
 */
export function groupPicked(picked: PickedGroup[]): BatchRequest[] {
    const byAnime = new Map<string, PickedGroup[]>()
    for (const p of picked) {
        const list = byAnime.get(p.animeKey) ?? []
        list.push(p)
        byAnime.set(p.animeKey, list)
    }
    return [...byAnime.values()].map(list => {
        const [main, ...rest] = list
        return {
            label: main.subgroup || main.animeTitle,
            dto: {url: main.url, bgmUrl: main.bgmUrl, subgroup: main.subgroup, enable: true},
            match: main.match,
            standby: rest.map(g => ({label: g.subgroup, url: g.url, offset: 0})),
        }
    })
}
