import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {clearableText} from '@/composables/clearableText'
import * as api from '@shared/api'
import type {Ani, ListAni} from '@shared/types'
import {useUiStore} from './ui'

/**
 * 一条订阅是否命中关键词。
 * 后端给了 pinyin / pinyinInitials 两个字段，所以中文番剧名可以用拼音或首字母搜
 * （「无职转生」→ wuzhizhuansheng / wzzs）——上游就是这么用的，别只比对标题。
 */
function matches(a: Ani, k: string): boolean {
    return [a.title, a.jpTitle, a.subgroup, a.themoviedbName, a.bgmUrl, a.pinyin, a.pinyinInitials]
        .some(v => v?.toLowerCase().includes(k))
}

/** 订阅列表。全站唯一数据源，各弹窗改完调 reload() */
export const useAniStore = defineStore('ani', () => {
    const raw = ref<ListAni>({})
    const loading = ref(false)
    /* 十一款顶栏的搜索框都带 clearable，清空时写回的是 null 而不是 ''
       —— 见 clearableText 里那段。兜在这一处，十一款一起管。 */
    const keyword = clearableText()
    /*
     * 上游批量管理页有「全部 / 已启用 / 未启用」和季度两个下拉，主列表顶栏也有启用状态那个。
     * 我们之前只有关键词 —— 订阅上百条以后，「哪些被我停用了」只能一条条翻。
     * 空值 = 不筛。
     */
    const status = ref<'all' | 'on' | 'off'>('all')
    /** 季度，形如 2026-07；候选来自后端的 releaseDateList，之前一直没人用 */
    const season = ref('')
    /** 选中的订阅 id，批量操作用 */
    const selected = ref<Set<string>>(new Set())

    async function reload() {
        loading.value = true
        try {
            raw.value = await api.listAni()
        } finally {
            loading.value = false
        }
    }

    /** 拍平成一维，网格/列表视图用 */
    const all = computed<Ani[]>(() => (raw.value.weekList || []).flatMap(w => w.items || []))

    /* 三个筛选条件合成一个判定，列表视图和按星期分组共用 —— 各写各的迟早会漂。
       季度只比到年月：后端给的候选就是 yyyy-MM，订阅上存的是完整日期 */
    const pass = computed(() => {
        const k = keyword.value.trim().toLowerCase()
        const st = status.value, se = season.value
        return (a: Ani) =>
            (!k || matches(a, k)) &&
            (st === 'all' || (st === 'on' ? !!a.enable : !a.enable)) &&
            (!se || (a.releaseDate || '').replace(/-\d{2}$/, '') === se)
    })

    const filtered = computed<Ani[]>(() => all.value.filter(pass.value))

    /** 按星期分组，保留后端给的顺序（后端已按今天排在最前处理过） */
    const byWeek = computed(() => {
        return (raw.value.weekList || [])
            .map(w => ({
                label: w.weekLabel || '',
                items: (w.items || []).filter(pass.value),
            }))
            .filter(w => w.items.length)
    })

    /** 季度候选：后端算好的，直接用 */
    const seasons = computed<string[]>(() => raw.value.releaseDateList || [])

    /** 有没有在筛 —— 界面上要据此给「清除筛选」和空状态换文案 */
    const filtering = computed(() => !!keyword.value.trim() || status.value !== 'all' || !!season.value)

    function clearFilters() {
        keyword.value = ''
        status.value = 'all'
        season.value = ''
    }

    const total = computed(() => raw.value.total ?? all.value.length)
    const enabledCount = computed(() => all.value.filter(a => a.enable).length)

    /* ── 选择 ── */
    const toggleSelect = (id: string) => {
        const s = new Set(selected.value)
        s.has(id) ? s.delete(id) : s.add(id)
        selected.value = s
    }
    const clearSelection = () => (selected.value = new Set())
    const selectAll = () => (selected.value = new Set(filtered.value.map(a => a.id!).filter(Boolean)))

    /* ── 写操作，全部走完自动 reload ── */
    async function withReload<T>(fn: () => Promise<T>, okMsg?: string): Promise<T> {
        const r = await fn()
        if (okMsg) useUiStore().success(okMsg)
        await reload()
        return r
    }

    const add = (ani: Ani) => withReload(() => api.addAni(ani), '添加成功')
    /* okMsg 可覆盖：预览面板改「不下载」也走这里，那里说「已禁止下载 3 集」比「已保存」有用，
       各弹各的会连着冒两个提示 */
    const update = (ani: Ani, move = false, okMsg = '已保存') =>
        withReload(() => api.setAni(move, ani), okMsg)
    const remove = (ids: string[], deleteFiles: boolean) =>
        withReload(() => api.deleteAni(deleteFiles, ids), `已删除 ${ids.length} 项`)
    const refreshOne = (ani: Ani) => withReload(() => api.refreshAni(ani), '已刷新')
    const refreshAll = () => withReload(() => api.refreshAll(), '已触发全部刷新')
    /* 单条刮削：封面菜单上那两颗「刮削 / 强制刮削」走这里，和批量刮削共用一套提示 */
    const scrapeOne = (ani: Ani, force: boolean) =>
        withReload(() => api.scrape(force, ani), force ? '已触发强制刮削' : '已触发刮削')
    const setEnabled = (ids: string[], value: boolean) =>
        withReload(() => api.batchEnable(value, ids), value ? '已启用' : '已禁用')
    const batchScrape = (ids: string[], force: boolean) =>
        withReload(() => api.batchScrape(force, ids), '已触发刮削')
    const updateEpisodes = (ids: string[], force: boolean) =>
        withReload(() => api.updateTotalEpisodeNumber(force, ids), '已更新总集数')

    return {
        raw, loading, keyword, status, season, selected,
        all, filtered, byWeek, total, enabledCount, seasons, filtering,
        reload, toggleSelect, clearSelection, selectAll, clearFilters,
        add, update, remove, refreshOne, refreshAll, setEnabled, batchScrape, updateEpisodes, scrapeOne,
    }
})
