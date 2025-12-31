# Excel 匯出功能實作計畫

## 目標

從 BorderCollie 網頁版匯出靜態 Excel 檔案 (`.xlsx`)，包含：
1. **ProjectGantt** 工作表 - 專案甘特圖
2. **PersonGantt** 工作表 - 人力甘特圖

> 靜態圖表，不需要 VBA 互動功能。

---

## 技術選型

| 方案 | 說明 | 選擇 |
|------|------|------|
| **ExcelJS** | 免費、支援 styling、可在 browser 使用 | ✅ |
| SheetJS (Community) | 免費版不支援 styling/charts | ❌ |
| SheetJS Pro | 付費 | ❌ |

---

## Proposed Changes

### [MODIFY] [package.json](file:///Users/kywk/Dropbox/project/border-collie/package.json)

新增 ExcelJS 依賴：
```json
"exceljs": "^4.4.0"
```

---

### [MODIFY] [exporter.ts](file:///Users/kywk/Dropbox/project/border-collie/src/utils/exporter.ts)

新增 `exportToExcel()` 函數：

```typescript
export async function exportToExcel(store: any): Promise<void>
```

**實作邏輯：**

1. **建立 Workbook**
2. **ProjectGantt Worksheet**
   - Row 1-2: 年/月標題列 (styled header)
   - Column A: 專案名稱
   - 資料區: 以 cell 背景色繪製甘特條塊
3. **PersonGantt Worksheet**
   - Row 1-2: 年/月標題列
   - Column A: 人員名稱
   - Row 2 (per person): 月負載數值 + 條件格式 (>1.1 紅色)
   - 資料區: 以 cell 背景色繪製參與專案

---

## 工作表設計

### ProjectGantt 工作表

```
    |  A          |  B  |  C  |  D  |  E  |  F  | ...
----+-------------+-----+-----+-----+-----+-----+----
  1 |             | 2025      | 2026                |
  2 |             | Oct | Nov | Dec | Jan | Feb | ...
----+-------------+-----+-----+-----+-----+-----+----
  3 | AI OCR      | ███ | ███ |     |     |     |   <- BA 階段
  4 |             |     |     | ███ | ███ | ███ |   <- SA 階段
  5 | Staff Portal|     |     |     | ███ | ███ |
```

**樣式：**
- 年份列: 合併儲存格、深色背景
- 月份列: 淺色背景、置中
- 專案名稱: 粗體、凍結欄
- 甘特條塊: 專案顏色填充、白色文字

---

### PersonGantt 工作表

```
    |  A          |  B  |  C  |  D  |  E  |  F  | ...
----+-------------+-----+-----+-----+-----+-----+----
  1 |             | 2025      | 2026                |
  2 |             | Oct | Nov | Dec | Jan | Feb | ...
----+-------------+-----+-----+-----+-----+-----+----
  3 | Andy        | 0.3 | 0.3 | 0.6 | 0.8 | ... |   <- 月負載
  4 |   AI OCR-BA | ███ | ███ |     |     |     |
  5 |   AI OCR-SA |     |     | ███ | ███ |     |
  6 | Ben         | 0.8 | 0.8 |     |     | 1.2 |   <- 1.2 紅色警示
```

**樣式：**
- 負載 > 1.1: 紅色背景
- 負載 ≤ 1.1: 綠色文字
- 甘特條塊: 專案顏色填充

---

### [MODIFY] [GanttPanel.vue](file:///Users/kywk/Dropbox/project/border-collie/src/components/GanttPanel.vue)

在匯出下拉選單新增「Excel」選項：

```vue
<option value="excel">Excel (.xlsx)</option>
```

---

## Verification Plan

### 功能測試

1. 點擊「匯出 → Excel」
2. 確認下載 `.xlsx` 檔案
3. 開啟檔案，確認：
   - 兩個工作表存在
   - 年/月標題列正確
   - 專案/人員甘特圖顯示正確
   - 人力負載警示顏色正確

### 相容性測試

- Excel 2016+
- LibreOffice Calc
- Google Sheets (線上開啟)

---

## 預估工時

| 項目 | 時間 |
|------|------|
| ExcelJS 整合 | 0.5 hr |
| ProjectGantt 工作表 | 1 hr |
| PersonGantt 工作表 | 1 hr |
| UI 整合 | 0.5 hr |
| 測試 | 0.5 hr |
| **總計** | **~3.5 hr** |
