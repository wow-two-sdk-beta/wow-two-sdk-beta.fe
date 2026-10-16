<script lang="ts">
import type { MenuItemState } from './Menu.variants';

/** Defines props for one choice inside a `MenuRadioGroup`. */
export interface MenuRadioItemProps {
  /** The value this row selects. */
  readonly value: string;

  /** The visual state of the row. */
  readonly state?: MenuItemState;

  /** The disabled state — blocks selection. Falls back to the group's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** The close-after-select toggle. Default `true`; `false` keeps the menu open. */
  readonly canCloseOnSelect?: boolean;
  /** @deprecated Use `canCloseOnSelect`; this alias is removed next release. */
  readonly closeOnSelect?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useAttrs, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { useId } from '../../../foundation/identifiers';
import { useMenuContext, useMenuRadioGroupContext } from './MenuContext';
import { MenuExtensions } from './MenuExtensions';
import { MenuItemState as MenuItemStateToken, menuItemIndicatorVariants, menuItemVariants } from './Menu.variants';

/** Renders one single-choice menu row that marks the group's selected value with a dot. */
defineOptions({ name: 'MenuRadioItem', inheritAttrs: false });

defineSlots<{
  /** The row label. */
  default(): unknown;

  /** The selection mark override; receives whether this row is selected. */
  indicator?(props: { checked: boolean }): unknown;
}>();

/* `isDisabled` defaults to `undefined` so the group's disabled state can apply. */
const props = withDefaults(defineProps<MenuRadioItemProps>(), {
  state: undefined,
  isDisabled: undefined,
  canCloseOnSelect: undefined,
  closeOnSelect: undefined,
});

const emit = defineEmits<{
  /** Fires after the reader picks this row with Enter, Space or a click. */
  select: [];
}>();

const attrs = useAttrs();
const menu = useMenuContext();
const group = useMenuRadioGroupContext();
const id = useId();
const el = shallowRef<HTMLButtonElement | null>(null);

/** Whether this row is disabled by itself or through its group. */
const disabled = computed(() => props.isDisabled ?? group.isDisabled.value);

/** Whether this row holds the group's value. */
const isChecked = computed(() => group.value.value === props.value);

const itemState = computed(
  () => props.state ?? (disabled.value ? MenuItemStateToken.Disabled : MenuItemStateToken.Default),
);

const classes = computed(() => cn(menuItemVariants({ state: itemState.value }), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Registers the row with the menu's arrow walk; a disabled toggle re-registers it. */
watch(
  [el, disabled],
  ([node, isDisabled]) => {
    menu.registerItem({ id, el: node, disabled: isDisabled });
  },
  { immediate: true, flush: 'post' },
);

onScopeDispose(() => menu.unregisterItem(id));

/** Selects this row's value, then closes the menu tree unless the row keeps it open. */
function choose(): void {
  group.select(props.value);
  emit('select');
  if (props.canCloseOnSelect ?? props.closeOnSelect ?? true) menu.close();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || disabled.value) return;
  if (menu.navigate(id, event)) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    choose();
  }
}

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || disabled.value) return;
  choose();
}

/** Moves focus to the row under a mouse pointer, so pointer and keyboard share one highlight. */
function handlePointerMove(event: PointerEvent): void {
  if (!MenuExtensions.isMousePointer(event)) return;
  menu.hoverItem(null);
  if (disabled.value) menu.focusSurface();
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
    role="menuitemradio"
    :aria-checked="isChecked"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    :data-disabled="dataAttr(disabled)"
    :data-state="isChecked ? 'checked' : 'unchecked'"
    v-bind="rest"
    :class="classes"
    @click="handleClick"
    @keydown="handleKeydown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <span :class="menuItemIndicatorVariants()" aria-hidden="true">
      <slot name="indicator" :checked="isChecked">
        <span v-if="isChecked" class="size-2 rounded-full bg-current" />
      </slot>
    </span>
    <slot />
  </button>
</template>
