<script lang="ts">
import type { JsonEditorMode } from './JsonEditorContext';

export interface JsonEditorProps {
  /** The document, controlled. The `v-model` binding target. */
  readonly modelValue?: unknown;

  /** The initial document when uncontrolled. Defaults to `{}`. */
  readonly defaultValue?: unknown;

  /** The render mode, controlled. The `v-model:mode` binding target. */
  readonly mode?: JsonEditorMode;

  /** The initial render mode when uncontrolled. Default `tree`. */
  readonly defaultMode?: JsonEditorMode;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** The read-only state. Falls back to the surrounding form control's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The `JSON.stringify` indent used by text mode. Default `2`. */
  readonly indent?: number;

  /** The CSS minHeight on the surface (default `14rem`). */
  readonly minHeight?: string;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { JsonEditorKey, JsonEditorMode as JsonEditorModeValue, type JsonEditorContextValue } from './JsonEditorContext';
import { JsonEditorExtensions, type JsonPath } from './JsonEditorExtensions';
import JsonEditorTreeView from './JsonEditorTreeView.vue';
import JsonEditorTextView from './JsonEditorTextView.vue';

/** Renders a JSON document as an inline-editable tree or as raw text, switched by a mode toggle. */
/* `inheritAttrs: false` so `class` folds into the surface's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'JsonEditor', inheritAttrs: false });

const props = withDefaults(defineProps<JsonEditorProps>(), {
  indent: 2,
  minHeight: '14rem',
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  defaultValue: undefined,
  mode: undefined,
  defaultMode: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the document — the `v-model` half. */
  'update:modelValue': [value: unknown];
  /** Fires when the reader picks a different mode — the `v-model:mode` half. */
  'update:mode': [mode: JsonEditorMode];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const valueCtl = useControlled<unknown>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? {},
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const modeCtl = useControlled<JsonEditorMode>({
  controlled: () => props.mode,
  default: () => props.defaultMode ?? JsonEditorModeValue.Tree,
  onChange: (next) => {
    emit('update:mode', next);
  },
});

/* Named `document` / `renderMode`, not `modelValue` / `mode`: a setup const sharing a prop's
   name collides with it in the template scope (`vue/no-dupe-keys`). */
const document = valueCtl.value;
const renderMode = modeCtl.value;

/* Inherits flags from a surrounding <Field>; explicit props win. The context id /
   labelling / describedby land on the active editing surface (text-mode textarea or
   tree-mode tree) — the subviews read the context themselves. */
const ctx = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? ctx?.isDisabled ?? false);
const finalReadOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly ?? false);
const finalInvalid = computed(() => props.isInvalid ?? ctx?.isInvalid ?? false);

function updateAt(path: JsonPath, next: unknown): void {
  valueCtl.setValue(JsonEditorExtensions.setAtPath(document.value, path, next));
}

/* Live getters, not a snapshot — a flag change on the root has to reach every tree node. */
provide<JsonEditorContextValue>(JsonEditorKey, {
  updateAt,
  get isDisabled() {
    return finalDisabled.value;
  },
  get isReadOnly() {
    return finalReadOnly.value;
  },
  get isInvalid() {
    return finalInvalid.value;
  },
});

/* `Object.values` hoisted out of the template — the runtime template compiler resolves plain
   identifiers, not arbitrary global calls. */
const modes = Object.values(JsonEditorModeValue);

function modeButtonClass(m: JsonEditorMode): string {
  return cn(
    'inline-flex h-6 items-center rounded px-2 text-xs font-medium transition-colors',
    renderMode.value === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  );
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const surfaceClass = computed(() =>
  cn(
    'flex flex-col overflow-hidden rounded-md border border-input bg-card text-card-foreground shadow-sm',
    finalInvalid.value && 'border-destructive',
    finalDisabled.value && 'opacity-60',
    attrs.class as ClassValue,
  ),
);

/** The rendered root `<div>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  valueCtl.reset();
  modeCtl.reset();
});

const locale = useLocale();
</script>

<template>
  <div
    :key="formResetRevision"
    ref="el"
    :data-state="finalInvalid ? 'invalid' : 'default'"
    :class="surfaceClass"
    :style="{ minHeight }"
    v-bind="passthroughAttrs"
  >
    <div class="flex items-center gap-1 border-b border-border bg-muted/40 px-2 py-1">
      <div
        role="radiogroup"
        :aria-label="locale.t('JsonEditor.jsonMode', undefined, 'JSON mode')"
        class="flex items-center gap-0.5 rounded-md bg-card p-0.5 ring-1 ring-border"
      >
        <button
          v-for="m in modes"
          :key="m"
          type="button"
          role="radio"
          :aria-checked="renderMode === m"
          :class="modeButtonClass(m)"
          @click="modeCtl.setValue(m)"
        >
          {{ m }}
        </button>
      </div>
    </div>
    <div class="flex-1 overflow-auto" :style="{ minHeight: 0 }">
      <JsonEditorTreeView v-if="renderMode === 'tree'" :value="document" />
      <JsonEditorTextView v-else :value="document" :indent="indent" @commit="valueCtl.setValue" />
    </div>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
