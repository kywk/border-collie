<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useGanttScale } from '@/composables/useGanttScale'
import { normalizeDate } from '@/parser/textParser'
import type { ComputedPhase } from '@/types'

const store = useProjectStore()
const { months, totalWidth, getXPosition, getWidth, getProjectGradient, getTodayPosition } = useGanttScale()

// Tooltip 狀態
const tooltip = ref<{
  visible: boolean
  x: number
  y: number
  project: string
  phase: string
  period: string
  total: string
}>({
  visible: false,
  x: 0,
  y: 0,
  project: '',
  phase: '',
  period: '',
  total: ''
})

// 檢查兩個時間範圍是否重疊
function isOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = new Date(normalizeDate(start1))
  const e1 = new Date(normalizeDate(end1, true))
  const s2 = new Date(normalizeDate(start2))
  const e2 = new Date(normalizeDate(end2, true))
  return s1 < e2 && s2 < e1 // 嚴格重疊 (不包含首尾相接)
}

// 取得原始 Phase 資料以判斷是否為接續階段
function getOriginalPhase(projectIndex: number, phaseName: string) {
  const project = store.projects[projectIndex]
  if (!project) return null
  return project.phases.find(p => p.name === phaseName)
}

// 計算每個專案的階段行分配 (處理時間重疊)
// 規則：接續階段 (startDate = null) 優先與前一階段同行，除非有真正的時間重疊
const projectRows = computed(() => {
  const result: {
    projectName: string
    projectIndex: number
    rows: ComputedPhase[][]
  }[] = []

  let currentProjectName = ''
  let currentProjectData: typeof result[0] | null = null

  for (const phase of store.computedPhases) {
    // 新專案
    if (phase.projectName !== currentProjectName) {
      if (currentProjectData) {
        // 確保每一列的階段都按開始時間排序
        currentProjectData.rows.forEach(row => {
          row.sort((a, b) => new Date(normalizeDate(a.startDate)).getTime() - new Date(normalizeDate(b.startDate)).getTime())
        })
        result.push(currentProjectData)
      }
      currentProjectName = phase.projectName
      currentProjectData = {
        projectName: phase.projectName,
        projectIndex: phase.projectIndex,
        rows: []
      }
    }

    // 取得原始 Phase 判斷是否為接續階段
    const originalPhase = getOriginalPhase(phase.projectIndex, phase.name)
    const isInheritedStart = originalPhase?.startDate === null

    // 找出可放置的行
    let placed = false
    
    for (let rowIdx = 0; rowIdx < currentProjectData!.rows.length; rowIdx++) {
      const row = currentProjectData!.rows[rowIdx]
      
      // 檢查是否與該行的任何階段有真正重疊
      const hasOverlap = row.some(existingPhase =>
        isOverlapping(
          phase.startDate,
          phase.endDate,
          existingPhase.startDate,
          existingPhase.endDate
        )
      )
      
      if (!hasOverlap) {
        // 如果是接續階段，優先嘗試放在包含前一階段的行
        if (isInheritedStart) {
          // 找出前一個階段在哪一行
          const phaseIndex = store.computedPhases.indexOf(phase)
          if (phaseIndex > 0) {
            const prevPhase = store.computedPhases[phaseIndex - 1]
            if (prevPhase.projectName === phase.projectName) {
              const prevPhaseInRow = row.some(p => p.name === prevPhase.name)
              if (prevPhaseInRow) {
                row.push(phase)
                placed = true
                break
              }
            }
          }
        } else {
          // 非接續階段，直接放到第一個不重疊的行
          row.push(phase)
          placed = true
          break
        }
      }
    }

    // 如果還沒放置
    if (!placed) {
      // 對於接續階段，再試一次找不重疊的行
      if (isInheritedStart) {
        for (const row of currentProjectData!.rows) {
          const hasOverlap = row.some(existingPhase =>
            isOverlapping(
              phase.startDate,
              phase.endDate,
              existingPhase.startDate,
              existingPhase.endDate
            )
          )
          if (!hasOverlap) {
            row.push(phase)
            placed = true
            break
          }
        }
      }
      
      // 如果所有現有行都有重疊，新開一行
      if (!placed) {
        currentProjectData!.rows.push([phase])
      }
    }
  }

  // 推入最後一個專案
  if (currentProjectData) {
    // 確保每一列的階段都按開始時間排序 (確保 Z-index 正確: 最早的在最上面)
    currentProjectData.rows.forEach(row => {
      row.sort((a, b) => new Date(normalizeDate(a.startDate)).getTime() - new Date(normalizeDate(b.startDate)).getTime())
    })
    result.push(currentProjectData)
  }

  return result
})

function showTooltip(event: MouseEvent, phase: ComputedPhase) {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    visible: true,
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
    project: phase.projectName,
    phase: phase.name,
    period: `${phase.startDate} ~ ${phase.endDate}`,
    total: `人力: ${phase.totalAssignment.toFixed(1)}`
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}
</script>

