import { nextTick, onScopeDispose, watch, type Ref } from 'vue';

import { animate, type AnimationHandle } from '../../../foundation/animation';
import type { OverlayPosition } from '../../../foundation/styles';
import { isFocusVisible } from './ToastFocusExtensions';
import type { ToastGroupMotion } from './ToastHost.vue';
import { isRunning } from './ToastHostStore';
import type { ToastOptions } from './ToastOptions';
import type { VisibleToast } from './UseResolvedToasts';

/** Defines how a card changed in place. */
export const ToastChange = {
  /** Refers to a change of the card's height. */
  Resize: 'resize',
  /** Refers to a group's first merge. */
  Merge: 'merge',
  /** Refers to a further arrival in a group. */
  Arrival: 'arrival',
  /** Refers to a change of the card's copy or severity. */
  Content: 'content',
} as const;

export type ToastChange = (typeof ToastChange)[keyof typeof ToastChange];

/** Defines the elements, lists and host state a card's in-place motion reads. */
export interface ToastGroupMotionSources {
  readonly stack: Readonly<Ref<HTMLElement | null>>;
  readonly visible: Readonly<Ref<ReadonlyArray<VisibleToast>>>;
  readonly position: () => OverlayPosition;
  readonly groupMotion: () => ToastGroupMotion;
  readonly reducedMotion: Readonly<Ref<boolean>>;
  /** Whether the stack scrolls, so a preview starts at its visible edge. */
  readonly scrolls: () => boolean;
  readonly isExpanded: (id: string) => boolean;
  readonly copyOf: (toast: ToastOptions) => Pick<ToastOptions, 'title' | 'description'>;
}

/** Defines the host settings a card's in-place motion reads. */
export interface ToastGroupMotionSettings {
  /** The time cards take to slide together, in ms; 0 is an instant reflow. */
  readonly moveDuration: number;

  /** The space between cards, in px. */
  readonly gap: number;
}

/**
 * Manages the animation of a card that changes in place: a group's merge preview flying over the stack, the
 * count glowing as a member arrives, a height change, and a highlight when the copy or severity changes.
 */
