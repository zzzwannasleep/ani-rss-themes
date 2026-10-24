<script setup lang="ts">
import type {AniScreen} from '@/composables/useAniScreen'
import AniAddDialog from './AniAddDialog.vue'
import AniBatchDialog from './AniBatchDialog.vue'
import AniEditDialog from './AniEditDialog.vue'
import AniDeleteDialog from './AniDeleteDialog.vue'
import PlayListDialog from './PlayListDialog.vue'
import CoverDialog from './CoverDialog.vue'
import RateDialog from './RateDialog.vue'
import PreviewDialog from './PreviewDialog.vue'
import ImportAniDialog from './ImportAniDialog.vue'
import CollectionDialog from './CollectionDialog.vue'

/**
 * 十个弹窗的挂载点。各款界面各自只管「订阅怎么摆」，弹窗都长一样，
 * 挂一行 <AniDialogs :s="s"/> 就全有了。
 */
const {s} = defineProps<{s: AniScreen}>()
</script>

<template>
  <AniAddDialog v-model="s.adding.value" :s="s"/>
  <!-- 新增订阅的最后一步：所有入口排进这个队列，逐条过目再入库 -->
  <AniBatchDialog v-model="s.batchOpen.value" :requests="s.batchQueue.value"/>
  <AniEditDialog v-if="s.editing.value" :item="s.editing.value" @close="s.editing.value = null"/>
  <AniDeleteDialog v-if="s.deleting.value" :items="s.deleting.value"
                   @close="s.deleting.value = null; s.exitSelect()"/>
  <PlayListDialog v-if="s.playlistOf.value" :item="s.playlistOf.value" @close="s.playlistOf.value = null"/>
  <CoverDialog v-if="s.coverOf.value" :item="s.coverOf.value" @close="s.coverOf.value = null"/>
  <RateDialog v-if="s.ratingOf.value" :item="s.ratingOf.value" @close="s.ratingOf.value = null"/>
  <PreviewDialog v-if="s.previewOf.value" :item="s.previewOf.value" @close="s.previewOf.value = null"/>
  <ImportAniDialog v-model="s.importing.value"/>
  <CollectionDialog v-model="s.collecting.value"/>
</template>
