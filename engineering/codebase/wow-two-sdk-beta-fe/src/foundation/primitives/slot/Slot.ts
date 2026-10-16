import {
  Comment,
  Fragment,
  Text,
  createTextVNode,
  defineComponent,
  h,
  normalizeClass,
  normalizeStyle,
  type Slots,
  type VNode,
  type VNodeArrayChildren,
} from 'vue';

export type AnyProps = Record<string, unknown>;

/** Blocks inactive activation before either slotted or component-owned handlers can run. */
export function withInactiveGuard(props: AnyProps, owner: AnyProps = props): AnyProps {
  const disabled = owner.disabled === true || owner.disabled === '';
  const inactive = disabled || owner['aria-disabled'] === true || owner['aria-disabled'] === 'true';
  if (!inactive) return props;
  const guard =
    (name: string) =>
    (event: Event): void => {
      if (event.type.startsWith('key')) {
        const key = (event as KeyboardEvent).key;
        if (key !== 'Enter' && key !== ' ') {
          for (const handler of toHandlers(props[name])) (handler as (event: Event) => void)(event);
          return;
        }
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
  return {
    ...props,
    'aria-disabled': true,
    ...(disabled ? { disabled: true, tabindex: -1 } : {}),
    onClickCapture: guard('onClickCapture'),
    onAuxclickCapture: guard('onAuxclickCapture'),
    onDblclickCapture: guard('onDblclickCapture'),
    onPointerdownCapture: guard('onPointerdownCapture'),
    onKeydownCapture: guard('onKeydownCapture'),
    onKeyupCapture: guard('onKeyupCapture'),
  };
}

/**
 * Vue keeps a vnode's listeners under the same `on[A-Z]` prop shape React uses
 * (`@click` compiles to `onClick`), but a single prop may hold *several*
 * handlers as an array. Normalize both sides before chaining so a child that
 * already carries two listeners doesn't lose one.
 */
function toHandlers(value: unknown): ReadonlyArray<unknown> {
  if (Array.isArray(value)) return value.filter((handler) => typeof handler === 'function');
  return typeof value === 'function' ? [value] : [];
}

/**
 * Merge the slot's own props into the child element's props. Port of the React
 * `Slot`'s `mergeProps`, semantics preserved exactly:
 *
 * - `class` — concatenated, slot first (React's `className`, same order).
 * - `style` — shallow-merged, **child wins** on a key collision.
 * - `on[A-Z]*` — chained **child first, then slot**. Vue invokes an array of
 *   handlers in order, so the chain is expressed as an array rather than React's
 *   wrapper closure — same call order, and each handler stays inspectable.
 * - everything else — the child's value wins whenever it is defined.
 */
export function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...childProps };
  for (const key of Object.keys(slotProps)) {
    const slotVal = slotProps[key];
    const childVal = childProps[key];
    if (key === 'class') {
      merged.class = normalizeClass([slotVal, childVal]);
    } else if (key === 'style') {
      // `normalizeStyle` merges left → right, so the child's declarations land last.
      merged.style = normalizeStyle([slotVal, childVal]);
    } else if (/^on[A-Z]/.test(key)) {
      const slotFns = toHandlers(slotVal);
      const childFns = toHandlers(childVal);
      if (slotFns.length > 0 && childFns.length > 0) {
        merged[key] = [...childFns, ...slotFns];
      } else if (slotFns.length > 0) {
        merged[key] = slotVal;
      }
    } else if (childVal === undefined) {
      merged[key] = slotVal;
    }
  }
  // Inactive ownership cannot be overridden by a child's props or listener order.
  return withInactiveGuard(merged, slotProps);
}

/** A whitespace-only text vnode — the compiler emits these between elements; they are not merge targets. */
function isBlankText(vnode: VNode): boolean {
  return vnode.type === Text && typeof vnode.children === 'string' && vnode.children.trim() === '';
}

/**
 * Flatten a slot's return value to the vnodes that actually render. Vue wraps
 * `v-if` / `v-for` output in `Fragment`s and emits `Comment` placeholders for a
 * false `v-if`; React's `Children.toArray` filtering has no equivalent, so the
 * walk is explicit. This is what makes "the single child element" well-defined.
 */
export function renderableChildren(nodes: VNodeArrayChildren | undefined): Array<VNode> {
  const flattened: Array<VNode> = [];
  for (const node of nodes ?? []) {
    if (node === null || node === undefined || typeof node === 'boolean') continue;
    if (Array.isArray(node)) {
      flattened.push(...renderableChildren(node));
      continue;
    }
    const vnode = node as VNode;
    if (vnode.type === Fragment) {
      flattened.push(...renderableChildren(Array.isArray(vnode.children) ? vnode.children : undefined));
      continue;
    }
    if (vnode.type === Comment || isBlankText(vnode)) continue;
    flattened.push(vnode);
  }
  return flattened;
}

