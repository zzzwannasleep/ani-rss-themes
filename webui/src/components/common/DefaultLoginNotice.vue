<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {getToken} from '@shared/http'
import {useConfigStore} from '@/stores/config'

/**
 * 「你还在用默认登录信息」的提示。
 *
 * 上游 3.2.62（4332062）在 `Login` 上加了 `isDefault`，后端拿它标记「用户名密码还是出厂那组」，
 * 自带界面登录后弹一次对话框，可以「不再提醒」。备用界面跑在同一台 ani-rss 上，
 * 后端已经把事实算好了摆在那儿，不接反而奇怪 —— 而且这条提示是有意义的：
 * 挂着公网反代却不改默认密码的实例，谁扫到都能进来。
 *
 * 几个必须守住的边界：
 *  - **老后端没有这个字段**（3.2.62 以前）。`undefined === true` 不成立，一律不弹，
 *    不会让还在 3.2.5x 上的人每次登录都被拦一下。
 *  - **「不再提醒」和上游自带界面共用同一个 localStorage 键**，两套界面切换着用，
 *    关过一次就是关过，不会换个界面又冒出来。
 *  - **保存完自己消失**：`visible` 直接依赖 config 里的 isDefault，设置页保存后 store 会重拉，
 *    isDefault 变 false，对话框跟着没。
 */

/** 键名与上游 MainLayoutView 一致，不能改 */
const HIDE_KEY = 'hide-default-login-reminder'

const config = useConfigStore()
const router = useRouter()
const route = useRoute()

const open = ref(false)
/** 这一次打开页面里已经点过「稍后再说」——切路由别再弹 */
const dismissed = ref(false)
const hideForever = ref(localStorage.getItem(HIDE_KEY) === 'true')

watch(hideForever, v => {
    if (v) localStorage.setItem(HIDE_KEY, 'true')
    else localStorage.removeItem(HIDE_KEY)
})

const isDefault = computed(() => config.config.login?.isDefault === true)
const visible = computed(() => open.value && !dismissed.value && isDefault.value && !hideForever.value)

async function check() {
    if (hideForever.value || dismissed.value) return
    // 没登录就没什么可提醒的；登录页上弹这个只会挡住输入框
    if (!getToken()) return
    try {
        await config.load()
    } catch {
        // 拉配置失败由接口层统一提示，这儿不重复报，也不影响主界面
        return
    }
    if (config.config.login?.isDefault === true) open.value = true
}

function later() {
    open.value = false
    dismissed.value = true
}

function goSecurity() {
    later()
    // 安全页签的 value 是 login（见 SettingsView 的 TABS）
    void router.push({name: 'settings', params: {tab: 'login'}})
}

function onChange(v: boolean) {
    if (!v) later()
}

onMounted(() => void check())

// 登录成功后 Shell 才挂上，而本组件在 App 里常驻 —— 靠路由变化补那次检查
watch(() => route.name, n => {
    if (!n || n === 'login' || n === 'bgm-callback') return
    void check()
})
</script>

<template>
  <v-dialog :max-width="440" :model-value="visible" @update:model-value="onChange">
    <v-card>
      <v-card-title class="d-flex align-center ga-2 pt-5">
        <v-icon color="warning" icon="mdi-shield-alert-outline" size="22"/>
        请修改默认登录信息
      </v-card-title>
      <v-card-text class="text-body-2">
        当前仍在使用默认的用户名和密码 —— 知道这组凭据的人都能进来看你的订阅和下载记录。
        请到「设置 → 安全」改掉，改完记得点保存。
        <v-checkbox v-model="hideForever" class="mt-3" density="compact" hide-details label="不再提醒"/>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer/>
        <v-btn variant="text" @click="later">稍后再说</v-btn>
        <v-btn color="primary" variant="flat" @click="goSecurity">立即修改</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
