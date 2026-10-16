<script lang="ts">
import type { MenuItemState } from './Menu.variants';

/** Defines props for the checkable menu row. */
export interface MenuCheckboxItemProps {
  /** The checked state, controlled. The `v-model` binding target. */
  readonly modelValue?: boolean;

  /** The initial checked state when uncontrolled. Default `false`. */
  readonly defaultValue?: boolean;

  /** The mixed state — announces `aria-checked="mixed"` and draws a dash; the next toggle checks the row. */
  readonly isIndeterminate?: boolean;

  /** The visual state of the row. */
  readonly state?: MenuItemState;

  /** The disabled state — blocks toggling. */
  readonly isDisabled?: boolean;

  /** The close-after-toggle toggle. Default `true`; `false` keeps the menu open to flip several rows. */
  readonly canCloseOnSelect?: boolean;
  /** @deprecated Use `canCloseOnSelect`; this alias is removed next release. */
  readonly closeOnSelect?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useAttrs, watch } from 'vue';
import { Check, Minus } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { Icon } from '../../../foundation/icons';
import { useId } from '../../../foundation/identifiers';
import { useControlled } from '../../../foundation/state';
import { useMenuContext } from './MenuContext';
import { MenuExtensions } from './MenuExtensions';
import { MenuItemState as MenuItemStateToken, menuItemIndicatorVariants, menuItemVariants } from './Menu.variants';

/** Renders a menu row that toggles one boolean option and marks it with a check. */
defineOptions({ name: 'MenuCheckboxItem', inheritAttrs: false });

defineSlots<{
  /** The row label. */
  default(): unknown;

  /** The check mark override; receives the current state. */
  indicator?(props: { checked: boolean; isIndeterminate: boolean }): unknown;
}>();

/* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an absent
   `boolean` prop to `false`, which would select controlled mode for every row. */
const props = withDefaults(defineProps<MenuCheckboxItemProps>(), {
  modelValue: undefined,
  defaultValue: false,
  isIndeterminate: false,
  state: undefined,
  isDisabled: undefined,
  canCloseOnSelect: undefined,
  closeOnSelect: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader toggles the row — the `v-model` half. */
  'update:modelValue': [checked: boolean];

  /** Fires after each toggle from Enter, Space or a click. */
  select: [];
}>();

const attrs = useAttrs();
const menu = useMenuContext();
const id = useId();
const el = shallowRef<HTMLButtonElement | null>(null);

const controlled = useControlled<boolean>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const isChecked = controlled.value;

/** The `aria-checked` value — `mixed` while indeterminate. */
const ariaChecked = computed(() => (props.isIndeterminate ? 'mixed' : isChecked.value));

const itemState = computed(
  () => props.state ?? (props.isDisabled ? MenuItemStateToken.Disabled : MenuItemStateToken.Default),
);

const classes = computed(() => cn(menuItemVariants({ state: itemState.value }), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Registers the row with the menu's arrow walk; a disabled toggle re-registers it. */
watch(
  [el, () => props.isDisabled],
  ([node, isDisabled]) => {
    menu.registerItem({ id, el: node, disabled: isDisabled === true });
  },
  { immediate: true, flush: 'post' },
);

onScopeDispose(() => menu.unregisterItem(id));

/** Toggles the row — a mixed row becomes checked — then closes the menu tree unless the row keeps it open. */
function toggle(): void {
  controlled.setValue(props.isIndeterminate ? true : !isChecked.value);
  emit('select');
  if (props.canCloseOnSelect ?? props.closeOnSelect ?? true) menu.close();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || props.isDisabled) return;
  if (menu.navigate(id, event)) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggle();
  }
}

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || props.isDisabled) return;
  toggle();
}

/** Moves focus to the row under a mouse pointer, so pointer and keyboard share one highlight. */
function handlePointerMove(event: PointerEvent): void {
  if (!MenuExtensions.isMousePointer(event)) return;
  menu.hoverItem(null);
  if (props.isDisabled) menu.focusSurface();
  else MenuExtensions.focusRow(el.value);
}

function handlePointerLeave(event: PointerEvent): void {
  if (MenuExtensions.isMousePointer(event)) menu.focusSurface();
}

defineExpose({ el });
</script>

<template>
  <button
    ref="el"
    type="button"
    role="menuitemcheckbox"
    :aria-checked="ariaChecked"
    :disabled="isDisabled"
    :aria-disabled="isDisabled || undefined"
    :data-disabled="dataAttr(isDisabled)"
    :data-state="isIndeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'"
    v-bind="rest"
    :class="classes"
    @click="handleClick"
    @keydown="handleKeydown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <span :class="menuItemIndicatorVariants()" aria-hidden="true">
      <slot name="indicator" :checked="isChecked" :is-indeterminate="isIndeterminate">
        <Icon v-if="isIndeterminate" :icon="Minus" :size="14" />
        <Icon v-else-if="isChecked" :icon="Check" :size="14" />
      </slot>
    </span>
    <slot />
  </button>
</template>
