/**
 * BorderCollie - Text Parser
 * 解析純文字格式為資料模型
 */

import type { Project, Phase, Assignment } from '@/types'

/**
 * 解析純文字格式的專案資料
 * 
 * 格式範例:
 * ```
 * AI OCR:
 * - BA, 2025-10-01, 2025-11-30: Andy 0.3, Ben 0.8, Cat 0.5
 * - SA, --, 2026-02: Andy 0.3, Danny 0.6, Elsa 0.2
 * ```
 */
export function parseText(text: string): Project[] {
    const lines = text.split('\n')
    const projects: Project[] = []
    let currentProject: Project | null = null

    for (const line of lines) {
        const trimmedLine = line.trim()

        // 跳過空行
        if (!trimmedLine) continue

        // 檢查是否為專案名稱 (以冒號結尾，不是以 - 開頭)
        if (!trimmedLine.startsWith('-') && trimmedLine.endsWith(':')) {
            // 儲存前一個專案
            if (currentProject) {
                projects.push(currentProject)
            }
            // 開始新專案
            currentProject = {
                name: trimmedLine.slice(0, -1).trim(),
                phases: []
            }
            continue
        }

        // 檢查是否為階段行 (以 - 開頭)
        if (trimmedLine.startsWith('-') && currentProject) {
            const phase = parsePhase(trimmedLine.slice(1).trim())
            if (phase) {
                currentProject.phases.push(phase)
            }
        }
    }

    // 儲存最後一個專案
    if (currentProject) {
        projects.push(currentProject)
    }

    return projects
}

/**
 * 解析階段行
 * 格式: 階段名, 開始時間, 結束時間: 人員1 百分比, 人員2 百分比, ...
 */
function parsePhase(line: string): Phase | null {
    // 分離階段資訊和人員指派
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) return null

    const phaseInfo = line.slice(0, colonIndex).trim()
    const assignmentInfo = line.slice(colonIndex + 1).trim()

    // 解析階段資訊: 階段名, 開始時間, 結束時間
    const phasePattern = /^([^,]+),\s*([^,]+),\s*(.+)$/
    const phaseMatch = phaseInfo.match(phasePattern)
    if (!phaseMatch) return null

    const [, name, startRaw, endDate] = phaseMatch

    // 處理開始時間 (-- 表示接續前一階段)
    const startDate = startRaw.trim() === '--' ? null : startRaw.trim()

    // 解析人員指派
    const assignments = parseAssignments(assignmentInfo)

    return {
        name: name.trim(),
        startDate,
        endDate: endDate.trim(),
        assignments
    }
}

/**
 * 解析人員指派列表
 * 格式: 人員1 百分比, 人員2 百分比, ...
 */
function parseAssignments(text: string): Assignment[] {
    if (!text.trim()) return []

    const assignments: Assignment[] = []
    const parts = text.split(',')

    for (const part of parts) {
        const trimmed = part.trim()
        // 格式: 人員名 百分比
        const match = trimmed.match(/^(.+?)\s+([\d.]+)$/)
        if (match) {
            assignments.push({
                person: match[1].trim(),
                percentage: parseFloat(match[2])
            })
        }
    }

    return assignments
}



/**
 * 判斷日期格式是否為月份格式 (YYYY-MM)
 */
export function isMonthFormat(date: string): boolean {
    return /^\d{4}-\d{2}$/.test(date)
}

/**
 * 標準化日期為完整日期格式
 * YYYY-MM -> YYYY-MM-01 (月初)
 * YYYY-MM-DD -> YYYY-MM-DD
 */
export function normalizeDate(date: string, isEnd: boolean = false): string {
    if (isMonthFormat(date)) {
        if (isEnd) {
            // 月末日期
            const [year, month] = date.split('-').map(Number)
            const lastDay = new Date(year, month, 0).getDate()
            return `${date}-${String(lastDay).padStart(2, '0')}`
        }
        return `${date}-01`
    }
    return date
}
