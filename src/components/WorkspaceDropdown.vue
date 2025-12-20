<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { fetchPublicGist } from '@/utils/gist'
import { fetchFromUrl } from '@/utils/urlSource'
import { parseFrontmatter, serializeFrontmatter, type Frontmatter } from '@/parser/frontmatterParser'
import ConfirmDialog from './ConfirmDialog.vue'

const workspaceStore = useWorkspaceStore()

// Dropdown state
const isOpen = ref(false)
const showDeleteConfirm = ref(false)
const workspaceToDelete = ref<string | null>(null)
const isRefreshing = ref<string | null>(null)

// Computed
const workspaces = computed(() => workspaceStore.workspaces)
const currentWorkspace = computed(() => workspaceStore.currentWorkspace)
const currentName = computed(() => currentWorkspace.value?.frontmatter.name ?? 'BorderCollie')

// Actions
function toggleDropdown() {
    isOpen.value = !isOpen.value
}

function closeDropdown() {
    isOpen.value = false
}

function selectWorkspace(id: string) {
    workspaceStore.switchWorkspace(id)
    closeDropdown()
}

function createNewWorkspace() {
    workspaceStore.createWorkspace()
    closeDropdown()
}

function confirmDelete(id: string, e: Event) {
    e.stopPropagation()
    workspaceToDelete.value = id
    showDeleteConfirm.value = true
}

function executeDelete() {
    if (workspaceToDelete.value) {
        workspaceStore.deleteWorkspace(workspaceToDelete.value)
    }
    workspaceToDelete.value = null
}

function cancelDelete() {
    workspaceToDelete.value = null
}

async function refreshGist(ws: { id: string, frontmatter: Frontmatter, content: string }, e: Event) {
    e.stopPropagation()
    
    const gistId = ws.frontmatter.gist
    if (!gistId) return
    
    isRefreshing.value = ws.id
    
    try {
        const result = await fetchPublicGist(gistId)
        
        if (!result.success) {
            alert(`Gist 重新載入失敗: ${result.error}`)
            return
        }
        
        if (result.content) {
            // 解析 Gist 內容
            const { frontmatter: gistFrontmatter, content: gistContent } = parseFrontmatter(result.content)
            
            // 保留原有名稱和 gist ID，但更新內容
            const updatedFrontmatter: Frontmatter = {
                ...gistFrontmatter,
                name: ws.frontmatter.name, // 保持本地名稱
                gist: gistId
            }
            
            // 更新當前工作區
            workspaceStore.switchWorkspace(ws.id)
            workspaceStore.updateCurrentRawText(
                serializeFrontmatter(updatedFrontmatter, gistContent)
            )
            
            alert('已從 Gist 重新載入內容！')
        }
    } finally {
        isRefreshing.value = null
    }
}

async function refreshSource(ws: { id: string, frontmatter: Frontmatter, content: string }, e: Event) {
    e.stopPropagation()
    
    const sourceUrl = ws.frontmatter.source
    if (!sourceUrl) return
    
    isRefreshing.value = ws.id
    
    try {
        const result = await fetchFromUrl(sourceUrl)
        
        if (!result.success) {
            alert(`外部資源重新載入失敗: ${result.error}\n\n來源 URL: ${sourceUrl}`)
            return
        }
        
        if (result.content) {
            // 解析外部內容
            const { frontmatter: sourceFrontmatter, content: sourceContent } = parseFrontmatter(result.content)
            
            // 保留原有名稱和 source URL，但更新內容
            const updatedFrontmatter: Frontmatter = {
                ...sourceFrontmatter,
                name: ws.frontmatter.name, // 保持本地名稱
                source: sourceUrl
            }
            
            // 更新當前工作區
            workspaceStore.switchWorkspace(ws.id)
            workspaceStore.updateCurrentRawText(
                serializeFrontmatter(updatedFrontmatter, sourceContent)
            )
            
            alert('已從外部來源重新載入內容！')
        }
    } finally {
        isRefreshing.value = null
    }
}

// Format date for display
function formatDate(dateStr?: string): string {
    if (!dateStr) return ''
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('zh-TW', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        })
    } catch {
        return dateStr
    }
}
</script>

