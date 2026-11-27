import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref, type Ref } from 'vue';
import { ScrollRegionAttribute } from '@src/foundation/dom';
import { AppFrame, LockedHeadLayout } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat the drawer's links as hidden.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  localStorage.clear();
  vi.restoreAllMocks();
});

/** Answers the `md` and `lg` min-width queries, so the frame takes its phone, tablet or desktop surface. */
function viewport({ md, lg }: { md: boolean; lg: boolean }): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('768px') ? md : query.includes('1024px') ? lg : false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

const Desktop = { md: true, lg: true };
const Tablet = { md: true, lg: false };
const Phone = { md: false, lg: false };

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
}

/** A frame whose page is a `LockedHeadLayout` while `shown` holds, else plain text. */
async function frame(shown: Ref<boolean>, props: Record<string, unknown> = {}): Promise<VueWrapper> {
  const wrapper = mount(AppFrame, {
    props,
    slots: {
      default: () =>
        shown.value
          ? h(LockedHeadLayout, { bodyClass: 'pb-10' }, { head: () => 'Head', default: () => 'Body' })
          : 'Plain page',
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await settle();
  return wrapper;
}

const main = (): HTMLElement => document.querySelector<HTMLElement>('main')!;
const column = (): HTMLElement => main().firstElementChild as HTMLElement;
const body = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-locked-body]');
const isLocked = (): boolean => main().hasAttribute('data-page-locked');

describe('LockedHeadLayout in an AppFrame', () => {
  for (const [name, size] of [
    ['desktop', Desktop],
    ['tablet', Tablet],
  ] as const) {
    it(`locks the frame while registered on a ${name}`, async () => {
      viewport(size);
      const shown = ref(false);
      await frame(shown);
      expect(isLocked()).toBe(false);
      expect(main().className).toContain('overflow-y-scroll');

      shown.value = true;
      await settle();
      expect(isLocked()).toBe(true);
      expect(main().className).toContain('overflow-hidden');
      expect(main().className).not.toContain('overflow-y-scroll');
      expect(column().className).toContain('min-h-0');
      expect(column().className).toContain('pb-0');
      expect(column().className).toContain('sm:pb-0');
      expect(body()?.hasAttribute(ScrollRegionAttribute)).toBe(true);
      expect(body()?.className).toContain('overflow-y-auto');
      expect(body()?.className).toContain('flex-1');
      expect(body()?.className).toContain('pb-10');
      expect(document.querySelector('[data-locked-head]')?.className).toBe('shrink-0');
    });
  }

  it('moves the column end padding to the body, and none at full width', async () => {
    viewport(Desktop);
    await frame(ref(true));
    expect(body()?.className).toContain('sm:pb-6');
    document.body.innerHTML = '';
    await frame(ref(true), { contentWidth: 'full' });
    expect(body()?.className).not.toContain('sm:pb-6');
  });

  it('stays in the flow on a phone', async () => {
    viewport(Phone);
    await frame(ref(true));
    expect(isLocked()).toBe(false);
    expect(main().className).toContain('overflow-y-scroll');
    expect(body()?.hasAttribute(ScrollRegionAttribute)).toBe(false);
    expect(body()?.className).toBe('pb-10');
  });

  it('stays in the flow on a forced phone at a desktop width', async () => {
    viewport(Desktop);
    await frame(ref(true), { isPhone: true });
    expect(isLocked()).toBe(false);
    expect(body()?.hasAttribute(ScrollRegionAttribute)).toBe(false);
  });

  it('restores the scrolling main when the page unmounts', async () => {
    viewport(Desktop);
    const shown = ref(true);
    await frame(shown);
    expect(isLocked()).toBe(true);
    shown.value = false;
    await settle();
    expect(isLocked()).toBe(false);
    expect(main().className).toContain('overflow-y-scroll');
    expect(main().className).not.toContain('overflow-hidden');
    expect(column().className).not.toContain('min-h-0');
  });
});

describe('LockedHeadLayout outside a frame', () => {
  it('flows and marks no scroll region', async () => {
    const wrapper = mount(LockedHeadLayout, { slots: { head: () => 'Head', default: () => 'Body' } });
    wrappers.push(wrapper);
    await settle();
    expect(wrapper.find('[data-locked-body]').attributes(ScrollRegionAttribute)).toBeUndefined();
    expect(wrapper.classes()).toEqual([]);
  });
});