export function useToastGroupMotion(sources: ToastGroupMotionSources, settings: ToastGroupMotionSettings) {
  const { stack, visible, position, reducedMotion, scrolls, isExpanded, copyOf } = sources;
  const updateMotions = new Map<HTMLElement, Array<AnimationHandle>>();

  function stop(): void {
    for (const animations of updateMotions.values()) {
      for (const animation of animations) animation.cancel();
    }
    updateMotions.clear();
  }

  function animateGroupCard(
    host: HTMLElement,
    card: HTMLElement,
    arrival: HTMLElement,
    initialExtraHeight: number,
    expanded: boolean,
  ): Array<AnimationHandle> {
    const bottom = position().startsWith('bottom');
    const room = Number.parseFloat(getComputedStyle(host).maxHeight) || window.innerHeight;
    const scrolling = scrolls();
    const startEdge = scrolling ? host.scrollTop : host.offsetHeight + initialExtraHeight - room;
    const endEdge = scrolling ? host.scrollTop + host.clientHeight : room;
    const details = expanded ? card.querySelector('[data-toast-details]') : null;
    const landing = details ? Math.round(details.getBoundingClientRect().top - card.getBoundingClientRect().top) : 0;
    const target = card.offsetTop + landing;
    if (scrolling && (target < startEdge || target >= endEdge)) return [];

    let tail = bottom ? card.offsetTop : card.offsetTop + card.offsetHeight;
    for (const item of host.children) {
      if (!(item instanceof HTMLElement) || !item.dataset.toastId || item.hasAttribute('data-toast-exiting')) continue;
      tail = bottom ? Math.min(tail, item.offsetTop) : Math.max(tail, item.offsetTop + item.offsetHeight);
    }
    // A shrinking group still occupies its old height when the preview starts moving.
    const origin = bottom
      ? Math.max(startEdge, tail - settings.gap - arrival.offsetHeight)
      : Math.min(endEdge - arrival.offsetHeight, tail + settings.gap + initialExtraHeight);
    const distance = origin - target;
    if ((bottom ? -distance : distance) < 16) return [];

    const duration = settings.moveDuration * 2;
    return [
      animate(card, [{ zIndex: 2 }, { zIndex: 2 }], { duration }),
      animate(
        arrival,
        [
          { translate: `0 ${landing + distance}px`, scale: 1, opacity: 0.9, visibility: 'visible' },
          { translate: `0 ${landing + distance * 0.65}px`, scale: 1, opacity: 1, offset: 0.32, visibility: 'visible' },
          { translate: landing ? `0 ${landing}px` : 'none', scale: 0.94, opacity: 0, visibility: 'visible' },
        ],
        { duration, easing: 'ease-out' },
      ),
    ];
  }

  function animateHighlight(node: Element | null, peak: Keyframe, rest: Keyframe, delay = 0): AnimationHandle {
    const duration = settings.moveDuration;
    if (reducedMotion.value) return animate(node, [peak, peak], { duration: duration * 3 });
    return animate(
      node,
      [
        { ...rest, easing: 'ease-out' },
        { ...peak, offset: 0.065 },
        { ...peak, offset: 0.25, easing: 'ease-in-out' },
        rest,
      ],
      { duration: duration * 6, delay, easing: 'linear' },
    );
  }

  /** Measures a card before Vue patches it, then animates from that measure once the patch lands. */
  function captureToastChange(id: string, change: ToastChange): void {
    const host = stack.value;
    const node = Array.from(host?.children ?? []).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.toastId === id,
    );
    const surface = node?.firstElementChild;
    if (!host || !node || !(surface instanceof HTMLElement)) return;
    const firstHeight = surface.offsetHeight;
    const containedFocus = node.contains(document.activeElement);
    const keyboardFocus = containedFocus && isFocusVisible(document.activeElement);

    void nextTick(() => {
      if (stack.value !== host || !node.isConnected || node.hasAttribute('data-toast-exiting')) return;
      // A patch that removes the focused control hands focus to the card's disclosure, or to a keyboard user's card.
      if (containedFocus && document.activeElement === document.body) {
        const disclosure = node.querySelector<HTMLElement>('button[aria-controls]');
        (disclosure ?? (keyboardFocus ? node : null))?.focus({ preventScroll: true });
      }
      if (settings.moveDuration <= 0 || typeof surface.animate !== 'function') return;
      for (const animation of updateMotions.get(node) ?? []) animation.cancel();

      const duration = settings.moveDuration;
      const motionAllowed = !reducedMotion.value;
      const lastHeight = surface.offsetHeight;
      const animations: Array<AnimationHandle> = [];
      const incoming = change === ToastChange.Merge || change === ToastChange.Arrival;
      const arrival = incoming && motionAllowed ? node.querySelector<HTMLElement>('[data-toast-group-arrival]') : null;
      const flight = arrival
        ? animateGroupCard(host, node, arrival, Math.max(0, firstHeight - lastHeight), isExpanded(id))
        : [];
      animations.push(...flight);
      if (motionAllowed && Math.abs(firstHeight - lastHeight) >= 1) {
        animations.push(
          animate(
            surface,
            [
              { height: `${firstHeight}px`, overflow: 'clip' },
              { height: `${lastHeight}px`, overflow: 'clip' },
            ],
            { duration },
          ),
        );
      }
      if (motionAllowed && change === ToastChange.Merge) {
        animations.push(
          animate(
            node.querySelector('[data-toast-summary]'),
            [
              { translate: '0 3px', opacity: 0.55 },
              { translate: 'none', opacity: 1 },
            ],
            { duration },
          ),
        );
      }
      if (incoming) {
        animations.push(
          animateHighlight(
            node.querySelector('[data-toast-group-count-highlight]'),
            {
              color: 'var(--toast-count-peak, var(--color-popover-foreground))',
              textShadow: motionAllowed
                ? 'var(--toast-count-glow, 0 0 0.4em color-mix(in oklab, var(--color-primary) 75%, transparent))'
                : 'none',
            },
            { color: 'var(--toast-count-rest, var(--color-muted-foreground))', textShadow: 'none' },
            flight.length > 0 ? duration * 1.5 : 0,
          ),
        );
      } else if (change === ToastChange.Content) {
        animations.push(
          animateHighlight(node.querySelector('[data-toast-update-highlight]'), { opacity: 1 }, { opacity: 0 }),
        );
      }
      updateMotions.set(node, animations);
      void Promise.all(animations.map((animation) => animation.finished)).then(() => {
        if (updateMotions.get(node) === animations) updateMotions.delete(node);
      });
    });
  }

  // A group's count change merges or resizes it; a changed copy, severity or finished operation highlights it.
  watch(visible, (next, previous) => {
    if (previous.length === 0) return;
    const earlier = new Map(previous.map((card) => [card.id, card]));
    for (const card of next) {
      const prior = earlier.get(card.id);
      if (!prior || prior.nonce === card.nonce) continue;
      const before = prior.group?.count;
      const after = card.group?.count;
      if (before !== undefined && after !== undefined && before !== after) {
        captureToastChange(
          card.id,
          after < before ? ToastChange.Resize : before === 1 ? ToastChange.Merge : ToastChange.Arrival,
        );
        continue;
      }
      const oldCopy = copyOf(prior);
      const newCopy = copyOf(card);
      if (
        oldCopy.title !== newCopy.title ||
        oldCopy.description !== newCopy.description ||
        prior.severity !== card.severity ||
        (isRunning(prior) && !isRunning(card))
      ) {
        captureToastChange(card.id, ToastChange.Content);
      }
    }
  });

  watch([reducedMotion, position, () => settings.moveDuration, sources.groupMotion], stop);
  onScopeDispose(stop);

  return { captureToastChange };
}
