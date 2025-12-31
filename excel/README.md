# BorderCollie Excel VBA 甘特圖工具

此目錄包含 BorderCollie 專案管理系統的 Excel VBA 版本，可在 Excel 中建立與管理專案甘特圖。

## 📁 檔案結構

```
excel/
├── README.md                 # 本說明文件
├── BorderCollie.xlsm         # 主要 Excel 檔案 (需自行建立)
└── vba/                      # VBA 模組原始碼
    ├── ModConfig.bas         # 設定與常數
    ├── ModDataParser.bas     # 資料解析
    ├── ModGanttRenderer.bas  # 甘特圖繪製
    ├── ModImportExport.bas   # 匯入/匯出功能
    ├── ModMain.bas           # 主程式進入點
    └── ThisWorkbook.cls      # 工作簿事件
```

## 🚀 快速開始

### 步驟 1：建立 Excel 檔案

1. 開啟 Excel (2016 或更新版本)
2. 建立新的空白活頁簿
3. 儲存為 **啟用巨集的活頁簿 (.xlsm)** 格式
   - 檔案 → 另存新檔 → 選擇「Excel 啟用巨集的活頁簿 (*.xlsm)」

### 步驟 2：匯入 VBA 模組

1. 按 `Alt + F11` 開啟 VBA 編輯器
2. 在左側「專案」視窗中，找到你的活頁簿
3. 右鍵點擊活頁簿名稱 → **匯入檔案**
4. 依序匯入 `vba/` 目錄下的所有 `.bas` 檔案：
   - `ModConfig.bas`
   - `ModDataParser.bas`
   - `ModGanttRenderer.bas`
   - `ModImportExport.bas`
   - `ModMain.bas`
5. 對於 `ThisWorkbook.cls`：
   - 雙擊左側的「ThisWorkbook」
   - 複製 `ThisWorkbook.cls` 的內容（跳過前 9 行 Attribute 宣告）
   - 貼到程式碼視窗中

### 步驟 3：初始化

1. 關閉 VBA 編輯器
2. 按 `Alt + F8` 開啟巨集對話框
3. 選擇 `InitializeWorkbook` 並執行
4. 完成後會自動建立 Config 工作表

### 步驟 4：新增控制按鈕 (選用)

1. 在 Config 工作表中
2. 插入 → 圖案 → 選擇矩形
3. 右鍵點擊圖案 → **指派巨集**
4. 選擇對應的巨集：
   - `UpdateAllCharts` - 更新所有圖表
   - `ImportText` - 匯入純文字
   - `ExportText` - 匯出純文字

## 📝 使用說明

### Config 工作表欄位說明

| 欄位 | 說明 | 範例 |
|------|------|------|
| 專案名稱 | 專案名稱 | AI OCR |
| 擱置 | Y/N，擱置的專案不顯示 | N |
| 階段 | 階段名稱 | BA, SA, Dev |
| 開始日期 | 可用 YYYY-MM-DD 或 YYYY-MM | 2025-10-01 |
| 結束日期 | 可用 YYYY-MM-DD 或 YYYY-MM | 2025-11-30 |
| 人員1~8 | 人員名稱 | Andy |
| 比例1~8 | 投入比例 0.1~1.0 | 0.3 |

### 範例資料

| 專案名稱 | 擱置 | 階段 | 開始日期 | 結束日期 | 人員1 | 比例1 | 人員2 | 比例2 |
|----------|------|------|----------|----------|-------|-------|-------|-------|
| AI OCR | N | BA | 2025-10-01 | 2025-11-30 | Andy | 0.3 | Ben | 0.8 |
| AI OCR | N | SA | 2025-12-01 | 2026-02-28 | Andy | 0.3 | Danny | 0.6 |
| AI OCR | N | SD | 2026-03-01 | 2026-04-30 | Andy | 0.6 | Elsa | 0.2 |

### 自動更新

- **開啟檔案時**：自動更新圖表
- **切換工作表時**：切換到 ProjectGantt 或 PersonGantt 時自動更新
- **手動更新**：執行 `UpdateAllCharts` 巨集

## 🔄 與 BorderCollie Web 版同步

### 從 Web 版匯入

1. 在 BorderCollie 網頁版複製純文字格式的專案資料
2. 執行 `ImportText` 巨集
3. 在對話框中貼上資料
4. 確認匯入

### 匯出到 Web 版

1. 執行 `ExportText` 巨集
2. 資料會自動複製到剪貼簿
3. 在 BorderCollie 網頁版貼上

### 支援的純文字格式

```text
name: AI 專案規劃 2025
---
AI OCR:
- BA, 2025-10-01, 2025-11-30: Andy 0.3, Ben 0.8
- SA, 2025-12-01, 2026-02: Andy 0.3, Danny 0.6

Staff Portal, pending:
- BA/SA, 2026-01, 2026-06: Andy 0.3, Monica 0.7
```

## ⚠️ 負載警示

人力甘特圖會自動計算每位人員每月的投入比例總和：

- 🟢 **綠色**：負載 ≤ 1.1 (110%)
- 🔴 **紅色**：負載 > 1.1 (過載警示)

## 🛠️ 疑難排解

### 巨集被停用

1. 檔案 → 選項 → 信任中心 → 信任中心設定
2. 巨集設定 → 選擇「啟用所有巨集」或「停用巨集但通知我」

### 編譯錯誤

確認所有 VBA 模組都已正確匯入，且沒有重複的模組名稱。

### 圖表沒有更新

1. 確認 Config 工作表有資料
2. 手動執行 `UpdateAllCharts` 巨集
3. 檢查日期格式是否正確

## 📄 License

MIT - 與 BorderCollie 專案相同
