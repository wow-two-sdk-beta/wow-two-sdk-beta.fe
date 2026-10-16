<script lang="ts">
import type { TagVariant } from '../../display/tag';
import type { InputSize, InputState } from '../InputStyles';

export interface TagsInputProps {
  /** The control size. */
  readonly size?: InputSize;

  /** The validity surface. */
  readonly state?: InputState;

  /** The committed tags, controlled. The `v-model` binding target. */
  readonly modelValue?: ReadonlyArray<string>;

  /** The initial tags when uncontrolled. */
  readonly defaultValue?: ReadonlyArray<string>;

  /** The in-flight text, controlled. The `v-model:input-value` binding target. */
  readonly inputValue?: string;

  /** The empty-state placeholder. */
  readonly placeholder?: string;

  /** The characters that commit the current input. Enter and Tab always do. */
  readonly delimiters?: ReadonlyArray<string>;

  /**
   * The predicate gating committed tags. Default: non-empty after trim.
   *
   * Kept a PROP, not an emit: it RETURNS a verdict, which an emit cannot do.
   */
  readonly validate?: (tag: string) => boolean;

  /** Whether the same tag may be committed twice. Default `false`. */
  readonly canAddDuplicates?: boolean;
  /** @deprecated Use `canAddDuplicates`; this alias is removed next release. */
  readonly allowsDuplicates?: boolean;

  /** The cap on committed tags. */
  readonly max?: number;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The hidden input name; the hidden input emits the comma-joined value. */
  readonly name?: string;

  /**
   * The chip variant.
   *
   * The NAMED type, not `TagVariants['variant']` — the SFC prop resolver cannot follow
   * an indexed access into an imported interface, and the build fails on it while
   * `vue-tsc` stays green.
   */
  readonly tagVariant?: TagVariant;

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
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import Tag from '../../display/tag/Tag.vue';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';

/** Renders committed tags as chips beside a free-form input — Enter, comma or Tab commits the next one. */
/* `inheritAttrs: false` so `class` folds into the container's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'TagsInput', inheritAttrs: false });

const inputProps = withDefaults(defineProps<TagsInputProps>(), {
  delimiters: () => [','],
  validate: (t: string) => t.trim().length > 0,
  canAddDuplicates: undefined,
  allowsDuplicates: undefined,
  tagVariant: 'neutral',
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context, and Vue casts an absent `boolean` prop to `false` — which would shadow it. */
  isInvalid: undefined,
  isDisabled: undefined,
  disabled: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});
const props = useLocaleDefaults(inputProps, 'TagsInput', { placeholder: 'Add tag…' });

const emit = defineEmits<{
  /** Fires when the reader commits or removes a tag — the `v-model` half. */
  'update:modelValue': [tags: ReadonlyArray<string>];
  /** Fires when the reader edits the uncommitted draft text — the `v-model:input-value` half. */
  'update:inputValue': [input: string];
}>();

const attrs = useAttrs();

const tagsControlled = useControlled<ReadonlyArray<string>>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? [],
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const textControlled = useControlled<string>({
  controlled: () => props.inputValue,
  default: () => '',
  onChange: (next) => {
    emit('update:inputValue', next);
  },
});

const tags = tagsControlled.value;
const text = textControlled.value;

const input = useTemplateRef<HTMLInputElement>('input');
const pendingDelete = ref(false);

/* FormControlContext adoption — explicit props stay as overrides. */
const ctx = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? props.readOnly ?? ctx?.isReadOnly);
const invalid = computed(() => props.isInvalid ?? ctx?.isInvalid);
const finalState = computed(() => props.state ?? (invalid.value ? InputStateValue.Invalid : InputStateValue.Default));

function commit(raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed || !props.validate(trimmed)) return;
  if (!(props.canAddDuplicates ?? props.allowsDuplicates ?? false) && tags.value.includes(trimmed)) return;
  if (props.max != null && tags.value.length >= props.max) return;
  tagsControlled.setValue([...tags.value, trimmed]);
  textControlled.setValue('');
}

function removeAt(index: number): void {
  tagsControlled.setValue(tags.value.filter((_, i) => i !== index));
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  textControlled.setValue((event.target as HTMLInputElement).value);
}

