/*
 * Measures the coarse-pointer rule: a finger grows a target's reach, never moves what the target shows. `reachOf`
 * reads where a tap lands on a target, and `placementsIn` / `movedSideways` read where its marks, icons and text sit.
 */

const ProbeAttribute = 'data-reach-probe';

/* Every element but the probed target and its own content stops taking taps, so a neighbour never counts. */
const ProbeCss = `*{pointer-events:none!important}[${ProbeAttribute}],[${ProbeAttribute}] *{pointer-events:auto!important}`;

/** The step, in px, the probe walks out from the target's centre. */
const ProbeStep = 0.25;

/** The farthest the probe walks from the centre, in px. */
const ProbeLimit = 80;

/** The size of a tap area. */
export interface Reach {
  readonly width: number;
  readonly height: number;
}

/**
 * The width and height of the area around a target's centre where a tap lands on it — its box plus any invisible hit
 * area — read by hit-testing, so an ancestor that clips the hit area shortens it. Its neighbours are ignored.
 */
export function reachOf(target: Element): Reach {
  const style = document.createElement('style');
  style.textContent = ProbeCss;
  document.head.append(style);
  target.setAttribute(ProbeAttribute, '');
  try {
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const lands = (px: number, py: number): boolean => {
      const hit = document.elementFromPoint(px, py);
      return hit !== null && target.contains(hit);
    };
    const extent = (dx: number, dy: number): number => {
      let distance = 0;
      while (distance < ProbeLimit && lands(x + dx * (distance + ProbeStep), y + dy * (distance + ProbeStep))) {
        distance += ProbeStep;
      }
      return distance;
    };
    return { width: extent(-1, 0) + extent(1, 0), height: extent(0, -1) + extent(0, 1) };
  } finally {
    target.removeAttribute(ProbeAttribute);
    style.remove();
  }
}

/** Where one mark, icon or run of text sits on the x axis. */
export interface Placement {
  readonly element: Element;
  readonly name: string;
  readonly left: number;
  readonly right: number;
}

const isShown = (element: Element): boolean =>
  element.checkVisibility({ opacityProperty: true, visibilityProperty: true });

/** Every visible mark (`img`), icon (`svg`) and run of text inside `root`, with its horizontal extent. */
export function placementsIn(root: Element): Placement[] {
  const found: Placement[] = [];
  for (const element of root.querySelectorAll('img, svg')) {
    if (element.parentElement?.closest('svg')) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || !isShown(element)) continue;
    found.push({
      element,
      name: `<${element.tagName.toLowerCase()}> #${found.length}`,
      left: rect.left,
      right: rect.right,
    });
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? '';
    const parent = node.parentElement;
    if (!text || !parent || parent.closest('svg, style, script') || !isShown(parent)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    found.push({ element: parent, name: `"${text.slice(0, 32)}"`, left: rect.left, right: rect.right });
  }
  return found;
}

/**
 * Whether `element` may change under a coarse pointer because of a declared touch change: it matches one of
 * `declared` (a field's touch height, its 16px text), holds one, sits inside one, or follows one in document order
 * (what a taller field pushes down). Such an element may change vertically only.
 */
function isDeclared(element: Element, declared: readonly Element[]): boolean {
  return declared.some(
    (origin) =>
      origin === element ||
      origin.contains(element) ||
      element.contains(origin) ||
      (origin.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
  );
}

const declaredIn = (selectors: readonly string[]): Element[] =>
  selectors.length > 0 ? [...document.querySelectorAll(selectors.join(','))] : [];

/** Where one element's box sits. */
export interface Box {
  readonly element: Element;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const describe = (element: Element, index: number): string => {
  const label = element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 24) ?? '';
  return `#${index} <${element.tagName.toLowerCase()}>${label ? ` "${label}"` : ''}`;
};

/**
 * The box of every visible element inside `root`, an SVG's own shapes left out. An invisible element (a native
 * input's transparent hit overlay) shows nothing, so its box may grow under a coarse pointer.
 */
export function boxesIn(root: Element): Box[] {
  return [...root.querySelectorAll('*')]
    .filter((element) => !element.parentElement?.closest('svg') && isShown(element))
    .map((element, index) => {
      const rect = element.getBoundingClientRect();
      return { element, name: describe(element, index), x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
}

/**
 * The boxes of `after` that changed from `before` by more than `tolerance` px, described. An element tied to a
 * `declared` touch change may change its height and top; it still keeps its left edge and width. An element inside a
 * `resized` one (a field's 16px text, a trailing slot widened to 44px) may change in both axes.
 */
export function boxesChanged(
  before: Box[],
  after: Box[],
  declared: readonly string[] = [],
  resized: readonly string[] = [],
  tolerance = 0.5,
): string[] {
  if (before.length !== after.length) {
    return [`${before.length} elements under a fine pointer, ${after.length} under a coarse one`];
  }
  const origins = declaredIn(declared);
  const free = declaredIn(resized);
  return before.flatMap((box, index) => {
    const moved = after[index]!;
    if (free.some((element) => element.contains(moved.element))) return [];
    const vertical = isDeclared(moved.element, origins);
    const off = (a: number, b: number): boolean => Math.abs(a - b) > tolerance;
    const changed =
      off(box.x, moved.x) ||
      off(box.width, moved.width) ||
      (!vertical && (off(box.y, moved.y) || off(box.height, moved.height)));
    const at = (b: Box): string => `${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.width.toFixed(1)}x${b.height.toFixed(1)}`;
    return changed ? [`${box.name} ${at(box)} -> ${at(moved)}`] : [];
  });
}

/**
 * The items of `after` that sit more than `tolerance` px sideways from where `before` had them, described. Text inside
 * a `declared` touch change (a field's 16px text) keeps only its start.
 */
export function movedSideways(
  before: Placement[],
  after: Placement[],
  tolerance = 0.5,
  declared: readonly string[] = [],
): string[] {
  const origins = declaredIn(declared);
  if (before.length !== after.length) {
    return [`${before.length} visible items under a fine pointer, ${after.length} under a coarse one`];
  }
  return before.flatMap((item, index) => {
    const moved = after[index]!;
    const startOnly = origins.some((origin) => origin.contains(moved.element));
    const dx = startOnly
      ? Math.abs(moved.left - item.left)
      : Math.max(Math.abs(moved.left - item.left), Math.abs(moved.right - item.right));
    return moved.name !== item.name || dx > tolerance
      ? [
          `${item.name} ${item.left.toFixed(1)}..${item.right.toFixed(1)} -> ${moved.left.toFixed(1)}..${moved.right.toFixed(1)}`,
        ]
      : [];
  });
}

/** Two animation frames: a media change restyles at once, and a component that reads it renders one frame later. */
export const nextFrames = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
