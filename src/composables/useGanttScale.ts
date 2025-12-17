/**
 * BorderCollie - useGanttScale Composable
 * 時間軸計算邏輯
 */

import { computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { normalizeDate, isMonthFormat } from '@/parser/textParser'

export function useGanttScale() {
    const store = useProjectStore()

    // 月份列表
    const months = computed(() => {
        const { start, end } = store.timeRange
        const result: {
            year: number
            month: number
            label: string
            shortLabel: string      // 簡短標籤：首月顯示 "YYYY-MM"，其他只顯示 "MM"
            isFirstMonthOfYear: boolean
            isEvenYear: boolean     // 用於年度交替背景色
        }[] = []

        const current = new Date(start)
        let prevYear = -1

        while (current <= end) {
            const year = current.getFullYear()
            const month = current.getMonth() + 1
            const isFirstMonth = year !== prevYear

            result.push({
                year,
                month,
                label: `${year}-${String(month).padStart(2, '0')}`,
                shortLabel: isFirstMonth
                    ? `${year}-${String(month).padStart(2, '0')}`
                    : String(month).padStart(2, '0'),
                isFirstMonthOfYear: isFirstMonth,
                isEvenYear: year % 2 === 0
            })

            prevYear = year
            current.setMonth(current.getMonth() + 1)
        }

        return result
    })

    // 總寬度
    const totalWidth = computed(() => {
        return months.value.length * store.scale.monthWidth
    })

    // 計算日期對應的 X 座標
    function getXPosition(dateStr: string): number {
        const { start } = store.timeRange
        const date = new Date(normalizeDate(dateStr))

        // 計算距離開始的月份數
        const monthsDiff = (date.getFullYear() - start.getFullYear()) * 12
            + (date.getMonth() - start.getMonth())

        // 如果是完整日期格式，加上日內偏移
        let dayOffset = 0
        if (!isMonthFormat(dateStr)) {
            const day = date.getDate()
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
            dayOffset = (day - 1) / daysInMonth
        }

        return (monthsDiff + dayOffset) * store.scale.monthWidth
    }

    // 計算日期範圍對應的寬度
    function getWidth(startDate: string, endDate: string): number {
        const startX = getXPosition(startDate)
        const endX = getXPosition(normalizeDate(endDate, true))
        // 加上結束月的剩餘天數
        const endDateObj = new Date(normalizeDate(endDate, true))
        const daysInMonth = new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 1, 0).getDate()
        const dayWidth = store.scale.monthWidth / daysInMonth

        return Math.max(endX - startX + dayWidth, store.scale.monthWidth / 2)
    }

    // 取得專案顏色
    function getProjectColor(projectIndex: number): string {
        const colors = [
            'var(--gantt-color-1)',
            'var(--gantt-color-2)',
            'var(--gantt-color-3)',
            'var(--gantt-color-4)',
            'var(--gantt-color-5)',
            'var(--gantt-color-6)',
            'var(--gantt-color-7)',
            'var(--gantt-color-8)',
        ]
        return colors[projectIndex % colors.length]
    }

    // 取得專案漸層色
    function getProjectGradient(projectIndex: number): string {
        const colorPairs = [
            { base: 'var(--gantt-color-1)', light: 'var(--gantt-color-1-light)' },
            { base: 'var(--gantt-color-2)', light: 'var(--gantt-color-2-light)' },
            { base: 'var(--gantt-color-3)', light: 'var(--gantt-color-3-light)' },
            { base: 'var(--gantt-color-4)', light: 'var(--gantt-color-4-light)' },
            { base: 'var(--gantt-color-5)', light: 'var(--gantt-color-5-light)' },
            { base: 'var(--gantt-color-6)', light: 'var(--gantt-color-6-light)' },
            { base: 'var(--gantt-color-7)', light: 'var(--gantt-color-7-light)' },
            { base: 'var(--gantt-color-8)', light: 'var(--gantt-color-8-light)' },
        ]
        const pair = colorPairs[projectIndex % colorPairs.length]
        return `linear-gradient(135deg, ${pair.light} 0%, ${pair.base} 100%)`
    }

    // 取得今天的 X 座標位置
    function getTodayPosition(): number {
        const { start, end } = store.timeRange
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 檢查今天是否在時間範圍內
        if (today < start || today > end) {
            return -1 // 不在範圍內，不顯示
        }

        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        return getXPosition(todayStr)
    }

    return {
        months,
        totalWidth,
        getXPosition,
        getWidth,
        getProjectColor,
        getProjectGradient,
        getTodayPosition
    }
}
