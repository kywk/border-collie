<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
    visible: boolean
    workspaceName: string
}>()

const emit = defineEmits<{
    (e: 'overwrite'): void
    (e: 'rename'): void
    (e: 'cancel'): void
    (e: 'update:visible', value: boolean): void
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)

watch(() => props.visible, (val) => {
    if (val) {
        dialogRef.value?.showModal()
    } else {
        dialogRef.value?.close()
    }
})

function onOverwrite() {
    emit('overwrite')
    emit('update:visible', false)
}

function onRename() {
    emit('rename')
    emit('update:visible', false)
}

function onCancel() {
    emit('cancel')
    emit('update:visible', false)
}

function onBackdropClick(e: MouseEvent) {
    if (e.target === dialogRef.value) {
        onCancel()
    }
}
</script>

<template>
    <dialog 
        ref="dialogRef" 
        class="conflict-dialog"
        @click="onBackdropClick"
    >
        <div class="dialog-content">
            <div class="dialog-icon">⚠️</div>
            <h3 class="dialog-title">專案名稱衝突</h3>
            <p class="dialog-message">
                本機已存在名為「<strong>{{ workspaceName }}</strong>」的專案。<br>
                請選擇如何處理？
            </p>
            <div class="dialog-actions">
                <button class="btn btn-ghost" @click="onCancel">
                    取消
                </button>
                <button class="btn btn-secondary" @click="onRename">
                    重新命名
                </button>
                <button class="btn btn-danger" @click="onOverwrite">
                    覆蓋
                </button>
            </div>
        </div>
    </dialog>
</template>

<style scoped>
.conflict-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: none;
    border-radius: var(--radius-xl);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    padding: 0;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--glass-border);
    max-width: 480px;
    width: 90%;
    margin: 0;
}

.conflict-dialog::backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
}

.dialog-content {
    padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-lg);
    text-align: center;
}

.dialog-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.dialog-title {
    margin: 0 0 var(--spacing-md);
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-text-primary);
}

.dialog-message {
    margin: 0 0 var(--spacing-xl);
    color: var(--color-text-secondary);
    line-height: 1.7;
    font-size: 1rem;
}

.dialog-message strong {
    color: var(--color-accent);
    font-weight: 600;
}

.dialog-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    flex-wrap: wrap;
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--glass-border);
}

.dialog-actions .btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    font-size: 1rem;
    font-weight: 600;
    min-width: 110px;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
}

.btn-secondary {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
}

.btn-secondary:hover {
    background: var(--color-bg-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid transparent;
}

.btn-ghost:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
}
</style>
