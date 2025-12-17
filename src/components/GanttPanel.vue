<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { exportToImage, exportToPpt } from '@/utils/exporter'
import ProjectGantt from './ProjectGantt.vue'
import PersonGantt from './PersonGantt.vue'

type GanttMode = 'project' | 'person'

defineProps<{
  toggleTheme: () => void
  isDarkMode: boolean
}>()

const store = useProjectStore()
const mode = ref<GanttMode>('project')
const showExportMenu = ref(false)

async function handleExport(type: 'png' | 'svg' | 'ppt') {
  showExportMenu.value = false
  
  if (type === 'ppt') {
    exportToPpt(mode.value, store)
  } else {
    // Export DOM to image
    // Note: We target 'gantt-content' but need to be careful about scrolling
    // html-to-image usually captures the visible part or full scroll depending on options
    // For best results, we might want to temporarily expand the container if it's scrolling
    await exportToImage('gantt-content', type, `border-collie-${mode.value}-gantt`)
  }
}
</script>

<template>
  <div class="panel gantt-panel">
    <div class="panel-header">
      <!-- Left: Toggle Group -->
      <div class="toggle-group">
        <button
          class="btn btn-ghost"
          :class="{ active: mode === 'project' }"
          @click="mode = 'project'"
        >
          專案甘特圖
        </button>
        <button
          class="btn btn-ghost"
          :class="{ active: mode === 'person' }"
          @click="mode = 'person'"
        >
          人力甘特圖
        </button>
      </div>

      <!-- Right: Controls -->
      <div class="panel-controls">
        <div class="zoom-controls">
          <button class="btn btn-ghost" @click="store.zoomOut" title="縮小">
            −
          </button>
          <button class="btn btn-ghost" @click="store.resetZoom" title="重置">
            ⟳
          </button>
          <button class="btn btn-ghost" @click="store.zoomIn" title="放大">
            ＋
          </button>
        </div>
        
        <div class="export-dropdown">
          <button class="btn btn-ghost" @click="showExportMenu = !showExportMenu" title="匯出">
            📥 匯出
          </button>
          <div v-if="showExportMenu" class="dropdown-menu">
            <button class="dropdown-item" @click="handleExport('png')">匯出 PNG 圖片</button>
            <button class="dropdown-item" @click="handleExport('svg')">匯出 SVG 圖片</button>
            <button class="dropdown-item" @click="handleExport('ppt')">匯出 PowerPoint</button>
          </div>
        </div>
        
        <button 
          class="style-toggle" 
          @click="store.toggleBarStyle" 
          :title="store.barStyle === 'block' ? '切換箭頭樣式' : '切換標準區塊樣式'"
        >
          {{ store.barStyle === 'block' ? '▭ 區塊' : '➤ 箭頭' }}
        </button>
        
        <button class="theme-toggle" @click="toggleTheme" :title="isDarkMode ? '切換淺色模式' : '切換深色模式'">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </button>
      </div>
    </div>
    <div id="gantt-content" class="panel-content" @click="showExportMenu = false">
      <ProjectGantt v-if="mode === 'project'" />
      <PersonGantt v-else />
    </div>
  </div>
</template>

<style scoped>
.gantt-panel {
  min-width: 400px;
}

.panel-content {
  position: relative; /* Context for dropdown click away roughly */
}

#gantt-content {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

#gantt-content > * {
  flex: 1;
}

.panel-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  padding: 2px;
}

.zoom-controls .btn {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
}

/* Export Dropdown */
.export-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-xs);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs);
  z-index: 100;
  min-width: 150px;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  text-align: left;
  background: transparent;
  border: none;
  padding: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--color-bg-hover);
}

/* Style Toggle Button */
.style-toggle {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.style-toggle:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
}
</style>
