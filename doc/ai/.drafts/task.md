# Workspace 功能開發任務

## Phase 1: Core Workspace 功能

- [x] **Frontmatter 解析器**
  - [x] 建立 Frontmatter 解析邏輯 (name, gist, description, createdAt 等)
  - [x] 整合 Frontmatter 至現有 textParser
  - [x] Frontmatter 序列化功能

- [x] **多專案 Workspace Store**
  - [x] 重構 projectStore 支援多專案管理
  - [x] localStorage 結構調整 (多專案儲存)
  - [x] 專案 CRUD 操作 (Create, Read, Update, Delete)
  - [x] 當前專案切換邏輯

- [x] **Workspace UI 元件**
  - [x] 建立 WorkspaceDropdown 元件
  - [x] 整合至 EditorPanel (取代 BorderCollie logo)
  - [x] 專案列表顯示 (含 description, createdAt 提示)
  - [x] 新增專案功能
  - [x] 刪除專案功能 (確認對話框)

- [x] **分享連結衝突處理**
  - [x] 建立 ConflictDialog 元件
  - [x] 衝突檢測邏輯
  - [x] 覆蓋/Rename(自動後綴)/取消 選項

- [x] **Phase 1 測試與驗證**
  - [x] 單元測試 Frontmatter 解析
  - [x] 整合測試 Workspace 切換
  - [x] 衝突處理流程測試

---

## Phase 2: Gist 支援

- [x] **Gist API 整合**
  - [x] 建立 Gist 讀取 utility
  - [x] 公開 Gist 內容解析

- [x] **Gist URL 參數載入**
  - [x] 支援 `?gist=GIST_ID` URL 參數
  - [x] 自動載入並儲存至本地

- [x] **Gist Refresh 功能**
  - [x] Gist 專案顯示 Refresh 按鈕
  - [x] 重新載入 Gist 內容 (覆蓋本地)

- [/] **Phase 2 測試與驗證**
  - [/] Gist API 測試
  - [ ] Gist 載入流程測試
