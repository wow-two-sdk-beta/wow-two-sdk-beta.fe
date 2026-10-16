<script lang="ts">
/** Internal — the raw-text pane of `JsonEditor`. Not exported from the folder barrel. */
export interface JsonEditorTextViewProps {
  /** The document rendered as pretty-printed JSON. */
  readonly value: unknown;

  /** The `JSON.stringify` indent. */
  readonly indent: number;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, ref, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { useFormControl } from '../../../foundation/primitives';
import { useJsonEditorContext } from './JsonEditorContext';
import { JsonEditorExtensions } from './JsonEditorExtensions';

/** Renders the document as a pretty-printed JSON textarea that parses on blur and shows parse errors. */
defineOptions({ name: 'JsonEditorTextView' });

const props = defineProps<JsonEditorTextViewProps>();

const emit = defineEmits<{
  /** Fires when the reader leaves the textarea and the edited source parses as valid JSON. */
  commit: [value: unknown];
}>();

/* In text mode the raw textarea is the editing surface — it takes the context id
   (LabelText `for` target) and the Field label overrides the generic fallback name. */
const ctx = useFormControl();
const editor = useJsonEditorContext();

const initial = computed(() => JsonEditorExtensions.safeStringify(props.value, props.indent));

const draft = ref(initial.value);
const error = ref<string | null>(null);
const dirty = ref(false);

// Re-sync when external value changes (when not actively editing).
watch(initial, (next) => {
  if (!dirty.value) draft.value = next;
});

function commit(): void {
  try {
    const parsed: unknown = JSON.parse(draft.value);
    error.value = null;
    emit('commit', parsed);
    dirty.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Invalid JSON';
  }
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  dirty.value = true;
  draft.value = (event.target as HTMLTextAreaElement).value;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    draft.value = initial.value;
    error.value = null;
    dirty.value = false;
  }
}

const textareaClass = computed(() =>
  cn(
    'flex-1 resize-none whitespace-pre bg-transparent p-3 font-mono text-sm outline-hidden placeholder:text-subtle-foreground disabled:cursor-not-allowed',
    error.value && 'text-foreground',
  ),
);

const locale = useLocale();
</script>

<template>
  <div class="flex h-full flex-col">
    <textarea
      :id="ctx?.id"
      :aria-label="locale.t('JsonEditorTextView.jsonSource', undefined, 'JSON source')"
      :aria-labelledby="ctx?.labelledBy"
      :aria-invalid="editor.isInvalid || undefined"
      :aria-describedby="ctx?.describedBy"
      :value="draft"
      :disabled="editor.isDisabled"
      :readonly="editor.isReadOnly"
      :spellcheck="false"
      :class="textareaClass"
      @input="onInput"
      @compositionend="onInput"
      @blur="commit"
      @keydown="onKeydown"
    />
    <div
      v-if="error"
      role="alert"
      class="border-t border-destructive bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground"
    >
      {{ error }}
    </div>
  </div>
</template>
