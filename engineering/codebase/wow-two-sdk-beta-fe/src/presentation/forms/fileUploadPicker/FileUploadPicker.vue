<script lang="ts">
/** Defines why a picked file was rejected by the uploader. */
export const FileRejectionReason = {
  /** Refers to a file whose MIME type / extension is not accepted. */
  Type: 'type',
  /** Refers to a file exceeding the max size. */
  Size: 'size',
  /** Refers to a file beyond the max file count. */
  Count: 'count',
} as const;

export type FileRejectionReason = (typeof FileRejectionReason)[keyof typeof FileRejectionReason];

export interface FileRejection {
  file: File;
  reason: FileRejectionReason;
}

/** Reflects the drop zone's live drag state; surfaced as `data-drag-state`. */
type DragState = 'idle' | 'over' | 'reject';

export interface FileUploadPickerProps {
  /** The `accept` token list handed to the native input and used for validation. */
  readonly accept?: string;

  /** Whether more than one file may be picked. Default `false`. */
  readonly multiple?: boolean;

  /** The per-file byte cap. Files exceeding this drop into `rejected`. */
  readonly maxSize?: number;

  /** The cap on total accepted files (multiple mode). Excess go to `rejected`. */
  readonly maxFiles?: number;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The zone's headline. Fill the `label` slot for richer content. */
  readonly label?: string | number;

  /** The zone's sub-line. Fill the `hint` slot for richer content. */
  readonly hint?: string | number;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The native input name. */
  readonly name?: string;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, ref, watch, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { UploadCloud } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { matchesAccept, matchesAcceptType } from '../../../foundation/files';
import { Icon } from '../../../foundation/icons';
import { useFormControl } from '../../../foundation/primitives';

/**
 * Renders a drag-drop zone that also opens the native picker on click, Enter or Space.
 *
 * Every drop is validated against `accept`, `maxSize` and `maxFiles`, then partitioned into the
 * accepted and rejected lists carried by `files-change`.
 */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call, and so the rest
   of the attrs land on the hidden native `<input>` rather than the wrapper. */
defineOptions({ name: 'FileUploadPicker', inheritAttrs: false });

const inputProps = withDefaults(defineProps<FileUploadPickerProps>(), {
  multiple: false,

  /* Explicit `undefined` defaults: each flag falls back to the form control context, and Vue
     casts an absent `boolean` prop to `false` — which would shadow it. */
  isInvalid: undefined,
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});
const props = useLocaleDefaults(inputProps, 'FileUploadPicker', { label: 'Drop files here, or click to browse' });

const emit = defineEmits<{
  /** Fires when the reader drops or picks files, carrying them split into accepted and rejected. */
  'files-change': [accepted: ReadonlyArray<File>, rejected: ReadonlyArray<FileRejection>];
}>();

defineSlots<{
  /** The content rendered under the drop zone — React's `children`. */
  default?(): unknown;
  label?(): unknown;
  hint?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

const input = useTemplateRef<HTMLInputElement>('input');
const dragCounter = ref(0);
const dragState = ref<DragState>('idle');

/* FormControlContext adoption — explicit props stay as overrides. The HIDDEN native
   input carries the context id, so `Field`-rendered labels/describedby reference it
   (label click opens the picker). The dropzone mirrors describedby for keyboard users. */
const ctx = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? ctx?.isReadOnly);
const inactive = computed(() => finalDisabled.value || finalReadOnly.value);
watch(inactive, (value) => {
  if (value) {
    dragCounter.value = 0;
    dragState.value = 'idle';
  }
});
const invalid = computed(() => props.isInvalid ?? ctx?.isInvalid);

function partition(files: FileList | ReadonlyArray<File>): [ReadonlyArray<File>, ReadonlyArray<FileRejection>] {
  const accepted: Array<File> = [];
  const rejected: Array<FileRejection> = [];
  const arr = Array.from(files);
  for (const f of arr) {
    if (!matchesAccept(f, props.accept)) {
      rejected.push({ file: f, reason: FileRejectionReason.Type });
      continue;
    }
    if (props.maxSize != null && f.size > props.maxSize) {
      rejected.push({ file: f, reason: FileRejectionReason.Size });
      continue;
    }
    accepted.push(f);
  }
  if (props.maxFiles != null && accepted.length > props.maxFiles) {
    const overflow = accepted.splice(props.maxFiles);
    for (const f of overflow) rejected.push({ file: f, reason: FileRejectionReason.Count });
  }
  return [accepted, rejected];
}

function openPicker(): void {
  if (!inactive.value) input.value?.click();
}

function onDragEnter(event: DragEvent): void {
  if (inactive.value) return;
  event.preventDefault();
  dragCounter.value += 1;
  const items = event.dataTransfer?.items;
  let reject = false;
  /* Only the MIME type is exposed pre-drop — size is unavailable and extension tokens are
     unverifiable, so this check is advisory and stays optimistic (`extensionTokens: 'allow'`).
     `onDrop` re-checks authoritatively with `matchesAccept`. */
  if (items && props.accept) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || it.kind !== 'file') continue;
      if (!matchesAcceptType(it.type, props.accept)) {
        reject = true;
        break;
      }
    }
  }
  dragState.value = reject ? 'reject' : 'over';
}

