# BorderCollie Excel VBA 甘特圖工具設計

## 目標

建立一個 Excel 檔案（`.xlsm`），包含三個工作表：
1. **專案人力配置表** - 結構化資料輸入區
2. **專案甘特圖** - 以專案為核心的甘特圖（VBA 自動產生）
3. **人力甘特圖** - 以人員為核心的甘特圖（VBA 自動產生）

支援與 BorderCollie 網頁版的雙向資料匯入/匯出。

---

## User Review Required

> [!IMPORTANT]
> **VBA 自動更新機制選擇**
> 
> 自動更新有兩種實作方式，需確認偏好：
> - **方案 A：Worksheet_Change 事件** - 每次編輯即時更新（可能影響大量資料輸入時的效能）
> - **方案 B：按鈕觸發 + 開啟時更新** - 提供「更新圖表」按鈕，並在檔案開啟時自動刷新
> 
> **建議採用方案 B**，兼顧效能與即時性。

> [!WARNING]
> **人員數量限制**
> 
> 結構化表格需預設人員欄位數量。建議預設 **8 位人員/階段**，如需更多請確認。

---

## 工作表設計

### 1. 專案人力配置表 (Sheet: Config)

結構化表格設計，每一列代表一個專案階段：

| 欄 | 欄位名稱 | 格式 | 說明 |
|----|----------|------|------|
| A | 專案名稱 | 文字 | 相同專案的階段可合併儲存格或重複填寫 |
| B | 擱置 | 下拉選單 (Y/N) | Pending 狀態 |
| C | 階段名稱 | 文字 | 如 BA, SA, SD, Dev, SIT, UAT |
| D | 開始日期 | 日期 | YYYY-MM-DD 或 YYYY-MM |
| E | 結束日期 | 日期 | YYYY-MM-DD 或 YYYY-MM |
| F | 人員1 | 文字 | 人員名稱 |
| G | 比例1 | 數字 | 0.1 ~ 1.0 |
| H | 人員2 | 文字 | |
| I | 比例2 | 數字 | |
| ... | ... | ... | 最多 8 組人員/比例 |

**範例資料：**

| 專案名稱 | 擱置 | 階段 | 開始日期 | 結束日期 | 人員1 | 比例1 | 人員2 | 比例2 |
|----------|------|------|----------|----------|-------|-------|-------|-------|
| AI OCR | N | BA | 2025-10-01 | 2025-11-30 | Andy | 0.3 | Ben | 0.8 |
| AI OCR | N | SA | 2025-12-01 | 2026-02-28 | Andy | 0.3 | Danny | 0.6 |
| Staff Portal | N | BA/SA | 2026-01-01 | 2026-06-30 | Andy | 0.3 | Monica | 0.7 |

---

### 2. 專案甘特圖 (Sheet: ProjectGantt)

**結構：**
- **Row 1-2**: 年份/月份標題列
- **Row 3+**: 每個專案佔用若干列，顯示各階段時間條

**視覺設計：**
- 年份背景色交替（淺灰/淺藍）
- 階段條塊使用漸層填充色，依專案 index 循環配色
- 條塊內顯示「階段名稱」文字

```
     |  2025  |           2026           |
     | Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|
─────┼────────────────────────────────────────
AI OCR
  BA |████████|   |   |   |   |   |   |   |   |
  SA |   |   |███████████|   |   |   |   |   |
  SD |   |   |   |   |   |███████████|   |   |
```

---

### 3. 人力甘特圖 (Sheet: PersonGantt)

**結構：**
- **Row 1-2**: 年份/月份標題列 + 每月負載欄
- **Row 3+**: 每個人員一區塊，顯示其參與的各專案階段

**負載警示：**
- 每月計算該人員總投入比例
- `> 1.1` 顯示 🔴 紅色警示
- `<= 1.1` 顯示 🟢 綠色

