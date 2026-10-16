<script lang="ts">
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';
import type { EqualityFn, ListboxPickerIndicator } from './ListboxPickerContext';

/**
 * Represents the prop surface of the `ListboxPicker` root.
 *
 * React modelled single- vs multi-select as a discriminated union
 * (`SingleProps<T> | MultiProps<T>`) over a generic `T`. Vue's `defineProps`
 * resolves one flat runtime shape, and a `generic="T"` SFC cannot host the
 * exported interface in the plain `<script>` block — so the union is flattened
 * and `T` is fixed to `unknown`. `isMultiple` still discriminates at runtime:
 * the value is an array in multi mode and a scalar in single mode.
 *
 * The five surface axes are spelled out rather than inherited from
 * `SurfaceLayoutVariants`: that alias is `VariantProps<typeof surfaceVariants>`, which
 * the SFC compiler cannot follow as a heritage clause — it throws `Failed to
 * resolve extends base type` at build time while `vue-tsc` stays green. Named
 * types resolve fine, and the props have to be generated (not treated as
 * fallthrough attrs) because `rootClass` reads them.
 */
export interface ListboxPickerProps {
  /** The surface style. */
  readonly variant?: SurfaceVariant;

  /** The surface tone. */
  readonly tone?: SurfaceTone;

  /** The corner radius. */
  readonly radius?: SurfaceRadius;

  /** The inner padding. Default `xs` (p-1), for items breathing room. */
  readonly padding?: SurfacePadding;

  /** The elevation / shadow step. */
  readonly elevation?: SurfaceElevation;

  /** The multi-select state — the value becomes an array and items toggle. */
  readonly isMultiple?: boolean;

  /** The selection, controlled. The `v-model` binding target. Array in multi mode. */
  readonly modelValue?: unknown;

  /** The initial selection when uncontrolled. Defaults to `[]` in multi mode. */
  readonly defaultValue?: unknown;

  /** Disables all items when true. */
  readonly isDisabled?: boolean;
  /** Prevents selection changes while allowing inspection. */
  readonly isReadOnly?: boolean;

  /** Compares item values for equality; defaults to `Object.is`. */
  readonly isEqual?: EqualityFn<unknown>;

  /** Sets the selection-indicator style; default `check` (single) or `checkbox` (multi). */
  readonly indicator?: ListboxPickerIndicator;

  /** The tab index of the list container. Defaults to `0`, or `-1` while disabled. */
  readonly tabindex?: number;
}
</script>

<script setup lang="ts">
import { DomOrderExtensions } from '../../../foundation/dom';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { useTypeahead } from '../../../foundation/selection';
import { listboxVariants } from './ListboxPicker.variants';
import {
  defaultEquals,
  listboxContextKey,
  ListboxPickerIndicator as ListboxPickerIndicatorValue,
  type ItemEntry,
  type ListboxPickerContextValue,
} from './ListboxPickerContext';

/** Renders a keyboard-navigable option list with type-to-select, single or multi selection, and per-item indicators. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ListboxPicker', inheritAttrs: false });

const props = withDefaults(defineProps<ListboxPickerProps>(), {
  /* Explicit `undefined` defaults: Vue casts an absent `boolean` prop to `false`, which would
     make `isDisabled` read as an explicit "enabled" and, for `isMultiple`, is simply the real
     default — but `isDisabled` must stay tri-state for the `aria-disabled` / tabindex branches. */
  isMultiple: false,
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks an option, or toggles one in multi mode — the `v-model` half. */
  'update:modelValue': [value: unknown];
  /** Fires when the highlighted option changes by key, pointer or the auto-highlight on mount. */
  'active-change': [id: string | null];
}>();

defineSlots<{
  /** The options, as `ListboxPickerItem` / `ListboxPickerGroup` children. */
  default(): unknown;
}>();

const attrs = useAttrs();
const field = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const finalReadOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const inactive = computed(() => finalDisabled.value || finalReadOnly.value);

