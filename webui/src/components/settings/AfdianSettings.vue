<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Config} from '@shared/types'
import * as api from '@shared/api'
import {formatTime} from '@shared/format'
import {useUiStore} from '@/stores/ui'

const props = defineProps<{config: Config}>()
const ui = useUiStore()
const busy = ref(false)

/* verifyExpirationTime 这个名字是骗人的：它不是「已过期」，是「还在有效期内」。
   后端 AfdianService#verifyExpirationTime() 的实现就一行：`return time < expirationTime`，
   上游 UI 也是照着 `verifyExpirationTime ? '已捐赠' : '未捐赠'` 渲染的。
   而 types.ts 是从 Java 的 javadoc 自动生成的，那句「捐赠或试用是否过期」正好说反了
   —— 照字面读就会把状态显示成反的：捐过的人看到一个红色的「已过期」。
   types.ts 是生成物不能手改，所以在这里用具名 computed 把语义钉死。 */
const valid = computed(() => props.config.verifyExpirationTime === true)

/** 上游的四态：试用中 / 试用已过期 / 已捐赠 / 未捐赠 */
const state = computed<'trial' | 'trial-over' | 'donated' | 'none'>(() =>
    props.config.tryOut
        ? (valid.value ? 'trial' : 'trial-over')
        : (valid.value ? 'donated' : 'none'))

/* 捐赠通过时后端把到期时间设成「当前时间 + 999 年」（AfdianController），
   那是「永久」的意思，不是一个真日期。照着印会得到「有效期至 3025-08-20」这种东西，
   看着像坏了。超过 50 年就当永久，不显示日期。 */
const dueDate = computed(() => {
  const t = props.config.expirationTime
  if (!t) return ''
  return t - Date.now() > 50 * 365 * 864e5 ? '' : formatTime(t)
})

/** 捐赠后解锁的能力，与上游列表保持一致 */
const UNLOCKS = ['Mikan / AnimeGarden 番剧列表显示评分']

