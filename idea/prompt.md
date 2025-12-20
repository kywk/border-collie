# BorderCollie - AI Coding Agent Prompt

> 本文件為 AI Coding Agent 可直接引用的 prompt，描述 BorderCollie 專案的完整規格與設計決策。
> 適用於讓另一個 AI Agent 生成雷同專案。

---

## 專案概述

**BorderCollie** 是一個現代化、輕量級的專案管理與人力資源甘特圖工具。

### 核心目標
- 兼顧 **編輯** 與 **視覺呈現** 的專案/人力管理頁面
- 區分 _編輯區塊_ 和 _檢視區塊_，資料即時連動
- 透過雙視角甘特圖，快速掌握團隊人員忙碌/空閒時間，方便新進專案時程規劃

### 技術架構
- 純前端 SPA，使用 Vue 3 + TypeScript
- 可直接 host 在 GitHub Pages 或私人靜態網頁服務器，不需後端資料庫
- 狀態管理：Pinia
- 打包工具：Vite
- 資料持久化：Browser LocalStorage

---

## 純文字編輯規格

BorderCollie 使用 Frontmatter + 專案定義的純文字格式。

### 完整格式

```text
name: 工作區名稱
description: 描述（選填）
gist: GIST_ID（選填）
createdAt: 2025-12-18（選填）
---
專案名稱:
- 階段名, 開始時間, 結束時間: 人員1 投入比, 人員2 投入比
- 階段名, --, 結束時間: 人員3 投入比

另一專案:
- ...
```

### 語法規則

#### Frontmatter（`---` 之前，選用）
| 欄位 | 必填 | 說明 |
|------|------|------|
| `name` | ✅ | 工作區名稱，顯示於下拉選單 |
| `description` | ❌ | 描述，顯示於下拉選單提示 |
| `gist` | ❌ | Gist ID，用於雲端同步 |
| `createdAt` | ❌ | 建立時間 |

#### 專案內容（`---` 之後）
1. **專案宣告**：`專案名稱:`（冒號結尾）。若加入 `, pending` 標記（如 `專案名, pending:`）則代表擱置該專案。
2. **階段定義**：`- 階段名, 開始日期, 結束日期: 人員指派`
3. **日期格式**：`YYYY-MM`（月視圖）或 `YYYY-MM-DD`（日視圖）
4. **自動接續**：開始日期填 `--` 表示接續前一階段結束時間
5. **人員指派**：`人員名稱 投入比例`，投入比例 `0.1` ~ `1.0`

### 完整範例

```text
name: AI 專案規劃 2025
description: 年度 AI 專案時程與人力配置
---
AI OCR:
- BA, 2025-10-01, 2025-11-30: Andy 0.3, Ben 0.8, Cat 0.5
- SA, --, 2026-02: Andy 0.3, Danny 0.6, Elsa 0.2
- SD, --, 2026-04: Andy 0.6, Elsa 0.2, Frank 0.2
- Dev, 2026-03, 2026-05: Andy 0.1, Elsa 0.6, Frank 0.6
- Sit, --, 2026-06: Elsa 0.3, Frank 0.3
- Uat, --, 2026-07: Elsa 0.1, Frank 0.1, Ben 0.7, Cat 0.4

Staff Portal:
- BA/SA, 2026-01, 2026-06: Andy 0.3, Monica 0.7, Amber 0.4
- SD/Dev, 2026-03, 2026-09: Andy 0.2, Amber 0.7, Kevin 0.7
- Sit/Uat, --, 2026-11: Amber 0.2, Kevin 0.2, Monica 0.5, Norman 0.5
```

---

## 功能規格

### 編輯區
- **純文字模式**：直接編輯純文字格式
- **表格模式**：互動式表格編輯（欄位：專案、階段、開始/結束時間、人員投入）
- 兩種模式資料即時同步

### 專案甘特圖
- 縱軸為專案，橫軸為時間
- 時間範圍依專案實際時間自動計算
- 若某階段開始日期為 `--`，和前一階段畫在同一列
- 支援縮放功能，方便截圖貼簡報
- **箭頭視圖**：可切換為箭頭樣式，視覺化階段流向
- **隱藏/顯示**：可隱藏特定專案列，方便進行部分項目比較
- **專案擱置 (Pending)**：
    - 表格模式提供 Pending 切換按鈕（⏸/▶）
    - 設為 Pending 的專案會從甘特圖中完全移除，且不計入任何人力負荷計算
    - 編輯區保留資料並提供視覺反饋（如不透明度降低）

