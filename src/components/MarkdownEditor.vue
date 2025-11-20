<template>
  <div class="markdown-editor">
    <textarea
      ref="textareaRef"
      v-model="localContent"
      @input="handleInput"
      :style="{
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
      }"
      class="editor-textarea"
      :placeholder="t('editor.editMode')"
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

watch(() => props.modelValue, (newValue) => {
  if (newValue !== localContent.value) {
    localContent.value = newValue;
  }
});

function handleInput() {
  emit('update:modelValue', localContent.value);
}

// 外部から呼び出し可能なメソッド
function insertText(before: string, after: string, placeholder?: string) {
  const textarea = textareaRef.value;
  if (!textarea) return;

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
    const newCursorPos = start + before.length + textToInsert.length;
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
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
