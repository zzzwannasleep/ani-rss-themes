<script setup lang="ts">
import {ref, watch} from 'vue'
import type {Ani} from '@shared/types'
import * as api from '@shared/api'
import {useAniStore} from '@/stores/ani'

const props = defineProps<{items: Ani[]}>()
const emit = defineEmits<{close: []}>()

const ani = useAniStore()
const dialog = ref(true)
const deleteFiles = ref(false)
const busy = ref(false)

/**
 * 要删的到底是哪个目录。
 *
 * 「无法撤销」这四个字不解决问题 —— 人在按下去之前想知道的是「删的是哪儿」。
 * 下载路径可以是全局默认拼出来的，也可以是这条订阅自己覆盖的，光看订阅名猜不出来，
 * 所以问后端要（上游删除框也是这么干的）。
 *
 * 只在单选时查：多选时每条路径都不一样，列一长串没人看，还要打 N 个请求。
 * 查不到就不显示，别拿一个次要信息挡住删除本身。
 */
const path = ref('')
watch(deleteFiles, async v => {
  if (!v || path.value || props.items.length !== 1) return
  try {
    path.value = (await api.downloadPath(props.items[0])).downloadPath
  } catch {
    // 后端答不上来就算了，删除照常
  }
})

async function confirm() {
  busy.value = true
  try {
    await ani.remove(props.items.map(i => i.id!).filter(Boolean), deleteFiles.value)
    dialog.value = false
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="480" @after-leave="emit('close')">
    <v-card>
      <v-card-title>删除订阅</v-card-title>
      <v-card-text>
        <p class="mb-3">
          确定删除
          <strong>{{ items.length === 1 ? items[0].title : `选中的 ${items.length} 项` }}</strong>
          ？
        </p>
        <v-list v-if="items.length > 1" class="mb-3 overflow-y-auto" density="compact" max-height="180">
          <v-list-item v-for="i in items" :key="i.id" :title="i.title" class="text-caption"/>
        </v-list>

        <!-- 删文件是不可逆的，单独一个开关并给出明确后果 -->
        <v-checkbox v-model="deleteFiles" color="error" density="compact" hide-details
                    label="同时删除已下载的文件"/>
        <v-alert v-if="deleteFiles" class="mt-3" density="compact" type="warning" variant="tonal">
          磁盘上已下载的文件会一并删除，无法撤销。
          <div v-if="path" class="mt-1">
            会删掉整个目录：<code class="path">{{ path }}</code>
          </div>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="dialog = false">取消</v-btn>
        <v-btn :loading="busy" color="error" variant="flat" @click="confirm">删除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* 路径可以很长且没有空格，不给断点会把对话框撑宽 */
.path {
    font-size: .78rem;
    word-break: break-all;
}
</style>
