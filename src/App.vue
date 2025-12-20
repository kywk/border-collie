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
import { fetchPublicGist, extractGistId } from '@/utils/gist'
import { decodeSourceUrl, fetchFromUrl, isValidSourceUrl } from '@/utils/urlSource'
import { serializeFrontmatter, type Frontmatter } from '@/parser/frontmatterParser'

// Conflict handling
const showConflict = ref(false)
const conflictName = ref('')
const pendingSharedData = ref('')

// Loading state
const isLoading = ref(false)
const loadingMessage = ref('')

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

async function loadFromGist(gistId: string) {
  isLoading.value = true
  loadingMessage.value = '正在載入 Gist...'
  
  try {
    const result = await fetchPublicGist(gistId)
    
    if (!result.success) {
      alert(`Gist 載入失敗: ${result.error}`)
      return false
    }
    
    if (result.content) {
      // 確保 Frontmatter 包含 gist ID
      let contentToImport = result.content
      
      // 若原內容無 gist 欄位，自動加入
      if (!contentToImport.includes('gist:')) {
        const { frontmatter, content } = await import('@/parser/frontmatterParser')
          .then(m => m.parseFrontmatter(result.content!))
        
        const newFrontmatter: Frontmatter = {
          ...frontmatter,
          name: frontmatter?.name ?? result.filename ?? 'Gist Project',
          gist: gistId
        }
        contentToImport = serializeFrontmatter(newFrontmatter, content)
      }
      
      // 匯入資料（處理衝突）
      const importResult = workspaceStore.importSharedData(contentToImport)
      
      if (importResult.status === 'conflict') {
        conflictName.value = importResult.conflictName ?? ''
        pendingSharedData.value = contentToImport
        showConflict.value = true
      }
      
      return true
    }
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
  
  return false
}

async function loadFromSource(base64Url: string) {
  // Decode Base64 URL
  const sourceUrl = decodeSourceUrl(base64Url)
  
  if (!sourceUrl) {
    alert('無效的 URL 編碼格式')
    return false
  }
  
  if (!isValidSourceUrl(sourceUrl)) {
    alert('無效的 URL 格式，僅支援 HTTP/HTTPS')
    return false
  }
  
  isLoading.value = true
  loadingMessage.value = '正在載入外部資源...'
  
  try {
    const result = await fetchFromUrl(sourceUrl)
    
    if (!result.success) {
      alert(`載入失敗: ${result.error}\n\n來源 URL: ${sourceUrl}`)
      return false
    }
    
    if (result.content) {
      // 確保 Frontmatter 包含 source URL
      let contentToImport = result.content
      
      // 若原內容無 source 欄位，自動加入
      if (!contentToImport.includes('source:')) {
        const { frontmatter, content } = await import('@/parser/frontmatterParser')
          .then(m => m.parseFrontmatter(result.content!))
        
        // 從 URL 提取檔名作為預設名稱
        const urlPath = new URL(sourceUrl).pathname
        const filename = urlPath.split('/').pop() || 'External Source'
        const defaultName = filename.replace(/\.(md|txt)$/i, '')
        
        const newFrontmatter: Frontmatter = {
          ...frontmatter,
          name: frontmatter?.name ?? defaultName,
          source: sourceUrl
        }
        contentToImport = serializeFrontmatter(newFrontmatter, content)
      }
      
      // 匯入資料（處理衝突）
      const importResult = workspaceStore.importSharedData(contentToImport)
      
      if (importResult.status === 'conflict') {
        conflictName.value = importResult.conflictName ?? ''
        pendingSharedData.value = contentToImport
        showConflict.value = true
      }
      
      return true
    }
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
  
  return false
}

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const sharedData = urlParams.get('data')
  const gistParam = urlParams.get('gist')
  const sourceParam = urlParams.get('source')
  
  // Clean up URL
  if (sharedData || gistParam || sourceParam) {
    const newUrl = window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }
  
  // Initialize workspace store first
  workspaceStore.init()
  
  if (gistParam) {
    // Handle ?gist=GIST_ID parameter
    const gistId = extractGistId(gistParam)
    if (gistId) {
      await loadFromGist(gistId)
    } else {
      alert('無效的 Gist ID 格式')
    }
    store.init()
  } else if (sourceParam) {
    // Handle ?source=BASE64_URL parameter
    await loadFromSource(sourceParam)
    store.init()
  } else if (sharedData) {
    // Handle ?data=... parameter
    const decoded = decodeData(sharedData)
    if (decoded) {
      const result = workspaceStore.importSharedData(decoded)
      
      if (result.status === 'conflict') {
        conflictName.value = result.conflictName ?? ''
        pendingSharedData.value = decoded
        showConflict.value = true
      }
    }
    store.init()
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
