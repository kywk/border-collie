import { toPng, toSvg } from 'html-to-image'
import PptxGenJS from 'pptxgenjs'
import ExcelJS from 'exceljs'
import type { Project, PersonAssignment, ComputedPhase } from '@/types'

// ============================================================================
// Excel Export
// ============================================================================

/**
 * Export Gantt data to Excel (.xlsx)
 * Creates two worksheets: ProjectGantt and PersonGantt
 */
export async function exportToExcel(store: any): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BorderCollie'
    workbook.created = new Date()

    // Get timeline data
    const { startDate, endDate, totalMonths, monthLabels } = getTimelineData(store)

    // Create worksheets
    createProjectGanttSheet(workbook, store, startDate, endDate, totalMonths, monthLabels)
    createPersonGanttSheet(workbook, store, startDate, endDate, totalMonths, monthLabels)

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'border-collie-gantt.xlsx'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
}

// Project colors (matching PPT export)
const PROJECT_COLORS = ['60A5FA', '34D399', 'FBBF24', 'A78BFA', 'F472B6', '2DD4BF', 'FB923C', '818CF8']

function createProjectGanttSheet(
    workbook: ExcelJS.Workbook,
    store: any,
    startDate: Date,
    _endDate: Date,
    totalMonths: number,
    monthLabels: string[]
) {
    const ws = workbook.addWorksheet('ProjectGantt')

    // Column A for project/phase names
    ws.getColumn(1).width = 25

    // Set month column widths
    for (let i = 0; i < totalMonths; i++) {
        ws.getColumn(i + 2).width = 8
    }

    // Row 1: Year headers
    let currentYear = 0
    let yearStartCol = 2
    monthLabels.forEach((label, idx) => {
        const year = parseInt(label.split('-')[0])
        if (year !== currentYear) {
            if (currentYear !== 0) {
                // Merge previous year cells
                if (idx + 1 > yearStartCol) {
                    ws.mergeCells(1, yearStartCol, 1, idx + 1)
                }
            }
            yearStartCol = idx + 2
            currentYear = year
        }
        ws.getCell(1, idx + 2).value = year
    })
    // Merge last year
    if (totalMonths + 1 >= yearStartCol) {
        ws.mergeCells(1, yearStartCol, 1, totalMonths + 1)
    }

    // Style year row
    const yearRow = ws.getRow(1)
    yearRow.height = 20
    yearRow.eachCell((cell, colNumber) => {
        if (colNumber > 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
    })

    // Row 2: Month headers
    monthLabels.forEach((label, idx) => {
        const month = label.split('-')[1]
        const cell = ws.getCell(2, idx + 2)
        cell.value = parseInt(month) + '月'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
        cell.font = { size: 10 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
    })
    ws.getRow(2).height = 18

    // Freeze panes
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }]

    // Data rows
    let currentRow = 3
    store.projects.forEach((project: Project, pIdx: number) => {
        if (project.pending) return

        const color = PROJECT_COLORS[pIdx % PROJECT_COLORS.length]

        // Get phases for this project from computedPhases
        const projectPhases = store.computedPhases.filter(
            (p: ComputedPhase) => p.projectName === project.name
        )

        // Pack phases into rows (non-overlapping)
        const packedRows: ComputedPhase[][] = []
        projectPhases.forEach((phase: ComputedPhase) => {
            let placed = false
            for (const row of packedRows) {
                const overlap = row.some(p => {
                    const s1 = new Date(normalizeDate(phase.startDate)).getTime()
                    const e1 = new Date(normalizeDate(phase.endDate, true)).getTime()
                    const s2 = new Date(normalizeDate(p.startDate)).getTime()
                    const e2 = new Date(normalizeDate(p.endDate, true)).getTime()
                    return s1 < e2 && s2 < e1
                })
                if (!overlap) {
                    row.push(phase)
                    placed = true
                    break
                }
            }
            if (!placed) packedRows.push([phase])
        })

        // Draw project name (spanning all its rows)
        const startRow = currentRow
        const rowCount = Math.max(1, packedRows.length)

        // Merge project name cells
        if (rowCount > 1) {
            ws.mergeCells(startRow, 1, startRow + rowCount - 1, 1)
        }
        const nameCell = ws.getCell(startRow, 1)
        nameCell.value = project.name
        nameCell.font = { bold: true }
        nameCell.alignment = { vertical: 'middle' }
        nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }

        // Draw phases
        packedRows.forEach((row, rIdx) => {
            const rowNum = currentRow + rIdx

            row.forEach(phase => {
                const phaseStart = new Date(normalizeDate(phase.startDate))
                const phaseEnd = new Date(normalizeDate(phase.endDate, true))

                // Calculate column range
                const startCol = getMonthColumn(startDate, phaseStart) + 2
                const endCol = getMonthColumn(startDate, phaseEnd) + 2

                if (startCol <= endCol && startCol >= 2) {
                    // Merge cells for the phase
                    if (endCol > startCol) {
                        ws.mergeCells(rowNum, startCol, rowNum, endCol)
                    }

                    const cell = ws.getCell(rowNum, startCol)
                    cell.value = phase.name
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } }
                    cell.font = { color: { argb: 'FFFFFFFF' }, size: 9 }
                    cell.alignment = { horizontal: 'center', vertical: 'middle' }
                }
            })

            ws.getRow(rowNum).height = 22
        })

        currentRow += rowCount
    })
}

