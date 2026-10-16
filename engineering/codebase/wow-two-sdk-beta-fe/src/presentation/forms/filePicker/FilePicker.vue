<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface FilePickerProps {
  /** The button label. Default `"Choose file"`. Fill the `label` slot for richer content. */
  readonly label?: string | number;

  /** The filename(s) preview rendered next to the button. Fill the `preview` slot for richer content. */
  readonly preview?: string | number;

  /** The visual size of the button. Default `md`. */
  readonly size?: Size;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;
}

/* Sizes not listed fall back to the `md` row at the call site. */
const SizeClass: Partial<Record<Size, string>> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Upload } from 'lucide-vue-next';
import { cn, Size as SizeValue } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useFormControl } from '../../../foundation/primitives';

/** Renders a styled trigger button over a visually-hidden native `<input type="file">`. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'FilePicker', inheritAttrs: false });

const inputProps = withDefaults(defineProps<FilePickerProps>(), {
  size: SizeValue.Md,
  /* Explicit `undefined` default: the flag falls back to the form control context, and Vue
     casts an absent `boolean` prop to `false` — which would shadow it. */
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});
const props = useLocaleDefaults(inputProps, 'FilePicker', { label: 'Choose file' });

const emit = defineEmits<{
  /** Fires when the reader picks files in the system dialog, carrying the chosen `FileList`. */
  'files-change': [files: FileList | null];
}>();

defineSlots<{
  label?(): unknown;
  preview?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

/* FormControlContext adoption — the HIDDEN native input carries the context id, so
   `Field`-rendered labels/describedby reference it (label click opens the picker).
   The trigger button mirrors describedby for keyboard users. */
const ctx = useFormControl();

const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? ctx?.isReadOnly);
const inactive = computed(() => finalDisabled.value || finalReadOnly.value);
const inputId = computed(() => props.id ?? ctx?.id);
const describedBy = computed(() => ctx?.describedBy);
const isInvalid = computed(() => ctx?.isInvalid || undefined);
/* aria- (not native) required — the change handler resets `value` after handing the files
   out, so a native `required` would block every submit. */
const finalRequired = computed(() => ctx?.isRequired || undefined);

const hasPreview = computed(() => Boolean(props.preview) || Boolean(slots.preview));

const input = useTemplateRef<HTMLInputElement>('input');

function openPicker(): void {
  if (inactive.value) return;
  input.value?.click();
}

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (inactive.value) {
    target.value = '';
    return;
  }
  emit('files-change', target.files);
  // Reset so re-picking the same file fires change again.
  target.value = '';
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() => cn('inline-flex items-center gap-3', attrs.class as ClassValue));

const buttonClass = computed(() =>
  cn(
    'inline-flex items-center gap-2 rounded-md border border-input bg-background font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
    SizeClass[props.size] ?? SizeClass.md,
  ),
);

const UploadIcon = Upload;

/** The rendered `<input type="file">` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: input });
</script>

<template>
  <div :class="wrapperClass">
    <button type="button" :disabled="inactive" :aria-describedby="describedBy" :class="buttonClass" @click="openPicker">
      <Icon :icon="UploadIcon" :size="16" />
      <slot name="label">{{ props.label }}</slot>
    </button>
    <input
      ref="input"
      type="file"
      :id="inputId"
      :disabled="inactive"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      :aria-required="finalRequired"
      class="sr-only"
      v-bind="passthroughAttrs"
      @change="onChange"
    />
    <span v-if="hasPreview" class="truncate text-sm text-muted-foreground">
      <slot name="preview">{{ preview }}</slot>
    </span>
  </div>
</template>