function onDragOver(event: DragEvent): void {
  if (inactive.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
}

function onDragLeave(event: DragEvent): void {
  if (inactive.value) return;
  event.preventDefault();
  dragCounter.value -= 1;
  if (dragCounter.value <= 0) {
    dragCounter.value = 0;
    dragState.value = 'idle';
  }
}

function onDrop(event: DragEvent): void {
  if (inactive.value) return;
  event.preventDefault();
  dragCounter.value = 0;
  dragState.value = 'idle';
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const [accepted, rejected] = partition(files);
  emit('files-change', accepted, rejected);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (inactive.value) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openPicker();
  }
}

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (inactive.value) {
    target.value = '';
    return;
  }
  const files = target.files;
  if (!files || files.length === 0) return;
  const [accepted, rejected] = partition(files);
  emit('files-change', accepted, rejected);
  // reset so picking the same file again still fires
  target.value = '';
}

const showError = computed(() => invalid.value || dragState.value === 'reject');

const hasHint = computed(() => Boolean(props.hint) || Boolean(slots.hint));

const inputId = computed(() => props.id ?? ctx?.id);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() => cn('flex flex-col gap-3', attrs.class as ClassValue));

const zoneClass = computed(() =>
  cn(
    'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-background px-6 py-10 text-center text-sm text-muted-foreground transition-colors',
    'hover:border-border-strong hover:bg-muted/40',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    dragState.value === 'over' && 'border-primary bg-primary-soft/30 text-foreground',
    showError.value && 'border-destructive bg-destructive-soft/30 text-destructive-soft-foreground',
    finalDisabled.value && 'cursor-not-allowed opacity-60 hover:border-input hover:bg-background',
  ),
);

const iconClass = computed(() =>
  cn(
    'text-muted-foreground',
    dragState.value === 'over' && 'text-primary-soft-foreground',
    showError.value && 'text-destructive-soft-foreground',
  ),
);

const UploadIcon = UploadCloud;

/** The rendered `<input type="file">` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: input });
</script>

<template>
  <div :class="wrapperClass">
    <div
      role="button"
      :tabindex="inactive ? -1 : 0"
      :aria-disabled="inactive || undefined"
      :aria-describedby="ctx?.describedBy"
      :data-drag-state="dragState"
      :data-invalid="showError || undefined"
      :class="zoneClass"
      @click="openPicker"
      @keydown="onKeydown"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <Icon :icon="UploadIcon" :size="28" :class="iconClass" />
      <div class="font-medium text-foreground">
        <slot name="label">{{ props.label }}</slot>
      </div>
      <div v-if="hasHint" class="text-xs">
        <slot name="hint">{{ hint }}</slot>
      </div>
      <input
        ref="input"
        type="file"
        :id="inputId"
        :accept="accept"
        :multiple="multiple"
        :disabled="inactive"
        :aria-invalid="invalid || undefined"
        :aria-describedby="ctx?.describedBy"
        :aria-required="ctx?.isRequired || undefined"
        :name="name"
        class="sr-only"
        v-bind="passthroughAttrs"
        @change="onChange"
      />
    </div>
    <slot />
  </div>
</template>