function createPersonGanttSheet(
    workbook: ExcelJS.Workbook,
    store: any,
    startDate: Date,
    _endDate: Date,
    totalMonths: number,
    monthLabels: string[]
) {
    const ws = workbook.addWorksheet('PersonGantt')

    // Column A for person/assignment names
    ws.getColumn(1).width = 28

    // Set month column widths
    for (let i = 0; i < totalMonths; i++) {
        ws.getColumn(i + 2).width = 6
    }

    // Row 1: Year headers (same as ProjectGantt)
    let currentYear = 0
    let yearStartCol = 2
    monthLabels.forEach((label, idx) => {
        const year = parseInt(label.split('-')[0])
        if (year !== currentYear) {
            if (currentYear !== 0 && idx + 1 > yearStartCol) {
                ws.mergeCells(1, yearStartCol, 1, idx + 1)
            }
            yearStartCol = idx + 2
            currentYear = year
        }
        ws.getCell(1, idx + 2).value = year
    })
    if (totalMonths + 1 >= yearStartCol) {
        ws.mergeCells(1, yearStartCol, 1, totalMonths + 1)
    }

    const yearRow = ws.getRow(1)
    yearRow.height = 20
    yearRow.eachCell((cell, colNumber) => {
        if (colNumber > 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
    })

    // Row 2: Month headers
    monthLabels.forEach((label, idx) => {
        const month = label.split('-')[1]
        const cell = ws.getCell(2, idx + 2)
        cell.value = parseInt(month) + '月'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
        cell.font = { size: 9 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    ws.getRow(2).height = 18

    // Freeze panes
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }]

    // Data rows - group by person
    let currentRow = 3

    store.allPersons.forEach((person: string) => {
        // Person name row with monthly load
        const nameCell = ws.getCell(currentRow, 1)
        nameCell.value = person
        nameCell.font = { bold: true }
        nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }

        // Calculate and display monthly load
        const assignments = store.personAssignments.filter(
            (a: PersonAssignment) => a.person === person
        )

        for (let monthIdx = 0; monthIdx < totalMonths; monthIdx++) {
            const monthDate = new Date(startDate)
            monthDate.setMonth(monthDate.getMonth() + monthIdx)
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

            // Sum load for this month
            let monthLoad = 0
            assignments.forEach((a: PersonAssignment) => {
                const aStart = new Date(normalizeDate(a.startDate))
                const aEnd = new Date(normalizeDate(a.endDate, true))
                if (aStart <= monthEnd && aEnd >= monthStart) {
                    monthLoad += a.percentage
                }
            })

            const cell = ws.getCell(currentRow, monthIdx + 2)
            if (monthLoad > 0) {
                cell.value = Math.round(monthLoad * 10) / 10
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
                cell.font = { size: 9, bold: true }

                // Color based on load
                if (monthLoad > 1.1) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
                    cell.font = { size: 9, bold: true, color: { argb: 'FFDC2626' } }
                } else if (monthLoad >= 0.5) {
                    cell.font = { size: 9, bold: true, color: { argb: 'FF16A34A' } }
                } else {
                    cell.font = { size: 9, color: { argb: 'FF6B7280' } }
                }
            }
        }

        ws.getRow(currentRow).height = 20
        currentRow++

        // Assignment rows for this person
        assignments.forEach((assignment: PersonAssignment) => {
            const labelCell = ws.getCell(currentRow, 1)
            labelCell.value = `  ${assignment.projectName} - ${assignment.phaseName}`
            labelCell.font = { size: 9, color: { argb: 'FF6B7280' } }

            const aStart = new Date(normalizeDate(assignment.startDate))
            const aEnd = new Date(normalizeDate(assignment.endDate, true))

            const startCol = getMonthColumn(startDate, aStart) + 2
            const endCol = getMonthColumn(startDate, aEnd) + 2

            if (startCol <= endCol && startCol >= 2) {
                const color = PROJECT_COLORS[assignment.projectIndex % PROJECT_COLORS.length]

                if (endCol > startCol) {
                    ws.mergeCells(currentRow, startCol, currentRow, endCol)
                }

                const cell = ws.getCell(currentRow, startCol)
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } }
            }

            ws.getRow(currentRow).height = 18
            currentRow++
        })

        // Add empty row between persons
        currentRow++
    })
}

