# 🐕 BorderCollie - 專案管理甘特圖

BorderCollie 是一個現代化、輕量級的專案管理與人力資源甘特圖工具。它專為快速編輯與視覺化設計，支援純文字格式定義專案，並即時轉換為互動式甘特圖。

![Dark Mode](assets/Screenshot_Dark.png)

## ✨ 特色功能

-   **雙視圖切換**：
    -   **專案甘特圖 (Project Gantt)**：以專案為核心，展示各階段時程與相依性。
    -   **人力甘特圖 (Person Gantt)**：以人員為核心，視覺化每位成員在不同專案間的投入狀況與工作負載。
-   **純文字編輯 (Text-to-Gantt)**：使用簡單直覺的純文字語法快速定義專案、階段與人員指派。
-   **精美現代 UI**：
    -   **Glassmorphism 設計**：毛玻璃面板標題，漸層背景與陰影效果。
    -   **今日標記線**：時間軸上顯示當日位置，方便對照進度。
    -   **動態互動效果**：滑鼠懸停放大、平滑過渡動畫、主題切換特效。
-   **即時互動**：
    -   支援左右面板拖拉調整 (Split Pane) 與收縮功能。
    -   深色 (Dark) / 淺色 (Light) 主題切換。
    -   甘特圖縮放 (Zoom In/Out)。
-   **智慧排程與負載計算**：
    -   自動處理專案階段的時間接續 (Inherited Dates)。
    -   人力甘特圖自動計算每月平均負載 (Man-Days Average)，並以紅/綠燈號警示過載或閒置。
    -   智慧行分配，優化畫面空間利用。
-   **便捷分享**：
    -   內建 **分享連結** 功能，將甘特圖資料壓縮編碼 (Gzip + Base64) 於 URL 中，無需後端即可分享給同事。

![Light Mode](assets/Screenshot_Light.png)
![Person Gantt](assets/Screenshot_Person.png)

## 🚀 快速開始

### 線上體驗

**https://kywk.github.io/BorderCollie/**

### 本地執行

請參考 [INSTALL.md](./INSTALL.md) 了解詳細安裝與部署步驟。

## 📝 純文字編輯規格

BorderCollie 使用自定義的純文字格式來描述專案。格式設計目標是「可讀性高」且「易於輸入」。

### 格式範例

```text
專案名稱 A:
- 階段名稱, 開始時間, 結束時間: 人員A 投入比, 人員B 投入比
- 階段名稱, --, 結束時間: 人員C 投入比

專案名稱 B:
- ...
```

### 語法說明

1.  **專案宣告**：以 `專案名稱:` 開頭 (冒號結尾)。
2.  **階段定義**：以 `-` 開頭，欄位以 `,` 分隔。
    -   格式：`- 階段名, 開始日期, 結束日期: 人員指派`
    -   **日期格式**：支援 `YYYY-MM` (月視圖) 或 `YYYY-MM-DD`。
    -   **自動接續**：開始日期若填寫 `--`，表示接續該專案「前一個階段」的結束時間。
3.  **人員指派**：位於冒號 `:` 之後，多個人員以 `,` 分隔。
    -   格式：`人員名稱 投入比例`
    -   投入比例為 `0.1` ~ `1.0` (代表 10% ~ 100%)。

### 完整範例

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

## 🛠️ 技術架構

-   **Frontend Framework**: Vue 3 + TypeScript
-   **Build Tool**: Vite
-   **State Management**: Pinia
-   **Styling**: Vanilla CSS (Variables & Scoped CSS)
-   **Utils**: `pako` (Gzip), `js-base64` (URL encoding)

## 📄 License

MIT
