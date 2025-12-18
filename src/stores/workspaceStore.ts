/**
 * BorderCollie - Workspace Store
 * 管理多個工作區，持久化至 localStorage
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseFrontmatter, serializeFrontmatter, generateUniqueName, type Frontmatter } from '@/parser/frontmatterParser'

// Constants
const STORAGE_KEY = 'border-collie-workspaces'
const LEGACY_STORAGE_KEY = 'border-collie-projects'

const DEFAULT_CONTENT = `AI OCR:
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

// Types
export interface Workspace {
    id: string
    frontmatter: Frontmatter
    content: string
    updatedAt: string
}

interface StorageData {
    workspaces: Workspace[]
    currentId: string
}

/**
 * 生成 UUID
 */
function generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        })
}

/**
 * 獲取當前時間 ISO 字串
 */
function nowISO(): string {
    return new Date().toISOString()
}

export const useWorkspaceStore = defineStore('workspaces', () => {
    // State
    const workspaces = ref<Workspace[]>([])
    const currentId = ref<string>('')

    // Computed
    const currentWorkspace = computed<Workspace | null>(() => {
        return workspaces.value.find(w => w.id === currentId.value) ?? null
    })

    const workspaceNames = computed<string[]>(() => {
        return workspaces.value.map(w => w.frontmatter.name)
    })

    const currentRawText = computed<string>(() => {
        const ws = currentWorkspace.value
        if (!ws) return ''
        return serializeFrontmatter(ws.frontmatter, ws.content)
    })

    // Actions

    /**
     * 初始化：從 localStorage 載入，包含舊資料遷移
     */
    function init() {
        // 嘗試載入新格式
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const data: StorageData = JSON.parse(saved)
                workspaces.value = data.workspaces
                currentId.value = data.currentId

                // 驗證 currentId 是否有效
                if (!workspaces.value.find(w => w.id === currentId.value)) {
                    currentId.value = workspaces.value[0]?.id ?? ''
                }
                return
            } catch (e) {
                console.error('Failed to parse workspace data:', e)
            }
        }

        // 嘗試遷移舊格式
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacyData) {
            migrateFromLegacy(legacyData)
            // 刪除舊資料
            localStorage.removeItem(LEGACY_STORAGE_KEY)
            return
        }

        // 創建默認工作區
        createDefaultWorkspace()
    }

    /**
     * 從舊格式遷移
     */
    function migrateFromLegacy(legacyText: string) {
        const { frontmatter, content } = parseFrontmatter(legacyText)

        const ws: Workspace = {
            id: generateId(),
            frontmatter: frontmatter ?? { name: 'Default Workspace' },
            content: frontmatter ? content : legacyText,
            updatedAt: nowISO()
        }

        workspaces.value = [ws]
        currentId.value = ws.id
        persist()
    }

    /**
     * 創建默認工作區
     */
    function createDefaultWorkspace() {
        const ws: Workspace = {
            id: generateId(),
            frontmatter: {
                name: 'Sample Project',
                createdAt: nowISO().slice(0, 10)
            },
            content: DEFAULT_CONTENT,
            updatedAt: nowISO()
        }

        workspaces.value = [ws]
        currentId.value = ws.id
        persist()
    }

    /**
     * 切換工作區
     */
    function switchWorkspace(id: string) {
        if (workspaces.value.find(w => w.id === id)) {
            currentId.value = id
            persist()
        }
    }

    /**
     * 創建新工作區
     */
    function createWorkspace(name?: string): string {
        const baseName = name ?? 'New Project'
        const uniqueName = generateUniqueName(baseName, workspaceNames.value)

        const ws: Workspace = {
            id: generateId(),
            frontmatter: {
                name: uniqueName,
                createdAt: nowISO().slice(0, 10)
            },
            content: '',
            updatedAt: nowISO()
        }

        workspaces.value.push(ws)
        currentId.value = ws.id
        persist()

        return ws.id
    }

    /**
     * 刪除工作區
     */
    function deleteWorkspace(id: string): boolean {
        const index = workspaces.value.findIndex(w => w.id === id)
        if (index === -1) return false

        // 至少保留一個工作區
        if (workspaces.value.length <= 1) {
            return false
        }

        workspaces.value.splice(index, 1)

        // 如果刪除的是當前工作區，切換到第一個
        if (currentId.value === id) {
            currentId.value = workspaces.value[0].id
        }

        persist()
        return true
    }

    /**
     * 更新當前工作區的原始文字 (包含 Frontmatter)
     */
    function updateCurrentRawText(text: string) {
        const ws = currentWorkspace.value
        if (!ws) return

        const { frontmatter, content } = parseFrontmatter(text)

        if (frontmatter) {
            ws.frontmatter = frontmatter
            ws.content = content
        } else {
            // 保留原有 frontmatter，只更新內容
            ws.content = text
        }

        ws.updatedAt = nowISO()
        persist()
    }

    /**
     * 更新當前工作區的專案內容 (不含 Frontmatter)
     */
    function updateCurrentContent(content: string) {
        const ws = currentWorkspace.value
        if (!ws) return

        ws.content = content
        ws.updatedAt = nowISO()
        persist()
    }

    /**
     * 導入分享資料 (處理衝突)
     * @returns 'imported' | 'conflict' | 'error'
     */
    function importSharedData(
        text: string,
        conflictResolution?: 'overwrite' | 'rename' | 'cancel'
    ): { status: 'imported' | 'conflict' | 'error', conflictName?: string, newId?: string } {
        const { frontmatter, content } = parseFrontmatter(text)
        const workspaceName = frontmatter?.name ?? 'Shared Project'

        // 檢查名稱衝突
        const existingNames = workspaceNames.value
        const hasConflict = existingNames.includes(workspaceName)

        if (hasConflict && !conflictResolution) {
            return { status: 'conflict', conflictName: workspaceName }
        }

        if (conflictResolution === 'cancel') {
            return { status: 'imported' }
        }

        if (conflictResolution === 'overwrite' && hasConflict) {
            // 覆蓋現有工作區
            const existing = workspaces.value.find(w => w.frontmatter.name === workspaceName)
            if (existing) {
                existing.frontmatter = frontmatter ?? { name: workspaceName }
                existing.content = frontmatter ? content : text
                existing.updatedAt = nowISO()
                currentId.value = existing.id
                persist()
                return { status: 'imported', newId: existing.id }
            }
        }

        // 重新命名或無衝突：創建新工作區
        const finalName = hasConflict && conflictResolution === 'rename'
            ? generateUniqueName(workspaceName, existingNames)
            : workspaceName

        const ws: Workspace = {
            id: generateId(),
            frontmatter: {
                ...(frontmatter ?? {}),
                name: finalName
            } as Frontmatter,
            content: frontmatter ? content : text,
            updatedAt: nowISO()
        }

        workspaces.value.push(ws)
        currentId.value = ws.id
        persist()

        return { status: 'imported', newId: ws.id }
    }

    /**
     * 持久化到 localStorage
     */
    function persist() {
        const data: StorageData = {
            workspaces: workspaces.value,
            currentId: currentId.value
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }

    return {
        // State
        workspaces,
        currentId,
        // Computed
        currentWorkspace,
        workspaceNames,
        currentRawText,
        // Actions
        init,
        switchWorkspace,
        createWorkspace,
        deleteWorkspace,
        updateCurrentRawText,
        updateCurrentContent,
        importSharedData
    }
})