/* `EqualityFn` is already imported by the plain `<script>` block above — both blocks share one
   module scope, so re-importing it here would be a duplicate declaration. */
const equals = computed<EqualityFn<unknown>>(() => props.isEqual ?? defaultEquals);

const resolvedIndicator = computed(
  () =>
    props.indicator ?? (props.isMultiple ? ListboxPickerIndicatorValue.Checkbox : ListboxPickerIndicatorValue.Check),
);

const controlled = useControlled<unknown>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? (props.isMultiple ? [] : undefined),
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const values = computed<ReadonlyArray<unknown>>(() => {
  const current = controlled.value.value;
  if (Array.isArray(current)) return current as unknown[];
  return current === undefined ? [] : [current];
});

/* A plain array, not a ref: React held this in a `useRef` precisely so registration churn
   never drove a render, and the reads below all happen inside event handlers. `activeId` is
   the reactive half, and it is what descendants actually re-render on. */
const items: ItemEntry[] = [];
const activeId = ref<string | null>(null);
let mounted = false;
function reconcileActive(): void {
  if (items.some((item) => item.id === activeId.value && !item.isDisabled)) return;
  const enabled = orderedItems().filter((item) => !item.isDisabled);
  activeId.value =
    (enabled.find((item) => values.value.some((value) => equals.value(value, item.value))) ?? enabled[0])?.id ?? null;
}
function scheduleReconcile(): void {
  if (mounted) reconcileActive();
  void nextTick(() => {
    if (mounted) reconcileActive();
  });
}
onBeforeUnmount(() => {
  mounted = false;
});

function registerItem(entry: ItemEntry): void {
  const idx = items.findIndex((i) => i.id === entry.id);
  if (idx >= 0) items[idx] = entry;
  else items.push(entry);
  scheduleReconcile();
}

function unregisterItem(id: string): void {
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) items.splice(idx, 1);
  scheduleReconcile();
}

function setActiveId(id: string | null): void {
  activeId.value = id;
}

function onItemSelect(next: unknown): void {
  if (inactive.value || !items.some((item) => !item.isDisabled && equals.value(item.value, next))) return;
  if (props.isMultiple) {
    const current = controlled.value.value;
    const list = (Array.isArray(current) ? current : []) as unknown[];
    const has = list.some((v) => equals.value(v, next));
    controlled.setValue(has ? list.filter((v) => !equals.value(v, next)) : [...list, next]);
  } else {
    controlled.setValue(next);
  }
}

/* The initial auto-active: first selected enabled option, else the first enabled one.
   `onMounted` is the Vue equivalent of React's mount-only effect — children have registered
   by then, and it never runs on the server. */
onMounted(() => {
  mounted = true;
  if (activeId.value) return;
  const firstSelected = items.find((i) => !i.isDisabled && values.value.some((v) => equals.value(v, i.value)));
  const firstEnabled = items.find((i) => !i.isDisabled);
  activeId.value = (firstSelected ?? firstEnabled)?.id ?? null;
});

/* Mirrors the active id to a hosting combobox after commit, including the initial auto-active. */
watch(activeId, (id) => emit('active-change', id), { flush: 'post' });

const root = useTemplateRef<HTMLDivElement>('root');

/** Activates an option by id and keeps it visible (lists are `max-h-72 overflow-y-auto`). */
function activateById(id: string): void {
  activeId.value = id;
  /* Event-driven only, so `document` is always defined here — but the guard keeps the
     function safe if it is ever reached from a render-time path under SSR. */
  if (typeof document === 'undefined') return;
  root.value?.ownerDocument.getElementById(id)?.scrollIntoView({ block: 'nearest' });
}

function orderedItems(): ItemEntry[] {
  return DomOrderExtensions.inDocumentOrder(items, (item) => root.value?.ownerDocument.getElementById(item.id));
}