```
        |  2025  |           2026           |
        | Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|
────────┼────────────────────────────────────
Andy
  Load  |🟢0.3|🟢0.3|🟢0.3|🟢0.6|🟢0.6|🟢0.8|...
  AI OCR-BA  |████|████|   |   |   |   |
  AI OCR-SA  |   |   |███|███|███|   |
```

---

## Proposed Changes

### VBA 模組架構

#### [NEW] Module: `ModConfig`
- 常數定義（欄位索引、顏色代碼、警示閾值 1.1）
- 工作表名稱常數

#### [NEW] Module: `ModDataParser`
- `ParseConfigData()` - 解析配置表，回傳專案陣列
- `GetTimeRange()` - 計算資料涵蓋的時間範圍
- `GetPersonList()` - 取得所有人員清單

#### [NEW] Module: `ModGanttRenderer`
- `RenderProjectGantt()` - 繪製專案甘特圖
- `RenderPersonGantt()` - 繪製人力甘特圖
- `DrawTimelineHeader()` - 繪製年/月標題列
- `DrawPhaseBar()` - 繪製階段條塊
- `CalculateMonthlyLoad()` - 計算月負載
- `ApplyLoadWarning()` - 套用紅/綠警示

#### [NEW] Module: `ModImportExport`
- `ExportToText()` - 匯出為 BorderCollie 純文字格式
- `ImportFromText()` - 從純文字格式匯入
- 提供 UserForm 或 InputBox 進行操作

#### [NEW] Class: `Worksheet_Activate` Events
- `ProjectGantt_Activate` - 切換到此工作表時自動更新
- `PersonGantt_Activate` - 切換到此工作表時自動更新

#### [NEW] Ribbon/Button
- 「更新圖表」按鈕
- 「匯入純文字」按鈕
- 「匯出純文字」按鈕

---

### 雙向匯入/匯出格式

**匯出範例（BorderCollie 格式）：**
```text
name: AI 專案規劃 2025
---
AI OCR:
- BA, 2025-10-01, 2025-11-30: Andy 0.3, Ben 0.8
- SA, 2025-12-01, 2026-02: Andy 0.3, Danny 0.6

Staff Portal:
- BA/SA, 2026-01, 2026-06: Andy 0.3, Monica 0.7
```

匯入時解析此格式並填入配置表。

---

## 檔案結構

```
/excel/
├── BorderCollie.xlsm          # 主要 Excel 檔案（含 VBA）
└── README.md                  # 使用說明
```

---

## Verification Plan

### 功能測試

1. **配置表輸入**
   - 輸入範例資料，確認格式驗證正常
   - 測試日期格式 YYYY-MM 與 YYYY-MM-DD

2. **專案甘特圖**
   - 切換工作表，確認自動產生圖表
   - 確認年/月標題列正確
   - 確認條塊位置與顏色正確
   - 確認 Pending 專案不顯示

3. **人力甘特圖**
   - 確認人員分組正確
   - 確認負載計算正確
   - 測試負載 > 1.1 顯示紅色警示

4. **匯入/匯出**
   - 從 BorderCollie 複製純文字，測試匯入
   - 匯出後貼回 BorderCollie，確認顯示一致

### 相容性測試

- Excel 2016 Windows
- Excel 365 Windows
- （可選）Excel for Mac

---

## 實作順序

1. 建立 Excel 基礎結構（三個工作表、標題列）
2. 設計配置表欄位與資料驗證
3. 實作 `ModDataParser` 資料解析
4. 實作 `ModGanttRenderer` 甘特圖繪製
5. 實作自動更新機制
6. 實作匯入/匯出功能
7. 測試與微調

---

## 預估工時

| 項目 | 預估時間 |
|------|----------|
| Excel 結構設計 | 0.5 hr |
| VBA 資料解析 | 1 hr |
| 專案甘特圖繪製 | 1.5 hr |
| 人力甘特圖繪製 | 1.5 hr |
| 匯入/匯出功能 | 1 hr |
| 測試與除錯 | 1 hr |
| **總計** | **~6.5 hr** |
