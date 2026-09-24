<script setup lang="ts">
/* 演示构建才有那枚左下角徽标 */
const isDemo = __DEMO__
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import * as api from '@shared/api'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'
import {BACKUP_SECTION, BASIC_SECTIONS, DOWNLOAD_SECTIONS, EXCLUDE_SECTION, LOGIN_SECTIONS, PROXY_SECTION} from '@/components/settings/schema'
import SettingSection from '@/components/settings/SettingSection.vue'
import PageSettings from '@/components/settings/PageSettings.vue'
import NotificationSettings from '@/components/settings/NotificationSettings.vue'
import BackupSettings from '@/components/settings/BackupSettings.vue'
import IntegrationUrls from '@/components/settings/IntegrationUrls.vue'
import AboutSettings from '@/components/settings/AboutSettings.vue'
import AfdianSettings from '@/components/settings/AfdianSettings.vue'

const store = useConfigStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const TABS = [
  {value: 'download', label: '下载设置'},
  {value: 'basic', label: '基本设置'},
  {value: 'exclude', label: '全局排除'},
  {value: 'proxy', label: '代理'},
  // 上游 3.2.36（046975d）改叫「安全」。value 不动：地址 #/settings/login 可能已经被人存成书签
  {value: 'login', label: '安全'},
  {value: 'notification', label: '通知'},
  {value: 'afdian', label: '捐赠'},
  {value: 'about', label: '关于'},
]

// 标签页写进路由，刷新和分享链接都能停在同一页
const tab = computed({
  get: () => (TABS.some(t => t.value === route.params.tab) ? String(route.params.tab) : 'download'),
  set: v => void router.replace({name: 'settings', params: {tab: v}}),
})

const config = computed(() => store.config)
const testing = ref('')

onMounted(() => void store.load())

async function testDownloadTool() {
  testing.value = 'download'
  try {
    await api.downloadLoginTest(config.value)
    ui.success('下载器连接正常')
  } finally {
    testing.value = ''
  }
}

async function testProxy() {
  testing.value = 'proxy'
  try {
    const r = await api.testProxy('https://api.bgm.tv', config.value)
    // title 是后端抓回来的页面标题（3.2.23 起单独放在返回体里，之前是拼在 message 里的）。
    // 有它才说明真的连通了 —— 只有耗时的话，代理把请求吞掉返回空body 也是「成功」。
    ui.success(`代理可用${r?.title ? `：${r.title}` : ''}${r?.time ? `，耗时 ${r.time}ms` : ''}`)
  } finally {
    testing.value = ''
  }
}

async function updateTrackers() {
  testing.value = 'trackers'
  try {
    await api.trackersUpdate(config.value)
    ui.success('Trackers 已更新')
  } finally {
    testing.value = ''
  }
}

async function testIpWhitelist() {
  testing.value = 'ip'
  try {
    await api.testIpWhitelist()
    ui.success('当前 IP 在白名单内')
  } finally {
    testing.value = ''
  }
}
</script>

