# Excel 匯出功能 - AI Prompt 參考

> 本文件整理 Excel 匯出功能的需求定義、設計決策與實作細節，供有類似需求的前端專案參考使用。

---

## 功能概述

### 問題背景

專案管理甘特圖工具需要將資料匯出為 Excel 格式，以便：
1. 離線查閱與分享
2. 與不使用網頁版的同事協作
3. 進一步在 Excel 中進行資料分析

### 解決方案

使用 **ExcelJS** 在瀏覽器端生成 `.xlsx` 檔案，包含兩個工作表：
- ProjectGantt - 專案甘特圖
- PersonGantt - 人力甘特圖

---

## 技術選型

| 方案 | 說明 | 選擇 |
|------|------|------|
| **ExcelJS** | 免費、支援 styling、可在 browser 使用 | ✅ |
| SheetJS (Community) | 免費版不支援 styling/charts | ❌ |
| SheetJS Pro | 付費 | ❌ |

### ExcelJS 優點

- 完整的 cell styling 支援 (填充色、字體、邊框)
- 支援合併儲存格
- 支援凍結窗格 (Freeze Panes)
- 瀏覽器端直接生成，無需後端

---

## 資料結構

### 輸入資料 (from Store)

```typescript
// 專案資料
interface Project {
    name: string
    phases: Phase[]
    pending?: boolean
}

// 計算後的階段資料
interface ComputedPhase {
    projectName: string
    projectIndex: number
    name: string
    startDate: string
    endDate: string
}

// 人員指派
interface PersonAssignment {
    person: string
    projectName: string
    projectIndex: number
    phaseName: string
    startDate: string
    endDate: string
    percentage: number
}
```

### 輸出格式

**ProjectGantt 工作表**
```
    | A (專案名) | B (月1) | C (月2) | D (月3) | ...
1   |            | 2025    | 2025    | 2025    | ...  <- 年份列
2   |            | 10月    | 11月    | 12月    | ...  <- 月份列
3   | AI OCR     | ████    | ████    |         | ...  <- 甘特條
4   |            |         |         | ████    | ...
```

**PersonGantt 工作表**
```
    | A (人員)   | B (月1) | C (月2) | ...
1   |            | 2025    | 2025    | ...
2   |            | 10月    | 11月    | ...
3   | Andy       | 0.3     | 0.6     | ...  <- 月負載
4   |   AI-BA    | ████    | ████    | ...  <- 參與專案
5   |   AI-SA    |         | ████    | ...
```

---

## 核心實作

### 主函數

```typescript
export async function exportToExcel(store: any): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BorderCollie'
    workbook.created = new Date()

    const { startDate, endDate, totalMonths, monthLabels } = getTimelineData(store)

    createProjectGanttSheet(workbook, store, startDate, endDate, totalMonths, monthLabels)
    createPersonGanttSheet(workbook, store, startDate, endDate, totalMonths, monthLabels)

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    // Trigger download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'border-collie-gantt.xlsx'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
}
```

### 繪製甘特條塊

```typescript
// 計算月份欄位索引
function getMonthColumn(startDate: Date, targetDate: Date): number {
    return (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
           (targetDate.getMonth() - startDate.getMonth())
}

// 繪製條塊 (合併儲存格 + 填充色)
const startCol = getMonthColumn(startDate, phaseStart) + 2
const endCol = getMonthColumn(startDate, phaseEnd) + 2

if (endCol > startCol) {
    ws.mergeCells(rowNum, startCol, rowNum, endCol)
}

const cell = ws.getCell(rowNum, startCol)
cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } }
cell.font = { color: { argb: 'FFFFFFFF' }, size: 9 }
cell.alignment = { horizontal: 'center', vertical: 'middle' }
```

### 負載警示

```typescript
if (monthLoad > 1.1) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
    cell.font = { size: 9, bold: true, color: { argb: 'FFDC2626' } }
} else if (monthLoad >= 0.5) {
    cell.font = { size: 9, bold: true, color: { argb: 'FF16A34A' } }
} else {
    cell.font = { size: 9, color: { argb: 'FF6B7280' } }
}
```

---

## UI 整合

### GanttPanel.vue

```vue
<script setup>
import { exportToExcel } from '@/utils/exporter'

async function handleExport(type: 'png' | 'svg' | 'ppt' | 'mermaid' | 'excel') {
  if (type === 'excel') {
    await exportToExcel(store)
  }
  // ...
}
</script>

<template>
  <button @click="handleExport('excel')">匯出 Excel</button>
</template>
```

---

## 設計決策

### 為什麼用 Cell 填充色而非 Chart？

1. **ExcelJS 不支援動態 Chart 繪製** - 只能嵌入圖片
2. **Cell 填充更精確** - 可對應到月份欄位
3. **易於維護** - 純文字 + 樣式，無複雜 XML

### 為什麼分兩個工作表？

1. **一致性** - 與網頁版雙視圖一致
2. **易讀性** - 各工作表專注單一視角
3. **列印友善** - 可分別設定列印範圍

---

## 檔案清單

```
src/utils/exporter.ts
├── exportToExcel()           # 主函數
├── createProjectGanttSheet() # 專案甘特圖
├── createPersonGanttSheet()  # 人力甘特圖
├── getMonthColumn()          # 月份索引計算
└── getTimelineData()         # 時間軸資料 (共用)
```

---

## 延伸功能 (Backlog)

- [ ] 圖表標題列 (顯示專案名稱/日期範圍)
- [ ] 自動欄寬調整
- [ ] 多語言支援 (月份名稱)
- [ ] 自訂檔名
- [ ] 匯出選項對話框 (選擇工作表)
