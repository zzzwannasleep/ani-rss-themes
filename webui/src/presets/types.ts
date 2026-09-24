import type {PresetId} from './ids'

/** 一款界面的自我介绍。构建期只会打包中选的那一款。 */
export interface PresetMeta {
    id: PresetId
    /** 界面名，显示在侧栏和关于页 */
    name: string
    /** 一句话说清它是什么路子 */
    tagline: string
    /** 默认皮肤（用户仍可在设置里换成另外八款） */
    theme: string
    /** 是否带总览页。不带的界面进来直接是订阅列表 */
    dashboard: boolean
    /**
     * 订阅页首次打开时用哪种视图（用户切过之后按用户的来）。
     * 缺省是 'grid' —— 大多数界面的订阅页就是为海报墙设计的；
     * 只有把「一行一条、点表头排序」当主视图的界面才需要改这一项。
     */
    defaultView?: 'grid' | 'list'
    /**
     * 订阅页点封面默认做什么（用户在页面设置里改过之后按用户的来）。
     * 缺省跟上游一样是 'cover'（换封面）；原本就把「点封面」当「打开」用的界面
     * （Finder 的图标、MoviePilot 的海报）给 'edit'，升级之后手感不变。
     */
    coverClick?: CoverClickAction
    /** 订阅页压根没有封面（github 那款是纯文字清单）：页面设置里不出「点击封面」这一项 */
    covers?: false
}

/** 点封面的三种动作，取值与上游 cover-click-action 一致 */
export type CoverClickAction = 'edit' | 'playlist' | 'cover'
export const COVER_CLICK_ACTIONS: readonly CoverClickAction[] = ['edit', 'playlist', 'cover']
