import {computed, onMounted, ref} from 'vue'
import type {Ani} from '@shared/types'
import {useAniStore} from '@/stores/ani'
import {usePrefsStore} from '@/stores/prefs'
import {saveBlob} from './saveBlob'

/**
 * 订阅页的「非视觉」部分：弹窗开关、多选状态、批量动作。
 *
 * 十一款界面长得完全不一样，但这一层一模一样 —— 抽出来之后每款只剩「怎么摆」，
 * 加一个弹窗、改一次批量逻辑，十一款同时生效。
 */
export function useAniScreen() {
    const ani = useAniStore()
    const prefs = usePrefsStore()

    /* 各弹窗的目标对象。用 null 表示关闭，避免再多一个 boolean 状态 */
    const editing = ref<Ani | null>(null)
    const adding = ref(false)
    const deleting = ref<Ani[] | null>(null)
    const playlistOf = ref<Ani | null>(null)
    const coverOf = ref<Ani | null>(null)
    const ratingOf = ref<Ani | null>(null)
    const previewOf = ref<Ani | null>(null)
    const importing = ref(false)
    const collecting = ref(false)

    const selectMode = ref(false)

    onMounted(() => {
        if (!ani.all.length) void ani.reload()
    })

    const selectedIds = computed(() => [...ani.selected])
    const selectedAnis = computed(() => ani.all.filter(a => a.id && ani.selected.has(a.id)))

    /** 按星期分组只在「显示星期」开着且没搜索时才有意义 —— 搜索结果再按星期切碎反而难找 */
    const grouped = computed(() => prefs.showWeek && !ani.keyword.trim())

    function exitSelect() {
        selectMode.value = false
        ani.clearSelection()
    }

    function toggleSelectMode() {
        selectMode.value ? exitSelect() : (selectMode.value = true)
    }

    async function batch(fn: () => Promise<unknown>) {
        await fn()
        exitSelect()
    }

    /**
     * 导出选中的订阅为 ani.v2.json —— 和「导入订阅」是一对，上游管理面板里就有这一项。
     * 直接把订阅对象序列化下来，不经过后端：导入那边收的也是同一个数组。
     */
    function exportSelected() {
        const list = selectedAnis.value
        if (!list.length) return
        // 原来点完就同步 revoke，部分浏览器存出来是 0 字节（见 saveBlob）
        saveBlob(new Blob([JSON.stringify(list)], {type: 'application/json'}), 'ani.v2.json')
        exitSelect()
    }

    /** 卡片/行统一往这里丢事件，省得每款界面各写一遍 v-on */
    const on = {
        edit: (a: Ani) => (editing.value = a),
        playlist: (a: Ani) => (playlistOf.value = a),
        cover: (a: Ani) => (coverOf.value = a),
        rate: (a: Ani) => (ratingOf.value = a),
        preview: (a: Ani) => (previewOf.value = a),
        del: (a: Ani) => (deleting.value = [a]),
        toggle: (a: Ani) => a.id && ani.toggleSelect(a.id),
        /**
         * 点封面：多选模式下照旧是选中 / 取消，否则按页面设置里的「点击封面」走
         * （编辑订阅 / 视频列表 / 换封面）。十一款的封面长在不同地方，
         * 但点下去都调这一个，行为就只在这里定义一次。
         */
        coverClick: (a: Ani): void => {
            if (selectMode.value) on.toggle(a)
            else on[prefs.coverClickAction](a)
        },
    }

    return {
        ani, prefs,
        editing, adding, deleting, playlistOf, coverOf, ratingOf, previewOf, importing, collecting,
        selectMode, selectedIds, selectedAnis, grouped,
        exitSelect, toggleSelectMode, batch, exportSelected, on,
    }
}

export type AniScreen = ReturnType<typeof useAniScreen>