<template>
  <div class="project-gantt">
    <div class="gantt-container">
      <!-- 時間軸標題 -->
      <div class="gantt-header" :style="{ width: totalWidth + 140 + 'px' }">
        <div class="gantt-label header-label">專案</div>
        <div class="gantt-timeline">
          <div
            v-for="month in months"
            :key="month.label"
            class="month-header"
            :class="{ 
              'year-even': month.isEvenYear,
              'year-first': month.isFirstMonthOfYear 
            }"
            :style="{ width: store.scale.monthWidth + 'px' }"
          >
            {{ month.shortLabel }}
          </div>
        </div>
        
        <!-- Today Indicator in Header (pin head) -->
        <div 
          v-if="getTodayPosition() >= 0"
          class="today-header-indicator"
          :style="{ left: (getTodayPosition() + 140) + 'px' }"
        />
      </div>

      <!-- 專案群組 -->
      <div
        v-for="(project, pIdx) in projectRows"
        :key="project.projectName"
        class="project-group"
        :class="{ 'alt-group': pIdx % 2 === 1 }"
      >
        <div class="project-group-inner">
          <!-- 專案名稱 (跨越所有行，垂直居中) -->
          <div 
            class="gantt-label project-label"
            :style="{ height: project.rows.length * store.scale.rowHeight + 'px' }"
          >
            <span>{{ project.projectName }}</span>
          </div>
          
          <!-- 專案內的多列 -->
          <div class="project-rows">
            <div
              v-for="(row, rowIdx) in project.rows"
              :key="rowIdx"
              class="gantt-row"
              :style="{ height: store.scale.rowHeight + 'px' }"
            >
              <div
                class="gantt-timeline"
                :style="{ width: totalWidth + 'px' }"
              >
                <!-- 月份格線 -->
                <div
                  v-for="month in months"
                  :key="month.label"
                  class="month-line"
                  :style="{ width: store.scale.monthWidth + 'px' }"
                />
                
              <div
                  v-for="(phase, index) in row"
                  :key="phase.name"
                  class="gantt-bar"
                  :class="{ 
                    'arrow-style': store.barStyle === 'arrow'
                  }"
                  :style="{
                    left: (getXPosition(phase.startDate) - (store.barStyle === 'arrow' && phase.isContinuation ? 24 : 0)) + 'px',
                    width: (getWidth(phase.startDate, phase.endDate) + (store.barStyle === 'arrow' && phase.isContinuation ? 24 : 0)) + 'px',
                    background: getProjectGradient(phase.projectIndex),
                    zIndex: store.barStyle === 'arrow' ? (100 - rowIdx * 10 - index) : 10
                  }"
                  @mouseenter="showTooltip($event, phase)"
                  @mouseleave="hideTooltip"
                >
                  {{ phase.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Today Marker Line (Full Height) -->
      <div 
        v-if="getTodayPosition() >= 0"
        class="today-marker-line"
        :style="{ left: (getTodayPosition() + 140) + 'px' }"
      />
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltip.visible"
        class="tooltip"
        :style="{
          left: tooltip.x + 'px',
          top: tooltip.y + 'px',
          transform: 'translate(-50%, -100%)'
        }"
      >
        <div class="tooltip-title">{{ tooltip.project }} - {{ tooltip.phase }}</div>
        <div class="tooltip-info">{{ tooltip.period }}</div>
        <div class="tooltip-info">{{ tooltip.total }}</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.project-gantt {
  position: relative;
  height: 100%;
  overflow: auto;
}

.gantt-container {
  min-width: max-content;
}

.gantt-header {
  display: flex;
  position: sticky;
  top: 0;
  background: var(--color-bg-tertiary);
  z-index: 300;
  border-bottom: 2px solid var(--color-border);
}

.header-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  position: sticky;
  left: 0;
  z-index: 301;
  background: var(--color-bg-tertiary);
}

.month-header {
  flex-shrink: 0;
  padding: var(--spacing-sm);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  border-right: 1px solid var(--color-border);
}

/* 專案群組樣式 */
.project-group {
  border-bottom: 2px solid var(--color-border);
}

.project-group.alt-group {
  background: var(--color-bg-alt);
}

.project-group:last-child {
  border-bottom: none;
}

.project-group-inner {
  display: flex;
}

.gantt-label {
  flex-shrink: 0;
  width: 140px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  position: sticky;
  left: 0;
  z-index: 200;
}

.project-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: 500;
  font-size: var(--font-size-sm);
}



.project-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.gantt-row {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.project-rows .gantt-row:last-child {
  border-bottom: none;
}

.gantt-timeline {
  position: relative;
  display: flex;
}

.month-line {
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  opacity: 0.3;
}

.gantt-bar {
  position: absolute;
  height: 28px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 var(--spacing-sm);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.gantt-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  pointer-events: none;
}

.gantt-bar:hover {
  transform: translateY(-50%) scale(1.03);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 5;
}

/* Arrow Style - Unified (Flat Left, Point Right) */
.gantt-bar.arrow-style {
  border-radius: 0;
  padding-right: 16px;
  /* Use drop-shadow instead of box-shadow so it follows the clip-path shape */
  box-shadow: none !important; 
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
  clip-path: polygon(
    0% 0%,             /* top-left flat */
    calc(100% - 12px) 0%,   /* top-right before point */
    100% 50%,          /* right arrow point */
    calc(100% - 12px) 100%, /* bottom-right before point */
    0% 100%            /* bottom-left flat */
  );
  padding-left: 8px;
}

.gantt-bar.arrow-style::before {
  border-radius: 0;
  clip-path: polygon(
    0% 0%,
    calc(100% - 12px) 0%,
    100% 50%,
    calc(100% - 12px) 100%,
    0% 100%
  );
}

.gantt-bar.arrow-style:hover {
  transform: translateY(-50%) scale(1.02);
  /* Enhance drop-shadow on hover */
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
}

/* Today Marker - Full Height Line */
.today-marker-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  z-index: 150;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

/* Today Header Indicator - Circle aligned with line */
.today-header-indicator {
  position: absolute;
  bottom: -6px;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  background: #ef4444;
  border-radius: 50%;
  z-index: 305;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.tooltip {
  position: fixed;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-sm);
  z-index: 1000;
  pointer-events: none;
}

.tooltip-title {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.tooltip-info {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
</style>
