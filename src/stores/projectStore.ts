/**
 * BorderCollie - Project Store
 * Pinia store 管理專案資料解析與甘特圖計算
 * 注意：持久化由 workspaceStore 處理
 */

import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Project, ComputedPhase, PersonAssignment, TimeRange, GanttScale } from '@/types'
import { parseText } from '@/parser/textParser'
import { serializeToText } from '@/parser/serializer'
import { normalizeDate } from '@/parser/textParser'
import { useWorkspaceStore } from './workspaceStore'
import { parseFrontmatter } from '@/parser/frontmatterParser'

const DEFAULT_TEXT = `AI OCR:
- BA, 2025-10-01, 2025-11-30: Andy 0.3, Ben 0.8, Cat 0.5
- SA, --, 2026-02: Andy 0.3, Danny 0.6, Elsa 0.2
- SD, --, 2026-04: Andy 0.6, Elsa 0.2, Frank 0.2
- Dev, 2026-03, 2026-05: Andy 0.1, Elsa 0.6, Frank 0.6
- Sit, --, 2026-06: Elsa 0.3, Frank 0.3
- Uat, --, 2026-07: Elsa 0.1, Frank 0.1, Ben 0.7, Cat 0.4
Staff Portal:
- BA/SA, 2026-01, 2026-06: Andy 0.3, Monica 0.7, Amber 0.4
- SD/Dev, 2026-03, 2026-09: Andy 0.2, Amber 0.7, Kevin 0.7
- Sit/Uat, --, 2026-11: Amber 0.2, Kevin 0.2, Monica 0.5, Norman 0.5`

export const useProjectStore = defineStore('projects', () => {
    // State
    const rawText = ref('')
    const projects = ref<Project[]>([])
    const scale = ref<GanttScale>({
        monthWidth: 60,
        rowHeight: 48
    })
    // Bar style: 'block' for standard rectangular bars, 'arrow' for chevron/arrow style
    const barStyle = ref<'block' | 'arrow'>('block')

    // Toggle bar style
    function toggleBarStyle() {
        barStyle.value = barStyle.value === 'block' ? 'arrow' : 'block'
    }

    // 初始化：從 workspaceStore 取得當前工作區內容
    function init() {
        const workspaceStore = useWorkspaceStore()
        workspaceStore.init()

        // 監聽 workspace 變化
        const { currentRawText } = storeToRefs(workspaceStore)

        // 初始載入
        loadFromWorkspace()

        // 監聽切換
        watch(currentRawText, () => {
            loadFromWorkspace()
        })
    }

    function loadFromWorkspace() {
        const workspaceStore = useWorkspaceStore()
        const ws = workspaceStore.currentWorkspace

        if (ws) {
            rawText.value = workspaceStore.currentRawText
            // 解析時只取 content 部分（不含 frontmatter）
            projects.value = parseText(ws.content)
        } else {
            rawText.value = DEFAULT_TEXT
            projects.value = parseText(DEFAULT_TEXT)
        }
    }

    // 更新純文字並解析
    function updateText(text: string) {
        rawText.value = text

        // 解析 frontmatter 和 content
        const { content } = parseFrontmatter(text)
        projects.value = parseText(content)

        // 同步至 workspace store
        const workspaceStore = useWorkspaceStore()
        workspaceStore.updateCurrentRawText(text)
    }

    // 更新專案列表並序列化
    function updateProjects(newProjects: Project[]) {
        projects.value = newProjects
        const serializedContent = serializeToText(newProjects)

        // 只更新 content 部分
        const workspaceStore = useWorkspaceStore()
        workspaceStore.updateCurrentContent(serializedContent)

        // 重新取得完整 rawText
        rawText.value = workspaceStore.currentRawText
    }

    // 縮放控制
    function zoomIn() {
        scale.value.monthWidth = Math.min(scale.value.monthWidth + 10, 150)
        scale.value.rowHeight = Math.min(scale.value.rowHeight + 4, 80)
    }

    function zoomOut() {
        scale.value.monthWidth = Math.max(scale.value.monthWidth - 10, 30)
        scale.value.rowHeight = Math.max(scale.value.rowHeight - 4, 32)
    }

    function resetZoom() {
        scale.value = { monthWidth: 60, rowHeight: 48 }
    }

    // 計算屬性：所有階段 (含計算後的實際開始日期)
    const computedPhases = computed<ComputedPhase[]>(() => {
        const result: ComputedPhase[] = []

        projects.value.forEach((project, projectIndex) => {
            let previousEndDate: string | null = null

            project.phases.forEach((phase) => {
                // 計算實際開始日期
                let startDate: string
                if (phase.startDate) {
                    startDate = phase.startDate
                } else if (previousEndDate) {
                    // 接續前一階段: 結束日期的下一天/下一月
                    startDate = getNextDay(previousEndDate)
                } else {
                    // 沒有前一階段，使用結束日期作為開始日期
                    startDate = phase.endDate
                }

                // 計算總投入人力
                const totalAssignment = phase.assignments.reduce(
                    (sum, a) => sum + a.percentage, 0
                )

                // 判斷是否為接續階段 (原 startDate 為空且有前一階段)
                const isContinuation = !phase.startDate && !!previousEndDate

                result.push({
                    ...phase,
                    projectName: project.name,
                    projectIndex,
                    startDate,
                    totalAssignment,
                    isContinuation
                })

                previousEndDate = phase.endDate
            })
        })

        return result
    })

    // 計算屬性：所有人員列表
    const allPersons = computed<string[]>(() => {
        const personSet = new Set<string>()
        projects.value.forEach(project => {
            project.phases.forEach(phase => {
                phase.assignments.forEach(a => {
                    personSet.add(a.person)
                })
            })
        })
        return Array.from(personSet).sort()
    })

    // 計算屬性：人員投入記錄 (給人力甘特圖用)
    const personAssignments = computed<PersonAssignment[]>(() => {
        const result: PersonAssignment[] = []

        computedPhases.value.forEach(phase => {
            phase.assignments.forEach(a => {
                result.push({
                    person: a.person,
                    projectName: phase.projectName,
                    projectIndex: phase.projectIndex,
                    phaseName: phase.name,
                    startDate: phase.startDate,
                    endDate: phase.endDate,
                    percentage: a.percentage,
                    isContinuation: phase.isContinuation
                })
            })
        })

        return result
    })

    // 計算屬性：時間範圍
    const timeRange = computed<TimeRange>(() => {
        let minDate = new Date()
        let maxDate = new Date()
        let hasData = false

        computedPhases.value.forEach(phase => {
            const start = new Date(normalizeDate(phase.startDate))
            const end = new Date(normalizeDate(phase.endDate, true))

            if (!hasData) {
                minDate = start
                maxDate = end
                hasData = true
            } else {
                if (start < minDate) minDate = start
                if (end > maxDate) maxDate = end
            }
        })

        // 擴展範圍：前後各加一個月
        minDate.setMonth(minDate.getMonth() - 1)
        maxDate.setMonth(maxDate.getMonth() + 1)

        return { start: minDate, end: maxDate }
    })

    // 輔助函數：獲取下一天日期
    function getNextDay(date: string): string {
        const d = new Date(normalizeDate(date, true))
        d.setDate(d.getDate() + 1)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    return {
        // State
        rawText,
        projects,
        scale,
        barStyle,
        // Actions
        init,
        updateText,
        updateProjects,
        zoomIn,
        zoomOut,
        resetZoom,
        toggleBarStyle,
        // Computed
        computedPhases,
        allPersons,
        personAssignments,
        timeRange
    }
})
