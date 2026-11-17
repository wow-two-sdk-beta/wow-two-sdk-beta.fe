import { onScopeDispose, shallowRef, type Ref } from 'vue';

import { animate } from '../../../foundation/animation';
import {
  acceptsPointerType,
  exceedsThreshold,
  GestureAxis,
  windowedVelocity,
  type GestureSample,
} from '../../../foundation/gestures';
import { Side, type OverlayPosition } from '../../../foundation/styles';

/** @internal The pointers a card follows — a finger or a stylus; a mouse keeps its text selection. */
const SwipePointerTypes = ['touch', 'pen'] as const;

/** @internal The horizontal travel before a press becomes a swipe (px); below it a tap stays a tap. */
const SwipeSlop = 8;

/** @internal The share of the card's width a release must pass to dismiss it (0..1). */
const DismissFraction = 0.4;

/** @internal The distance a flick must cover to dismiss short of the dismiss point (px). */
const FlickDistance = 50;

/** @internal The speed a flick must reach to dismiss short of the dismiss point (px/ms). */
const FlickVelocity = 0.3;

/** @internal The window the release velocity is measured over (ms). */
const VelocityWindowMs = 80;

/** @internal The most pointer samples a gesture keeps. */
const MaxSamples = 16;

/** @internal The card's opacity at the dismiss point (0..1). */
const FadeFloor = 0.4;

/** @internal The share of a drag kept toward a side the card cannot leave by (0..1). */
const Resistance = 0.2;

/** @internal The width a card without layout counts as — the default `--toast-width` (px). */
const FallbackWidth = 320;

/** @internal The duration of the spring back to rest (ms). */
const SettleMs = 200;

/** @internal The duration of the fly-off after a dismissing release (ms). */
const FlyOffMs = 160;

/** @internal A press on one of these acts on the control, never the card. */
const InteractiveSelector =
  'button, a[href], input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"]), ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="slider"], [role="menuitem"]';

/** @internal The pointer gesture in progress on one card. */
interface SwipeGesture {
  readonly pointerId: number;
  readonly id: string;
  readonly card: HTMLElement;
  readonly originX: number;
  readonly originY: number;
  readonly samples: Array<GestureSample>;
  recognized: boolean;
  offset: number;
}

/** Defines the stack and host state a swipe reads. */
export interface ToastSwipeSources {
  readonly stack: Readonly<Ref<HTMLElement | null>>;
  readonly position: () => OverlayPosition;
  readonly reducedMotion: Readonly<Ref<boolean>>;
  readonly dismiss: (id: string) => void;
}

/** @internal The sides a card can leave by: toward its anchored side, or either side on a centered stack. */
function sidesFor(position: OverlayPosition): ReadonlySet<Side> {
  if (position.endsWith('right')) return new Set<Side>([Side.Right]);
  if (position.endsWith('left')) return new Set<Side>([Side.Left]);
  return new Set<Side>([Side.Left, Side.Right]);
}

/** @internal Reads a card's width, or the fallback while it has no layout. */
function widthOf(card: HTMLElement): number {
  return card.offsetWidth || FallbackWidth;
}

/** @internal Clears the inline styles a drag left on a card. */
function clearDrag(card: HTMLElement): void {
  card.style.translate = '';
  card.style.opacity = '';
  card.style.transition = '';
}

/**
 * Manages swiping a present card off the stack with a finger or stylus. The card follows a horizontal drag and
 * fades toward the dismiss point; a release past 40% of its width, or a flick, toward a side it may leave by
 * sends it off that side and dismisses it. Anything short springs back. A press on a control, a mouse, and a
 * vertical pan stay theirs. Reduced motion drops the follow and the spring, never the dismissal.
 */