// Get month column index (0-based)
function getMonthColumn(startDate: Date, targetDate: Date): number {
    return (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
        (targetDate.getMonth() - startDate.getMonth())
}

/**
 * Export specific element to Image
 * Handles temporarily switching to Light mode if needed
 */
export async function exportToImage(elementId: string, format: 'png' | 'svg' = 'png', fileName: string = 'gantt-chart') {
    const element = document.getElementById(elementId)
    if (!element) {
        console.error('Element not found:', elementId)
        return
    }

    // Save current theme
    const currentTheme = document.documentElement.getAttribute('data-theme')
    const isDark = currentTheme !== 'light'

    // Force Light mode for export
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light')
        // Wait for styles to apply (repaint)
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    try {
        let dataUrl = ''
        const options = { quality: 0.95, backgroundColor: '#ffffff' }

        // Clone node to handle scrolling
        // We can't just capture the element directly if it has overflow
        // We need to capture the full scrollWidth/scrollHeight
        const node = element
        const width = node.scrollWidth
        const height = node.scrollHeight

        const style = {
            width: `${width}px`,
            height: `${height}px`,
            overflow: 'visible'
            // We force visible overload to ensure everything renders
        }

        // Pass width/height/style to library to ensure it captures full size
        const captureOptions = {
            ...options,
            width,
            height,
            style
        }

        if (format === 'svg') {
            dataUrl = await toSvg(node, captureOptions)
        } else {
            dataUrl = await toPng(node, captureOptions)
        }

        // Download logic
        const link = document.createElement('a')
        link.download = `${fileName}.${format}`
        link.href = dataUrl
        link.click()

    } catch (err) {
        console.error('Export failed:', err)
        alert('匯出失敗')
    } finally {
        // Restore theme
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark')
        }
    }
}

/**
 * Export Gantt data to PowerPoint
 */
