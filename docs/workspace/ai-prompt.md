# Workspace + Gist 多專案管理功能 - AI Prompt 參考

> 本文件整理 Workspace 與 Gist 功能的需求定義、設計決策與實作細節，供有類似需求的前端專案參考使用。

---

## 功能概述

### 問題背景

純前端 SPA 應用程式常見痛點：
1. **資料持久化受限**：僅能使用 localStorage，無法跨裝置同步
2. **單一專案限制**：一次只能編輯一組資料
3. **分享困難**：需要後端服務才能產生分享連結

### 解決方案

**Workspace (多專案工作區) + Gist (雲端同步)**

| 功能 | 說明 |
|------|------|
| Workspace | 本地多專案切換、CRUD、localStorage 持久化 |
| Frontmatter | YAML 格式元資料，定義專案名稱、描述、Gist ID |
| Gist 載入 | `?gist=ID` URL 參數自動載入公開 Gist |
| Gist Refresh | 一鍵從 Gist 重新載入最新內容 |
| 衝突處理 | 名稱衝突時提供覆蓋/重新命名/取消選項 |

---

## 資料結構設計

### Workspace Interface

```typescript
interface Workspace {
    id: string              // UUID
    frontmatter: Frontmatter
    content: string         // 不含 frontmatter 的純內容
    updatedAt: string       // ISO 時間戳記
}

interface Frontmatter {
    name: string            // 必填：專案名稱
    description?: string    // 選填：描述
    gist?: string           // 選填：Gist ID
    createdAt?: string      // 選填：建立時間
    [key: string]: any      // 擴充欄位
}
```

### localStorage 結構

```typescript
// Key: 'border-collie-workspaces'
interface WorkspacesStorage {
    workspaces: Workspace[]
    currentId: string
}
```

### Frontmatter 格式

```yaml
name: 專案名稱
description: 專案描述（選填）
gist: abc123def456...       # 32 字元 Gist ID（選填）
createdAt: 2025-12-18       # 建立時間（選填）
---
[專案內容]
```

---

## 核心模組

### 1. Frontmatter Parser

```typescript
// src/parser/frontmatterParser.ts

/**
 * 解析 Frontmatter
 * @returns { frontmatter, content }
 */
function parseFrontmatter(text: string): {
    frontmatter: Frontmatter | null
    content: string
}

/**
 * 序列化 Frontmatter + Content
 */
function serializeFrontmatter(
    frontmatter: Frontmatter, 
    content: string
): string

/**
 * 提取專案名稱（用於快速顯示）
 */
function extractWorkspaceName(text: string): string | null

/**
 * 產生唯一名稱（處理重複）
 * "Project" -> "Project (1)" -> "Project (2)"
 */
function generateUniqueName(
    baseName: string, 
    existingNames: string[]
): string
```

### 2. Workspace Store (Pinia)

```typescript
// src/stores/workspaceStore.ts

const useWorkspaceStore = defineStore('workspaces', () => {
    // State
    const workspaces = ref<Workspace[]>([])
    const currentId = ref<string>('')
    
    // Getters
    const currentWorkspace = computed(...)
    const currentRawText = computed(...)  // frontmatter + content
    
    // Actions
    function init()                       // 初始化並遷移舊資料
    function createWorkspace()            // 建立新專案
    function deleteWorkspace(id: string)
    function switchWorkspace(id: string)
    function updateCurrentRawText(text: string)
    function importSharedData(text: string, mode?: 'overwrite' | 'rename')
})
```

### 3. Gist Utility

```typescript
// src/utils/gist.ts

/**
 * 讀取公開 Gist 內容
 */
async function fetchPublicGist(
    gistId: string, 
    targetFilename?: string
): Promise<GistResult>

/**
 * 驗證 Gist ID 格式（32 字元 hex）
 */
function isValidGistId(id: string): boolean

/**
 * 從 URL 或純文字提取 Gist ID
 * 支援: gist.github.com/user/ID, 純 ID
 */
function extractGistId(input: string): string | null
```

---

## UI 元件

### WorkspaceDropdown

**功能**：下拉選單管理多專案

```vue
<WorkspaceDropdown />
```

- 顯示當前專案名稱
- 專案列表（含 description/createdAt 提示）
- Gist 專案顯示 🔗 標記 + 🔄 Refresh 按鈕
- 新增/刪除專案（含確認對話框）

### ConfirmDialog

**功能**：通用確認對話框

```vue
<ConfirmDialog
    v-model:visible="show"
    title="刪除專案"
    message="確定要刪除嗎？"
    :danger="true"
    @confirm="onConfirm"
    @cancel="onCancel"
/>
```

### ConflictDialog

