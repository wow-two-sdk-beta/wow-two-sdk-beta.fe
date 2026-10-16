<script lang="ts">
/** Defines props for a nested submenu; controlled axes use their canonical Vue model names. */
export interface MenuSubProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;
}
</script>

<script setup lang="ts">
import { onScopeDispose, provide, shallowRef, watch } from 'vue';
import { useId } from '../../../foundation/identifiers';
import { useControlled } from '../../../foundation/state';
import { MenuSubKey, MenuSubOpenReason, useMenuContext } from './MenuContext';

/**
 * Renders only its slot, owning the open state of one nested submenu — the `MenuSubTrigger` row and
 * the `MenuSubContent` surface below it. Opening it closes any sibling submenu of the same menu.
 */
defineOptions({ name: 'MenuSub', inheritAttrs: false });

/** The submenu tree — one `MenuSubTrigger` and one `MenuSubContent`. */
defineSlots<{ default(): unknown }>();

/** `open` defaults to `undefined` so an absent prop cannot read as an explicit `false`. */
const props = withDefaults(defineProps<MenuSubProps>(), {
  open: undefined,
  defaultOpen: false,
});

const emit = defineEmits<{
  /** Fires when the submenu opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const menu = useMenuContext();
const id = useId();
const triggerId = useId();
const contentId = useId();
const triggerEl = shallowRef<HTMLElement | null>(null);

/** @internal How the current open started, read once by the submenu surface when it mounts. */
const openReason: { current: MenuSubOpenReason } = { current: MenuSubOpenReason.Keyboard };

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

/** Syncs the parent menu's record of its open submenu, so opening a sibling closes this one. */
watch(
  controlled.value,
  (open) => {
    if (open) menu.trackSubmenu({ id, trigger: () => triggerEl.value, close: () => setOpen(false) });
    else menu.untrackSubmenu(id);
  },
  { immediate: true },
);

onScopeDispose(() => menu.untrackSubmenu(id));

/** Requests the next open state and records how an open started. */
function setOpen(open: boolean, reason: MenuSubOpenReason = MenuSubOpenReason.Keyboard): void {
  if (open) openReason.current = reason;
  controlled.setValue(open);
}

provide(MenuSubKey, {
  id,
  open: controlled.value,
  setOpen,
  openReason,
  triggerEl,
  triggerId,
  contentId,
});
</script>

<template>
  <slot />
</template>