export function exportToPpt(mode: 'project' | 'person', store: any) {
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE' // 16:9

    // Slide dimensions in inches
    const slideWidth = 13.33
    const slideHeight = 7.5

    // Common styles
    // Common styles defined but currently passed inline for simplicity
    // const titleStyle = { x: 0.5, y: 0.3, w: '90%', fontSize: 24, bold: true, color: '000000' }
    // const noteStyle = { x: 0.5, y: 7.0, w: '90%', fontSize: 10, color: '666666' }

    if (mode === 'project') {
        createProjectSlides(pptx, store, slideWidth, slideHeight)
    } else {
        createPersonSlides(pptx, store, slideWidth, slideHeight)
    }

    pptx.writeFile({ fileName: `border-collie-${mode}-gantt.pptx` })
}

// Helper to add a new slide with header
function addNewSlide(pptx: PptxGenJS, title: string, store: any, graphX: number, graphY: number, availableW: number) {
    const slide = pptx.addSlide()
    slide.addText(title, { x: 0.5, y: 0.3, fontSize: 24, bold: true, color: '363636' })

    // Draw Timeline Header on every slide
    const { totalMonths, monthLabels } = getTimelineData(store)
    const monthW = availableW / totalMonths

    monthLabels.forEach((label, idx) => {
        slide.addShape(pptx.ShapeType.rect, {
            x: graphX + (idx * monthW), y: graphY, w: monthW, h: 0.4,
            fill: { color: 'EFF6FF' },
            line: { color: 'E2E8F0', width: 0.5 }
        })
        slide.addText(label, {
            x: graphX + (idx * monthW), y: graphY, w: monthW, h: 0.4,
            fontSize: 10, align: 'center', valign: 'middle', color: '475569'
        })
    })

    return slide
}

