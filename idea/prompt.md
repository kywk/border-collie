# BorderCollie - AI Coding Agent Prompt

> 本文件為 AI Coding Agent 可直接引用的 prompt，描述 BorderCollie 專案的完整規格與設計決策。

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

```text
專案名稱:
- 階段名, 開始時間, 結束時間: 人員1 投入比, 人員2 投入比, ...
- 階段名, --, 結束時間: 人員3 投入比
```

### 語法規則
1. **專案宣告**：`專案名稱:` （冒號結尾）
2. **階段定義**：`- 階段名, 開始日期, 結束日期: 人員指派`
3. **日期格式**：`YYYY-MM`（月視圖）或 `YYYY-MM-DD`（日視圖）
4. **自動接續**：開始日期填 `--` 表示接續前一階段結束時間
5. **人員指派**：`人員名稱 投入比例`，投入比例為 `0.1` ~ `1.0`

### 範例
```text
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
- **箭頭視圖**：可切換為箭頭樣式，視覺化階段流向，自動處理接續階段的重疊與層級顯示

### 人力甘特圖
- 縱軸為人員，橫軸為時間
- 以人員為主，對各專案不同階段投入作 group
- 相同專案不同階段，若時間不重疊，在同一列顯示
- 線段顏色依投入百分比呈現濃淡（40% ~ 100%）
- **工作負載警示**：
  - 超過 110%：紅色背景（縱向跨越該月份所有列）
  - 少於 50%：綠色背景
  - 0%：無背景（表示人員尚未報到或另有調度）

### 分享功能
- URL `?data=compressed` 格式
- 純文字資料經 LZ-String 壓縮編碼（比 Gzip+Base64 短約 10-15%）
- 無需後端即可分享

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

基於 git commit 歷程：

1. ✅ 甘特圖核心、分享連結、UI 架構
2. ✅ 主題增強、佈局優化、匯出功能（PNG/SVG/PPT）
3. ✅ GitHub Actions 自動部署 GitHub Pages
4. ✅ 凍結窗格（Freeze Panes）- 日期列與專案欄固定
5. ✅ UI 美化：Glassmorphism、漸層 Bar、今日標記線、微動畫
6. ✅ LZ-String 壓縮替代 Gzip+Base64（URL 長度減少 10-15%）
7. ✅ 年度時間軸格式：首月顯示完整年月，不同年度交替背景
8. ✅ Today Marker 大頭針設計：紅色圓點 + 垂直線貫穿整個甘特圖
9. ✅ **箭頭顯示模式**：支援標準/箭頭雙模式切換，箭頭模式具備自動重疊 (Overlap)、層級排序 (Z-Index) 與陰影效果 (Drop Shadow)
130. ✅ **UI/UX 優化**：
    - 修正 Export 下拉選單 Z-index 層級問題
    - 提升甘特圖文字對比度與易讀性
    - 統一 Toggle 按鈕視覺風格 (彩色漸層 Icon、一致的懸停動畫) 與操作邏輯

---

## Backlog

- 研究固定網址同步方案（無需手動分享 base64、無後端）
  - 可能方案：GitHub Gist API、JSONBin.io、Firebase Realtime DB

---

## 參考檔案

- `README.md` - 專案說明與使用方式
- `INSTALL.md` - 安裝與部署步驟
- `src/parser/textParser.ts` - 純文字解析邏輯
- `src/stores/projectStore.ts` - 狀態管理
- `src/composables/useGanttScale.ts` - 甘特圖時間軸計算
- `src/components/ProjectGantt.vue` - 專案甘特圖
- `src/components/PersonGantt.vue` - 人力甘特圖
