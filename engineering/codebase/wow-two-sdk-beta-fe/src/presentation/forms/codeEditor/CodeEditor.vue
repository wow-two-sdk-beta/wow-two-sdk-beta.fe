<script lang="ts">
export interface CodeEditorProps {
  /** The source text, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial source text when uncontrolled. */
  readonly defaultValue?: string;

  /** The forward-compat hint; unused by this first-gen component. */
  readonly language?: string;

  /** The number of spaces one indent step inserts. Default `2`. */
  readonly tabSize?: number;

  /** Whether indenting inserts a tab character instead of `tabSize` spaces. Default `false`. */
  readonly isTabIndented?: boolean;

  /** Whether Tab indents. Escape then Tab leaves the editor. Default true. */
  readonly canIndentOnTab?: boolean;

  /** The localized keyboard-exit instruction shown below the editor. */
  readonly keyboardExitLabel?: string;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The CSS minHeight on the surface (default `12rem`). */
  readonly minHeight?: string;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;

  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, nextTick, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { useFormControl } from '../../../foundation/primitives';

/** Renders a source-code textarea with a synced line-number gutter and Tab/Shift-Tab indenting, unhighlighted. */
/* `inheritAttrs: false` so `class` folds into the surface's own `cn()` call, and so the rest
   of the attrs land on the inner `<textarea>` rather than the surface. */
defineOptions({ name: 'CodeEditor', inheritAttrs: false });

const inputProps = withDefaults(defineProps<CodeEditorProps>(), {
  tabSize: 2,
  isTabIndented: false,
  canIndentOnTab: true,

  minHeight: '12rem',
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  isInvalid: undefined,
  isDisabled: undefined,
  disabled: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
});
const props = useLocaleDefaults(inputProps, 'CodeEditor', {
  keyboardExitLabel: 'Press Escape, then Tab to leave the editor.',
});

const emit = defineEmits<{
  /** Fires when the reader types or re-indents the source — the `v-model` half. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const source = controlled.value;

/* Inherits id/flags/describedby from a surrounding <Field>; explicit props win. */
const ctx = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? props.readOnly ?? ctx?.isReadOnly);
const finalInvalid = computed(() => props.isInvalid ?? ctx?.isInvalid);

const textarea = useTemplateRef<HTMLTextAreaElement>('textarea');
const scrollTop = ref(0);
const keyboardExitArmed = ref(false);
const keyboardHintId = useId();

const lineCount = computed(() => source.value.split('\n').length);
const indentChar = computed(() => (props.isTabIndented ? '\t' : ' '.repeat(props.tabSize)));

// Generate line-number string once per line count.
const gutterText = computed(() => Array.from({ length: lineCount.value }, (_, i) => String(i + 1)).join('\n'));

function insertAtSelection(insert: string, selStart: number, selEnd: number): number {
  const next = source.value.slice(0, selStart) + insert + source.value.slice(selEnd);
  controlled.setValue(next);
  return selStart + insert.length;
}

/**
 * Restores the caret after a programmatic edit.
 *
 * React reached for `requestAnimationFrame` to wait out its re-render; `nextTick` is the exact
 * Vue equivalent — it resolves after the reactive update has been flushed to the DOM — and it
 * keeps a browser global out of this file entirely (`requestAnimationFrame` is undefined during
 * SSR, and this handler is only unreachable there by accident of it being a DOM event).
 */
function restoreSelection(start: number, end: number): void {
  void nextTick(() => {
    const ta = textarea.value;
    if (!ta) return;
    ta.selectionStart = start;
    ta.selectionEnd = end;
  });
}

/* Runs after any caller-supplied `@keydown` (declared after `v-bind`), exactly as React's
   `onKeyDown?.(e)` ran before this body. */
function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) return;
  if (!props.canIndentOnTab) return;
  if (event.key === 'Escape') {
    keyboardExitArmed.value = true;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (['Alt', 'Shift', 'Control', 'Meta'].includes(event.key)) return;
  if (event.key !== 'Tab') {
    keyboardExitArmed.value = false;
    return;
  }
  if (keyboardExitArmed.value) {
    keyboardExitArmed.value = false;
    return;
  }

  const ta = event.currentTarget as HTMLTextAreaElement;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = source.value;

  event.preventDefault();

  if (start === end) {
    if (event.shiftKey) {
      // Outdent at cursor's line.
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineSlice = text.slice(lineStart, start);
      const match = props.isTabIndented ? /^\t/ : new RegExp(`^ {1,${props.tabSize}}`);
      const m = match.exec(lineSlice);
      if (m) {
        const next = text.slice(0, lineStart) + lineSlice.slice(m[0].length) + text.slice(start);
        controlled.setValue(next);
        const newPos = start - m[0].length;
        restoreSelection(newPos, newPos);
      }
    } else {
      const newPos = insertAtSelection(indentChar.value, start, end);
      restoreSelection(newPos, newPos);
    }
    return;
  }

  // Multi-line indent / outdent.
  const before = text.slice(0, start);
  const between = text.slice(start, end);
  const after = text.slice(end);
  const lineStartOffset = before.lastIndexOf('\n') + 1;
  const blockStart = before.slice(0, lineStartOffset);
  const block = before.slice(lineStartOffset) + between;
  let newStart: number;
  let newEnd: number;
  if (event.shiftKey) {
    const re = props.isTabIndented ? /^\t/gm : new RegExp(`^ {1,${props.tabSize}}`, 'gm');
    let removedTotal = 0;
    let removedFirst = 0;
    const outdented = block.replace(re, (m, offset: number) => {
      removedTotal += m.length;
      if (offset === 0) removedFirst = m.length;
      return '';
    });
    controlled.setValue(blockStart + outdented + after);
    newStart = Math.max(lineStartOffset, start - removedFirst);
    newEnd = Math.max(newStart, end - removedTotal);
  } else {
    const relEnd = end - lineStartOffset;
    let inserted = 0;
    const indented = block.replace(/^/gm, (_m, offset: number) => {
      if (offset < relEnd) inserted++;
      return indentChar.value;
    });
    controlled.setValue(blockStart + indented + after);
    newStart = start + indentChar.value.length;
    newEnd = end + indentChar.value.length * inserted;
  }
  restoreSelection(newStart, newEnd);
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  controlled.setValue((event.target as HTMLTextAreaElement).value);
}

