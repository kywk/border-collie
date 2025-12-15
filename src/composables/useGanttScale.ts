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
        const result: { year: number; month: number; label: string }[] = []

        const current = new Date(start)
        while (current <= end) {
            result.push({
                year: current.getFullYear(),
                month: current.getMonth() + 1,
                label: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
            })
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

    return {
        months,
        totalWidth,
        getXPosition,
        getWidth,
        getProjectColor
    }
}
