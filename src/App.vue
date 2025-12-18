<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import SplitPane from '@/components/SplitPane.vue'
import EditorPanel from '@/components/EditorPanel.vue'
import GanttPanel from '@/components/GanttPanel.vue'
import ConflictDialog from '@/components/ConflictDialog.vue'

const store = useProjectStore()
const workspaceStore = useWorkspaceStore()

// Theme management
const isDarkMode = ref(true)

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  localStorage.setItem('border-collie-theme', isDarkMode.value ? 'dark' : 'light')
}

import { decodeData } from '@/utils/sharing'

// Conflict handling
const showConflict = ref(false)
const conflictName = ref('')
const pendingSharedData = ref('')

function handleOverwrite() {
  if (pendingSharedData.value) {
    workspaceStore.importSharedData(pendingSharedData.value, 'overwrite')
    pendingSharedData.value = ''
  }
}

function handleRename() {
  if (pendingSharedData.value) {
    workspaceStore.importSharedData(pendingSharedData.value, 'rename')
    pendingSharedData.value = ''
  }
}

function handleCancel() {
  pendingSharedData.value = ''
}

onMounted(() => {
  // Check for shared data in URL
  const urlParams = new URLSearchParams(window.location.search)
  const sharedData = urlParams.get('data')
  
  if (sharedData) {
    const decoded = decodeData(sharedData)
    if (decoded) {
      // Clean up URL without reloading
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Initialize workspace store first
      workspaceStore.init()
      
      // Try to import shared data
      const result = workspaceStore.importSharedData(decoded)
      
      if (result.status === 'conflict') {
        // Show conflict dialog
        conflictName.value = result.conflictName ?? ''
        pendingSharedData.value = decoded
        showConflict.value = true
      }
      
      // Initialize project store after workspace
      store.init()
    } else {
      store.init()
    }
  } else {
    // Only init from local storage if no share data
    store.init()
  }
  
  // Load saved theme preference
  const savedTheme = localStorage.getItem('border-collie-theme')
  if (savedTheme === 'light') {
    isDarkMode.value = false
    document.documentElement.setAttribute('data-theme', 'light')
  }
})
</script>

<template>
  <div id="app" class="app-container">
    <SplitPane :initial-ratio="0.35" :min-left="320" :min-right="400">
      <template #left>
        <EditorPanel />
      </template>
      <template #right>
        <GanttPanel :toggle-theme="toggleTheme" :is-dark-mode="isDarkMode" />
      </template>
    </SplitPane>
    
    <!-- Conflict Dialog -->
    <ConflictDialog
      v-model:visible="showConflict"
      :workspace-name="conflictName"
      @overwrite="handleOverwrite"
      @rename="handleRename"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  padding: var(--spacing-sm);
  overflow: hidden;
}
</style>
