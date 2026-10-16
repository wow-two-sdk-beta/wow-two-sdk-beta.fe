<script lang="ts">
import type { InputSize, InputState } from '../InputStyles';

export interface EditableInputInputProps {
  /** The control size. */
  readonly size?: InputSize;

  /** The validity surface. */
  readonly state?: InputState;
}
/* React also inherited `Omit<InputBaseVariants, 'size' | 'state'>` — the `border` / `ring`
   axes — but never forwarded them to `inputBaseVariants`, so they were dead props that landed
   on the DOM as unknown attributes. They are not re-declared here; the two axes the original
   actually consumed are. */
</script>

<script setup lang="ts">
import { computed, onMounted, useAttrs, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { inputBaseVariants } from '../InputStyles';
import { useEditableContext } from './EditableInputContext';

/** Renders the edit-mode input, shown only while editing, focused with the caret at the end on entry. */
defineOptions({ name: 'EditableInputInput', inheritAttrs: false });

const props = defineProps<EditableInputInputProps>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useEditableContext();

/* Focus + caret-to-end on entering edit mode. Reached only from `onMounted` (React's effect
   also ran on mount, which is what focuses an `defaultEditing` control) and from a NON-immediate
   post-flush watcher — an `immediate: true, flush: 'post'` watcher would run during SSR and
   throw on the element access. */
function focusEnd(): void {
  const input = ctx.inputEl.value;
  if (!ctx.isEditing || !input) return;
  input.focus();
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

onMounted(focusEnd);
watch(() => ctx.isEditing, focusEnd, { flush: 'post' });

function setRef(node: unknown): void {
  ctx.inputEl.value = (node ?? null) as HTMLInputElement | null;
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  ctx.setDraft((event.target as HTMLInputElement).value);
}

/* Runs after any caller-supplied `@keydown` (declared after `v-bind`), exactly as React's
   `onKeyDown?.(e)` ran before this body. */
function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented) return;
  if (ctx.canSubmitOnEnter && event.key === 'Enter') {
    event.preventDefault();
    ctx.submit();
  } else if (ctx.canCancelOnEscape && event.key === 'Escape') {
    event.preventDefault();
    ctx.cancel();
  }
}

function onBlur(event: FocusEvent): void {
  if (event.defaultPrevented) return;
  if (ctx.canSubmitOnBlur) ctx.submit();
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const inputClass = computed(() =>
  cn(inputBaseVariants({ size: props.size, state: props.state }), attrs.class as ClassValue),
);

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: ctx.inputEl });
</script>

<template>
  <input
    v-if="ctx.isEditing"
    :ref="setRef"
    type="text"
    :value="ctx.draft"
    :disabled="ctx.isDisabled"
    :readonly="ctx.isReadOnly"
    :class="inputClass"
    v-bind="passthroughAttrs"
    @input="onInput"
    @compositionend="onInput"
    @keydown="onKeydown"
    @blur="onBlur"
  />
</template>