async function verify() {
  const no = props.config.outTradeNo?.trim()
  if (!no) return ui.error('请填写订单号')
  busy.value = true
  try {
    await api.verifyNo(no)
    /* 校验通过后后端已经把 outTradeNo / expirationTime / tryOut 写进服务端配置了，
       这里同步一下本地这份，卡片当场变成「已捐赠」——
       原来验完只弹个 toast，卡片纹丝不动，得刷新页面才看得到。
       expirationTime 不在这里填：接口返回的是 Result<Void>，data 是空的
       （上游那句 `config.expirationTime = res.data` 写错了，照抄会填进一个 undefined）。 */
    props.config.outTradeNo = no
    props.config.verifyExpirationTime = true
    props.config.tryOut = false
    ui.success('验证成功')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <!-- 捐赠卡：一枚徽章 + 解锁清单。原来这里只有一行小字，看不出这是个「去支持」的入口 -->
    <div class="afdian mb-5">
      <a class="afdian-badge" href="https://ifdian.net/a/wushuo894" rel="noopener" target="_blank">
        <v-icon icon="mdi-lightning-bolt" size="26"/>
        <span>
          <b>为我发电</b>
          <em>在爱发电赞助我</em>
        </span>
      </a>
      <div class="afdian-unlock">
        <div class="text-subtitle-2 mb-2">捐赠后解锁</div>
        <div class="d-flex flex-wrap ga-2">
          <v-chip v-for="u in UNLOCKS" :key="u" density="comfortable" size="small" variant="tonal">
            {{ u }}
          </v-chip>
        </div>
      </div>
    </div>

    <!-- 状态：四种状态各自一句话，不再是「有效 / 已过期」两个含义相反的药丸 -->
    <v-alert
        v-if="state === 'donated'"
        class="mb-4" density="comfortable" icon="mdi-heart" title="感谢您的捐赠支持 🎁"
        type="success" variant="tonal">
      <span v-if="dueDate">有效期至 {{ dueDate }}</span>
      <span v-else>订单已激活，长期有效。</span>
    </v-alert>

    <v-alert
        v-else-if="state === 'trial'"
        class="mb-4" density="comfortable" icon="mdi-clock-outline" title="试用中"
        type="info" variant="tonal">
      <span v-if="dueDate">到期时间 {{ dueDate }}</span>
      <span v-else>试用期内，需要捐赠的功能可以正常使用。</span>
    </v-alert>

    <v-alert
        v-else-if="state === 'trial-over'"
        class="mb-4" density="comfortable" icon="mdi-clock-alert-outline" title="试用已过期"
        type="warning" variant="tonal">
      填入爱发电订单号即可继续使用需要捐赠的功能。
    </v-alert>

    <v-alert
        v-else
        class="mb-4" density="comfortable" icon="mdi-information-outline" title="未捐赠"
        type="info" variant="tonal">
      ani-rss 的部分功能需要捐赠后使用，具体政策以上游为准。
    </v-alert>

    <!-- 已捐赠就不用再填了，和上游一致；到期后状态会自己变回未捐赠，输入框跟着回来 -->
    <template v-if="state !== 'donated'">
      <div class="text-body-2 text-medium-emphasis mb-2">已经捐赠？在这里填入订单号来激活。</div>
      <div class="d-flex flex-wrap ga-3 align-start">
        <v-text-field
            v-model="config.outTradeNo"
            class="afdian-input" density="comfortable" hide-details
            label="爱发电订单号" prepend-inner-icon="mdi-receipt-text-outline"
            @keyup.enter="verify"/>
        <v-btn
            :loading="busy" class="afdian-verify" color="primary"
            prepend-icon="mdi-check-decagram-outline" variant="flat" @click="verify">
          验证
        </v-btn>
      </div>
    </template>

    <div class="mt-5">
      <a class="text-body-2 afdian-link touch-link"
         href="https://github.com/wushuo894/ani-rss/discussions/260" rel="noopener" target="_blank">
        关于增加的捐赠功能，作者想说的话
        <v-icon icon="mdi-open-in-new" size="14"/>
      </a>
    </div>
  </div>
</template>

<style scoped>
.afdian {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
    padding: 18px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 12px;
    /* 两层：3% 的淡色压在一块实底上。
       只写那 3% 的话，带壁纸的皮肤里这块等于全透 —— 壁纸直接透过文字。
       实底用卡片那一档 alpha，不带壁纸的皮肤 alpha 是 1，观感跟原来一样 */
    background: linear-gradient(rgba(var(--v-theme-on-surface), .03), rgba(var(--v-theme-on-surface), .03)),
    rgba(var(--v-theme-surface), var(--ani-card-alpha, var(--ani-surface-alpha, 1)));
}

/* 爱发电那身紫，但压暗到白字能读：官方徽章的字是转成路径的，没人量过对比度，
   照抄那对渐变色（#AA84F5 → #885FD9）写成真文字只有 2.87:1。
   保色相压明度到两端都 ≥4.5:1 */
.afdian-badge {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    height: 64px;
    padding: 0 22px;
    border-radius: 10px;
    background: linear-gradient(100deg, #8366bd, #875ed7);
    color: #fff;
    font-size: 15px;
    font-weight: 650;
    letter-spacing: .01em;
    text-decoration: none;
    box-shadow: 0 6px 18px -10px #875ed7;
    transition: transform .18s cubic-bezier(.2, .7, .3, 1), box-shadow .18s;
}

/* 两行：上面是口号、下面是说明，和上游那枚官方徽章一个排法 */
.afdian-badge span {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
}

.afdian-badge b {
    font-size: 16px;
    font-weight: 700;
}

/* 副标题不压透明度：11.5px 属于小字，要 4.5:1，压到 92% 就只剩 4.15 了。
   层级靠字号和字重拉开就够 */
.afdian-badge em {
    font-size: 11.5px;
    font-style: normal;
    font-weight: 400;
}

.afdian-badge:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px -10px #875ed7;
}

.afdian-badge:active {
    transform: translateY(0);
}

.afdian-unlock {
    flex: 1 1 220px;
    min-width: 0;
}

.afdian-input {
    flex: 1 1 240px;
    min-width: 0;
    max-width: 340px;
}

/* 按钮和输入框同高：v-btn 默认比 comfortable 的输入框矮一截，并排放着像没对齐 */
.afdian-verify {
    height: 48px;
}

.afdian-link {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.afdian-link:hover {
    text-decoration: underline;
}
</style>
