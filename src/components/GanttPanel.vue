<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import ProjectGantt from './ProjectGantt.vue'
import PersonGantt from './PersonGantt.vue'

type GanttMode = 'project' | 'person'

const store = useProjectStore()
const mode = ref<GanttMode>('project')
</script>

<template>
  <div class="panel gantt-panel">
    <div class="panel-header">
      <span class="panel-title">檢視區</span>
      <div class="panel-controls">
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
      </div>
    </div>
    <div class="panel-content">
      <ProjectGantt v-if="mode === 'project'" />
      <PersonGantt v-else />
    </div>
  </div>
</template>

<style scoped>
.gantt-panel {
  min-width: 400px;
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
</style>
