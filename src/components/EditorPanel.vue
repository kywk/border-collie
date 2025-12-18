<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { encodeData } from '@/utils/sharing'
import TextEditor from './TextEditor.vue'
import TableEditor from './TableEditor.vue'
import WorkspaceDropdown from './WorkspaceDropdown.vue'

type EditorMode = 'text' | 'table'



const store = useProjectStore()
const mode = ref<EditorMode>('text')
const copyButtonText = ref('分享')

async function copyShareLink() {
  const encoded = encodeData(store.rawText)
  const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`
  
  try {
    await navigator.clipboard.writeText(url)
    copyButtonText.value = '已複製!'
    setTimeout(() => {
      copyButtonText.value = '分享'
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
    alert('複製失敗，請手動複製網址')
  }
}
</script>

<template>
  <div class="panel editor-panel">
    <div class="panel-header">
      <div class="header-left">
        <WorkspaceDropdown />
      </div>
      <div class="header-right">
        <div class="toggle-group">
          <button
            class="btn btn-ghost"
            :class="{ active: mode === 'text' }"
            @click="mode = 'text'"
          >
            純文字
          </button>
          <button
            class="btn btn-ghost"
            :class="{ active: mode === 'table' }"
            @click="mode = 'table'"
          >
            表單
          </button>
        </div>
        <button class="btn btn-ghost share-btn" @click="copyShareLink" title="複製分享連結">
          <span class="icon">🔗</span>
          <span>{{ copyButtonText }}</span>
        </button>
      </div>
    </div>
    <div class="panel-content">
      <TextEditor v-if="mode === 'text'" />
      <TableEditor v-else />
    </div>
  </div>
</template>

<style scoped>
.editor-panel {
  min-width: 320px;
}

.panel-header {
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
</style>
