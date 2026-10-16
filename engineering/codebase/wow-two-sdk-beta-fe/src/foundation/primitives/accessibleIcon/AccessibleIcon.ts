import { Fragment, cloneVNode, defineComponent, h } from 'vue';
import { AriaAttribute } from '../../dom/enums/AriaAttribute';
import { renderableChildren } from '../slot/Slot';
import VisuallyHidden from '../visuallyHidden/VisuallyHidden.vue';

export interface AccessibleIconProps {
  /** The accessible label for the icon. */
  readonly label: string;
}

/**
 * Wrap an icon-only element with an accessible label. The icon is hidden
 * from assistive tech and a `VisuallyHidden` sibling provides the label.
 *
 * A render function rather than an SFC: the `aria-hidden` / `focusable` pair
 * has to land on the *consumer's* icon vnode, and only a render function can
 * rebuild someone else's vnode. `cloneVNode`'s prop merge is safe here — these
 * two attributes collide with neither class, style, nor a handler.
 */
export const AccessibleIcon = defineComponent({
  name: 'AccessibleIcon',
  props: {
    label: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => {
      const children = renderableChildren(slots.default?.());
      const target = children[0];
      const icon = target ? cloneVNode(target, { [AriaAttribute.Hidden]: 'true', focusable: 'false' }) : children;
      return h(Fragment, [icon, h(VisuallyHidden, null, { default: () => props.label })]);
    };
  },
});