**功能**：名稱衝突處理

```vue
<ConflictDialog
    v-model:visible="show"
    :workspace-name="conflictName"
    @overwrite="..."   // 覆蓋本地
    @rename="..."      // 自動重新命名
    @cancel="..."
/>
```

---

## URL 參數支援

| 參數 | 說明 | 範例 |
|------|------|------|
| `?data=` | LZ-String 壓縮分享連結 | `?data=NoIgJghg...` |
| `?gist=` | 公開 Gist ID | `?gist=abc123def456...` |

**處理優先順序**：
1. `?gist=` 優先於 `?data=`
2. 載入後自動清除 URL 參數
3. 名稱衝突時顯示 ConflictDialog

---

## 舊資料遷移

舊版僅支援單一專案儲存：
```typescript
// Old: 'border-collie-projects' = "raw text content"
// New: 'border-collie-workspaces' = { workspaces: [...], currentId: "..." }
```

**遷移邏輯**（在 `workspaceStore.init()` 中）：

```typescript
function migrateFromLegacy() {
    const oldData = localStorage.getItem('border-collie-projects')
    if (oldData) {
        // 解析 frontmatter 取得名稱
        const { frontmatter, content } = parseFrontmatter(oldData)
        const ws: Workspace = {
            id: crypto.randomUUID(),
            frontmatter: { name: frontmatter?.name ?? 'Migrated Project', ...frontmatter },
            content: content,
            updatedAt: new Date().toISOString()
        }
        workspaces.value = [ws]
        currentId.value = ws.id
        
        // 移除舊 key
        localStorage.removeItem('border-collie-projects')
        persist()
    }
}
```

---

## GitHub Gist API

### Endpoint

```
GET https://api.github.com/gists/{gist_id}
```

### Response 結構

```typescript
interface GistResponse {
    id: string
    description: string
    files: {
        [filename: string]: {
            filename: string
            content: string
            language: string | null
            raw_url: string
            size: number
        }
    }
    created_at: string
    updated_at: string
    html_url: string
}
```

### 注意事項

- **僅支援公開 Gist**：私人 Gist 需要 OAuth token
- **API 限流**：未認證每小時 60 次請求
- **檔案選擇**：優先選擇 .md 或 .txt，否則選第一個檔案
- **錯誤處理**：404(不存在)、403(限流)、網路錯誤

---

## 設計決策

### 為什麼用 Frontmatter？

1. **人類可讀**：YAML 格式直覺易懂
2. **不侵入內容**：`---` 分隔符清楚區隔
3. **可擴展**：支援自訂欄位
4. **相容 Markdown**：許多工具已支援

### 為什麼用 Gist？

1. **零後端**：GitHub 託管，無需自建伺服器
2. **版本控制**：Gist 自帶 revision history
3. **便於分享**：公開 Gist 可直接分享 URL
4. **API 簡單**：RESTful，無需 OAuth（公開 Gist）

### 衝突處理策略

| 場景 | 策略 |
|------|------|
| 名稱相同 | 顯示對話框讓用戶選擇 |
| 覆蓋 | 直接替換同名專案內容 |
| 重新命名 | 自動加後綴 "(1)", "(2)"... |
| 取消 | 不做任何變更 |

---

## 測試重點

### 單元測試

- [ ] Frontmatter 解析（含 edge cases）
- [ ] 唯一名稱產生邏輯
- [ ] Gist ID 驗證與提取

### 整合測試

- [ ] Workspace CRUD 操作
- [ ] localStorage 持久化
- [ ] 舊資料遷移

### E2E 測試

- [ ] `?gist=` URL 載入
- [ ] Refresh 按鈕功能
- [ ] 衝突對話框流程

---

## 檔案清單

```
src/
├── parser/
│   ├── frontmatterParser.ts      # Frontmatter 解析
│   └── frontmatterParser.test.ts # 單元測試
├── stores/
│   ├── workspaceStore.ts         # 多專案狀態管理
│   └── projectStore.ts           # 專案內容解析 (重構後)
├── utils/
│   ├── gist.ts                   # Gist API 工具
│   └── sharing.ts                # 分享連結編碼
├── components/
│   ├── WorkspaceDropdown.vue     # 專案下拉選單
│   ├── ConfirmDialog.vue         # 通用確認對話框
│   └── ConflictDialog.vue        # 衝突處理對話框
└── App.vue                       # URL 參數處理整合
```

---

## 延伸功能（Backlog）

- [ ] Gist 寫入（需 OAuth）
- [ ] 匯出/匯入 JSON 備份
- [ ] 專案搜尋/過濾
- [ ] 專案標籤分類
- [ ] 多 Gist 檔案選擇
