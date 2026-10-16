<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';

export interface SearchInputProps extends /* @vue-ignore */ NativeInputAttributes {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The border weight. */
  readonly border?: InputBorder;
  /** The focus-ring weight. */
  readonly ring?: InputRing;

  /** The clearable state, showing a clear (×) button when the input has a value. Default true. */
  readonly isClearable?: boolean;

  /** The value, controlled. The `v-model` binding target. */
  readonly modelValue?: string | number;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: string | number;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;

  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Search, X } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';

const SearchIcon = Search;
const ClearIcon = X;

/** Renders a search field with a leading magnifier and an optional clear button inside the border. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. Everything else is forwarded
   onto the inner `<input>` by hand, matching React's `{...props}` placement. */
defineOptions({ name: 'SearchInput', inheritAttrs: false });

const props = withDefaults(defineProps<SearchInputProps>(), {
  isClearable: true,
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form
     control context, and Vue casts an absent `boolean` prop to `false` — which would
     shadow the context with a hard "not disabled / not required / not read-only". */
  isDisabled: undefined,
  disabled: undefined,
  isRequired: undefined,
  required: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the query — the `v-model` half. */
  'update:modelValue': [value: string];
  /** Fires when the reader empties the field with the clear button, after the value is reset. */
  clear: [];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<string | number>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', String(next));
  },
});

const currentValue = controlled.value;

const root = useTemplateRef<HTMLInputElement>('root');

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  controlled.setValue((event.target as HTMLInputElement).value);
}

const showClear = computed(() => props.isClearable && String(currentValue.value ?? '').length > 0);

function handleClear(): void {
  const el = root.value;
  if (el) {
    /* React needed the native value-setter to defeat its own value tracker; Vue reads the
       value straight off the element, so a plain assignment plus a bubbling `input` drives
       both this component's handler and any fallthrough `input` listener. */
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  } else {
    controlled.setValue('');
  }
  emit('clear');
}

const finalState = computed(() => props.state ?? (ctx?.isInvalid ? InputStateValue.Invalid : InputStateValue.Default));

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled ?? false);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? props.readOnly ?? ctx?.isReadOnly);
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'value']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() => cn('relative', attrs.class as ClassValue));

const inputClass = computed(() =>
  cn(
    inputBaseVariants({
      size: props.size,
      state: finalState.value,
      border: props.border,
      ring: props.ring,
    }),
    'pl-9',
    showClear.value && 'pr-9',
    '[&::-webkit-search-cancel-button]:appearance-none',
  ),
);

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(root, controlled.reset, () => {
  if (root.value) root.value.value = String(currentValue.value ?? '');
});

defineExpose({ el: root });

const locale = useLocale();
</script>

<template>
  <div :class="wrapperClass">
    <Icon :icon="SearchIcon" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
    <input
      ref="root"
      type="search"
      :id="inputId"
      :value="currentValue"
      :disabled="finalDisabled"
      :required="finalRequired"
      :readonly="finalReadOnly"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      :class="inputClass"
      v-bind="passthroughAttrs"
      @input="onInput"
      @compositionend="onInput"
    />
    <button
      v-if="showClear"
      type="button"
      :disabled="finalDisabled"
      :aria-label="locale.t('SearchInput.clearSearch', undefined, 'Clear search')"
      class="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-subtle-foreground hover:bg-muted hover:text-muted-foreground"
      @click="handleClear"
    >
      <Icon :icon="ClearIcon" :size="14" />
    </button>
  </div>
</template>
