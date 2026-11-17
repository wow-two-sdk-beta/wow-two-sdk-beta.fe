import { afterEach, describe, expect, it, vi } from 'vitest';
import { toastHost } from '@src/presentation/feedback/toastHost';
import { cards, host, resetToasts, settle, useFakeClock } from './ToastHarness';

/*
 * Swipe to dismiss. happy-dom has no layout, so a card counts as the default 320px wide and the dismiss point
 * sits at 128px. Releases under 50px never count as a flick, whatever their speed.
 */

afterEach(resetToasts);

const card = () => cards()[0]!;

const pointer = (target: EventTarget, type: string, x: number, pointerType = 'touch') =>
  target.dispatchEvent(
    new PointerEvent(type, { pointerId: 7, pointerType, clientX: x, clientY: 40, button: 0, bubbles: true }),
  );

/** Presses on `from`, drags through each x and releases at the last one. */
const drag = async (from: Element, xs: number[], pointerType = 'touch') => {
  pointer(from, 'pointerdown', 100, pointerType);
  for (const x of xs) pointer(from, 'pointermove', x, pointerType);
  await settle();
  const during = { swiping: card()?.hasAttribute('data-toast-swiping'), translate: card()?.style.translate || '' };
  pointer(from, 'pointerup', xs.at(-1) ?? 100, pointerType);
  await settle();
  return during;
};

const reduceMotion = () =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );

/** Mounts a host showing one "Saved" toast and returns its dismiss spy. */
const savedToast = async (props: Record<string, unknown> = {}) => {
  host(props);
  const dismissed = vi.fn();
  toastHost.toast({ title: 'Saved', onDismiss: dismissed });
  await settle();
  return dismissed;
};

describe('toast swipe', () => {
  it('follows a touch drag toward the anchored side and dismisses past 40% of the width', async () => {
    const dismissed = await savedToast();
    const surface = card().firstElementChild!;
    const during = await drag(surface, [110, 160, 260]);
    expect(during).toEqual({ swiping: true, translate: '160px 0' });
    expect(dismissed).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-toast-swiping]')).toBeNull();
  });

  it('springs back from a short drag, and from one toward the side it cannot leave by', async () => {
    const dismissed = await savedToast();
    await drag(card().firstElementChild!, [110, 130]);
    expect(dismissed).not.toHaveBeenCalled();
    expect(card().hasAttribute('data-toast-swiping')).toBe(false);
    expect(card().style.translate || '').toBe('');
    expect(card().style.opacity).toBe('');

    const during = await drag(card().firstElementChild!, [90, -100]);
    expect(during.translate).toBe('-40px 0');
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('lets a centered card leave by either side', async () => {
    const dismissed = await savedToast({ position: 'bottom-center' });
    await drag(card().firstElementChild!, [90, -100]);
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('ignores a mouse and a drag that starts on a control', async () => {
    const dismissed = await savedToast();
    const mouse = await drag(card().firstElementChild!, [110, 300], 'mouse');
    expect(mouse.swiping).toBe(false);
    const fromButton = await drag(card().querySelector('button')!, [110, 300]);
    expect(fromButton.swiping).toBe(false);
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('holds the card’s clock while it is dragged', async () => {
    useFakeClock();
    const dismissed = await savedToast({ defaultDuration: 1000, canPauseOnHover: false });
    const surface = card().firstElementChild!;
    pointer(surface, 'pointerdown', 100);
    pointer(surface, 'pointermove', 120);
    await settle();
    await vi.advanceTimersByTimeAsync(3000);
    expect(dismissed).not.toHaveBeenCalled();
    pointer(surface, 'pointerup', 120);
    await settle();
    await vi.advanceTimersByTimeAsync(1100);
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('still dismisses under reduced motion, with no follow', async () => {
    reduceMotion();
    const dismissed = await savedToast();
    const during = await drag(card().firstElementChild!, [110, 260]);
    expect(during).toEqual({ swiping: true, translate: '' });
    expect(dismissed).toHaveBeenCalledOnce();
  });
});
