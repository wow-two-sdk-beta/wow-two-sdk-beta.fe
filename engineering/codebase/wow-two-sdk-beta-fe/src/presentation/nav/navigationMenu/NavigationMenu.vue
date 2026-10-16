<script lang="ts">
/**
 * The prop surface of `NavigationMenu`.
 *
 * React declared `extends Omit<HTMLAttributes<HTMLElement>, 'defaultValue'>` and
 * read `'aria-label'` off it (defaulting to `Main navigation`). A declared
 * `'aria-label'` would arrive as `props.ariaLabel` and never render, so it stays
 * a fallthrough attr — the default is applied from `useAttrs` below.
 */
export interface NavigationMenuProps {
  /** The value of the item whose panel is open, or `null` if none. Controlled. */
  readonly modelValue?: string | null;

  /** The initially-open item value when uncontrolled. Default `null`. */
  readonly defaultValue?: string | null;
}

/** The accessible name used when the consumer supplies no `aria-label`. */
const DefaultAriaLabel = 'Main navigation';
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { navigationMenuContextKey } from './NavigationMenuContext';

const locale = useLocale();

/** Renders the top-level site navigation bar, holding one expandable panel open at a time. */
defineOptions({ name: 'NavigationMenu', inheritAttrs: false });

/** The `NavigationMenuList` tree — React's `children`. */
defineSlots<{ default(): unknown }>();

/** `modelValue` defaults to `undefined` — the tri-state that separates "controlled to null" from "uncontrolled". */
const props = withDefaults(defineProps<NavigationMenuProps>(), {
  modelValue: undefined,
  defaultValue: null,
});

const emit = defineEmits<{
  /** Fires when the reader opens a different item — carries its value, or `null` once all close. */
  'update:modelValue': [value: string | null];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const { value: activeId, setValue: setActiveId } = useControlled<string | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (next) => emit('update:modelValue', next),
});

provide(navigationMenuContextKey, { activeId, setActiveId });

const ariaLabel = computed(
  () =>
    (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('NavigationMenu.label', undefined, DefaultAriaLabel),
);

const classes = computed(() => cn('relative', attrs.class as string | undefined));

/** Everything but `class` and `aria-label`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, [AriaAttribute.Label]: _ariaLabel, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <nav ref="el" :aria-label="ariaLabel" v-bind="rest" :class="classes"><slot /></nav>
</template>
