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

  /**
   * The link destination. Set, the row renders an `<a>` the browser follows on activation. A scheme other than
   * http, https, mailto or tel (or a relative path) renders the plain button row instead.
   */
  readonly href?: string;

  /** The link's browsing context; `_blank` opens a new tab and adds the new-tab label. Needs `href`. */
  readonly target?: string;

  /** The link relationship. Default `noopener noreferrer` for an absolute URL or a new tab; `""` sets none. */
  readonly rel?: string;

  /** The as-child flag — renders the single child element, such as a router `AppLink`, as the row. */
  readonly asChild?: boolean;

  /** The screen-reader text after a new-tab link. Default `"(opens in a new tab)"`, localized; `""` omits it. */
  readonly newTabLabel?: string;
}

/** @internal An absolute web URL, scheme-relative included — a link that may leave the app. */
const AbsoluteWebUrl = /^(?:https?:)?\/\//iu;

/** @internal The link relationship an external or new-tab row gets unless the caller sets its own. */
const ExternalRel = 'noopener noreferrer';
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useAttrs, watch, type ComponentPublicInstance } from 'vue';
import { cn } from '../../../foundation/styles';
import { dataAttr, UrlExtensions } from '../../../foundation/dom';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { Primitive } from '../../../foundation/primitives';
import { useMenuContext } from './MenuContext';
import { MenuExtensions } from './MenuExtensions';
import { MenuItemState as MenuItemStateToken, menuItemVariants } from './Menu.variants';

/**
 * Renders one activatable menu row — a button, a link (`href`) or the caller's own link element (`asChild`); the
 * arrow keys walk the enabled siblings.
 */
defineOptions({ name: 'MenuItem', inheritAttrs: false });

/** The row content — React's `children`; under `asChild`, the single element that becomes the row. */
defineSlots<{ default(): unknown }>();

/** `isDisabled` defaults to `undefined`, not `false` — an absent optional boolean must stay absent. */
const componentProps = withDefaults(defineProps<MenuItemProps>(), {
  state: undefined,
  isDisabled: undefined,
  canCloseOnSelect: undefined,
  closeOnSelect: undefined,
  href: undefined,
  target: undefined,
  rel: undefined,
  asChild: false,
  newTabLabel: undefined,
});

const props = useLocaleDefaults(componentProps, 'MenuItem', { newTabLabel: '(opens in a new tab)' });

const emit = defineEmits<{
  /** Fires when the reader activates the row with Enter, Space, or a click; the menu closes after by default. */
  select: [];
}>();

const attrs = useAttrs();
const menu = useMenuContext();
const id = useId();
const el = shallowRef<HTMLElement | null>(null);

const itemState = computed(
  () => props.state ?? (props.isDisabled ? MenuItemStateToken.Disabled : MenuItemStateToken.Default),
);

/** The checked destination; `undefined` renders the button row. */
const safeHref = computed(() => (props.asChild ? undefined : UrlExtensions.safeNavigation(props.href)));

const isLink = computed(() => safeHref.value !== undefined);

/** Whether activation follows a link — this row's own anchor or the caller's element under `asChild`. */
const followsLink = computed(() => isLink.value || props.asChild);

const opensNewTab = computed(() => isLink.value && props.target === '_blank');

const linkRel = computed(() => {
  if (props.rel !== undefined) return props.rel === '' ? undefined : props.rel;
  return opensNewTab.value || AbsoluteWebUrl.test(safeHref.value ?? '') ? ExternalRel : undefined;
});

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

/** Takes the row element from the as-child primitive, whose root is the caller's element. */
function setChild(instance: Element | ComponentPublicInstance | null): void {
  const node = instance && '$el' in instance ? instance.$el : instance;
  el.value = node instanceof HTMLElement ? node : null;
}

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
    /* A link row clicks itself: the click follows the link (or lets a router link navigate) and activates the row,
       once — the key's own default, which would click it again, is prevented above. */
    if (followsLink.value) el.value?.click();
    else activate();
  }
}

function handleClick(event: MouseEvent): void {
  if (props.isDisabled) return;
  /* A router link prevents the browser's navigation to make its own, which still activates a link row. */
  if (event.defaultPrevented && !followsLink.value) return;
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
  <a
    v-if="isLink"
    ref="el"
    role="menuitem"
    :href="props.isDisabled ? undefined : safeHref"
    :target="props.target"
    :rel="linkRel"
    :aria-disabled="props.isDisabled || undefined"
    :data-disabled="dataAttr(props.isDisabled)"
    v-bind="rest"
    :class="classes"
    @click="handleClick"
    @keydown="handleKeydown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <slot /><span v-if="opensNewTab && props.newTabLabel" class="sr-only">{{ ` ${props.newTabLabel}` }}</span>
  </a>
  <!-- The caller's element becomes the row: role, state, class and handlers merge onto it, its own handlers first. -->
  <Primitive
    v-else-if="props.asChild"
    :ref="setChild"
    as-child
    role="menuitem"
    :aria-disabled="props.isDisabled || undefined"
    :data-disabled="dataAttr(props.isDisabled)"
    v-bind="rest"
    :class="classes"
    @click="handleClick"
    @keydown="handleKeydown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <slot />
  </Primitive>
  <button
    v-else
    ref="el"
    type="button"
    role="menuitem"
    :disabled="props.isDisabled"
    :aria-disabled="props.isDisabled || undefined"
    :data-disabled="dataAttr(props.isDisabled)"
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
