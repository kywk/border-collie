/**
 * BorderCollie - Type Definitions
 */

/** 人員指派 */
export interface Assignment {
    person: string
    percentage: number // 0.0 ~ 1.0
}

/** 專案階段 */
export interface Phase {
    name: string
    startDate: string | null    // YYYY-MM 或 YYYY-MM-DD, null 表示接續前一階段
    endDate: string
    assignments: Assignment[]
}

/** 專案 */
export interface Project {
    name: string
    phases: Phase[]
}

/** 解析後的計算階段資料 (包含實際日期) */
export interface ComputedPhase extends Omit<Phase, 'startDate'> {
    projectName: string
    projectIndex: number
    startDate: string           // 計算後的實際開始日期
    totalAssignment: number     // 總投入人力
    isContinuation: boolean     // 是否為接續前一階段 (決定箭頭樣式)
}

/** 人員投入記錄 */
export interface PersonAssignment {
    person: string
    projectName: string
    projectIndex: number
    phaseName: string
    startDate: string
    endDate: string
    percentage: number
    isContinuation: boolean     // 繼承自 Phase
}

/** 時間範圍 */
export interface TimeRange {
    start: Date
    end: Date
}

/** 甘特圖縮放設定 */
export interface GanttScale {
    monthWidth: number    // 每月寬度 (px)
    rowHeight: number     // 每行高度 (px)
}
