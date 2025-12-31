# BorderCollie 文件目錄

本目錄包含 BorderCollie 專案的設計文件、需求規格與 AI 開發提示。

## 📁 目錄結構

```
doc/
├── _project/           # 專案層級文件
├── gantt-core/         # 甘特圖核心功能
├── workspace/          # Workspace 多專案管理
├── dual-layout/        # 雙欄佈局設計
└── excel/              # Excel VBA 版本
```

## 🗂️ 各目錄說明

### [_project/](./_project/)
專案層級的通用文件，包括：
- `idea.md` - 專案構想與目標
- `changelog.md` - 功能變更紀錄
- `ai-prompt.md` - 核心 AI 開發提示

### [gantt-core/](./gantt-core/)
甘特圖核心功能的設計資料：
- `assets/` - 設計截圖與示意圖

### [workspace/](./workspace/)
Workspace 多專案管理功能：
- `spec.md` - 需求規格
- `ai-prompt.md` - AI 開發提示

### [dual-layout/](./dual-layout/)
雙欄佈局（左編輯、右預覽）設計模式：
- `ai-prompt.md` - 可重用的佈局設計 AI 提示

### [excel/](./excel/)
Excel VBA 甘特圖工具：
- `spec.md` - 需求規格
- `implementation-plan.md` - 實作計畫
- `ai-prompt.md` - AI 開發提示

---

## 📝 文件命名規範

| 檔名 | 用途 |
|------|------|
| `spec.md` | 需求規格定義 |
| `implementation-plan.md` | 詳細實作計畫 |
| `ai-prompt.md` | AI 開發用完整提示 |
| `notes.md` | 開發筆記/備忘 |
| `assets/` | 圖片資源子目錄 |

---

## 🤖 AI Prompt 使用說明

`ai-prompt.md` 檔案設計為可直接提供給 AI Coding Agent 使用的完整 Prompt。

**使用方式**：
1. 複製 `ai-prompt.md` 內容
2. 貼到 AI 對話中作為上下文
3. AI 可據此生成類似功能或進行修改

**適用場景**：
- 在其他專案複製類似功能
- 讓 AI 理解現有設計進行擴充
- 未來 AI 能力提升時重新生成更佳實作
