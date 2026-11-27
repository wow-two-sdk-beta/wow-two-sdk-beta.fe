import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { page } from 'vitest/browser';
import { AppFrame, LockedHeadLayout } from '@src/presentation/layout';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import { nextFrames } from '../../../support/TouchReach';
import '@src/index.css';

/*
 * A locked page scrolls its body, never main: from tablets up the head keeps its top while the body scrolls 600px and
 * main's scroll range is 0; on a phone the page flows and main scrolls it. Each size runs under a mouse and, where the
 * engine can emulate one, under a finger.
 */

let wrapper: VueWrapper | null = null;

afterEach(async () => {
  if (canEmulateCoarsePointer) await useFinePointer();
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  localStorage.clear();
});

const query = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

/** A frame whose page has a 120px head over forty 48px rows, so the body is far taller than any viewport. */
async function mountPage(): Promise<void> {
  wrapper = mount(
    {
      render: () =>
        h(
          AppFrame,
          { version: '0.4.2', crumbs: ['Sources', 'Source 42'] },
          {
            nav: () => h('a', { href: '#/home' }, 'Home'),
            default: () =>
              h(
                LockedHeadLayout,
                {},
                {
                  head: () => h('div', { style: 'height: 120px', 'data-test': 'banner' }, 'Banner and tabs'),
                  default: () =>
                    Array.from({ length: 40 }, (_, index) => h('div', { style: 'height: 48px' }, `Row ${index + 1}`)),
                },
              ),
          },
        ),
    },
    { attachTo: document.body },
  );
  /* The frame adopts the viewport on mount and the page registers, each one render later. */
  await nextFrames();
  await nextFrames();
}

const Pointers = canEmulateCoarsePointer ? (['mouse', 'touch'] as const) : (['mouse'] as const);

describe('LockedHeadLayout scrolling', () => {
  for (const pointer of Pointers) {
    const usePointer = async (): Promise<void> => {
      if (pointer === 'touch') await useCoarsePointer();
    };

    it(`holds the head and scrolls only the body at 1024 x 742 under ${pointer}`, { timeout: 30_000 }, async () => {
      await page.viewport(1024, 742);
      await usePointer();
      await mountPage();

      const main = query('main');
      const body = query('[data-locked-body]');
      await expect.poll(() => main.hasAttribute('data-page-locked')).toBe(true);
      expect(body.hasAttribute('data-scroll-region')).toBe(true);
      expect(main.scrollHeight - main.clientHeight).toBe(0);
      expect(body.scrollHeight - body.clientHeight).toBeGreaterThan(600);
      expect(Math.round(body.getBoundingClientRect().bottom)).toBe(Math.round(main.getBoundingClientRect().bottom));

      const headTop = query('[data-locked-head]').getBoundingClientRect().top;
      body.scrollTop = 600;
      await nextFrames();
      expect(body.scrollTop).toBe(600);
      expect(query('[data-locked-head]').getBoundingClientRect().top).toBe(headTop);
      expect(main.scrollTop).toBe(0);
    });

    it(`flows and lets main scroll the page at 375 x 667 under ${pointer}`, { timeout: 30_000 }, async () => {
      await page.viewport(375, 667);
      await usePointer();
      await mountPage();

      const main = query('main');
      const body = query('[data-locked-body]');
      expect(main.hasAttribute('data-page-locked')).toBe(false);
      expect(body.hasAttribute('data-scroll-region')).toBe(false);
      expect(main.scrollHeight - main.clientHeight).toBeGreaterThan(600);

      const headTop = query('[data-locked-head]').getBoundingClientRect().top;
      main.scrollTop = 600;
      await nextFrames();
      expect(main.scrollTop).toBe(600);
      /* The head scrolls away with main; the phone bar may slide away with it, so it moves 600px or more. */
      expect(query('[data-locked-head]').getBoundingClientRect().top).toBeLessThanOrEqual(headTop - 600 + 0.5);
    });
  }
});
