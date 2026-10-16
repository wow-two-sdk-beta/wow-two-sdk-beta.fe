<script lang="ts">
export interface FieldProps {
  /** The label text. Fill the `label` slot instead for richer content (e.g. label + tooltip). */
  readonly label?: string | number;

  /** The helper / hint shown beneath the control. Hidden while errors show. */
  readonly helper?: string | number;

  /**
   * The error text — renders only when truthy. Sets `isInvalid` on the form context.
   * Inside a forms-engine `Field` this is an OVERRIDE: leave it unset and the
   * field's own errors (client + server, all of them) render automatically.
   */
  readonly error?: string | number;

  /** The required state (also exposes `isRequired` to the control via context). */
  readonly isRequired?: boolean;

  /** The disabled state (also exposes `isDisabled` to the control). */
  readonly isDisabled?: boolean;

  /** The read-only state (also exposes `isReadOnly` to the control). */
  readonly isReadOnly?: boolean;

  /** Keeps the layout and draws the label, control and helper as skeletons; defaults to the nearest `DataRegion`. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { FormControlProvider, useFormControl } from '../../../foundation/primitives';
import LabelText from '../../display/labelText/LabelText.vue';
import FieldHelperText from '../../display/fieldHelperText/FieldHelperText.vue';
import FieldErrorCallout from '../../feedback/fieldErrorCallout/FieldErrorCallout.vue';
import { provideSkeletonState, useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';

/**
 * Renders label, control, helper and error as one block, wiring the control through form-control context.
 *
 * Wraps the default slot in a `FormControlProvider` so the inner control auto-wires `id`,
 * `aria-describedby`, `aria-invalid`, `disabled`, `required`, `readOnly`.
 *
 * Form-aware: composed inside a forms-engine `Field` it ADOPTS the glue's context
 * instead of shadowing it — same ids, inherited `isInvalid`/flags, and the field's
 * errors render without hand-wiring (`error` stays as an override). Standalone (no
 * surrounding provider) it behaves exactly as before.
 *
 * Each of React's three `ReactNode` props keeps its scalar form and gains a
 * same-named slot for richer content; the prop stays the discriminator.
 */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'Field', inheritAttrs: false });

const props = withDefaults(defineProps<FieldProps>(), {
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the PARENT
     context's value, and Vue's Boolean casting would turn an absent prop into an explicit
     `false` that shadows the parent instead of deferring to it. */
  isRequired: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isSkeleton: undefined,
});

/* One flag switches the label, the control and the helper; each draws its own skeleton in its own box. */
const skeleton = useSkeletonState(() => props.isSkeleton);
provideSkeletonState(skeleton);

/** The single form control (TextInput, SelectPicker, …) — receives wired id/aria via context. */
defineSlots<{
  default(): unknown;
  label?(): unknown;
  helper?(): unknown;
  error?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

/* `parent` is a live-getter object — read fields off it, never destructure. */
const parent = useFormControl();

const hasLabel = computed(() => Boolean(props.label) || Boolean(slots.label));
const hasHelper = computed(() => Boolean(props.helper) || Boolean(slots.helper));
const hasOwnError = computed(() => Boolean(props.error) || Boolean(slots.error));

/* Mirrors FieldErrorCallout's visibility so the helper never hides behind an error
   that won't render. */
const showError = computed(
  () => hasOwnError.value || ((parent?.errors?.length ?? 0) > 0 && (parent?.isInvalid ?? false)),
);

const parentId = computed(() => parent?.id);
const parentErrors = computed(() => parent?.errors);
const isInvalid = computed(() => hasOwnError.value || (parent?.isInvalid ?? false));
const isRequired = computed(() => props.isRequired ?? parent?.isRequired);
const isDisabled = computed(() => props.isDisabled ?? parent?.isDisabled);
const isReadOnly = computed(() => props.isReadOnly ?? parent?.isReadOnly);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('flex flex-col gap-1.5', attrs.class as ClassValue));

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <FormControlProvider
    :id="parentId"
    :errors="parentErrors"
    :is-invalid="isInvalid"
    :is-required="isRequired"
    :is-disabled="isDisabled"
    :is-read-only="isReadOnly"
  >
    <div
      ref="root"
      :data-skeleton="skeleton.isSkeleton.value || undefined"
      :aria-busy="props.isSkeleton || undefined"
      :class="rootClass"
      v-bind="passthroughAttrs"
    >
      <LabelText v-if="hasLabel">
        <slot name="label">{{ label }}</slot>
      </LabelText>

      <slot />

      <FieldErrorCallout v-if="showError" :message="hasOwnError ? error : undefined">
        <!-- Passed only when this Field owns the error: an always-present default slot
             would read as an override and suppress the context's own `errors`. -->
        <template v-if="hasOwnError && $slots.error" #default>
          <slot name="error" />
        </template>
      </FieldErrorCallout>
      <FieldHelperText v-else-if="hasHelper">
        <slot name="helper">{{ helper }}</slot>
      </FieldHelperText>
    </div>
  </FormControlProvider>
</template>
