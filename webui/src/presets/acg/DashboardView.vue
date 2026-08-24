<script setup lang="ts">
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
    <div class="rail mb-8 pl-6 pb-6 pt-6">
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

/* 横向轨道。scroll-snap 让每次滑动都停在整张海报上，不会停在半张 */
.rail {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    /* 抬起动作会超出轨道上沿，不留出空间的话阴影和位移都会被裁掉 */
    padding: 10px 4px 16px;
    /*
     * 左边不抵消：这条轨道要从左边 24px 起、右边一直通到屏幕边，
     * 左内边距是模板上的 pl-6 给的，抵消掉就等于没给。
     */
    margin: -10px -4px -16px 0;
    /*
     * 左内边距还得再跟 scroll-snap 说一遍。
     *
     * snapport 默认按 padding box 对齐，`scroll-snap-align: start` 会把第一张海报
     * 直接吸到内容起点 —— 那 24px 内边距一上来就被滚掉了，实测第一张卡落在 -4px，
     * 溢出屏幕左边、左圆角整个被切。scroll-padding 才是 snap 认的那一份。
     */
    scroll-padding-left: 24px;
    scrollbar-width: thin;
}

.rail-item {
    flex: 0 0 clamp(126px, 30vw, 178px);
    scroll-snap-align: start;
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
