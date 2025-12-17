import { toPng, toSvg } from 'html-to-image'
import PptxGenJS from 'pptxgenjs'
import type { Project, PersonAssignment } from '@/types'

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
