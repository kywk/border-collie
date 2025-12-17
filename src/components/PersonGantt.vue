<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useGanttScale } from '@/composables/useGanttScale'
import { normalizeDate } from '@/parser/textParser'
import type { PersonAssignment } from '@/types'

const store = useProjectStore()
const { months, totalWidth, getXPosition, getWidth, getProjectColor } = useGanttScale()

// Tooltip 狀態
const tooltip = ref<{
  visible: boolean
  x: number
  y: number
  person: string
  project: string
  phase: string
  period: string
  percentage: string
}>({
  visible: false,
  x: 0,
  y: 0,
  person: '',
  project: '',
  phase: '',
  period: '',
  percentage: ''
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

// 檢查某月份是否在日期範圍內
function isMonthInRange(year: number, month: number, startDate: string, endDate: string): boolean {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // 該月最後一天
  const rangeStart = new Date(normalizeDate(startDate))
  const rangeEnd = new Date(normalizeDate(endDate, true))
  return monthStart <= rangeEnd && monthEnd >= rangeStart
}

// 計算每個人員每月的總投入百分比 (以人天計算平均負載)
const monthlyWorkload = computed(() => {
  const result = new Map<string, Map<string, number>>() // person -> month -> average load

  for (const assignment of store.personAssignments) {
    if (!result.has(assignment.person)) {
      result.set(assignment.person, new Map())
    }
  }

  // 針對每個人員計算
  for (const person of store.allPersons) {
    const assignments = store.personAssignments.filter(a => a.person === person)
    const personMap = result.get(person)!

    for (const month of months.value) {
      const monthKey = month.label
      const year = month.year
      const mon = month.month
      const daysInMonth = new Date(year, mon, 0).getDate()
      
      // 建立該月每一天的累計負載陣列 (索引 0 = 1號)
      const dailyLoad = new Array(daysInMonth).fill(0)
      let hasAssignment = false

      for (const assignment of assignments) {
        // 檢查此任務是否與該月重疊
        if (isMonthInRange(year, mon, assignment.startDate, assignment.endDate)) {
          // 計算重疊的日期範圍
          const start = new Date(normalizeDate(assignment.startDate))
          const end = new Date(normalizeDate(assignment.endDate, true))
          const monthStart = new Date(year, mon - 1, 1)
          const monthEnd = new Date(year, mon, 0)
          
          // 取交集
          const overlapStart = start < monthStart ? monthStart : start
          const overlapEnd = end > monthEnd ? monthEnd : end

          if (overlapStart <= overlapEnd) {
            hasAssignment = true
            const startDay = overlapStart.getDate() 
            const endDay = overlapEnd.getDate()
            
            // 累加每一天的負載
            for (let d = startDay; d <= endDay; d++) {
              dailyLoad[d - 1] += assignment.percentage
            }
          }
        }
      }

      if (hasAssignment) {
        // 計算平均負載: 總人天 / 月份總天數
        const totalManDays = dailyLoad.reduce((sum, load) => sum + load, 0)
        const averageLoad = totalManDays / daysInMonth
        personMap.set(monthKey, averageLoad)
      }
    }
  }
  
  return result
})

// 取得某人員某月份的工作負載狀態
function getMonthWorkloadStatus(person: string, monthLabel: string): 'overload' | 'underload' | 'normal' {
  const personMap = monthlyWorkload.value.get(person)
  if (!personMap) return 'normal'
  const total = personMap.get(monthLabel) || 0
  if (total === 0) return 'normal'        // 0% - 無背景
  if (total > 1.1) return 'overload'      // 超過 110%
  if (total < 0.5) return 'underload'     // 少於 50%
  return 'normal'
}

// 群組：人員 -> 投入列表 (處理時間重疊與連續性)
const personRows = computed(() => {
  const result: {
    person: string
    rows: PersonAssignment[][]
  }[] = []

  // 先按人員分組
  const personMap = new Map<string, PersonAssignment[]>()
  for (const assignment of store.personAssignments) {
    if (!personMap.has(assignment.person)) {
      personMap.set(assignment.person, [])
    }
    personMap.get(assignment.person)!.push(assignment)
  }

  // 對每個人員，分配到不重疊的行
  for (const [person, assignments] of personMap) {
    const personData: typeof result[0] = {
      person,
      rows: []
    }

    // 依開始時間排序，確保順序處理
    const sortedAssignments = [...assignments].sort((a, b) => {
      return new Date(normalizeDate(a.startDate)).getTime() - new Date(normalizeDate(b.startDate)).getTime()
    })

    for (const assignment of sortedAssignments) {
      let placed = false
      
      // 嘗試放入現有行
      // 策略: 優先找 "最後一個任務是同專案" 且 "無重疊" 的行
      // 若無，則找任意 "無重疊" 的行
      
      // 1. 尋找同專案且無重疊的行
      const sameProjectRowIndex = personData.rows.findIndex(row => {
        const lastAssignment = row[row.length - 1]
        const isSameProject = lastAssignment.projectName === assignment.projectName
        const hasOverlap = row.some(existing =>
          isOverlapping(
            assignment.startDate,
            assignment.endDate,
            existing.startDate,
            existing.endDate
          )
        )
        return isSameProject && !hasOverlap
      })

      if (sameProjectRowIndex !== -1) {
        personData.rows[sameProjectRowIndex].push(assignment)
        placed = true
      } else {
        // 2. 尋找任意無重疊的行
        for (const row of personData.rows) {
          const hasOverlap = row.some(existing =>
            isOverlapping(
              assignment.startDate,
              assignment.endDate,
              existing.startDate,
              existing.endDate
            )
          )
          if (!hasOverlap) {
            row.push(assignment)
            placed = true
            break
          }
        }
      }

      // 3. 建立新行
      if (!placed) {
        personData.rows.push([assignment])
      }
    }

    result.push(personData)
  }

  return result.sort((a, b) => a.person.localeCompare(b.person))
})

function showTooltip(event: MouseEvent, assignment: PersonAssignment) {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    visible: true,
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
    person: assignment.person,
    project: assignment.projectName,
    phase: assignment.phaseName,
    period: `${assignment.startDate} ~ ${assignment.endDate}`,
    percentage: `投入: ${(assignment.percentage * 100).toFixed(0)}%`
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}

// 計算透明度 (基於投入百分比, 範圍 40% ~ 100%)
function getOpacity(percentage: number): number {
  // 線性映射: 0% -> 0.4, 100% -> 1.0
  return Math.max(0.4, Math.min(1, 0.4 + percentage * 0.6))
}
</script>

<template>
  <div class="person-gantt">
    <div class="gantt-container">
      <!-- 時間軸標題 -->
      <div class="gantt-header" :style="{ width: totalWidth + 140 + 'px' }">
        <div class="gantt-label header-label">人員</div>
        <div class="gantt-timeline">
          <div
            v-for="month in months"
            :key="month.label"
            class="month-header"
            :style="{ width: store.scale.monthWidth + 'px' }"
          >
            {{ month.label }}
          </div>
        </div>
      </div>

      <!-- 人員群組 -->
      <div
        v-for="(personData, pIdx) in personRows"
        :key="personData.person"
        class="person-group"
        :class="{ 'alt-group': pIdx % 2 === 1 }"
      >
        <div class="person-group-inner">
          <!-- 人員名稱 (跨越所有行，垂直居中) -->
          <div 
            class="gantt-label person-label"
            :style="{ height: personData.rows.length * store.scale.rowHeight + 'px' }"
          >
            <span>{{ personData.person }}</span>
          </div>
          
          <!-- 工作負載背景層 (跨越所有行) -->
          <div 
            class="workload-background-layer"
            :style="{ 
              width: totalWidth + 'px',
              height: personData.rows.length * store.scale.rowHeight + 'px'
            }"
          >
            <div
              v-for="month in months"
              :key="'bg-' + month.label"
              class="workload-column"
              :class="{
                'workload-overload': getMonthWorkloadStatus(personData.person, month.label) === 'overload',
                'workload-underload': getMonthWorkloadStatus(personData.person, month.label) === 'underload',
                'workload-unavailable': false
              }"
              :style="{ width: store.scale.monthWidth + 'px' }"
            />
          </div>
          
          <!-- 人員內的多列 -->
          <div class="person-rows">
            <div
              v-for="(row, rowIdx) in personData.rows"
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
                  class="month-cell"
                  :style="{ width: store.scale.monthWidth + 'px' }"
                />
                
                <!-- 投入 Bar -->
                <div
                  v-for="(assignment, idx) in row"
                  :key="`${assignment.projectName}-${assignment.phaseName}-${idx}`"
                  class="gantt-bar"
                  :style="{
                    left: getXPosition(assignment.startDate) + 'px',
                    width: getWidth(assignment.startDate, assignment.endDate) + 'px',
                    backgroundColor: getProjectColor(assignment.projectIndex),
                    opacity: getOpacity(assignment.percentage)
                  }"
                  @mouseenter="showTooltip($event, assignment)"
                  @mouseleave="hideTooltip"
                >
                  {{ getWidth(assignment.startDate, assignment.endDate) >= 100 
                    ? `${assignment.projectName} - ${assignment.phaseName}`
                    : assignment.projectName 
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
        <div class="tooltip-title">{{ tooltip.person }}</div>
        <div class="tooltip-project">{{ tooltip.project }} - {{ tooltip.phase }}</div>
        <div class="tooltip-info">{{ tooltip.period }}</div>
        <div class="tooltip-percentage">{{ tooltip.percentage }}</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.person-gantt {
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
  z-index: 20;
  border-bottom: 2px solid var(--color-border);
}

.header-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
}

.month-header {
  flex-shrink: 0;
  padding: var(--spacing-sm);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  border-right: 1px solid var(--color-border);
}

/* 人員群組樣式 */
.person-group {
  border-bottom: 2px solid var(--color-border);
}

.person-group.alt-group {
  background: var(--color-bg-alt);
}

.person-group:last-child {
  border-bottom: none;
}

.person-group-inner {
  display: flex;
  position: relative;
}

.gantt-label {
  flex-shrink: 0;
  width: 140px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  position: sticky;
  left: 0;
  z-index: 10;
}

.person-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: 500;
  font-size: var(--font-size-sm);
}