### 人力甘特圖
- 縱軸為人員，橫軸為時間
- 以人員為主，對各專案不同階段投入作 group
- 相同專案不同階段，若時間不重疊，在同一列顯示
- 線段顏色依投入百分比呈現濃淡（40% ~ 100%）
- **工作負載警示**：超過 110% 紅色背景、少於 50% 綠色背景
- **隱藏/顯示**：可隱藏特定人員列，方便進行部分項目比較

### 隱藏/顯示功能
- 每個專案/人員名稱前有 SVG 眼睛圖示按鈕
- 點擊按鈕隱藏該列，專案/人員名稱加入頂部「已隱藏」chip 列表
- 點擊 chip 可恢復顯示該項目
- 「全部顯示」按鈕一鍵恢復所有隱藏項目
- 專案甘特圖與人力甘特圖的隱藏狀態各自獨立管理

### 分享功能
- URL `?data=compressed` 格式，LZ-String 壓縮編碼
- 無需後端即可分享
- **衝突處理**：若專案名稱與本地衝突，可選擇覆蓋/重新命名/取消

### Workspace 多專案管理
- 支援多組專案儲存於 LocalStorage
- 使用 Frontmatter 定義專案元資料
- 工作區下拉選單：快速切換、新增、刪除專案
- 自動遷移舊版 localStorage 資料

### GitHub Gist 支援
- 支援 `?gist=GIST_ID` URL 參數載入公開 Gist
- Gist 專案顯示 🔗 標記，可一鍵 🔄 Refresh 重新載入
- 自動儲存至本地工作區，保留 Gist ID 供同步

### 匯出功能
- 匯出為 PNG 圖片（使用 html-to-image）
- 匯出為 SVG 向量圖
- 匯出為 PowerPoint 簡報（使用 pptxgenjs）

---

## UI/UX 設計規範

### 佈局
- 左右分割面板（SplitPane），可拖拉調整寬度
- 編輯區/檢視區可完全收縮，留下 Toggle 按鈕
- 全畫面高度（height: 100%），不顯示整頁滾動條
- 各區域可獨立滾動

### 甘特圖凍結窗格
- 仿照 Excel 凍結窗格原理
- 日期列固定在頂部（sticky top）
- 專案/人員欄固定在左側（sticky left）
- 滑動時仍可清楚看到日期和專案/人員

### 視覺設計
- **Glassmorphism**：面板標題使用毛玻璃效果（backdrop-filter: blur）
- **漸層背景**：主背景使用微妙漸層
- **甘特圖 Bar**：漸層填充、陰影、光澤效果（::before pseudo-element）
- **今日標記**：紅色大頭針設計，圓點在日期列，線條垂直貫穿整個甘特圖
- **年度時間軸**：首月顯示完整年月，其他月份只顯示月，不同年度交替背景色
- **微動畫**：按鈕 hover 浮起、Bar hover 放大、主題切換旋轉特效
- **Pill 按鈕**：切換按鈕為膠囊形狀，active 狀態帶 glow
- **隱藏按鈕**：淡紅色背景 SVG 眼睛圖示，hover 時顯示斜線表示隱藏動作

### 主題
- 支援 Light / Dark 模式
- Light 模式：高對比度、飽和顏色
- Dark 模式：柔和色調、適當對比
- 主題切換有平滑過渡動畫

### 配色原則
- 不同專案使用不同色相（HSL 色彩空間）
- 配色不過於飽和或灰淡
- 8 組預設專案顏色，循環使用

---

## 已實現功能清單

1. ✅ 甘特圖核心、分享連結、UI 架構
2. ✅ 主題增強、佈局優化、匯出功能（PNG/SVG/PPT）
3. ✅ GitHub Actions 自動部署 GitHub Pages
4. ✅ 凍結窗格（Freeze Panes）- 日期列與專案欄固定
5. ✅ UI 美化：Glassmorphism、漸層 Bar、今日標記線、微動畫
6. ✅ LZ-String 壓縮替代 Gzip+Base64（URL 長度減少 10-15%）
7. ✅ 年度時間軸格式：首月顯示完整年月，不同年度交替背景
8. ✅ Today Marker 大頭針設計：紅色圓點 + 垂直線貫穿整個甘特圖
9. ✅ **箭頭顯示模式**：支援標準/箭頭雙模式切換
10. ✅ **UI/UX 優化**：修正 Export 下拉選單 Z-index、統一 Toggle 按鈕風格
11. ✅ **Workspace 多專案管理**：
    - Frontmatter 解析器（name/gist/description/createdAt）
    - workspaceStore 多專案 CRUD 與 localStorage 持久化
    - WorkspaceDropdown 下拉選單元件
    - 分享連結衝突處理（覆蓋/重新命名/取消）
    - 自動遷移舊版 localStorage 資料
