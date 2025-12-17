<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import type { Project, Phase } from '@/types'

const store = useProjectStore()

// 計算所有人員列表
// 計算所有人員列表
const extraPersons = ref<string[]>([])
const allPersons = computed(() => {
  const combined = new Set([...store.allPersons, ...extraPersons.value])
  return Array.from(combined).sort()
})

// 新增專案
function addProject() {
  const newProject: Project = {
    name: '新專案',
    phases: [{
      name: '階段1',
      startDate: new Date().toISOString().slice(0, 7),
      endDate: new Date().toISOString().slice(0, 7),
      assignments: []
    }]
  }
  store.updateProjects([...store.projects, newProject])
}

// 新增階段
function addPhase(projectIndex: number) {
  const projects = [...store.projects]
  const project = projects[projectIndex]
  project.phases.push({
    name: '新階段',
    startDate: null, // 接續前一階段
    endDate: new Date().toISOString().slice(0, 7),
    assignments: []
  })
  store.updateProjects(projects)
}

// 更新專案名稱
function updateProjectName(projectIndex: number, name: string) {
  const projects = [...store.projects]
  projects[projectIndex].name = name
  store.updateProjects(projects)
}

// 更新階段
function updatePhase(
  projectIndex: number,
  phaseIndex: number,
  field: keyof Phase,
  value: string | null
) {
  const projects = [...store.projects]
  const phase = projects[projectIndex].phases[phaseIndex]
  
  if (field === 'startDate') {
    phase.startDate = value === '--' || value === '' ? null : value
  } else if (field === 'name' || field === 'endDate') {
    ;(phase[field] as string) = value as string
  }
  
  store.updateProjects(projects)
}

// 更新人員投入
function updateAssignment(
  projectIndex: number,
  phaseIndex: number,
  person: string,
  percentage: string
) {
  const projects = [...store.projects]
  const phase = projects[projectIndex].phases[phaseIndex]
  const value = parseFloat(percentage) || 0
  
  const existingIndex = phase.assignments.findIndex(a => a.person === person)
  
  if (value > 0) {
    if (existingIndex >= 0) {
      phase.assignments[existingIndex].percentage = value
    } else {
      phase.assignments.push({ person, percentage: value })
    }
  } else {
    if (existingIndex >= 0) {
      phase.assignments.splice(existingIndex, 1)
    }
  }
  
  store.updateProjects(projects)
}

// 取得人員投入
function getAssignment(phase: Phase, person: string): string {
  const assignment = phase.assignments.find(a => a.person === person)
  return assignment ? String(assignment.percentage) : ''
}

// 計算階段總人力
function getTotalAssignment(phase: Phase): number {
  return phase.assignments.reduce((sum, a) => sum + a.percentage, 0)
}

// 刪除階段
function removePhase(projectIndex: number, phaseIndex: number) {
  const projects = [...store.projects]
  projects[projectIndex].phases.splice(phaseIndex, 1)
  if (projects[projectIndex].phases.length === 0) {
    projects.splice(projectIndex, 1)
  }
  store.updateProjects(projects)
}

// 新增人員
const newPersonName = ref('')
function addPerson() {
  const name = newPersonName.value.trim()
  if (!name) return
  
  if (!store.allPersons.includes(name) && !extraPersons.value.includes(name)) {
    extraPersons.value.push(name)
  }
  newPersonName.value = ''
}
</script>

<template>
  <div class="table-editor">
    <div class="table-toolbar">
      <button class="btn btn-primary" @click="addProject">
        ＋ 新增專案
      </button>
      <div class="add-person">
        <input
          v-model="newPersonName"
          placeholder="新增人員..."
          @keyup.enter="addPerson"
        />
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-project">專案</th>
            <th class="col-phase">階段</th>
            <th class="col-date">開始時間</th>
            <th class="col-date">結束時間</th>
            <th class="col-total">人力投入</th>
            <th
              v-for="person in allPersons"
              :key="person"
              class="col-person"
            >
              {{ person }}
            </th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(project, pIdx) in store.projects" :key="pIdx">
            <tr v-for="(phase, phIdx) in project.phases" :key="`${pIdx}-${phIdx}`">
              <!-- 專案名稱 (第一個階段時顯示) -->
              <td
                v-if="phIdx === 0"
                :rowspan="project.phases.length"
                class="col-project"
              >
                <input
                  :value="project.name"
                  @change="e => updateProjectName(pIdx, (e.target as HTMLInputElement).value)"
                />
                <button
                  class="btn-add-phase"
                  @click="addPhase(pIdx)"
                  title="新增階段"
                >
                  ＋
                </button>
              </td>
              
              <!-- 階段名稱 -->
              <td class="col-phase">
                <input
                  :value="phase.name"
                  @change="e => updatePhase(pIdx, phIdx, 'name', (e.target as HTMLInputElement).value)"
                />
              </td>
              
              <!-- 開始時間 -->
              <td class="col-date">
                <input
                  :value="phase.startDate ?? '--'"
                  placeholder="-- 或 YYYY-MM"
                  @change="e => updatePhase(pIdx, phIdx, 'startDate', (e.target as HTMLInputElement).value)"
                />
              </td>
              
              <!-- 結束時間 -->
              <td class="col-date">
                <input
                  :value="phase.endDate"
                  placeholder="YYYY-MM"
                  @change="e => updatePhase(pIdx, phIdx, 'endDate', (e.target as HTMLInputElement).value)"
                />
              </td>
              
              <!-- 人力投入 (自動計算) -->
              <td class="col-total">
                <span class="total-value">{{ getTotalAssignment(phase).toFixed(1) }}</span>
              </td>
              
              <!-- 各人員投入 -->
              <td
                v-for="person in allPersons"
                :key="person"
                class="col-person"
              >
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  :value="getAssignment(phase, person)"
                  @change="e => updateAssignment(pIdx, phIdx, person, (e.target as HTMLInputElement).value)"
                />
              </td>
              
              <!-- 操作 -->
              <td class="col-actions">
                <button
                  class="btn-delete"
                  @click="removePhase(pIdx, phIdx)"
                  title="刪除階段"
                >
                  ✕
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.add-person input {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  width: 150px;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
}

.col-project {
  min-width: 120px;
  position: relative;
}

.col-project input {
  font-weight: 600;
}

.btn-add-phase {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.btn-add-phase:hover {
  opacity: 1;
}

.col-phase {
  min-width: 100px;
}

.col-date {
  min-width: 100px;
}

.col-date input {
  text-align: center;
}

.col-total {
  min-width: 70px;
  text-align: center;
}

.total-value {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  font-weight: 500;
  color: var(--color-accent);
}

.col-person {
  min-width: 60px;
}

.col-person input {
  text-align: center;
  width: 50px;
}

.col-actions {
  width: 40px;
  text-align: center;
}

.btn-delete {
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all var(--transition-fast);
}

.btn-delete:hover {
  background: var(--color-error);
  color: white;
}
</style>
