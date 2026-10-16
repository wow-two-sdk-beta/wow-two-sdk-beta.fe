import { defineComponent, h, type PropType } from 'vue';
import type { ElementType } from '../../dom/Polymorphic';
import { renderSlotClone, withInactiveGuard, type AnyProps } from './Slot';

export interface PrimitiveProps {
  /** The element or component to render. Default `'div'`. Ignored when `asChild`. */
  readonly as?: ElementType;

  /**
   * The merge flag — render the single slot child instead of `as`, with this
   * component's attrs merged into it (class concatenated, handlers chained,
   * child props winning). The Vue counterpart of React's `asChild` + `Slot`.
   */
  readonly asChild?: boolean;
}

/**
 * The base element every headless primitive renders through — a polymorphic
 * `as` element that collapses into its own child when `asChild` is set.
 * This is the Vue counterpart of React's `Slot`, and the whole of the
 * `asChild` contract: class concatenated, handlers chained, child props winning.
 *
 * ```vue
 * <Primitive as="button" class="btn">Save</Primitive>
 * <Primitive as-child class="btn"><a href="/x">Open</a></Primitive>
 * ```
 *
 * When one child is wrapped in `<Slottable>`, that element becomes the merge
 * target and the remaining children compose inside it — letting a component
 * render adornments around the consumer's element without breaking the
 * single-child contract:
 * ```vue
 * <Primitive as-child>
 *   <Icon />
 *   <Slottable><a href="/x">Open</a></Slottable>
 * </Primitive>
 * <!-- → <a href="/x" …merged><Icon />Open</a> -->
 * ```
 *
 * Named `Primitive`, not `Slot`: `<slot>` is a reserved Vue element, so a
 * component registered as `Slot` shadows it in templates.
 *
 * Exists as a render function because Vue has no runtime prop-merge on a
 * slot's vnode — `asChild` has to rebuild the child's vnode with merged props.
 * `inheritAttrs: false` is mandatory: the attrs are placed by hand so they land
 * on the child rather than on a wrapper. React's `forwardRef` has no
 * counterpart — the merged element *is* the root, so a parent's template ref
 * resolves to it through `$el`.
 */
export const Primitive = defineComponent({
  name: 'Primitive',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<ElementType>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () => {
      if (props.asChild) return renderSlotClone(attrs as AnyProps, slots);
      const guardedAttrs = withInactiveGuard(attrs as AnyProps);
      // A component target takes the slots object so named slots survive;
      // an intrinsic tag takes the flat vnode array.
      return typeof props.as === 'string'
        ? h(props.as, guardedAttrs, slots.default?.())
        : h(props.as as never, guardedAttrs, slots as never);
    };
  },
});