function onScroll(event: Event): void {
  scrollTop.value = (event.currentTarget as HTMLTextAreaElement).scrollTop;
}

const state = computed(() => (finalInvalid.value ? 'invalid' : 'default'));

/* Never a declared prop — a declared `'aria-describedby'` would arrive as
   `props.ariaDescribedby` and stop reaching the DOM. */
const ariaDescribedBy = computed(() => attrs[AriaAttribute.DescribedBy] as string | undefined);

const textareaId = computed(() => props.id ?? ctx?.id);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const describedBy = computed(
  () =>
    [ariaDescribedBy.value ?? ctx?.describedBy, props.canIndentOnTab ? keyboardHintId : undefined]
      .filter(Boolean)
      .join(' ') || undefined,
);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.DescribedBy]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const surfaceClass = computed(() =>
  cn(
    'relative flex overflow-hidden rounded-md border border-input bg-card text-card-foreground font-mono text-sm shadow-sm',
    'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40',
    state.value === 'invalid' && 'border-destructive focus-within:border-destructive focus-within:ring-destructive/40',
    finalDisabled.value && 'cursor-not-allowed opacity-60',
    attrs.class as ClassValue,
  ),
);

const gutterStyle = computed(() => ({ transform: `translateY(${-scrollTop.value}px)` }));

/** The rendered `<textarea>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(textarea, controlled.reset, () => {
  if (textarea.value) textarea.value.value = String(source.value ?? '');
});

defineExpose({ el: textarea });
</script>

<template>
  <div
    :data-state="state"
    :data-language="language || undefined"
    :data-disabled="finalDisabled || undefined"
    :data-readonly="finalReadOnly || undefined"
    :class="surfaceClass"
    :style="{ minHeight }"
  >
    <!-- React held a ref on this gutter that it never read; dropped rather than kept dead. -->
    <div
      aria-hidden="true"
      class="select-none overflow-hidden border-r border-border bg-muted/40 text-right text-muted-foreground tabular-nums"
    >
      <div class="whitespace-pre px-3 py-2" :style="gutterStyle">{{ gutterText }}</div>
    </div>
    <textarea
      ref="textarea"
      :value="source"
      :id="textareaId"
      :disabled="finalDisabled"
      :readonly="finalReadOnly"
      :required="finalRequired"
      :spellcheck="false"
      :aria-invalid="finalInvalid || undefined"
      :aria-describedby="describedBy"
      class="block flex-1 resize-none whitespace-pre overflow-auto bg-transparent px-3 py-2 outline-hidden placeholder:text-subtle-foreground disabled:cursor-not-allowed"
      v-bind="passthroughAttrs"
      @input="onInput"
      @compositionend="onInput"
      @keydown="onKeydown"
      @scroll="onScroll"
    />
  </div>
  <p v-if="props.canIndentOnTab" :id="keyboardHintId" class="mt-1 text-xs text-muted-foreground">
    {{ props.keyboardExitLabel }}
  </p>
</template>
