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
    found.push({ name: `<${element.tagName.toLowerCase()}> #${found.length}`, left: rect.left, right: rect.right });
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
    found.push({ name: `"${text.slice(0, 32)}"`, left: rect.left, right: rect.right });
  }
  return found;
}

/** The items of `after` that sit more than `tolerance` px sideways from where `before` had them, described. */
export function movedSideways(before: Placement[], after: Placement[], tolerance = 0.5): string[] {
  if (before.length !== after.length) {
    return [`${before.length} visible items under a fine pointer, ${after.length} under a coarse one`];
  }
  return before.flatMap((item, index) => {
    const moved = after[index]!;
    const dx = Math.max(Math.abs(moved.left - item.left), Math.abs(moved.right - item.right));
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
