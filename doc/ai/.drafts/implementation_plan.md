# BorderCollie 效能優化計畫

## 問題分析

### 已識別的效能瓶頸

#### 1. **即時更新觸發過多重複計算** ⚠️ 高優先

**問題**：TextEditor 每次輸入都觸發 `store.updateText()`，導致：
- 解析 Frontmatter
- 解析專案內容 (`parseText`)
- 序列化並寫入 localStorage
- 觸發所有 computed 屬性重新計算

**位置**：`TextEditor.vue` L8-9, `projectStore.ts` L76-86

```typescript
// 每次按鍵都執行
set: (value: string) => store.updateText(value)
```

#### 2. **localStorage 寫入過於頻繁** ⚠️ 高優先

**問題**：每次文字變更都執行 `persist()`，造成 I/O 瓶頸

**位置**：`workspaceStore.ts` L227, L239

#### 3. **Computed 屬性缺少快取優化** ⚠️ 中優先

**問題**：以下 computed 屬性在每次 projects 變更時都完整重新計算：
- `computedPhases`：O(n) 遍歷所有階段
- `allPersons`：O(n) 遍歷 + Set 操作
- `personAssignments`：O(n) 遍歷
- `timeRange`：O(n) 遍歷

**位置**：`projectStore.ts` L117-220

#### 4. **ProjectGantt 複雜 computed** ⚠️ 中優先

**問題**：`projectRows` computed 包含複雜的重疊檢測邏輯和多層迴圈

**位置**：`ProjectGantt.vue` L53-163

---

## 優化方案

### Phase 1: Debounce 文字輸入（立即效果）

**變更**：在 TextEditor 加入 debounce，減少更新頻率

```typescript
// TextEditor.vue
import { useDebounceFn } from '@vueuse/core'

const debouncedUpdate = useDebounceFn((value: string) => {
    store.updateText(value)
}, 300)

const text = computed({
    get: () => store.rawText,
    set: (value: string) => {
        // 立即更新本地狀態，延遲觸發解析
        localText.value = value
        debouncedUpdate(value)
    }
})
```

### Phase 2: Throttle localStorage 寫入

**變更**：使用 throttle 限制 persist 頻率

```typescript
// workspaceStore.ts
import { throttle } from 'lodash-es'

const throttledPersist = throttle(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        workspaces: workspaces.value,
        currentId: currentId.value
    }))
}, 1000)
```

### Phase 3: 分離 rawText 狀態

**變更**：讓 TextEditor 管理自己的 local state，只在需要時同步

```typescript
// projectStore.ts
const pendingText = ref('')  // 編輯中的暫存
const rawText = ref('')       // 已解析的版本

function updateText(text: string) {
    if (text === rawText.value) return  // 避免重複更新
    rawText.value = text
    // ...
}
```

### Phase 4: Virtual Scroll（大量資料）

**變更**：若專案/階段數量超過閾值，使用虛擬滾動

---

## 實作順序

| 優先 | 項目 | 預估效果 | 風險 |
|------|------|----------|------|
| 1 | Debounce 輸入 | 減少 80% 計算 | 低 |
| 2 | Throttle localStorage | 減少 I/O 延遲 | 低 |
| 3 | 分離編輯狀態 | 更流暢的輸入 | 中 |
| 4 | Virtual Scroll | 大量資料支援 | 高 |

---

## 需要安裝的套件

```bash
npm install @vueuse/core lodash-es
npm install -D @types/lodash-es
```
