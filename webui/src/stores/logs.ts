import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {clearableText} from '@/composables/clearableText'
import * as api from '@shared/api'
import {normalizeLog} from '@shared/logs'
import type {Log} from '@shared/types'
import {useUiStore} from './ui'

export const useLogsStore = defineStore('logs', () => {
    const items = ref<Log[]>([])
    const loading = ref(false)
    /* 过滤框带 clearable，清空时写回 null —— 见 clearableText */
    const keyword = clearableText()
    /* 级别和类名都是多选：上游级别是 checkbox 组、类名是 multiple select。
       单选筛不出「只看 WARN 和 ERROR」这种最常用的组合。空数组 = 不筛 */
    const level = ref<string[]>([])
    const loggerNames = ref<string[]>([])
    let timer: number | null = null

    async function reload() {
        loading.value = true
        try {
            /* 进门就把两种版本的形状归一（见 shared/logs.ts）：
               下游的过滤和渲染只认「ts + 纯正文」，不用各自判一遍后端是哪一版 */
            items.value = (await api.logs()).map(normalizeLog)
        } finally {
            loading.value = false
        }
    }

    function startPolling(ms = 5000) {
        stopPolling()
        void reload()
        timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void reload()
        }, ms)
    }

    function stopPolling() {
        if (timer !== null) {
            clearInterval(timer)
            timer = null
        }
    }

    async function clear() {
        await api.clearLogs()
        useUiStore().success('日志已清空')
        await reload()
    }

    const uniq = (pick: (l: Log) => string | undefined) =>
        [...new Set(items.value.map(pick).filter(Boolean))].sort() as string[]

    const levels = computed(() => uniq(l => l.level))
    /** 类名候选：日志里出现过的才列出来，列全部包名没意义 */
    const allLoggers = computed(() => uniq(l => l.loggerName))

    const filtered = computed(() => {
        const k = keyword.value.trim().toLowerCase()
        const lv = level.value, ln = loggerNames.value
        return items.value.filter(l =>
            (!lv.length || (l.level ? lv.includes(l.level) : false)) &&
            (!ln.length || (l.loggerName ? ln.includes(l.loggerName) : false)) &&
            (!k || (l.message || '').toLowerCase().includes(k)),
        )
    })

    return {
        items, loading, keyword, level, levels, loggerNames, allLoggers, filtered,
        reload, startPolling, stopPolling, clear,
    }
})
