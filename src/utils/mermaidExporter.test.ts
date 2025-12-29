/**
 * Mermaid Gantt Exporter - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Since exportToMermaidGantt uses document APIs for download,
// we'll test the core logic by creating a testable version

/**
 * Helper function to generate Mermaid Gantt content (mirrors export logic)
 * This is the pure function version for testing
 */
function generateMermaidGantt(computedPhases: any[], title?: string): string {
    const lines: string[] = []

    // Header
    lines.push('gantt')
    lines.push('    dateFormat YYYY-MM-DD')
    if (title) {
        lines.push(`    title ${title}`)
    }
    lines.push('')

    // Group phases by project
    const phasesByProject = new Map<string, any[]>()

    computedPhases.forEach((phase) => {
        if (!phasesByProject.has(phase.projectName)) {
            phasesByProject.set(phase.projectName, [])
        }
        phasesByProject.get(phase.projectName)!.push(phase)
    })

    // Generate sections for each project
    phasesByProject.forEach((phases, projectName) => {
        lines.push(`    section ${projectName}`)

        phases.forEach((phase) => {
            const safePhaseName = phase.name.replace(/:/g, ' ')
            lines.push(`    ${safePhaseName} :${phase.startDate}, ${phase.endDate}`)
        })

        lines.push('')
    })

    return lines.join('\n')
}

describe('Mermaid Gantt Export', () => {
    it('should generate correct Mermaid header', () => {
        const result = generateMermaidGantt([])
        expect(result).toContain('gantt')
        expect(result).toContain('dateFormat YYYY-MM-DD')
    })

    it('should include title when provided', () => {
        const result = generateMermaidGantt([], '專案時程')
        expect(result).toContain('title 專案時程')
    })

    it('should group phases by project as sections', () => {
        const phases = [
            { projectName: 'AI OCR', name: 'BA', startDate: '2025-10-01', endDate: '2025-11-30' },
            { projectName: 'AI OCR', name: 'SA', startDate: '2025-12-01', endDate: '2026-02-28' },
            { projectName: 'Staff Portal', name: 'BA/SA', startDate: '2026-01-01', endDate: '2026-06-30' }
        ]

        const result = generateMermaidGantt(phases)

        expect(result).toContain('section AI OCR')
        expect(result).toContain('section Staff Portal')
        expect(result).toContain('BA :2025-10-01, 2025-11-30')
        expect(result).toContain('SA :2025-12-01, 2026-02-28')
        expect(result).toContain('BA/SA :2026-01-01, 2026-06-30')
    })

    it('should escape colons in phase names', () => {
        const phases = [
            { projectName: 'Test', name: 'Phase:A', startDate: '2025-01-01', endDate: '2025-02-01' }
        ]

        const result = generateMermaidGantt(phases)

        // Colon should be replaced with space to avoid syntax issues
        expect(result).toContain('Phase A :2025-01-01, 2025-02-01')
    })

    it('should handle empty phases array', () => {
        const result = generateMermaidGantt([])

        expect(result).toContain('gantt')
        expect(result).toContain('dateFormat YYYY-MM-DD')
        // Should not throw error and should be valid empty gantt
    })

    it('should preserve phase order within projects', () => {
        const phases = [
            { projectName: 'AI OCR', name: 'BA', startDate: '2025-10-01', endDate: '2025-11-30' },
            { projectName: 'AI OCR', name: 'SA', startDate: '2025-12-01', endDate: '2026-02-28' },
            { projectName: 'AI OCR', name: 'SD', startDate: '2026-03-01', endDate: '2026-04-30' }
        ]

        const result = generateMermaidGantt(phases)

        const baIndex = result.indexOf('BA :')
        const saIndex = result.indexOf('SA :')
        const sdIndex = result.indexOf('SD :')

        expect(baIndex).toBeLessThan(saIndex)
        expect(saIndex).toBeLessThan(sdIndex)
    })
})
