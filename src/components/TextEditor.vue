<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'

const store = useProjectStore()

const text = computed({
  get: () => store.rawText,
  set: (value: string) => store.updateText(value)
})
</script>

<template>
  <div class="text-editor">
    <textarea
      v-model="text"
      class="editor-textarea"
      placeholder="輸入專案資料...

格式範例:
AI OCR:
- BA, 2025-10-01, 2025-11-30: Andy 0.3, Ben 0.8
- SA, --, 2026-02: Andy 0.3, Danny 0.6"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<style scoped>
.text-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-textarea {
  flex: 1;
  font-size: 13px;
  line-height: 1.8;
  tab-size: 2;
}

.editor-textarea::placeholder {
  color: var(--color-text-muted);
  opacity: 0.6;
}
</style>
