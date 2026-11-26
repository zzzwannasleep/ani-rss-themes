<script setup lang="ts">
import {ref} from 'vue'
import type {Config, NotificationConfig} from '@shared/types'
import * as api from '@shared/api'
import {useUiStore} from '@/stores/ui'
import {N_TYPES} from './notificationSchema'
import NotificationEditDialog from './NotificationEditDialog.vue'

const props = defineProps<{config: Config}>()
const ui = useUiStore()

const editing = ref<{item: NotificationConfig; index: number} | null>(null)
const busy = ref(-1)

function list(): NotificationConfig[] {
  if (!props.config.notificationConfigList) props.config.notificationConfigList = []
  return props.config.notificationConfigList
}

async function addOne() {
  // 新建项的默认值由后端给，免得前端和后端对不上默认配置
  const fresh = await api.newNotification()
  list().push(fresh)
  editing.value = {item: fresh, index: list().length - 1}
}

function remove(i: number) {
  list().splice(i, 1)
}

async function test(i: number) {
  busy.value = i
  try {
    await api.testNotification(list()[i])
    ui.success('已发送测试通知')
  } finally {
    busy.value = -1
  }
}

const typeTitle = (t?: string) => N_TYPES.find(x => x.value === t)?.title || t || '未选择类型'
const typeIcon = (t?: string) => N_TYPES.find(x => x.value === t)?.icon || 'mdi-bell-outline'
</script>

<template>
  <div>
    <v-textarea
        v-model="config.notificationTemplate"
        auto-grow
        class="mb-4"
        hint="所有通知共用的默认模版，单条通知可以覆盖"
        label="消息模版"
        persistent-hint
        rows="3"
    />

    <div class="d-flex align-center mb-3">
      <div class="text-subtitle-2">通知渠道</div>
      <v-chip class="ml-2" size="x-small" variant="tonal">{{ list().length }}</v-chip>
      <v-spacer/>
      <v-btn prepend-icon="mdi-plus" size="small" variant="tonal" @click="addOne">添加</v-btn>
    </div>

    <v-empty-state v-if="!list().length" icon="mdi-bell-off-outline" text="添加一个渠道后，下载事件才会通知你"
                   title="还没有通知渠道"/>

    <!-- 停用的渠道整张压暗一点（上游 3.2.60 `e1164cb` 的通知管理页也这么做）：
         一眼能扫出「哪几条其实没在发」，不用逐条去读右下角那颗开关 -->
    <v-card v-for="(n, i) in list()" :key="i" :class="{'n-off': !n.enable}" class="mb-2" variant="tonal">
      <v-card-text class="d-flex align-center ga-3 py-3">
        <v-avatar :color="n.enable ? 'primary' : undefined" size="36" variant="tonal">
          <v-icon>{{ typeIcon(n.notificationType) }}</v-icon>
        </v-avatar>
        <div class="flex-grow-1 min-w-0">
          <div class="text-body-2">{{ n.comment || typeTitle(n.notificationType) }}</div>
          <div class="text-caption text-medium-emphasis text-truncate">
            {{ typeTitle(n.notificationType) }} · {{ n.statusList?.length ? `${n.statusList.length} 个触发时机` : '未选择触发时机' }}
          </div>
        </div>
        <v-switch v-model="n.enable" color="primary" density="compact" hide-details/>
        <v-btn :loading="busy === i" icon="mdi-send-check-outline" size="small" title="测试" variant="text"
               @click="test(i)"/>
        <!-- 这两颗原来光秃秃只有图标：鼠标悬上去没有提示，读屏也念不出来。
             旁边那颗「测试」一直是有 title 的，补齐 —— 顺带让弹窗版式体检能稳定找到入口 -->
        <v-btn icon="mdi-pencil" size="small" title="编辑" variant="text" @click="editing = {item: n, index: i}"/>
        <v-btn color="error" icon="mdi-delete-outline" size="small" title="删除" variant="text" @click="remove(i)"/>
      </v-card-text>
    </v-card>

    <NotificationEditDialog v-if="editing" :item="editing.item" @close="editing = null"/>
  </div>
</template>

<style scoped>
/* 让中间那块能被 text-truncate 压缩，否则长备注会把开关挤出卡片 */
.min-w-0 {
    min-width: 0;
}

/* 停用的那条：整张压暗，但按钮仍然可点（不然连「启用」都点不动） */
.n-off {
    opacity: .62;
}
</style>