12. ✅ **GitHub Gist 支援**：
    - `?gist=GIST_ID` URL 參數載入公開 Gist
    - Gist 專案 🔗 標記與 🔄 Refresh 按鈕
    - Gist Utility：fetchPublicGist, extractGistId, isValidGistId
13. ✅ **甘特圖隱藏/顯示功能**：
    - 專案/人員列隱藏按鈕（SVG 眼睛圖示）
    - 頂部「已隱藏」chip 列表
    - 一鍵「全部顯示」恢復隱藏項目
    - 專案/人力甘特圖獨立管理隱藏狀態
14. ✅ **專案 Pending 功能**：
    - 支援 `, pending` 語法標記
    - 支援從人力負荷與甘特圖中排除
    - 表格編輯器支援並排的 Pending/AddPhase 按鈕佈局
    - 擱置專案提供視覺半透明反饋 (Opacity 0.5)

---

## Backlog

- [ ] Gist 寫入（需 OAuth）
- [ ] 匯出/匯入 JSON 備份
- [ ] 專案搜尋/過濾
- [ ] 隱藏狀態持久化（localStorage）

---

## 專案結構

```
border-collie/
├── src/
│   ├── App.vue                         # 主應用元件
│   ├── main.ts                         # 入口點
│   ├── assets/
│   │   └── main.css                    # 全域樣式與 CSS 變數
│   ├── components/
│   │   ├── SplitPane.vue               # 左右分割面板
│   │   ├── EditorPanel.vue             # 編輯區面板
│   │   ├── TextEditor.vue              # 純文字編輯器
│   │   ├── TableEditor.vue             # 表格編輯器
│   │   ├── GanttPanel.vue              # 甘特圖面板（含視圖切換）
│   │   ├── ProjectGantt.vue            # 專案甘特圖
│   │   ├── PersonGantt.vue             # 人力甘特圖
│   │   ├── WorkspaceDropdown.vue       # 工作區下拉選單
│   │   ├── ConflictDialog.vue          # 分享衝突對話框
│   │   └── ConfirmDialog.vue           # 確認對話框
│   ├── composables/
│   │   └── useGanttScale.ts            # 甘特圖時間軸計算
│   ├── parser/
│   │   ├── textParser.ts               # 純文字解析邏輯
│   │   └── frontmatterParser.ts        # Frontmatter 解析邏輯
│   ├── stores/
│   │   ├── projectStore.ts             # 專案狀態管理
│   │   └── workspaceStore.ts           # 工作區狀態管理
│   ├── types/
│   │   └── index.ts                    # TypeScript 型別定義
│   └── utils/
│       ├── sharing.ts                  # URL 分享編碼/解碼
│       ├── gist.ts                     # Gist API 工具
│       └── exporter.ts                 # 匯出功能（PNG/SVG/PPT）
├── public/
├── assets/                             # 文件截圖
├── idea/                               # 設計文件與 prompt
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 關鍵實作細節

### 甘特圖時間軸計算（useGanttScale.ts）
- 根據所有專案階段計算時間範圍（前後各加一個月）
- 計算月份列表、總寬度、X 座標位置
- 提供專案顏色漸層生成函數
- 計算今日標記位置

### 專案/人力甘特圖行分配
- 若階段時間不重疊，優先放在同一行
- 對於接續階段（startDate = `--`），優先與前一階段同行
- 智慧分配減少畫面垂直空間使用

### 隱藏/顯示狀態管理
- 使用 `ref<Set<string>>` 追蹤已隱藏的專案/人員名稱
- `toggleHide()` 切換隱藏狀態
- `showAll()` 清空隱藏集合
- 使用 `v-show` 而非 `v-if` 保留 DOM 結構

### 工作區持久化
- 每個工作區存為獨立 localStorage 項目
- 工作區列表存為 `border-collie-workspaces` 索引
- 自動遷移舊版單一 localStorage 資料

---

## 參考檔案

- `README.md` - 專案說明與使用方式
- `INSTALL.md` - 安裝與部署步驟
- `src/parser/textParser.ts` - 純文字解析邏輯
- `src/parser/frontmatterParser.ts` - Frontmatter 解析邏輯
- `src/stores/projectStore.ts` - 專案狀態管理
- `src/stores/workspaceStore.ts` - 工作區狀態管理
- `src/utils/gist.ts` - Gist API 工具
- `src/composables/useGanttScale.ts` - 甘特圖時間軸計算
- `src/components/ProjectGantt.vue` - 專案甘特圖
- `src/components/PersonGantt.vue` - 人力甘特圖
- `src/components/WorkspaceDropdown.vue` - 工作區下拉選單
