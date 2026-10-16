const ElementNode = 1;
const TextNode = 3;

function isHtmlElement(value: unknown): value is HTMLElement {
  return typeof value === 'object' && value !== null && (value as Node).nodeType === ElementNode && 'style' in value;
}

/** Vue opens every fragment with an empty text node; any other node is not an anchor to walk from. */
function isFragmentAnchor(value: unknown): value is Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Node).nodeType === TextNode &&
    (value as Node).textContent === ''
  );
}

/**
 * The first element a fragment renders, walking from its start anchor.
 *
 * Comments and whitespace are stepped over; the fragment's end anchor — an empty text node — ends the walk, so an
 * element-less fragment never borrows a sibling that belongs to someone else.
 */
function firstElementFrom(anchor: Node): HTMLElement | null {
  let node = anchor.nextSibling;
  while (node) {
    if (isHtmlElement(node)) return node;
    if (node.nodeType === TextNode && node.textContent === '') return null;
    node = node.nextSibling;
  }
  return null;
}

/**
 * The root DOM element behind a template-ref value: an element, a node, or a component instance's `$el`.
 *
 * A component that renders a fragment — several roots, or a template opening with a comment in a development
 * build — has a `$el` that is the fragment's empty start anchor, not an element. Anchoring, focus return and
 * roving focus need the element it renders, which follows that anchor. Reads `nodeType` rather than
 * `instanceof HTMLElement`, so it is safe on the server, where `HTMLElement` is not a global.
 */
export function resolveElement(value: unknown): HTMLElement | null {
  if (isHtmlElement(value)) return value;
  if (isFragmentAnchor(value)) return firstElementFrom(value);
  if (typeof value !== 'object' || value === null) return null;
  const root = (value as { $el?: unknown }).$el;
  if (isHtmlElement(root)) return root;
  return isFragmentAnchor(root) ? firstElementFrom(root) : null;
}
