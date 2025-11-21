<template>
  <div class="markdown-editor">
    <textarea
      ref="textareaRef"
      v-model="localContent"
      @input="handleInput"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      :style="{
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
      }"
      class="editor-textarea"
      :placeholder="t('editor.editMode')"
      inputmode="text"
      enterkeyhint="enter"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      lang="ja"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  modelValue: string;
  fontSize: number;
  fontFamily: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const localContent = ref(props.modelValue);
const textareaRef = ref<HTMLTextAreaElement>();

// ✅ IME入力中のフラグ（追加）
const isComposing = ref(false);

watch(() => props.modelValue, (newValue) => {
  if (newValue !== localContent.value) {
    localContent.value = newValue;
  }
});

// ✅ IME変換開始時の処理（追加）
function handleCompositionStart() {
  isComposing.value = true;
}

// ✅ IME変換終了時の処理（追加）
function handleCompositionEnd() {
  isComposing.value = false;
  // 変換確定後に必ず値を更新
  emit('update:modelValue', localContent.value);
}

function handleInput() {
  // ✅ IME変換中は値を更新しない（修正）
  if (!isComposing.value) {
    emit('update:modelValue', localContent.value);
  }
}

// 外部から呼び出し可能なメソッド
function insertText(before: string, after: string, placeholder?: string) {
  const textarea = textareaRef.value;
  if (!textarea) return;

  // ✅ IME変換中は処理をスキップ（追加）
  if (isComposing.value) {
    console.warn('Cannot insert text during IME composition');
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = localContent.value.substring(start, end);
  const textToInsert = selectedText || placeholder || '';
  
  const newText = 
    localContent.value.substring(0, start) +
    before + textToInsert + after +
    localContent.value.substring(end);
  
  localContent.value = newText;
  emit('update:modelValue', newText);

  // カーソル位置を調整
  setTimeout(() => {
    if (textarea && !isComposing.value) {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
  }, 10);
}

defineExpose({ insertText });
</script>

<style scoped>
.markdown-editor {
  height: 100%;
  width: 100%;
}

.editor-textarea {
  width: 100%;
  height: 100%;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--ion-text-color);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
}

.editor-textarea::placeholder {
  color: var(--ion-color-medium);
}
</style>