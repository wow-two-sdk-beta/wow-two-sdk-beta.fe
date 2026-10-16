import {
  computed,
  inject,
  onScopeDispose,
  reactive,
  shallowRef,
  toValue,
  useId,
  watch,
  type InjectionKey,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';
import { AriaAttribute } from '../../dom/enums/AriaAttribute';
import { resolveElement } from '../../dom/ResolveElement';

/**
 * Defines the arrow-key navigation axis of a roving-focus group.
 *
 * Diverges from the shared `Orientation` (foundation/utils) by adding `Both`
 * (2-D grids like ColorSwatchPicker) — stays local per the enum-alignment
 * divergence rule.
 */
export const Orientation = {
  /** Refers to left/right arrow navigation only. */
  Horizontal: 'horizontal',
  /** Refers to up/down arrow navigation only. */
  Vertical: 'vertical',
  /** Refers to both-axis (grid) arrow navigation. */
  Both: 'both',
} as const;

export type Orientation = (typeof Orientation)[keyof typeof Orientation];

export interface ItemEntry {
  id: string;
  node: HTMLElement | null;
}

/**
 * Disabled state is read from the DOM node rather than a hook option, so
 * items keep declaring it the way they already do (native `disabled`,
 * `aria-disabled="true"`, or a bare `data-disabled` attr) and the group sees
 * changes without re-registration.
 */
export function isNodeDisabled(node: HTMLElement | null): boolean {
  if (!node) return false;
  return (
    node.matches(':disabled') ||
    node.getAttribute(AriaAttribute.Disabled) === 'true' ||
    node.hasAttribute('data-disabled')
  );
}

export const isEntryDisabled = (entry: ItemEntry): boolean => isNodeDisabled(entry.node);

/**
 * First enabled entry walking from `start` (inclusive) in direction `dir`.
 * Wraps at the edges when `loop`, otherwise stops there. Returns undefined
 * when no enabled entry is reachable.
 */
export function findEnabled(
  list: ReadonlyArray<ItemEntry>,
  start: number,
  dir: 1 | -1,
  loop: boolean,
): ItemEntry | undefined {
  const len = list.length;
  if (len === 0) return undefined;
  for (let step = 0; step < len; step++) {
    let index = start + dir * step;
    if (loop) index = ((index % len) + len) % len;
    else if (index < 0 || index >= len) return undefined;
    const entry = list[index];
    if (entry && !isEntryDisabled(entry)) return entry;
  }
  return undefined;
}

/** Nearest enabled entry around `idx` (excluding it), preferring the next one on ties. */
export function findNearestEnabled(list: ReadonlyArray<ItemEntry>, idx: number): ItemEntry | undefined {
  for (let distance = 1; distance < list.length; distance++) {
    const forward = list[idx + distance];
    if (forward && !isEntryDisabled(forward)) return forward;
    const backward = list[idx - distance];
    if (backward && !isEntryDisabled(backward)) return backward;
  }
  return undefined;
}

export interface RovingFocusContextValue {
  register: (id: string, node: HTMLElement | null) => void;
  unregister: (id: string) => void;
  focusedId: Readonly<ShallowRef<string | null>>;
  setFocusedId: (id: string) => void;
  onItemKeyDown: (event: KeyboardEvent, id: string) => void;
  /** Re-validates that the tab stop sits on an enabled item (see useRovingFocusItem). */
  ensureEnabledStop: (id: string) => void;

  /** True once the user has interacted with the group; reset when focus leaves. */
  interacted: ShallowRef<boolean>;
  groupEl: Readonly<ShallowRef<HTMLElement | null>>;
}

export const RovingFocusKey: InjectionKey<RovingFocusContextValue> = Symbol('wow-two.rovingFocus');

export interface UseRovingFocusItemOptions {
  /** Preferred tab stop while focus is outside the group (e.g. the selected tab) — APG composite-widget pattern. */
  isActive?: MaybeRefOrGetter<boolean>;
}

export interface UseRovingFocusItemReturn {
  /** Function ref for the item's element — spread with `v-bind`, or bind explicitly with `:ref`. */
  ref: (node: unknown) => void;
  tabindex: 0 | -1;
  onKeydown: (event: KeyboardEvent) => void;
  onFocus: () => void;
  'data-roving-focus-item': boolean;
}

/** A function ref may receive a component's public instance; the group needs the DOM node. */
function toElement(value: unknown): HTMLElement | null {
  return resolveElement(value);
}

/**
 * Inside a `RovingFocusGroup`, returns props to bind onto a focusable item.
 * Outside, returns inert props (tabindex 0).
 *
 * ```vue
 * <button v-bind="item">…</button>
 * ```
 *
 * The returned object is `reactive` — `tabindex` tracks the group's tab stop,
 * so bind the object rather than destructuring it.
 */
export function useRovingFocusItem(options: UseRovingFocusItemOptions = {}): UseRovingFocusItemReturn {
  const context = inject(RovingFocusKey, null);
  const id = useId();
  const node = shallowRef<HTMLElement | null>(null);

  // A compound child can replace its root without remounting its component.
  watch(
    node,
    (el, _previous, onCleanup) => {
      if (!context) return;
      if (!el) {
        context.unregister(id);
        return;
      }
      context.register(id, el);
      context.ensureEnabledStop(id);
      const observer = new MutationObserver(() => context.ensureEnabledStop(id));
      observer.observe(el, {
        attributes: true,
        attributeFilter: ['disabled', AriaAttribute.Disabled, 'data-disabled'],
      });
      onCleanup(() => observer.disconnect());
    },
    { immediate: true, flush: 'post' },
  );

  onScopeDispose(() => context?.unregister(id));

  // Move DOM focus only after user interaction — never on initial mount.
  watch(
    () => context?.focusedId.value,
    (focusedId) => {
      if (focusedId === id && context?.interacted.value && node.value && document.activeElement !== node.value) {
        node.value.focus();
      }
    },
    { flush: 'post' },
  );

  // Keep the active item (e.g. selected tab) as the tab stop whenever focus
  // is outside the group. The group element is watched alongside `isActive`
  // because it is null until mount — React read it from a ref after commit.
  watch(
    [() => toValue(options.isActive ?? false), () => context?.groupEl.value ?? null],
    ([isActive, groupNode], _previous, onCleanup) => {
      if (!isActive || !context || !groupNode || typeof document === 'undefined') return;
      const selectActive = (): void => {
        if (node.value && !isNodeDisabled(node.value)) context.setFocusedId(id);
      };
      if (!groupNode.contains(groupNode.ownerDocument.activeElement)) selectActive();
      const onFocusOut = (event: FocusEvent) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !groupNode.contains(next)) selectActive();
      };
      groupNode.addEventListener('focusout', onFocusOut);
      onCleanup(() => groupNode.removeEventListener('focusout', onFocusOut));
    },
    { immediate: true, flush: 'post' },
  );

  return reactive({
    ref: (value: unknown) => {
      node.value = toElement(value);
    },
    tabindex: computed<0 | -1>(() => (!context || context.focusedId.value === id ? 0 : -1)),
    onKeydown: (event: KeyboardEvent) => context?.onItemKeyDown(event, id),
    onFocus: () => {
      if (!context) return;
      context.interacted.value = true;
      context.setFocusedId(id);
    },
    'data-roving-focus-item': true,
  }) as UseRovingFocusItemReturn;
}
