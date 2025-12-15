/**
 * BorderCollie - Serializer
 * 將資料模型序列化為純文字格式
 */

import type { Project, Phase, Assignment } from '@/types'

/**
 * 將專案列表序列化為純文字格式
 */
export function serializeToText(projects: Project[]): string {
    return projects.map(serializeProject).join('\n')
}

/**
 * 序列化單一專案
 */
function serializeProject(project: Project): string {
    const lines: string[] = []
    lines.push(`${project.name}:`)

    for (const phase of project.phases) {
        lines.push(serializePhase(phase))
    }

    return lines.join('\n')
}

/**
 * 序列化階段
 */
function serializePhase(phase: Phase): string {
    const startDate = phase.startDate ?? '--'
    const assignments = serializeAssignments(phase.assignments)
    return `- ${phase.name}, ${startDate}, ${phase.endDate}: ${assignments}`
}

/**
 * 序列化人員指派列表
 */
function serializeAssignments(assignments: Assignment[]): string {
    return assignments
        .map(a => `${a.person} ${a.percentage}`)
        .join(', ')
}
