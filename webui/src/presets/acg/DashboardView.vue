<script setup lang="ts">
import {nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {toApiFile} from '@shared/http'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * 「今天更新了什么」——追番的人一天里唯一会反复看的东西。
 *
 * 所以今天那一组占整个首屏，横着铺开一排大海报；统计数字缩成一行小药丸放在底下。
 * 别款的总览多半是「先看数字再看内容」，这款反过来：先看图，数字是配菜。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')

/* ── 海报轨道的左右翻页 ──
 *
 * 轨道自己的滚动条被藏了（一条横杠横在首屏正中间，比它引导的内容还显眼）。
 * 藏了就得把它提供的两件事补回来：知道还有没有、以及怎么往下走。
 * 前者靠两侧的箭头按钮在到头时消失，后者靠滚轮和点按钮。
 */
const rail = ref<HTMLElement>()
const canLeft = ref(false)
const canRight = ref(false)

function sync() {
    const el = rail.value
    if (!el) return
    // 亚像素：scrollLeft 是小数，到底时它可能是 max - 0.5，留 1px 容差
    canLeft.value = el.scrollLeft > 1
    canRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
}

/**
 * 翻页：按**整数张卡**翻，一屏能放几张就翻几张，留一张重叠当上下文。
 *
 * 算绝对落点而不是 scrollBy 相对量 —— 用滚轮随手滑过之后 scrollLeft 是个零头，
 * 相对翻页会把这个零头一路带下去，此后每一屏都卡在半张海报上。
 * 卡片左边那 24px 内边距也是这么保住的：第 k 张卡停在 k * 步距 时，它离左边正好还是 24px。
 */
function page(dir: 1 | -1) {
    const el = rail.value
    if (!el) return
    const first = el.querySelector<HTMLElement>('.rail-item')
    if (!first) return
    // 步距 = 卡宽 + 间距。宽度是 clamp() 出来的，只能量不能算
    const next = first.nextElementSibling as HTMLElement | null
    const pitch = next ? next.offsetLeft - first.offsetLeft : first.offsetWidth + 16
    const step = Math.max(1, Math.floor(el.clientWidth / pitch) - 1)
    el.scrollTo({left: (Math.round(el.scrollLeft / pitch) + dir * step) * pitch, behavior: 'smooth'})
}

/**
 * 竖着滚滚轮 → 轨道横着走。
 *
 * 两处必须放行，否则鼠标停在海报上时整页就滚不动了：
 * 触控板本来就在横着滑（deltaX 更大），以及轨道已经顶到这一头。
 */
function onWheel(e: WheelEvent) {
    const el = rail.value
    if (!el || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    const max = el.scrollWidth - el.clientWidth
    if (max <= 0) return
    if (e.deltaY < 0 ? el.scrollLeft <= 0 : el.scrollLeft >= max - 1) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
}

/* 卡片是定宽的，轨道宽度只随「今天几部」变，图加载完不会再变 —— 盯着数量就够 */
watch(() => d.today.value.length, () => nextTick(sync))
onMounted(() => {
    sync()
    window.addEventListener('resize', sync)
})
onBeforeUnmount(() => window.removeEventListener('resize', sync))
</script>

<template>
  <div>
    <!-- ── 今天 ── -->
    <div class="d-flex align-center ga-3 pa-6">
      <h1 class="hero-title">{{ d.todayLabel.value || '今天' }}</h1>
      <v-chip v-if="d.today.value.length" size="small" variant="flat">{{ d.today.value.length }} 部</v-chip>
      <v-spacer/>
      <v-btn :loading="d.ani.loading" icon="mdi-refresh" size="small" title="刷新全部"
             variant="text" @click="d.ani.refreshAll()"/>
    </div>

    <!-- 横向轨道：一屏放不下就左右滑，不换行 —— 换行会把「今天」这一组切成好几层，
         视线要来回扫，就没有「今天就这些」的一眼感 -->
    <div class="rail-wrap mb-8">
      <div ref="rail" class="rail pl-6 pb-6 pt-6" @scroll.passive="sync" @wheel="onWheel">
        <template v-if="d.firstLoad.value">
          <div v-for="i in 6" :key="i" class="rail-item">
            <div class="sk" style="aspect-ratio: .7; width: 100%"/>
          </div>
        </template>

        <template v-else-if="d.today.value.length">
          <div v-for="(a, i) in d.today.value" :key="a.id" :style="{'--i': i}"
               class="rail-item ani-in" @click="router.push('/subscriptions')">
            <!-- ani-lift 挂在 .tile 上，不能挂外面那层 rail-item：
                 悬停抬起的那道阴影是画在挂 ani-lift 的元素身上的，而 rail-item 只是
                 排版用的格子、没有圆角 —— 阴影就按方角铺在圆角海报四周，
                 四个角各露出一块方的。挂在真正有圆角的 .tile 上，阴影才跟着圆角走。 -->
            <div class="tile ani-lift">
              <v-img :src="cover(a.cover)" aspect-ratio="0.7" class="tile-art" cover>
                <template #placeholder>
                  <div class="fill-height d-flex align-center justify-center bg-surface-variant">
                    <v-icon icon="mdi-image-outline"/>
                  </div>
                </template>
              </v-img>
              <div class="tile-veil">
                <div class="tile-title">{{ a.title }}</div>
                <div class="tile-sub">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</div>
              </div>
            </div>
          </div>
        </template>

        <v-empty-state v-else class="w-100" icon="mdi-sleep" text="今天没有番要更新，去看看别的吧" title="今天休息"/>
      </div>

      <v-btn :disabled="!canLeft" aria-label="往左翻" class="rail-nav rail-nav--l" density="comfortable"
             icon="mdi-chevron-left" variant="text" @click="page(-1)"/>
      <v-btn :disabled="!canRight" aria-label="往右翻" class="rail-nav rail-nav--r" density="comfortable"
             icon="mdi-chevron-right" variant="text" @click="page(1)"/>
    </div>

    <!-- ── 数字：一行药丸，不占版面 ── -->
    <div class="pill-row mb-8 ml-6">
      <v-chip v-for="(s, i) in d.stats.value" :key="s.key" :prepend-icon="s.icon" :style="{'--i': i}"
              :to="s.to" class="ani-in stat-pill" size="large" variant="flat">
        <strong class="mr-1">{{ s.value }}</strong>{{ s.label }}
      </v-chip>
    </div>

    <div class="two-col ml-6">
      <!-- ── 下载中 ── -->
      <section>
        <h2 class="sec-title">下载中</h2>
        <div v-if="d.torrents.downloading.length" class="dl-list">
          <div v-for="(t, i) in d.torrents.downloading.slice(0, 6)" :key="t.hash" :style="{'--i': i}"
               class="dl-row ani-in">
            <div class="dl-name">{{ t.name }}</div>
            <div class="d-flex align-center ga-2 mt-1">
              <v-progress-linear :model-value="t.progress" color="primary" height="6" rounded/>
              <span class="dl-pct">{{ formatPercent(t.progress) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="empty-line">{{ d.downloadsHint.value }}</p>
      </section>

      <!-- ── 停更提醒 ── -->
      <section>
        <h2 class="sec-title">
          疑似停更
          <v-chip v-if="d.stalled.value.length" class="ml-2" color="warning" size="x-small" variant="flat">
            {{ d.stalled.value.length }}
          </v-chip>
        </h2>
        <div v-if="d.stalled.value.length" class="dl-list">
          <div v-for="(a, i) in d.stalled.value.slice(0, 6)" :key="a.id" :style="{'--i': i}" class="dl-row ani-in">
            <div class="dl-name">{{ a.title }}</div>
            <div class="dl-pct mt-1">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
          </div>
        </div>
        <p v-else class="empty-line">字幕组都很勤快。</p>
      </section>
    </div>

    <!-- 首屏还在转的时候，下面这堆也给个占位，免得整页只有一排灰海报 -->
    <div v-if="d.firstLoad.value" class="dl-list mt-4">
      <AniSkeleton :count="3" shape="row"/>
    </div>
  </div>
</template>

<style scoped>
.hero-title {
    font-family: var(--ani-font-title, inherit);
    font-size: clamp(1.5rem, 4vw, 2.1rem);
    font-weight: 700;
    line-height: 1.1;
    white-space: nowrap;
}

/* 翻页按钮要贴在轨道两侧，得有个定位参照 */
.rail-wrap {
    position: relative;
}

/*
 * 横向轨道。
 *
 * ── 这里没有 scroll-snap，是删掉的，别再加回来 ──
 *
 * 原先是 `scroll-snap-type: x mandatory`，图的是「每次滑动都停在整张海报上」。
 * 但吸附和滚轮是打架的：滚轮一次推进得小（触控板、精密滚轮一次才几像素），
 * 刚挪出去就被吸回原位，整条轨道纹丝不动 —— 实测 12px 的滚轮事件推动量为 0。
 * 换成 proximity 也一样，它的吸附阈值照样盖得住这个量级。
 *
 * 「停在整张海报上」改由翻页按钮自己算落点保证（见 page()），比吸附还准；
 * scroll-padding-left 那条补丁是配合吸附用的，一并没了。
 */
.rail {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    /* 抬起动作会超出轨道上沿，不留出空间的话阴影和位移都会被裁掉 */
    padding: 10px 4px 16px;
    /*
     * 左边不抵消：这条轨道要从左边 24px 起、右边一直通到屏幕边，
     * 左内边距是模板上的 pl-6 给的，抵消掉就等于没给。
     */
    margin: -10px -4px -16px 0;
    /* 滚动条藏掉：一条横杠横在首屏正中间，比它引导的海报还抢眼。
       它的两个作用改由两侧按钮承担 —— 见 .rail-nav */
    scrollbar-width: none;
}

.rail::-webkit-scrollbar {
    display: none;
}

/*
 * 翻页按钮。轨道右边一直通到屏幕边，两侧没有空地能摆，只能压在海报边缘上，
 * 所以做成和这一款其它卡片同一套材质：磨砂底 + 一圈浅白描边。
 * 换成实心色块的话，在壁纸上就是挖了两个洞。
 */
.rail-nav {
    position: absolute;
    top: 50%;
    z-index: 2;
    transform: translateY(-50%);
    color: rgb(var(--v-theme-on-surface));
    background: rgba(var(--v-theme-surface), var(--ani-card-alpha, var(--ani-surface-alpha, 1)));
    backdrop-filter: blur(var(--ani-panel-blur, 0px));
    border: 1px solid rgba(255, 255, 255, .28);
    box-shadow: 0 4px 16px rgba(0, 0, 0, .28);
    opacity: .85;
    transition: opacity .18s ease, transform .18s ease;
}

.rail-nav:hover {
    opacity: 1;
    transform: translateY(-50%) scale(1.08);
}

/*
 * 滑到头了就化掉，不是「变灰留在那儿」—— 没得翻还杵一颗按钮是在骗人点。
 * 用 :disabled 而不是 v-show：留在 DOM 里才淡得出去，
 * 同时 disabled 会把它踢出 tab 顺序，不会剩一个看不见却能聚焦的按钮。
 */
.rail-nav:disabled {
    opacity: 0;
    pointer-events: none;
}

.rail-nav--l {
    left: 8px;
}

.rail-nav--r {
    right: 8px;
}

/* 触摸屏直接拿手划，按钮只会挡住海报 */
@media (hover: none) {
    .rail-nav {
        display: none;
    }
}

.rail-item {
    flex: 0 0 clamp(126px, 30vw, 178px);
    cursor: pointer;
}

.tile {
    position: relative;
    border-radius: var(--ani-radius, 14px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .34);
    box-shadow: 0 6px 22px rgba(0, 0, 0, .3);
}

/*
 * 海报自己也带上圆角，不能只靠 .tile 的 overflow: hidden。
 * 带 filter / opacity / transform 的东西会被提成独立合成层，祖先的**圆角**裁剪
 * 对合成层不一定生效（矩形裁剪一定生效）—— 图就按方角画满，四个角从圆角里支出来。
 * 悬停抬起给的正是一个 transform，所以这一款最容易在悬停时露馅。
 */
.tile-art {
    border-radius: inherit;
}

/* 标题压在海报下沿：壁纸这款的重点是图，文字不该另占一块白底 */
.tile-veil {
    position: absolute;
    inset: auto 0 0 0;
    /* 只圆下两角：上边在海报中间，圆了会在渐变里啃出缺口 */
    border-radius: 0 0 var(--ani-radius, 14px) var(--ani-radius, 14px);
    padding: 22px 10px 8px;
    background: linear-gradient(transparent, rgba(0, 0, 0, .82));
    color: #fff;
}

.tile-title {
    font-size: .82rem;
    font-weight: 600;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.tile-sub {
    font-size: .7rem;
    opacity: .82;
    margin-top: 2px;
}

.pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.stat-pill {
    backdrop-filter: blur(var(--ani-panel-blur, 0px));
}

/*
 * minmax(0, 1fr) 不能省成 1fr。
 *
 * 网格子项的自动最小尺寸是 auto —— 里面那条 white-space: nowrap 的下载名
 * 有多长，列就被撑多宽，1fr 拦不住。390px 的屏上实测整块顶到 435px，
 * 右边 45px 连同进度条一起跑到屏幕外，还把整页拽出横向滚动条。
 * 子项自己的 min-width: 0 只管到 .dl-row 那一层，section 这一层照样要给。
 */
.two-col {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
}

.two-col > * {
    min-width: 0;
}

@media (min-width: 900px) {
    .two-col {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 40px;
    }
}

.sec-title {
    font-family: var(--ani-font-title, inherit);
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 12px;
}

.dl-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.dl-row {
    padding: 10px 12px;
    border-radius: var(--ani-radius, 14px);
    /* 这一行是卡片不是外壳，跟 --ani-card-alpha 走（缺省回退到外壳那档） */
    background: rgba(var(--v-theme-surface), var(--ani-card-alpha, var(--ani-surface-alpha, 1)));
    backdrop-filter: blur(var(--ani-panel-blur, 0px));
    border: 1px solid rgba(255, 255, 255, .22);
    min-width: 0;
}

/* 任务名可以很长（整个发布标题），不截断会把进度条挤出卡片 */
.dl-name {
    font-size: .85rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dl-pct {
    flex: 0 0 auto;
    font-size: .72rem;
    opacity: .72;
    font-variant-numeric: tabular-nums;
}

/*
 * 空态那句话也要有底板。
 * 壁纸是随机图，这句话直接铺在图上时经常一个字都读不出来 ——
 * 有底板就跟旁边的下载卡是一套，也不会因为换了张图突然消失。
 */
.empty-line {
    padding: 14px 12px;
    border-radius: var(--ani-radius, 14px);
    /* 这一行是卡片不是外壳，跟 --ani-card-alpha 走（缺省回退到外壳那档） */
    background: rgba(var(--v-theme-surface), var(--ani-card-alpha, var(--ani-surface-alpha, 1)));
    backdrop-filter: blur(var(--ani-panel-blur, 0px));
    border: 1px solid rgba(255, 255, 255, .22);
    font-size: .85rem;
    opacity: .8;
}
</style>
