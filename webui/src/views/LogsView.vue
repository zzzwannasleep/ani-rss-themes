<script setup lang="ts">
import {computed, nextTick, onActivated, onDeactivated, ref, watch} from 'vue'
import {downloadLogsUrl} from '@shared/api'
import {logTime, logTimeFull} from '@shared/logs'
import {useLogsStore} from '@/stores/logs'

const logs = useLogsStore()
const confirmClear = ref(false)
/** 新日志追加在末尾，默认贴底；用户往上翻查旧日志时不要把人拽回底部 */
const follow = ref(true)
const box = ref<HTMLElement | null>(null)

/** 贴回底部。跟随关掉时（用户自己往上翻了）什么都不做 */
async function stickToBottom() {
  if (!follow.value) return
  await nextTick()
  const el = box.value
  if (el) el.scrollTop = el.scrollHeight
}

/*
 * 切走再切回来也要贴底 —— 这是「日志一直停在最顶上」的真正来源。
 *
 * 这一页在 keep-alive 里（见各款 Shell）。切走时整块 DOM 被搬进隐藏容器，
 * 切回来再搬回文档 —— 浏览器在这一搬一搬之间把滚动容器的 scrollTop 抹成 0。
 * 组件本身没有重新挂载，reload() 拉回来的又常常是同样条数的日志，
 * 于是下面那个 watch 一次都不响，人回到这一页看到的就是**第一行**。
 * 量出来是「距底 8385，停在 0」，十一款都一样。
 *
 * follow 要自己存一份带过去：那一下 scrollTop 归零是会派 scroll 事件的，
 * onScroll 收到就把 follow 判成 false（离底 8385，远大于 40）——
 * 不存这一份的话，回到这一页永远是「已暂停跟随」，贴底那一步自己把自己拦掉。
 */
let wasFollowing = true
onActivated(() => {
  logs.startPolling(5000)
  follow.value = wasFollowing
  void stickToBottom()
})
onDeactivated(() => {
  wasFollowing = follow.value
  logs.stopPolling()
})

/*
 * 盯整个数组而不是 filtered.length。
 *
 * 后端日志是有上限的：满了以后每来一条就挤掉最老的一条，**条数一直不变**。
 * 只盯 length 的话，这种最常见的情形一次都不会触发，新日志进来了却不往下走。
 * 行高也会变（一段堆栈顶好几行），条数没变高度却变了，同样漏。
 * filtered 每轮轮询都是一个新数组，盯它就是「只要内容动过就贴一次」——
 * 贴一次的成本是一次赋值，比漏掉划算。
 */
watch(() => logs.filtered, stickToBottom)

/* 从「已暂停跟随」按回「跟随最新」时立刻追上去，别等下一轮轮询 */
watch(follow, v => v && void stickToBottom())