export function useToastSwipe(sources: ToastSwipeSources) {
  const { stack, position, reducedMotion, dismiss } = sources;
  /** The id of the card under a recognized drag. */
  const swiping = shallowRef<string>();
  let gesture: SwipeGesture | null = null;

  function sample(active: SwipeGesture, event: PointerEvent): void {
    active.samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
    if (active.samples.length > MaxSamples) active.samples.shift();
  }

  function finish(): void {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerEnd);
    window.removeEventListener('pointercancel', onPointerEnd);
    const active = gesture;
    gesture = null;
    if (!active) return;
    try {
      if (active.card.hasPointerCapture(active.pointerId)) active.card.releasePointerCapture(active.pointerId);
    } catch {
      // The pointer is gone, or capture was never held.
    }
  }

  function paint(active: SwipeGesture): void {
    if (reducedMotion.value) return;
    const progress = Math.min(1, Math.abs(active.offset) / (widthOf(active.card) * DismissFraction));
    active.card.style.transition = 'none';
    active.card.style.translate = `${active.offset}px 0`;
    active.card.style.opacity = String(1 - (1 - FadeFloor) * progress);
  }

  function springBack(active: SwipeGesture): void {
    const { card, offset } = active;
    const opacity = card.style.opacity || '1';
    clearDrag(card);
    if (reducedMotion.value || offset === 0 || typeof card.animate !== 'function') return;
    animate(
      card,
      [
        { translate: `${offset}px 0`, opacity },
        { translate: '0px 0', opacity: 1 },
      ],
      { duration: SettleMs, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  }

  function flyOff(active: SwipeGesture, side: Side): void {
    const { card, offset } = active;
    if (reducedMotion.value) {
      clearDrag(card);
      return;
    }
    const opacity = card.style.opacity || '1';
    const distance = (widthOf(card) + 32) * (side === Side.Left ? -1 : 1);
    // The card stays off-screen while its ordinary exit plays out invisibly in place.
    card.style.translate = `${distance}px 0`;
    card.style.opacity = '0';
    if (typeof card.animate !== 'function') return;
    animate(
      card,
      [
        { translate: `${offset}px 0`, opacity },
        { translate: `${distance}px 0`, opacity: 0 },
      ],
      { duration: FlyOffMs, easing: 'ease-out' },
    );
  }

  function onPointerMove(event: PointerEvent): void {
    const active = gesture;
    if (!active || event.pointerId !== active.pointerId) return;
    if (!active.card.isConnected || active.card.hasAttribute('data-toast-exiting')) {
      // Dismissed mid-drag: the card leaves from where the finger held it, with its own exit motion.
      finish();
      active.card.style.transition = '';
      swiping.value = undefined;
      return;
    }
    sample(active, event);
    const dx = event.clientX - active.originX;
    const dy = event.clientY - active.originY;
    if (!active.recognized) {
      // A pan that starts vertical belongs to the page.
      if (Math.abs(dy) > Math.abs(dx) && exceedsThreshold(dx, dy, SwipeSlop, GestureAxis.Both)) {
        finish();
        return;
      }
      if (!exceedsThreshold(dx, dy, SwipeSlop, GestureAxis.X)) return;
      active.recognized = true;
      try {
        active.card.setPointerCapture(active.pointerId);
      } catch {
        // The window listeners still deliver every move.
      }
      swiping.value = active.id;
    }
    const side: Side = dx < 0 ? Side.Left : Side.Right;
    active.offset = sidesFor(position()).has(side) ? dx : dx * Resistance;
    paint(active);
  }

  function onPointerEnd(event: PointerEvent): void {
    const active = gesture;
    if (!active || event.pointerId !== active.pointerId) return;
    const cancelled = event.type === 'pointercancel';
    if (!cancelled) sample(active, event);
    finish();
    if (!active.recognized) return;
    const last = active.samples.at(-1);
    const dx = (last?.x ?? active.originX) - active.originX;
    const side: Side = dx < 0 ? Side.Left : Side.Right;
    const { velocityX } = windowedVelocity(active.samples, VelocityWindowMs);
    const passed = Math.abs(dx) >= widthOf(active.card) * DismissFraction;
    const flicked = Math.abs(dx) >= FlickDistance && Math.abs(velocityX) >= FlickVelocity && velocityX * dx > 0;
    const leaves =
      !cancelled &&
      (passed || flicked) &&
      sidesFor(position()).has(side) &&
      active.card.isConnected &&
      !active.card.hasAttribute('data-toast-exiting');
    if (leaves) {
      flyOff(active, side);
      dismiss(active.id);
    } else {
      springBack(active);
    }
    swiping.value = undefined;
  }

  /** Starts tracking a press on a present card; bound to the stack's `pointerdown`. */
  function onPointerDown(event: PointerEvent): void {
    if (gesture || event.button !== 0 || !acceptsPointerType(event.pointerType, SwipePointerTypes)) return;
    const host = stack.value;
    const target = event.target;
    if (!host || !(target instanceof Element)) return;
    const card = target.closest<HTMLElement>('[data-toast-id]');
    if (!card?.dataset.toastId || card.parentElement !== host || card.hasAttribute('data-toast-exiting')) return;
    const control = target.closest(InteractiveSelector);
    if (control && card.contains(control)) return;
    gesture = {
      pointerId: event.pointerId,
      id: card.dataset.toastId,
      card,
      originX: event.clientX,
      originY: event.clientY,
      samples: [{ x: event.clientX, y: event.clientY, t: event.timeStamp }],
      recognized: false,
      offset: 0,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  }

  onScopeDispose(finish);

  return { swiping, onPointerDown };
}
