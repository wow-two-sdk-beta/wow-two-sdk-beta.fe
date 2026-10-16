<script lang="ts">
import type { MenuItemState } from './Menu.variants';

/**
 * Represents the prop surface of `MenuItem`.
 *
 * React declared `extends Omit<MenuItemVariants, 'state'>`; `state` is the only
 * axis `menuItemVariants` carries, so the heritage contributed nothing and is
 * dropped — a `VariantProps<…>` base is unresolvable to the SFC compiler anyway.
 */
export interface MenuItemProps {
  /** The visual state of the item. */
  readonly state?: MenuItemState;

  /** The disabled state — blocks activation. */
  readonly isDisabled?: boolean;

  /** The close-after-activate toggle. Default `true`; `false` keeps the menu open for repeated actions. */
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
import { useMenuContext } from './MenuContext';
import { MenuExtensions } from './MenuExtensions';
import { MenuItemState as MenuItemStateToken, menuItemVariants } from './Menu.variants';

/** Renders one activatable menu row; the arrow keys walk the enabled siblings. */
defineOptions({ name: 'MenuItem', inheritAttrs: false });

/** The row content — React's `children`. */
defineSlots<{ default(): unknown }>();

/** `isDisabled` defaults to `undefined`, not `false` — an absent optional boolean must stay absent. */
const props = withDefaults(defineProps<MenuItemProps>(), {
  state: undefined,
  isDisabled: undefined,
  canCloseOnSelect: undefined,
  closeOnSelect: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader activates the row with Enter, Space, or a click; the menu closes after by default. */
  select: [];
}>();

const attrs = useAttrs();
const menu = useMenuContext();
const id = useId();
const el = shallowRef<HTMLButtonElement | null>(null);

const itemState = computed(
  () => props.state ?? (props.isDisabled ? MenuItemStateToken.Disabled : MenuItemStateToken.Default),
);

const classes = computed(() => cn(menuItemVariants({ state: itemState.value }), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/* React re-registered from an effect keyed on `[ctx, id, isDisabled]`; the same
   two inputs are watched here, so a disabled toggle re-registers and the arrow
   walk sees it without a remount. */
watch(
  [el, () => props.isDisabled],
  ([node, isDisabled]) => {
    menu.registerItem({ id, el: node, disabled: isDisabled === true });
  },
  { immediate: true, flush: 'post' },
);

onScopeDispose(() => menu.unregisterItem(id));

/** Emits `select`, then closes the menu tree unless the row keeps it open. */
function activate(): void {
  emit('select');
  if (props.canCloseOnSelect ?? props.closeOnSelect ?? true) menu.close();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || props.isDisabled) return;
  if (menu.navigate(id, event)) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
  }
}

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || props.isDisabled) return;
  activate();
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
  <!-- Own attrs, then `v-bind="rest"`, then own handlers last — a consumer's
       `click` / `keydown` handler therefore runs first, the order React got from
       calling `onClick?.(e)` ahead of its own logic, which is what makes the
       `defaultPrevented` check meaningful. -->
  <button
    ref="el"
    type="button"
    role="menuitem"
    :disabled="isDisabled"
    :aria-disabled="isDisabled || undefined"
    :data-disabled="dataAttr(isDisabled)"
    v-bind="rest"
    :class="classes"
    @click="handleClick"
    @keydown="handleKeydown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <slot />
  </button>
</template>
