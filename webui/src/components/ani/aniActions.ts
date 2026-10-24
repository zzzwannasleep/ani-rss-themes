import {readonly, ref} from 'vue'
import type {Ani} from '@shared/types'
import type {AniScreen} from '@/composables/useAniScreen'

/**
 * 一条订阅能做的事，全站唯一一份。
 *
 * 之前这份清单是五款界面各抄各的，抄着抄着就散了：
 * Material 的列表行只有「预览 / 编辑 / 删除」三项，GitHub 那款有七项还多一个
 * 「刷新这一条」，玻璃那款六项 —— 同一条订阅，换个皮肤就少几个能力，
 * 而少掉的那几个不点开菜单根本发现不了。
 *
 * 现在加一个动作只改这里，十一款一起有。每款仍然自己决定「怎么摆」：
 * 图标一排、下拉菜单、还是列表项，读 compact 分主次即可。
 */
export interface AniAction {
    key: string
    title: string
    icon: string
    /** true 表示适合放进狭窄的图标行；其余的收进「更多」菜单 */
    compact?: boolean
    /** 危险动作，界面上给红色 */
    danger?: boolean
    run: () => void
}

/**
 * @param s   订阅页的状态
 * @param a   这一条订阅
 */
export function aniActions(s: AniScreen, a: Ani): AniAction[] {
    const list: AniAction[] = []

    /*
     * 「列表」不再挂开关。上游 3.2.52 把「显示视频列表」这个偏好整个删了
     * （`showPlaylist` 从 global.js 里拿掉，AniCoverView 那颗菜单项改成无条件出现）——
     * 视频列表本来就是订阅上最常点的一项，藏起来之后大多数人再也想不起来它存在。
     */
    list.push(
        {key: 'playlist', title: '列表', icon: 'mdi-play-circle-outline', compact: true,
            run: () => s.on.playlist(a)},
        {key: 'edit', title: '编辑', icon: 'mdi-pencil-outline', compact: true, run: () => s.on.edit(a)},
        {key: 'preview', title: '预览匹配结果', icon: 'mdi-eye-outline', compact: true, run: () => s.on.preview(a)},
        /* 刷新单条：原来只有 GitHub 那款有。RSS 刚更新时不想等下一轮轮询，
           这是最常按的一个，没道理只在一款界面里存在 */
        {key: 'refresh', title: '刷新这一条', icon: 'mdi-refresh', run: () => void s.ani.refreshOne(a)},
        /*
         * 刮削 / 强制刮削：上游 3.2.40（62a27b7）把这两项加到了封面菜单上 ——
         * 以前只能进「编辑订阅 → 其他」里点，为了刮一部番要开一次编辑框。
         * 放在「更多」菜单里而不是图标行：它俩不是高频动作，挤进图标行会把「编辑」顶出去。
         */
        {key: 'scrape', title: '刮削', icon: 'mdi-image-text', run: () => void s.ani.scrapeOne(a, false)},
        {
            key: 'scrapeF',
            title: '强制刮削',
            icon: 'mdi-image-sync-outline',
            run: () => void s.ani.scrapeOne(a, true),
        },
        /* 单条启停：原来只能进多选模式再批量操作，为了停一条番要点四下 */
        {
            key: 'enable',
            title: a.enable ? '停用' : '启用',
            icon: a.enable ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline',
            run: () => void s.ani.setEnabled([a.id ?? ''], !a.enable),
        },
        {key: 'cover', title: '更换封面', icon: 'mdi-image-edit-outline', run: () => s.on.cover(a)},
        {key: 'rate', title: '评分', icon: 'mdi-star-outline', run: () => s.on.rate(a)},
        {key: 'del', title: '删除', icon: 'mdi-delete-outline', danger: true, run: () => s.on.del(a)},
    )
    return list
}

/**
 * 图标行用的那几个。
 *
 * max 是给窄屏留的口子：卡片只有 150 来点宽，图标按钮在手机上要给到 40px 才点得着，
 * 四颗（三个常用 + 「更多」）就是 172px，装不下 —— 最后那颗会被顶出卡片外。
 * 超出 max 的不是丢掉，是退回「更多」菜单里（见 overflowOf），一个动作都不会消失。
 *
 * ⚠️ 摆不下的时候只能改这个数，不要用 CSS 把多出来的按钮 display: none。
 * 菜单里放哪些是按这个数算出来的，CSS 藏掉的那颗不会自动补进菜单 ——
 * 它是从界面上彻底消失，而不是换个地方。「编辑」在手机上整个不见就是这么来的：
 * vue 那款拿 nth-child 藏了前两颗，海报卡拿 :not(:last-child) 藏了一整排，
 * 两处都只藏了按钮，菜单还按「一颗没藏」在算。
 */
export const compactOf = (list: AniAction[], max = Infinity) =>
    list.filter(x => x.compact).slice(0, max)

/** 「更多」菜单用的那几个：本来就不常用的，加上被 max 挤下来的 */
export const overflowOf = (list: AniAction[], max = Infinity) => {
    const kept = new Set(compactOf(list, max).map(x => x.key))
    return list.filter(x => !x.compact || !kept.has(x.key))
}

/**
 * 触屏（没有悬停）。
 *
 * 只看 useDisplay().xs 是不够的：平板和触屏笔记本同样召不出 hover，
 * 图标行在它们上面也必须常驻、也要 40px 才点得着。
 * 挂一个模块级的监听给全站共用，不是每个卡片各订一份 —— 一页上有上百张卡。
 */
const coarse = ref(false)
if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(hover: none)')
    coarse.value = mq.matches
    mq.addEventListener('change', e => (coarse.value = e.matches))
}
export const isTouch = readonly(coarse)
