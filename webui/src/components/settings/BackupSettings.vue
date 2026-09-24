<script setup lang="ts">
import {ref} from 'vue'
import * as api from '@shared/api'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'
import {pickedFile} from '@/composables/pickedFile'
import DangerConfirm from '@/components/common/DangerConfirm.vue'

const store = useConfigStore()
const ui = useUiStore()
/** 单选时 v-file-input 给的是 File 本身，不是数组 —— 取值一律经 pickedFile */
const file = ref<File | File[] | null>(null)
const busy = ref('')
const confirming = ref(false)

/**
 * 导入前先拦一道。
 *
 * 后端的导入是整包覆盖：设置、订阅、下载记录全换成压缩包里那份，
 * 覆盖掉的东西没有任何回退路径（除非用户自己先导出过一份）。
 * 按钮就挨着「导出设置」，手滑点错的代价和点对的代价差得太远。
 */
function askImport() {
  if (!pickedFile(file.value)) return ui.error('请先选择备份文件')
  confirming.value = true
}

async function doImport() {
  const f = pickedFile(file.value)
  if (!f) return
  busy.value = 'import'
  try {
    await api.importBackup(f)
    confirming.value = false
    ui.success('导入完成，正在重新读取配置')
    await store.load(true)
    file.value = null
  } finally {
    busy.value = ''
  }
}

/**
 * 导出走 fetch 拿到 zip 再存盘，不再是 <a href="...?s=令牌">：
 * 要在新后端（exportBackup）和老后端（exportConfig）之间自己挑端点，链接做不到先探再退。
 */
async function doExport() {
  busy.value = 'export'
  try {
    const {blob, filename} = await api.exportBackup()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    // 同步 revoke 的话部分浏览器还没开始读就被收走了，存出来是 0 字节
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  } finally {
    busy.value = ''
  }
}

async function doClearCache() {
  busy.value = 'cache'
  try {
    await api.clearCache()
    ui.success('缓存已清理')
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-3">
      导出的是一份 zip，包含全部设置与订阅。导入会覆盖当前配置。
    </div>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-btn :loading="busy === 'export'" prepend-icon="mdi-upload" variant="tonal" @click="doExport">
        导出设置
      </v-btn>
      <v-btn :loading="busy === 'cache'" prepend-icon="mdi-broom" variant="tonal" @click="doClearCache">
        清理缓存
      </v-btn>
    </div>

    <v-file-input
        v-model="file"
        accept=".zip"
        class="mb-3"
        density="comfortable"
        label="选择备份文件"
        prepend-icon="mdi-folder-zip-outline"
        show-size
    />
    <v-btn :disabled="!pickedFile(file)" :loading="busy === 'import'" color="primary"
           prepend-icon="mdi-download" variant="flat" @click="askImport">
      导入设置
    </v-btn>

    <DangerConfirm v-model="confirming" :loading="busy === 'import'" ok-text="继续导入" @ok="doImport">
      会用备份里的内容<strong>覆盖</strong>现在的设置、订阅和下载记录，覆盖掉的部分无法撤销。
      <div class="text-caption text-medium-emphasis mt-2">
        想留退路的话，先点上面的「导出设置」存一份当前的。
      </div>
    </DangerConfirm>
  </div>
</template>
