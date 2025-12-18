## 需求目的

編輯區新增 Workspace 功能, localstorge 可以儲存多組不同專案的設定.

### 現行問題描述

- 只能編輯/儲存一組專案資訊, 多組專案處理需手動複製到外部記事本.
- 不小心點擊同事傳送過來的分享連結, 會直接覆蓋掉目前的專案設定.
- 沒有專案名稱區分, 需要手動管理多組專案.
- 難以持久化專案內容.

## 機能設計

### Frontmetter 

新增 Frontmatter, 用來描述專案的設定, localstorge 可以儲存多組不同專案的設定.

```
name: "專案名稱"
gist: "專案 Gist ID"
---
[原本專案內容]
```

### Workspace

編輯區新增 Workspace 下拉選單, 可以選擇不同的專案, 

- Workspace 會載入 Frontmatter 的設定, 以 frontmetter name 作為工作區名稱
- 編輯過程仍為即時儲存, 儲存時會將 Frontmatter 一起儲存.
- 選擇已儲存的專案, 可以直接載入專案設定.
- 選擇新增專案, 可以新增專案設定.
- 開啟分享的連結, 若 Frontmatter 中的專案名稱和本地有衝突, 可選擇覆蓋或 rename.

### Gist support

若 frontmatter 中的 gist id 有設定, 可以直接從 Gist 中載入專案設定.

- Gist 中的 Frontmatter 會自動載入到編輯區.
- Gist 中的內容會自動載入到編輯區.
- Gist 中的 Frontmatter 會自動儲存到 localstorge.
- Gist 中的內容會自動儲存到 localstorge.
- Gist 的專案編輯, 僅在本地端儲存與檢視, 不會同步到 Gist.
  - 安全考量, 由人員自行管理與更新 Gist 中的專案設定.
- Gist 的專案畫面上多一個 Refresh 按鈕, 可以重新載入 Gist 中的專案設定.
