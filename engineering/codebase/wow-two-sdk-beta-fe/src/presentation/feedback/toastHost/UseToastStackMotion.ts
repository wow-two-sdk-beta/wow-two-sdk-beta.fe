import { nextTick, onScopeDispose, watch, type Ref } from 'vue';

import { animate, type AnimationHandle } from '../../../foundation/animation';
import type { OverlayPosition } from '../../../foundation/styles';
import { comparePriority } from './ToastHostStore';
import type { VisibleToast } from './UseResolvedToasts';

/** @internal A card's measured slot before a patch — its top, height and in-flight translation, in px. */
interface SlotPosition {
  top: number;
  height: number;
  translation: number;
}

/** @internal A card that slides, from its offset to its place; `inFront` lifts a promoted arrival over its peers. */
interface SlotMove {
  node: HTMLElement;
  offset: number;
  inFront?: boolean;
}

/** Defines the elements, lists and host state stack motion reads. */
export interface ToastStackMotionSources {
  readonly stack: Readonly<Ref<HTMLElement | null>>;
  readonly visible: Readonly<Ref<ReadonlyArray<VisibleToast>>>;
  readonly position: () => OverlayPosition;
  readonly reducedMotion: Readonly<Ref<boolean>>;
  /** Whether the reader is browsing the overflow list, where cards keep still. */
  readonly browsing: () => boolean;
}

/** Defines the host settings stack motion reads. */
export interface ToastStackMotionSettings {
  /** The time cards take to slide together, in ms; 0 is an instant reflow. */
  readonly moveDuration: number;

  /** The space between cards, in px. */
  readonly gap: number;
}

/**
 * Manages the slide of the remaining cards into the slot an exit vacates, and carries a higher-priority arrival
 * past the cards it outranks. Each card's slot is measured apart from its entry and exit transform; an
 * interrupted slide restarts from its current translation, so another dismissal retargets it without a jump.
 */
export function useToastStackMotion(sources: ToastStackMotionSources, settings: ToastStackMotionSettings) {
  const { stack, visible, position, reducedMotion, browsing } = sources;
  const moving = new Map<HTMLElement, AnimationHandle>();
  let isClosingGap = false;

  function stop(): void {
    for (const animation of moving.values()) animation.cancel();
    moving.clear();
  }

  /** Measures every present card before Vue patches the stack, then slides them from there. */
  function captureGap(promoted: ReadonlySet<string> = new Set()): void {
    const host = stack.value;
    if (!host || browsing() || isClosingGap || reducedMotion.value || settings.moveDuration <= 0) return;
    const placement = position();
    const top = host.getBoundingClientRect().top;
    const positions = new Map<HTMLElement, SlotPosition>();
    for (const node of host.children) {
      if (!(node instanceof HTMLElement) || !node.dataset.toastId || node.hasAttribute('data-toast-exiting')) continue;
      const translateY = moving.has(node) ? getComputedStyle(node).translate?.split(' ')[1] : undefined;
      positions.set(node, {
        top: top + node.offsetTop,
        height: node.offsetHeight,
        translation: Number.parseFloat(translateY ?? '0') || 0,
      });
    }
    if (positions.size === 0) return;
    isClosingGap = true;
    void nextTick(() => {
      isClosingGap = false;
      if (stack.value !== host || position() !== placement || reducedMotion.value || settings.moveDuration <= 0) {
        return;
      }
      slideTogether(host, positions, promoted);
    });
  }

  function slideTogether(
    host: HTMLElement,
    positions: ReadonlyMap<HTMLElement, SlotPosition>,
    promoted: ReadonlySet<string>,
  ): void {
    const box = host.getBoundingClientRect();
    const moves: Array<SlotMove> = [];
    for (const [node, previous] of positions) {
      if (node.parentElement !== host || node.hasAttribute('data-toast-exiting')) continue;
      const distance = previous.top - (box.top + node.offsetTop);
      if (Math.abs(distance) < 0.5) continue;
      moves.push({ node, offset: distance + previous.translation });
    }
    if (promoted.size > 0) {
      const previous = [...positions.values()];
      const room = Number.parseFloat(getComputedStyle(host).maxHeight) || window.innerHeight;
      const bottom = position().startsWith('bottom');
      const tail = bottom
        ? Math.min(...previous.map((slot) => slot.top)) - settings.gap
        : Math.max(...previous.map((slot) => slot.top + slot.height)) + settings.gap;
      for (const node of host.children) {
        if (!(node instanceof HTMLElement) || positions.has(node) || !promoted.has(node.dataset.toastId ?? '')) {
          continue;
        }
        const target = box.top + node.offsetTop;
        const origin = bottom
          ? Math.max(box.bottom - room, tail - node.offsetHeight)
          : Math.min(box.top + room - node.offsetHeight, tail);
        moves.push({ node, offset: origin - target, inFront: true });
      }
    }
    for (const { node, offset, inFront } of moves) {
      moving.get(node)?.cancel();
      const layer = inFront ? { zIndex: 1 } : {};
      const animation = animate(
        node,
        [
          { translate: `0 ${offset}px`, ...layer },
          { translate: 'none', ...layer },
        ],
        { duration: settings.moveDuration },
      );
      moving.set(node, animation);
      void animation.finished.then(() => {
        if (moving.get(node) === animation) moving.delete(node);
      });
    }
  }

  // A new arrival that outranks a card already showing, or a card whose priority changed, moves the stack.
  watch(visible, (next, previous) => {
    if (previous.length === 0 || browsing()) return;
    const earlier = new Map(previous.map((card) => [card.id, card]));
    const promoted = new Set(
      next
        .filter((card) => !earlier.has(card.id) && previous.some((other) => comparePriority(card, other) < 0))
        .map((card) => card.id),
    );
    const reprioritized = next.some((card) => {
      const prior = earlier.get(card.id);
      return prior && comparePriority(card, prior) !== 0;
    });
    if (promoted.size > 0 || reprioritized) captureGap(promoted);
  });

  watch([reducedMotion, position, () => settings.moveDuration], stop);
  onScopeDispose(stop);

  return { captureGap };
}