function moveActive(direction: 1 | -1, jump = 1): void {
  const list = orderedItems().filter((i) => !i.isDisabled);
  if (list.length === 0) return;
  const currentIdx = list.findIndex((i) => i.id === activeId.value);
  let nextIdx = currentIdx + direction * jump;
  if (currentIdx === -1) nextIdx = direction === 1 ? 0 : list.length - 1;
  if (nextIdx < 0) nextIdx = 0;
  if (nextIdx >= list.length) nextIdx = list.length - 1;
  const nextEntry = list[nextIdx];
  if (nextEntry) activateById(nextEntry.id);
}

/* Type-to-select over the registered options. Labels are read from the live DOM text of each
   option (`document.getElementById` inside the user-event path → SSR-safe), so arbitrary
   children work without threading a label prop. Disabled options are skipped by the matcher. */
const typeahead = useTypeahead<ItemEntry>({
  items: orderedItems,
  getLabel: (entry) => (typeof document === 'undefined' ? '' : (document.getElementById(entry.id)?.textContent ?? '')),
  isDisabled: (entry) => entry.isDisabled,
  getActiveIndex: () => orderedItems().findIndex((i) => i.id === activeId.value),
  onMatch: (entry) => activateById(entry.id),
});

function handleKeyDown(event: KeyboardEvent): void {
  /* React called the consumer's `onKeyDown` first and then honoured `defaultPrevented`.
     A fallthrough listener would be merged AFTER this handler and lose that ordering, so the
     consumer's handler is pulled off `attrs` and invoked by hand (and excluded from the
     passthrough below so it cannot fire twice). */
  (attrs.onKeydown as ((e: KeyboardEvent) => void) | undefined)?.(event);
  if (event.defaultPrevented || event.isComposing || inactive.value) return;
  /* Type-to-select first: a printable char (incl. Space while a buffer is active) is consumed
     here and must not fall through to Enter/Space selection or anything else. */
  if (typeahead.onKeyDown(event)) {
    event.preventDefault();
    return;
  }
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveActive(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveActive(-1);
      break;
    case 'Home':
      event.preventDefault();
      moveActive(-1, items.length);
      break;
    case 'End':
      event.preventDefault();
      moveActive(1, items.length);
      break;
    case 'PageDown':
      event.preventDefault();
      moveActive(1, 10);
      break;
    case 'PageUp':
      event.preventDefault();
      moveActive(-1, 10);
      break;
    case 'Enter':
    case ' ': {
      if (!activeId.value) return;
      const entry = items.find((i) => i.id === activeId.value);
      if (!entry || entry.isDisabled) return;
      event.preventDefault();
      onItemSelect(entry.value);
      break;
    }
  }
}

const context: ListboxPickerContextValue = {
  get isMultiple() {
    return props.isMultiple;
  },
  get values() {
    return values.value;
  },
  get isEqual() {
    return equals.value;
  },
  get activeId() {
    return activeId.value;
  },
  get indicator() {
    return resolvedIndicator.value;
  },
  get isDisabled() {
    return inactive.value;
  },
  onItemSelect,
  registerItem,
  unregisterItem,
  setActiveId,
};

provide(listboxContextKey, context);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'onKeydown']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const listTabIndex = computed(() => (finalDisabled.value ? -1 : (props.tabindex ?? 0)));

const rootClass = computed(() =>
  cn(
    surfaceVariants({
      variant: props.variant,
      tone: props.tone,
      radius: props.radius,
      /* Default padding is `xs` (p-1) for items breathing room — overridable. */
      padding: props.padding ?? 'xs',
      elevation: props.elevation,
    }),
    listboxVariants(),
    attrs.class as ClassValue,
  ),
);

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <div
    :key="formResetRevision"
    ref="root"
    role="listbox"
    :tabindex="listTabIndex"
    :aria-multiselectable="isMultiple || undefined"
    :aria-activedescendant="activeId ?? undefined"
    :aria-disabled="finalDisabled || undefined"
    :aria-readonly="finalReadOnly || undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @keydown="handleKeyDown"
  >
    <slot />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