<template>
    <div class="workspace-dropdown" v-click-outside="closeDropdown">
        <!-- Toggle Button -->
        <button class="dropdown-toggle" @click="toggleDropdown">
            <span class="brand-logo">🐕 {{ currentName }}</span>
            <span class="toggle-arrow" :class="{ open: isOpen }">▾</span>
        </button>

        <!-- Dropdown Menu -->
        <Transition name="dropdown">
            <div v-if="isOpen" class="dropdown-menu">
                <!-- Workspace List -->
                <div class="workspace-list">
                    <div 
                        v-for="ws in workspaces" 
                        :key="ws.id"
                        class="workspace-item"
                        :class="{ active: ws.id === currentWorkspace?.id }"
                        @click="selectWorkspace(ws.id)"
                    >
                        <div class="workspace-info">
                            <div class="workspace-name-row">
                                <span class="workspace-name">{{ ws.frontmatter.name }}</span>
                                <span v-if="ws.frontmatter.gist" class="gist-badge" title="連結至 Gist">🔗</span>
                                <span v-else-if="ws.frontmatter.source" class="source-badge" title="外部來源">🔗</span>
                            </div>
                            <span v-if="ws.frontmatter.description" class="workspace-desc">
                                {{ ws.frontmatter.description }}
                            </span>
                            <span v-else-if="ws.frontmatter.createdAt" class="workspace-meta">
                                {{ formatDate(ws.frontmatter.createdAt) }}
                            </span>
                        </div>
                        <div class="workspace-actions">
                            <button 
                                v-if="ws.frontmatter.gist"
                                class="refresh-btn"
                                :class="{ refreshing: isRefreshing === ws.id }"
                                @click="refreshGist(ws, $event)"
                                title="從 Gist 重新載入"
                                :disabled="isRefreshing === ws.id"
                            >
                                🔄
                            </button>
                            <button 
                                v-else-if="ws.frontmatter.source"
                                class="refresh-btn"
                                :class="{ refreshing: isRefreshing === ws.id }"
                                @click="refreshSource(ws, $event)"
                                title="從外部來源重新載入"
                                :disabled="isRefreshing === ws.id"
                            >
                                🔄
                            </button>
                            <button 
                                v-if="workspaces.length > 1"
                                class="delete-btn"
                                @click="confirmDelete(ws.id, $event)"
                                title="刪除專案"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Divider -->
                <div class="dropdown-divider"></div>

                <!-- New Workspace -->
                <button class="new-workspace-btn" @click="createNewWorkspace">
                    <span class="icon">➕</span>
                    <span>新增專案</span>
                </button>
            </div>
        </Transition>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model:visible="showDeleteConfirm"
            title="刪除專案"
            message="確定要刪除此專案嗎？此操作無法復原。"
            confirm-text="刪除"
            cancel-text="取消"
            :danger="true"
            @confirm="executeDelete"
            @cancel="cancelDelete"
        />
    </div>
</template>

<style scoped>
.workspace-dropdown {
    position: relative;
}

.dropdown-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
}

.dropdown-toggle:hover {
    background: var(--color-bg-hover);
}

.toggle-arrow {
    font-size: var(--font-size-base);
    color: var(--color-text-muted);
    transition: transform var(--transition-fast);
}

.toggle-arrow.open {
    transform: rotate(180deg);
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    min-width: 300px;
    max-width: 400px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--glass-border);
    z-index: 1000;
    overflow: hidden;
}

.dropdown-menu::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 20px;
    width: 12px;
    height: 12px;
    background: var(--color-bg-secondary);
    border-left: 1px solid var(--glass-border);
    border-top: 1px solid var(--glass-border);
    transform: rotate(45deg);
}

.workspace-list {
    max-height: 320px;
    overflow-y: auto;
    padding: var(--spacing-xs) 0;
}

.workspace-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    cursor: pointer;
    transition: background var(--transition-fast);
    gap: var(--spacing-md);
}

.workspace-item:hover {
    background: var(--color-bg-hover);
}

.workspace-item.active {
    background: rgba(59, 130, 246, 0.12);
    border-left: 4px solid var(--color-accent);
    padding-left: calc(var(--spacing-lg) - 4px);
}

.workspace-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
    flex: 1;
}

.workspace-name-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.workspace-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.gist-badge,
.source-badge {
    font-size: 0.75rem;
    opacity: 0.7;
}

.workspace-item.active .workspace-name {
    color: var(--color-accent);
}

.workspace-desc,
.workspace-meta {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workspace-actions {
    display: flex;
    gap: var(--spacing-xs);
    flex-shrink: 0;
}

.delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    opacity: 0.5;
    transition: all var(--transition-fast);
    flex-shrink: 0;
    font-size: 1.1rem;
}

.delete-btn:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    transform: scale(1.05);
}

.refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    opacity: 0.5;
    transition: all var(--transition-fast);
    flex-shrink: 0;
    font-size: 1.1rem;
}

.refresh-btn:hover {
    opacity: 1;
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    transform: scale(1.05);
}

.refresh-btn.refreshing {
    opacity: 1;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.dropdown-divider {
    height: 1px;
    background: var(--color-border);
    margin: var(--spacing-xs) var(--spacing-md);
}

.new-workspace-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-accent);
    font-weight: 600;
    font-size: 1rem;
    transition: background var(--transition-fast);
}

.new-workspace-btn:hover {
    background: rgba(59, 130, 246, 0.1);
}

.new-workspace-btn .icon {
    font-size: 1rem;
}

/* Dropdown Animation */
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all var(--transition-normal);
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-12px);
}
</style>
