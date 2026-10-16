<script lang="ts">
import { inject, type InjectionKey } from 'vue';

/** The value shared with `ActionSheetAction` / `ActionSheetCancel`. */
export interface ActionSheetContextValue {
  setOpen: (open: boolean) => void;
}

export const actionSheetContextKey: InjectionKey<ActionSheetContextValue> = Symbol('wow-two.actionSheet');

export function useActionSheetContext(): ActionSheetContextValue {
  const context = inject(actionSheetContextKey, null);
  if (!context) throw new Error('ActionSheet.* must be used inside <ActionSheet>');
  return context;
}

/**
 * The prop surface of `ActionSheet`.
 *
 * React's `title` / `description` were `ReactNode`; they are `string` props here
 * with matching named slots for rich content. React's `className` is the `class`
 * attr, forwarded to the panel exactly as React forwarded it.
 */
export interface ActionSheetProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The heading above the action rows. Use the `title` slot for rich content. */
  readonly title?: string;

  /** The supporting line under the heading. Use the `description` slot for rich content. */
  readonly description?: string;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useSlots } from 'vue';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import Drawer from '../drawer/Drawer.vue';
import DrawerContent from '../drawer/DrawerContent.vue';
import OverlayTitle from '../OverlayTitle.vue';
import OverlayDescription from '../OverlayDescription.vue';

/**
 * Renders an iOS-style action sheet — a bottom `Drawer` of stacked button rows and a split Cancel.
 */
defineOptions({ name: 'ActionSheet', inheritAttrs: false });

defineSlots<{
  /** The action rows — `ActionSheetAction` / `ActionSheetCancel`. React's `children`. */
  default(): unknown;
  /** The heading, when it is richer than the `title` string prop. */
  title?(): unknown;
  /** The supporting line, when it is richer than the `description` string prop. */
  description?(): unknown;
}>();

/** `open` / the node-ish props default to `undefined` so an absent prop cannot read as a set one. */
const props = withDefaults(defineProps<ActionSheetProps>(), {
  open: undefined,
  defaultOpen: false,
  title: undefined,
  description: undefined,
});

const emit = defineEmits<{
  /** Fires when the sheet opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const attrs = useAttrs();
const slots = useSlots();

/*
 * ActionSheet owns open state and drives Drawer fully controlled, so `setOpen`
 * works in both controlled and uncontrolled modes (Drawer's context isn't
 * interceptable).
 */
const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const resolvedOpen = controlled.value;

provide(actionSheetContextKey, { setOpen: controlled.setValue });

const hasTitle = computed(() => props.title !== undefined || slots.title !== undefined);
const hasDescription = computed(() => props.description !== undefined || slots.description !== undefined);

const classes = computed(() =>
  cn('mx-auto max-w-md rounded-t-xl bg-card p-2 text-card-foreground', attrs.class as string | undefined),
);

/* Every other attribute reaches the dialog panel — an `aria-label` is how a sheet without a title gets its name. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <Drawer :open="resolvedOpen" side="bottom" @update:open="controlled.setValue">
    <DrawerContent v-bind="rest" :class="classes">
      <div v-if="hasTitle || hasDescription" class="px-3 py-2 text-center">
        <OverlayTitle v-if="hasTitle" class="text-sm font-medium text-muted-foreground">
          <slot name="title">{{ props.title }}</slot>
        </OverlayTitle>
        <OverlayDescription v-if="hasDescription" class="mt-1 text-xs text-muted-foreground">
          <slot name="description">{{ props.description }}</slot>
        </OverlayDescription>
      </div>
      <div class="flex flex-col gap-px overflow-hidden rounded-lg bg-border">
        <slot />
      </div>
    </DrawerContent>
  </Drawer>
</template>