function onScroll() {
  const el = box.value
  if (!el) return
  follow.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

/** 类名太长，下拉里只显示最后一段（org.x.y.AniService → AniService） */
const short = (n: string) => n.slice(n.lastIndexOf('.') + 1)
const loggerItems = computed(() => logs.allLoggers.map(n => ({title: short(n), subtitle: n, value: n})))

function levelColor(l?: string) {
  switch ((l || '').toUpperCase()) {
    case 'ERROR':
      return 'error'
    case 'WARN':
      return 'warning'
    case 'INFO':
      return 'info'
    default:
      return undefined
  }
}
</script>

<template>
  <div class="pa-4 d-flex flex-column logs-page">
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <v-text-field v-model="logs.keyword" class="flex-grow-1 log-search" clearable density="compact" hide-details
                    placeholder="过滤日志内容" prepend-inner-icon="mdi-magnify" style="max-width: 320px"/>
      <!-- 级别和类名都能多选：查一次问题通常要「WARN + ERROR」一起看，
           或者只盯住某个类。单选筛不出这两种最常用的组合。 -->
      <v-select v-model="logs.level" :items="logs.levels" chips closable-chips density="compact" hide-details
                multiple placeholder="全部级别" style="min-width: 128px; max-width: 200px"/>
      <v-select v-model="logs.loggerNames" :items="loggerItems" density="compact" hide-details
                item-props multiple placeholder="全部类名" style="min-width: 128px; max-width: 220px">
        <template #selection="{item, index}">
          <span v-if="index === 0" class="text-caption">{{ short(item.value) }}</span>
          <span v-else-if="index === 1" class="text-caption text-medium-emphasis ml-1">
            +{{ logs.loggerNames.length - 1 }}
          </span>
        </template>
      </v-select>
      <v-chip variant="tonal">{{ logs.filtered.length }} 条</v-chip>
      <v-chip :color="follow ? 'primary' : undefined" size="small" variant="tonal"
              @click="follow = !follow">
        {{ follow ? '跟随最新' : '已暂停跟随' }}
      </v-chip>
      <v-spacer/>
      <v-btn :loading="logs.loading" icon="mdi-refresh" title="立刻刷新" variant="text" @click="logs.reload()"/>
      <v-btn :href="downloadLogsUrl()" prepend-icon="mdi-download" target="_blank" variant="tonal">下载</v-btn>
      <v-btn color="error" prepend-icon="mdi-delete-sweep-outline" variant="tonal" @click="confirmClear = true">
        清空
      </v-btn>
    </div>

    <v-card class="flex-grow-1 overflow-hidden" variant="flat">
      <div ref="box" class="log-box" @scroll="onScroll">
        <div v-for="(l, i) in logs.filtered" :key="i" class="log-line">
          <!-- 时间自己占一列。3.2.28 以前它藏在 message 里跟着正文一起显示，
               新版本拆出来成了 ts —— 不单独摆一列的话，升级完时间就整个没了。
               认不出时间的行留空，那一列宽度是定的，正文左边缘不会跟着错位。 -->
          <span class="log-time flex-shrink-0" :title="logTimeFull(l.ts)">{{ logTime(l.ts) }}</span>
          <v-chip :color="levelColor(l.level)" class="mr-2 flex-shrink-0" label size="x-small" variant="tonal">
            {{ l.level }}
          </v-chip>
          <span v-if="l.loggerName" class="log-logger flex-shrink-0" :title="l.loggerName">
            {{ short(l.loggerName) }}
          </span>
          <span class="log-msg">{{ l.message }}</span>
        </div>
        <div v-if="!logs.filtered.length" class="pa-6 text-center text-medium-emphasis">暂无日志</div>
      </div>
    </v-card>

    <v-dialog v-model="confirmClear" max-width="380">
      <v-card>
        <v-card-title>清空日志</v-card-title>
        <v-card-text>日志将被永久清除，无法恢复。</v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="confirmClear = false">取消</v-btn>
          <v-btn color="error" variant="flat" @click="logs.clear(); confirmClear = false">清空</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/*
 * 让日志区域自己占满视口剩余高度，内部滚动，页面本身不滚。
 * 高度按 Vuetify 实际算出来的布局边距扣，别写死 64 —— 各款顶栏不一样高。
 * 外壳自己额外占掉的（悬浮岛、底部导航垫片）写在 --ani-page-*，Vuetify 算不到。
 * dvh 是为了地址栏收起时不把底部顶出屏幕。
 */
.logs-page {
    height: calc(100vh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px)
    - var(--ani-page-top, 0px) - var(--ani-page-bottom, 0px));
    height: calc(100dvh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px)
    - var(--ani-page-top, 0px) - var(--ani-page-bottom, 0px));
}

/* 同 SettingsView：能滚的那一段必须允许缩到 0，否则日志一多就把上面的筛选栏压扁 */
.logs-page > .v-card {
    flex: 1 1 0;
    min-height: 0;
}

.logs-page > :not(.v-card) {
    flex: 0 0 auto;
}

/*
 * 窄屏上筛选栏那一行让搜索框独占一整行。
 *
 * 不让的话四个控件挤一行：搜索框只剩 71px（占位文字要 97），
 * 两个下拉各 82px（「全部级别」要 65，扣掉箭头只剩 40）——
 * 三个控件里的字全被截断，看着像三个坏掉的框。
 * 两个下拉给了 min-width：宁可换行，也不要挤到看不出是什么。
 */
@media (max-width: 599.98px) {
    .logs-page .log-search {
        flex: 1 1 100%;
        max-width: none;
    }
}

.log-box {
    height: 100%;
    overflow-y: auto;
    padding: 8px 12px;
    /*
     * 等宽字体走主题变量，别在这儿写死。
     *
     * base.css 里本来就有一条 `html[data-ani-theme] .log-box { font-family: var(--ani-font-mono) }`，
     * 但这条是 scoped 的（带 data-v 属性，权重 0,2,0），压过那边的 0,1,1 ——
     * 结果是十一款皮肤给的 fontMono 一个都没生效，日志框永远是浏览器默认的等宽字。
     * 直接在这里读变量最省事，缺省值还是原来那串。
     */
    font-family: var(--ani-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: .8125rem;
    line-height: 1.6;
}

.log-line {
    display: flex;
    align-items: flex-start;
    padding: 1px 0;
}

/* 时间和类名一个待遇：压暗当次要信息，定宽（HH:mm:ss 正好 8ch）让各行对齐。
   老后端上认不出时间的行这一列是空的，宽度照占，正文不会跟着往左窜 */
.log-time {
    width: 8ch;
    margin-right: 8px;
    opacity: .55;
}

/* 类名放在级别和正文之间，压暗当次要信息；定宽让多行的正文左边缘对齐 */
.log-logger {
    width: 13ch;
    margin-right: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: .55;
}

/* 长路径和堆栈要能换行，否则整行横向溢出 */
.log-msg {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
