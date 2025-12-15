<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import SplitPane from '@/components/SplitPane.vue'
import EditorPanel from '@/components/EditorPanel.vue'
import GanttPanel from '@/components/GanttPanel.vue'

const store = useProjectStore()

// Theme management
const isDarkMode = ref(true)

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  localStorage.setItem('border-collie-theme', isDarkMode.value ? 'dark' : 'light')
}

import { decodeData } from '@/utils/sharing'

onMounted(() => {
  // Check for shared data in URL
  const urlParams = new URLSearchParams(window.location.search)
  const sharedData = urlParams.get('data')
  
  if (sharedData) {
    const decoded = decodeData(sharedData)
    if (decoded) {
      // Overwrite current data with shared data
      store.updateText(decoded)
      
      // Clean up URL without reloading
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
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
        <EditorPanel :toggle-theme="toggleTheme" :is-dark-mode="isDarkMode" />
      </template>
      <template #right>
        <GanttPanel />
      </template>
    </SplitPane>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  padding: var(--spacing-sm);
  overflow: hidden;
}
</style>
