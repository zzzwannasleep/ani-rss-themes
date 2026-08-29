<script setup lang="ts">
/**
 * 破坏性操作的最后一道拦截。
 *
 * 只给「按下去就回不来」的动作用：覆盖配置、搬走整个已下载目录这一类。
 * 可撤销的操作不要套 —— 每一步都拦一下，用户很快就学会闭着眼点「继续」，
 * 那这道拦截在真正要命的那次也拦不住了。
 *
 * 默认按钮是危险色，且**不**是焦点默认项：得让人主动移过去点。
 */
defineProps<{
  /** 弹窗标题，默认「警告」 */
  title?: string
  /** 确认按钮文案。写清楚要发生什么（「继续导入」），别写「确定」 */
  okText?: string
  loading?: boolean
}>()

const emit = defineEmits<{ok: []}>()
const model = defineModel<boolean>({required: true})
</script>

<template>
  <v-dialog v-model="model" max-width="440">
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="warning" icon="mdi-alert-outline"/>
        {{ title ?? '警告' }}
      </v-card-title>
      <v-card-text>
        <slot/>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="model = false">取消</v-btn>
        <v-btn :loading="loading" color="error" variant="flat" @click="emit('ok')">
          {{ okText ?? '继续' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