/** A component vnode (as opposed to an intrinsic tag) — its children are a slots object, not an array. */
function isComponentVNode(vnode: VNode): boolean {
  return typeof vnode.type !== 'string';
}

/** The vnodes a target already renders, whether it holds text, an array, or slots. */
function ownChildren(vnode: VNode): Array<VNode> {
  const { children } = vnode;
  if (children === null || children === undefined) return [];
  if (typeof children === 'string') return [createTextVNode(children)];
  if (Array.isArray(children)) return renderableChildren(children);
  const defaultSlot = (children as Slots).default;
  return typeof defaultSlot === 'function' ? renderableChildren(defaultSlot()) : [];
}

/**
 * Rebuild `target` with `props` and `children`.
 *
 * Deliberately **not** `cloneVNode`: that runs the extra props back through
 * Vue's own `mergeProps`, which would concatenate the child's class a second
 * time and chain an already-chained handler — double-firing every listener the
 * child declared. Building the vnode fresh keeps `mergeProps` above the single
 * authority on merge order; `ref` and `key` are carried over by hand because
 * they live on the vnode rather than in its props.
 */
function rebuild(target: VNode, props: AnyProps, children: unknown): VNode {
  const rebuilt = h(target.type as never, props, children as never);
  rebuilt.ref = target.ref;
  rebuilt.key = target.key;
  // These belong to the child vnode rather than its props; losing them drops
  // v-show/custom directives, transition hooks and the caller's scoped CSS.
  rebuilt.dirs = target.dirs;
  rebuilt.transition = target.transition;
  rebuilt.scopeId = target.scopeId;
  if ('slotScopeIds' in target) Object.assign(rebuilt, { slotScopeIds: target.slotScopeIds });
  return rebuilt;
}

/** `<Slottable>` takes no props — the merge target arrives through its default slot. */
export type SlottableProps = Record<string, never>;

/**
 * Marks the merge target among a `Slot`'s children. Wrap the consumer's element
 * in `<Slottable>` when the component renders extra content (icons, adornments)
 * around it — the surrounding children then compose *inside* the cloned target,
 * so the single-child `Slot` contract is never violated.
 */
export const Slottable = defineComponent({
  name: 'Slottable',
  setup(_props, { slots }) {
    return () => slots.default?.() ?? null;
  },
});

/**
 * The single-child merge shared by `Slot` and `Primitive`'s `asChild` branch.
 * Resolves the merge target (honouring `<Slottable>`), merges `slotProps` into
 * it, and returns the rebuilt vnode — or `null` when the slot holds no element.
 */
export function renderSlotClone(slotProps: AnyProps, slots: Slots): VNode | null {
  const children = renderableChildren(slots.default?.());
  const slottable = children.find((child) => child.type === Slottable);

  if (slottable) {
    // The `<Slottable>`'s own child is the real merge target (e.g. a RouterLink).
    const target = ownChildren(slottable)[0];
    if (!target) return null;
    // Rebuild the sibling list, swapping the `<Slottable>` placeholder for the
    // target's original children — so the surrounding nodes compose inside the
    // rebuilt target: [before…, …targetChildren, …after].
    const targetChildren = ownChildren(target);
    const newChildren = children.flatMap((child) => (child === slottable ? targetChildren : [child]));
    const merged = mergeProps(slotProps, (target.props ?? {}) as AnyProps);
    return rebuild(target, merged, isComponentVNode(target) ? { default: () => newChildren } : newChildren);
  }

  const child = children[0];
  if (!child) return null;
  const merged = mergeProps(slotProps, (child.props ?? {}) as AnyProps);
  // Pass the child's existing children straight through — for a component that
  // is its whole slots object, so named slots survive the rebuild.
  return rebuild(child, merged, child.children as Array<VNode> | Slots | string);
}

/*
 * There is deliberately no `Slot` component here.
 *
 * `<slot>` is a real Vue element, so a component registered as `Slot` collides
 * in every template that renders one (`vue/no-reserved-component-names`). The
 * React `Slot`'s always-clone behaviour is `<Primitive as-child>` instead —
 * see `./Primitive`. `renderSlotClone` above is the shared merge core, exported
 * for anything that needs the merge without the component wrapper.
 */
