import { Text, defineComponent, h, type PropType, type VNode } from 'vue';
import { renderableChildren } from '../../../foundation/primitives';
import { cn } from '../../../foundation/styles';
import { skeletonLineClass, type SkeletonStateAnimation } from './SkeletonState.variants';
import { useSkeletonStateGroup } from './SkeletonStateContext';

/** @internal The bar an empty value draws, so a placeholder row still reads as text. */
const EmptyLineWidth = '8em';

/** @internal Whether a rendered child tree holds a component — which then draws its own skeleton. */
function hasComponent(node: VNode): boolean {
  if (typeof node.type === 'object' || typeof node.type === 'function') return true;
  return Array.isArray(node.children) && renderableChildren(node.children).some(hasComponent);
}

/** @internal Whether a rendered child tree holds text a reader would see — else it is an icon or an image. */
function hasText(node: VNode): boolean {
  if (node.type === Text) return true;
  if (typeof node.type !== 'string') return false;
  if (typeof node.children === 'string') return node.children.trim() !== '';
  return Array.isArray(node.children) && renderableChildren(node.children).some(hasText);
}

/**
 * @internal Renders its content as-is, or in skeleton mode as an inline bar per line box: the text stays mounted but
 * transparent, so every line keeps its height and the bar takes the text's width. An empty value, or an explicit
 * `width`, draws one bar of that width instead.
 *
 * A render function: whether a component's content is text, empty, or other components is only visible on its vnodes.
 */
export const SkeletonStateLine = defineComponent({
  name: 'SkeletonStateLine',
  props: {
    /** Whether the content renders as its placeholder. */
    isSkeleton: { type: Boolean, required: true },
    /** The bar's width, any CSS length; replaces the content's own width. */
    width: { type: String, default: undefined },
    /**
     * Whether the content is text and always becomes one bar. `false` leaves content holding components as it is,
     * so cells and rows let their badges, buttons and avatars draw their own shapes.
     */
    isText: { type: Boolean, default: true },
    /** How the bar moves; defaults to the nearest region's animation. */
    animation: { type: String as PropType<SkeletonStateAnimation>, default: undefined },
  },
  setup(props, { slots }) {
    const group = useSkeletonStateGroup();
    return () => {
      const nodes = slots.default?.();
      if (!props.isSkeleton) return nodes;
      const children = renderableChildren(nodes);
      if (!props.isText && children.some(hasComponent)) return nodes;
      const isFixed = props.width !== undefined || children.length === 0;
      /* An icon is a block box a line bar cannot wrap, so icon-only content becomes one box the icon's size. */
      const isGlyph = !isFixed && !children.some(hasText);
      return h(
        'span',
        {
          'aria-hidden': 'true',
          'data-skeleton-line': '',
          class: cn(
            skeletonLineClass(props.animation ?? group?.animation.value),
            isGlyph && 'inline-flex align-middle',
          ),
          style: isFixed ? { paddingInlineEnd: props.width ?? EmptyLineWidth } : undefined,
        },
        isFixed ? ' ' : nodes,
      );
    };
  },
});
