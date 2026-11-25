import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Toast from '@src/presentation/feedback/toast/Toast.vue';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import '@src/index.css';

/**
 * Touch targets of the toast card: its icon-only buttons stay 24px (36px under a finger) and an invisible 44px square
 * centred on each takes the tap, so the card keeps its height; the details toggle reaches 44px.
 */

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function mountCard(): HTMLElement {
  wrapper = mount(
    {
      render: () =>
        h('div', { style: 'width: 360px; padding: 48px 8px' }, [
          h(
            Toast,
            {
              title: 'Harvest running',
              isPinned: false,
              onClose: () => undefined,
              onDelete: () => undefined,
              closeLabel: 'Dismiss',
              deleteLabel: 'Delete',
              pinLabel: 'Pin notification',
              unpinLabel: 'Unpin notification',
            },
            { details: () => 'More' },
          ),
        ]),
    },
    { attachTo: document.body },
  );
  return document.querySelector<HTMLElement>('[role="status"]')!;
}

const iconButtons = (): HTMLButtonElement[] =>
  ['Pin notification', 'Delete', 'Dismiss'].map((name) =>
    document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!,
  );

/** The corners and the centre of the 44px square centred on `element`, where a tap should still land on it. */
function tapsLandOn(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  return [
    [0, 0],
    [-21, -21],
    [21, -21],
    [-21, 21],
    [21, 21],
  ].every(([dx, dy]) => element.contains(document.elementFromPoint(x + dx!, y + dy!)));
}

describe('toast card under a fine pointer', () => {
  it('keeps the icon buttons at 24px and their tap area on the button', () => {
    mountCard();
    for (const button of iconButtons()) {
      const rect = button.getBoundingClientRect();
      expect([Math.round(rect.width), Math.round(rect.height)]).toEqual([24, 24]);
      expect(tapsLandOn(button)).toBe(false);
    }
  });
});

describe.skipIf(!canEmulateCoarsePointer)('toast card under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  });
  afterEach(async () => {
    await useFinePointer();
  });

  it('gives the pin, delete and dismiss buttons a 44 x 44px tap area on a 36px button', () => {
    mountCard();
    for (const button of iconButtons()) {
      const rect = button.getBoundingClientRect();
      expect([Math.round(rect.width), Math.round(rect.height)]).toEqual([36, 36]);
      expect(tapsLandOn(button)).toBe(true);
    }
  });

  it('gives the details toggle a 44px height', () => {
    mountCard();
    const toggle = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Show details'),
    )!;
    expect(toggle.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });
});