<template>
  <div class="settings-page">
    <v-tabs v-model="tab" density="comfortable" show-arrows>
      <v-tab v-for="t in TABS" :key="t.value" :value="t.value">{{ t.label }}</v-tab>
    </v-tabs>
    <v-divider/>

    <v-progress-linear v-if="store.loading" indeterminate/>

    <div class="pa-4 settings-body">
      <v-tabs-window v-model="tab">
        <!-- ══ 下载设置 ══ -->
        <v-tabs-window-item value="download">
          <v-expansion-panels multiple variant="accordion" :model-value="[0, 1, 2]">
            <v-expansion-panel v-for="s in DOWNLOAD_SECTIONS" :key="s.title" :title="s.title">
              <template #text>
                <SettingSection :config="config" :section="s">
                  <v-btn v-if="s.title === '下载工具'" :loading="testing === 'download'" class="mt-2"
                         prepend-icon="mdi-lan-connect" variant="tonal" @click="testDownloadTool">
                    测试连接
                  </v-btn>
                </SettingSection>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-tabs-window-item>

        <!-- ══ 基本设置 ══ -->
        <v-tabs-window-item value="basic">
          <v-expansion-panels variant="accordion">
            <!-- 页面设置里有一半是浏览器本地偏好，单独做一个组件 -->
            <v-expansion-panel title="页面设置">
              <template #text>
                <PageSettings :config="config"/>
              </template>
            </v-expansion-panel>

            <v-expansion-panel v-for="s in BASIC_SECTIONS.slice(1)" :key="s.title" :title="s.title">
              <template #text>
                <SettingSection :config="config" :section="s">
                  <v-btn v-if="s.title === 'Trackers'" :loading="testing === 'trackers'" class="mt-2"
                         prepend-icon="mdi-download" variant="tonal" @click="updateTrackers">
                    立即更新
                  </v-btn>
                  <IntegrationUrls v-if="s.title === '其他'" :config="config"/>
                </SettingSection>
              </template>
            </v-expansion-panel>

            <v-expansion-panel title="备份">
              <template #text>
                <SettingSection :config="config" :section="BACKUP_SECTION" class="mb-4"/>
                <v-divider class="mb-4"/>
                <BackupSettings/>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-tabs-window-item>

        <!-- ══ 全局排除 ══ -->
        <v-tabs-window-item value="exclude">
          <SettingSection :config="config" :section="EXCLUDE_SECTION"/>
        </v-tabs-window-item>

        <!-- ══ 代理 ══ -->
        <v-tabs-window-item value="proxy">
          <SettingSection :config="config" :section="PROXY_SECTION">
            <v-btn :loading="testing === 'proxy'" prepend-icon="mdi-lan-connect" variant="tonal" @click="testProxy">
              测试代理
            </v-btn>
          </SettingSection>
        </v-tabs-window-item>

        <!-- ══ 登录 ══ -->
        <v-tabs-window-item value="login">
          <div v-if="config.login" class="mb-6">
            <div class="text-subtitle-2 mb-1">账号</div>
            <div class="text-caption text-medium-emphasis mb-3">密码留空表示不修改。</div>
            <v-text-field v-model="config.login.username" autocomplete="off" class="mb-3" label="用户名"/>
            <v-text-field v-model="config.login.password" autocomplete="new-password" label="新密码"
                          placeholder="留空则不修改" type="password"/>
          </div>

          <template v-for="s in LOGIN_SECTIONS.slice(1)" :key="s.title">
            <div class="text-subtitle-2 mb-2 mt-4">{{ s.title }}</div>
            <SettingSection :config="config" :section="s">
              <v-btn v-if="s.title === '访问控制'" :loading="testing === 'ip'" class="mt-2"
                     prepend-icon="mdi-ip-network-outline" variant="tonal" @click="testIpWhitelist">
                测试当前 IP
              </v-btn>
            </SettingSection>
          </template>
        </v-tabs-window-item>

        <!-- ══ 通知 ══ -->
        <v-tabs-window-item value="notification">
          <NotificationSettings :config="config"/>
        </v-tabs-window-item>

        <!-- ══ 捐赠 ══ -->
        <v-tabs-window-item value="afdian">
          <AfdianSettings :config="config"/>
        </v-tabs-window-item>

        <!-- ══ 关于 ══ -->
        <v-tabs-window-item value="about">
          <AboutSettings/>
        </v-tabs-window-item>
      </v-tabs-window>
    </div>

    <!-- 保存条常驻底部：设置项很长，翻到哪都能存 -->
    <v-sheet v-if="tab !== 'about' && tab !== 'afdian'" class="save-bar d-flex align-center ga-2 px-4 py-3" elevation="4">
      <!-- 演示站左下角钉着一枚「演示模式」徽标，正好压在这句话上，给它让开一截。
           手机上徽标已经抬到底部导航上方去了（见 App.vue），这句话本身也让位给按钮 —— d-none d-sm-flex -->
      <span :class="{'demo-gap': isDemo}" class="text-caption text-medium-emphasis d-none d-sm-flex">改动不会自动保存</span>
      <v-spacer/>
      <v-btn :disabled="store.saving" variant="text" @click="store.load(true)">放弃改动</v-btn>
      <v-btn :loading="store.saving" color="primary" prepend-icon="mdi-content-save" variant="flat"
             @click="store.save()">
        保存设置
      </v-btn>
    </v-sheet>
  </div>
</template>

<style scoped>
/*
 * 整页不滚，只有中间那段滚。
 *
 * 高度不能写死 100vh - 64px：顶栏每款不一样高（56 / 64 / 悬浮岛 / Win98 的标题栏加菜单栏），手机上还多一条底部导航。
 * --v-layout-top / --v-layout-bottom 是 Vuetify 按实际布局算出来的；外壳自己额外占掉的
 * （液态玻璃的悬浮岛、手机上的底部导航垫片）Vuetify 不知道，由外壳写进 --ani-page-*。
 * dvh 而不是 vh：手机上地址栏收起时 vh 不变，用 vh 会把保存条顶到屏幕外面。
 */
.settings-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px)
    - var(--ani-page-top, 0px) - var(--ani-page-bottom, 0px));
    height: calc(100dvh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px)
    - var(--ani-page-top, 0px) - var(--ani-page-bottom, 0px));
}

/*
 * min-height: 0 是这里的关键，不是可有可无的保险。
 *
 * flex 子项的默认 min-height 是 auto —— 内容有多高就赖着多高，一点都不肯缩。
 * 于是展开一个设置面板，内容撑到 1300px，收缩压力全转嫁给兄弟节点：
 * 上面的标签栏被从 48px 压成 27px，标签文字被自己的 overflow:hidden 拦腰切掉，
 * 底下的保存条同样被啃掉一截。看着就像「下面的东西把上面的挡住了」。
 * 让真正能滚的这一段可以缩到 0，兄弟才不会被挤。
 */
.settings-body {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
}

/* 标签栏、分隔线、保存条都是固定高度，一律不参与收缩 */
.settings-page > :not(.settings-body) {
    flex: 0 0 auto;
}

/*
 * 徽标宽度 ≈ 128px，加 12px 左边距和一点余量。
 *
 * 只在宽屏让位。手机上整条保存条也才 390px，让掉 152px 之后
 * 「保存设置」会被顶出屏幕右边 25px —— 实测点不到。
 * 徽标在手机上已经抬到底部导航上方，压根不在这条上，没有让位的必要。
 */
@media (min-width: 600px) {
    .demo-gap {
        margin-left: 152px;
    }
}

.save-bar {
    position: sticky;
    bottom: 0;
    /* 底部安全区，避免被 iPhone 横条压住 */
    padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
    background: rgb(var(--v-theme-surface));
}
</style>