function createProjectSlides(pptx: PptxGenJS, store: any, slideW: number, slideH: number) {
    const graphX = 2.0
    const graphY = 1.0
    const availableW = slideW - graphX - 0.5
    const rowH = 0.45
    const gap = 0.05

    const { startDate, endDate } = getTimelineData(store)

    let currentSlide = addNewSlide(pptx, '專案甘特圖', store, graphX, graphY, availableW)
    let currentY = graphY + 0.5

    store.projects.forEach((proj: Project, pIdx: number) => {
        // Calculate needed height for this project (label + rows)
        // Simplification: We assume project label height matches rows height roughly or is at least one row
        // Ideally we mirror the component logic where label spans multiple rows
        // Here we just list rows sequentially

        // Count total rows needed for this project properties (phases)
        // We will do a simple layout: one row per phase group? 
        // Component logic is complex (multi-row packing). 
        // For PPT, we'll simplify: One row per phase to guarantee visibility, or simple packing.
        // Let's do simple packing: if overlap, new row.

        // Pre-calculate packing for PPT
        const packedRows: any[][] = []
        proj.phases.forEach(phase => {
            let placed = false
            for (const row of packedRows) {
                // Check overlap
                const overlap = row.some(p => {
                    const s1 = new Date(normalizeDate(phase.startDate || '')).getTime()
                    const e1 = new Date(normalizeDate(phase.endDate, true)).getTime()
                    const s2 = new Date(normalizeDate(p.startDate || '')).getTime()
                    const e2 = new Date(normalizeDate(p.endDate, true)).getTime()
                    return s1 < e2 && s2 < e1 // Simple overlap check
                })
                if (!overlap) {
                    row.push(phase)
                    placed = true
                    break
                }
            }
            if (!placed) packedRows.push([phase])
        })

        const projectHeight = packedRows.length * (rowH + gap)

        // Check if we need new slide
        if (currentY + projectHeight > slideH - 0.5) {
            currentSlide = addNewSlide(pptx, '專案甘特圖 (續)', store, graphX, graphY, availableW)
            currentY = graphY + 0.5
        }

        // Draw Project Label Area
        const labelH = projectHeight
        // Alternate background color for project group
        const bgFill = pIdx % 2 === 1 ? 'F1F5F9' : 'FFFFFF' // Light gray for alt

        if (pIdx % 2 === 1) {
            // Draw background for the whole group row
            currentSlide.addShape(pptx.ShapeType.rect, {
                x: 0.5, y: currentY, w: slideW - 1, h: labelH,
                fill: { color: bgFill }, line: { color: 'transparent' }
            })
        }

        currentSlide.addShape(pptx.ShapeType.rect, {
            x: 0.5, y: currentY, w: 1.4, h: labelH,
            fill: { color: 'F8FAFC' },
            line: { color: 'E2E8F0' }
        })
        currentSlide.addText(proj.name, {
            x: 0.5, y: currentY, w: 1.4, h: labelH,
            fontSize: 11, bold: true, color: '0F172A', valign: 'middle'
        })

        // Draw Rows
        packedRows.forEach((row, rIdx) => {
            const rowY = currentY + (rIdx * (rowH + gap))

            // Grid line
            currentSlide.addShape(pptx.ShapeType.line, {
                x: 0.5, y: rowY + rowH + gap, w: slideW - 1, h: 0,
                line: { color: 'E2E8F0', width: 0.5 }
            })

            row.forEach(phase => {
                const start = phase.startDate ? new Date(normalizeDate(phase.startDate)) : new Date(startDate)
                const end = new Date(normalizeDate(phase.endDate, true))

                const totalDur = endDate.getTime() - startDate.getTime()
                const startPos = Math.max(0, (start.getTime() - startDate.getTime()) / totalDur)
                const durPos = (end.getTime() - start.getTime()) / totalDur

                const barX = graphX + (startPos * availableW)
                const barW = Math.max(0.1, durPos * availableW)

                // Colors
                const colors = ['60A5FA', '34D399', 'FBBF24', 'A78BFA', 'F472B6', '2DD4BF']
                const color = colors[pIdx % colors.length]

                currentSlide.addShape(pptx.ShapeType.rect, {
                    x: barX, y: rowY + 0.05, w: barW, h: rowH - 0.1,
                    fill: { color },
                    rectRadius: 0.1
                })

                if (barW > 0.6) {
                    currentSlide.addText(phase.name, {
                        x: barX, y: rowY + 0.05, w: barW, h: rowH - 0.1,
                        fontSize: 9, color: 'FFFFFF', align: 'center', valign: 'middle'
                    })
                }
            })
        })

        currentY += labelH
    })
}

function createPersonSlides(pptx: PptxGenJS, store: any, slideW: number, slideH: number) {
    const graphX = 2.0
    const graphY = 1.0
    const availableW = slideW - graphX - 0.5
    const rowH = 0.5
    const gap = 0.05

    const { startDate, endDate } = getTimelineData(store)

    let currentSlide = addNewSlide(pptx, '人力甘特圖', store, graphX, graphY, availableW)
    let currentY = graphY + 0.5

    store.allPersons.forEach((person: string, pIdx: number) => {
        if (currentY + rowH > slideH - 0.5) {
            currentSlide = addNewSlide(pptx, '人力甘特圖 (續)', store, graphX, graphY, availableW)
            currentY = graphY + 0.5
        }

        // Background for Alt row
        if (pIdx % 2 === 1) {
            currentSlide.addShape(pptx.ShapeType.rect, {
                x: 0.5, y: currentY, w: slideW - 1, h: rowH,
                fill: { color: 'F1F5F9' }, line: { color: 'transparent' }
            })
        }

        // Person Label
        currentSlide.addShape(pptx.ShapeType.rect, {
            x: 0.5, y: currentY, w: 1.4, h: rowH,
            fill: { color: 'F8FAFC' },
            line: { color: 'E2E8F0' }
        })
        currentSlide.addText(person, {
            x: 0.5, y: currentY, w: 1.4, h: rowH,
            fontSize: 11, bold: true, color: '0F172A', valign: 'middle'
        })

        // Bars
        const assignments = store.personAssignments.filter((a: PersonAssignment) => a.person === person)
        assignments.forEach((assignment: PersonAssignment) => {
            const start = new Date(normalizeDate(assignment.startDate))
            const end = new Date(normalizeDate(assignment.endDate, true))

            const totalDur = endDate.getTime() - startDate.getTime()
            const startPos = Math.max(0, (start.getTime() - startDate.getTime()) / totalDur)
            const durPos = (end.getTime() - start.getTime()) / totalDur

            const barX = graphX + (startPos * availableW)
            const barW = Math.max(0.1, durPos * availableW)

            // Opacity check for load
            // We can use different colors for load levels (Green < 0.5, Red > 1.0) 
            // But calculating monthly load here is complex. We stick to percentage based opacity or color.
            // Let's use standard blue with transparency or saturation logic

            currentSlide.addShape(pptx.ShapeType.rect, {
                x: barX, y: currentY + 0.05, w: barW, h: rowH - 0.1,
                fill: { color: '3B82F6', transparency: (1 - assignment.percentage) * 50 }, // 0~50% transparency
                rectRadius: 0.1
            })

            if (barW > 0.8) {
                currentSlide.addText(assignment.projectName, {
                    x: barX, y: currentY + 0.05, w: barW, h: rowH - 0.1,
                    fontSize: 8, color: 'FFFFFF', align: 'center', valign: 'middle'
                })
            }
        })

        currentY += rowH + gap
    })
}