/* Runs after any caller-supplied `@keydown` — declared after `v-bind`. */
function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) return;
  if (event.key === 'Enter' || (event.key === 'Tab' && text.value)) {
    if (text.value) {
      if (event.key === 'Enter') event.preventDefault();
      commit(text.value);
      pendingDelete.value = false;
    }
    return;
  }
  if (props.delimiters.includes(event.key)) {
    event.preventDefault();
    commit(text.value);
    pendingDelete.value = false;
    return;
  }
  if (event.key === 'Backspace' && !text.value && tags.value.length > 0) {
    if (pendingDelete.value) {
      event.preventDefault();
      removeAt(tags.value.length - 1);
      pendingDelete.value = false;
    } else {
      pendingDelete.value = true;
    }
    return;
  }
  pendingDelete.value = false;
}

/* Blur is not gated on `defaultPrevented`. */
function onBlur(): void {
  if (text.value) commit(text.value);
  pendingDelete.value = false;
}

function onContainerClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) input.value?.focus();
}

function isPendingDelete(index: number): boolean {
  return pendingDelete.value && index === tags.value.length - 1;
}

/**
 * `Tag` renders its close button only when the consumer bound `@close`. A listener cannot be
 * conditionally omitted with `@close`, so it is bound through `v-on` with an object that is
 * empty when closing is off.
 */
function tagListeners(index: number): Record<string, () => void> {
  if (finalDisabled.value || finalReadOnly.value) return {};
  return { close: () => removeAt(index) };
}

function tagClass(index: number): string {
  return cn(isPendingDelete(index) && 'ring-1 ring-ring');
}

/* Never declared props — a declared `'aria-describedby'` would arrive as
   `props.ariaDescribedby` and stop reaching the DOM. Both are read off the attrs so the
   consumer's value can override the context's. */
const ariaDescribedBy = computed(() => attrs[AriaAttribute.DescribedBy] as string | undefined);
const ariaRequired = computed(() => attrs[AriaAttribute.Required] as 'true' | 'false' | boolean | undefined);

const inputId = computed(() => props.id ?? ctx?.id);
const describedBy = computed(() => ariaDescribedBy.value ?? ctx?.describedBy);
/* aria- (not native) required — the tag list is the value; a native `required` on the empty
   inner input would block submits even with tags committed. */
const requiredAttr = computed(() => ariaRequired.value ?? (ctx?.isRequired || undefined));
const inputPlaceholder = computed(() => (tags.value.length === 0 ? props.placeholder : undefined));
const hiddenValue = computed(() => tags.value.join(','));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.DescribedBy, AriaAttribute.Required]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    inputBaseVariants({ size: props.size, state: finalState.value }),
    'h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5',
    finalDisabled.value && 'cursor-not-allowed opacity-60',
    attrs.class as ClassValue,
  ),
);

/** The rendered `<input>`. */
defineExpose({ el: input });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  tagsControlled.reset();
  textControlled.reset();
});
</script>

<template>
  <div
    :key="formResetRevision"
    role="group"
    :data-disabled="finalDisabled || undefined"
    :data-readonly="finalReadOnly || undefined"
    :data-invalid="invalid || undefined"
    :class="rootClass"
    @click="onContainerClick"
  >
    <Tag
      v-for="(t, i) in tags"
      :key="`${t}-${i}`"
      :variant="tagVariant"
      :data-pending-delete="isPendingDelete(i) ? '' : undefined"
      :class="tagClass(i)"
      v-on="tagListeners(i)"
    >
      {{ t }}
    </Tag>
    <input
      ref="input"
      type="text"
      :id="inputId"
      :value="text"
      :placeholder="inputPlaceholder"
      :disabled="finalDisabled"
      :readonly="finalReadOnly"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      :aria-required="requiredAttr"
      class="min-w-[6rem] flex-1 border-0 bg-transparent p-0 text-sm outline-hidden placeholder:text-subtle-foreground disabled:cursor-not-allowed"
      v-bind="passthroughAttrs"
      @input="onInput"
      @compositionend="onInput"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <input
      v-if="name"
      type="hidden"
      :disabled="finalDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="hiddenValue"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