/* 工作負載背景層 (跨越所有行) */
.workload-background-layer {
  position: absolute;
  left: 140px;
  top: 0;
  display: flex;
  z-index: 1;
  pointer-events: none;
}

.workload-column {
  flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

/* 工作負載超過 110% - 柔和紅色 */
.workload-column.workload-overload {
  background: rgba(239, 68, 68, 0.18);
}

/* 工作負載少於 50% - 柔和綠色 */
.workload-column.workload-underload {
  background: rgba(34, 197, 94, 0.15);
}

/* 工作負載為 0% - 柔和灰色 (人員尚未報到或另有調度) */
.workload-column.workload-unavailable {
  background: rgba(148, 163, 184, 0.15);
}

.person-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  z-index: 2;
}

.gantt-row {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.person-rows .gantt-row:last-child {
  border-bottom: none;
}

.gantt-timeline {
  position: relative;
  display: flex;
}

/* 月份格子樣式 */
.month-cell {
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
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: filter var(--transition-fast), transform var(--transition-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 var(--spacing-sm);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.gantt-bar:hover {
  filter: brightness(1.15);
  transform: translateY(-50%) scale(1.02);
  z-index: 5;
  opacity: 1 !important;
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

.tooltip-project {
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  margin-bottom: var(--spacing-xs);
}

.tooltip-info {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.tooltip-percentage {
  color: var(--color-success);
  font-size: var(--font-size-xs);
  font-weight: 500;
  margin-top: var(--spacing-xs);
}
</style>