// Helpers (Duplicated from textParser/store logic slightly for standalone utility)
function normalizeDate(date: string, isEnd = false) {
    if (/^\d{4}-\d{2}$/.test(date)) {
        if (isEnd) {
            const [y, m] = date.split('-').map(Number)
            // Last day of month
            const d = new Date(y, m, 0).getDate()
            return `${date}-${d}`
        }
        return `${date}-01`
    }
    return date
}

function getTimelineData(store: any) {
    const minDate = new Date(store.timeRange.start)
    const maxDate = new Date(store.timeRange.end) // Store already adds padding

    // Calculate total months
    const totalMonths = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1

    const monthLabels = []
    const d = new Date(minDate)
    d.setDate(1) // align to month start

    for (let i = 0; i < totalMonths; i++) {
        monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        d.setMonth(d.getMonth() + 1)
    }

    return { startDate: minDate, endDate: maxDate, totalMonths, monthLabels }
}

/**
 * Export Gantt data to Mermaid Gantt chart format
 * Focuses on project schedules only (no manpower/resources)
 * Uses computedPhases which already resolves '--' continuation dates
 */
export function exportToMermaidGantt(store: any, title?: string): void {
    const lines: string[] = []

    // Header
    lines.push('gantt')
    lines.push('    dateFormat YYYY-MM-DD')
    if (title) {
        lines.push(`    title ${title}`)
    }
    lines.push('')

    // Group phases by project
    const phasesByProject = new Map<string, typeof store.computedPhases>()

    store.computedPhases.forEach((phase: any) => {
        if (!phasesByProject.has(phase.projectName)) {
            phasesByProject.set(phase.projectName, [])
        }
        phasesByProject.get(phase.projectName)!.push(phase)
    })

    // Generate sections for each project
    phasesByProject.forEach((phases, projectName) => {
        lines.push(`    section ${projectName}`)

        phases.forEach((phase: any) => {
            // Normalize dates to YYYY-MM-DD format
            const startDate = normalizeDate(phase.startDate)
            const endDate = normalizeDate(phase.endDate, true)

            // Format: taskName :startDate, endDate
            // Escape special characters in phase name if needed
            const safePhaseName = phase.name.replace(/:/g, ' ')
            lines.push(`    ${safePhaseName} :${startDate}, ${endDate}`)
        })

        lines.push('')
    })

    const mermaidContent = lines.join('\n')

    // Download as .mmd file
    const blob = new Blob([mermaidContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `border-collie-gantt.mmd`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
}

