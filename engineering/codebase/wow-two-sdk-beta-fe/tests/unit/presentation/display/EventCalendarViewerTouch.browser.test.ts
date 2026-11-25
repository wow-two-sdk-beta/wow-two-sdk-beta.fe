import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { page } from 'vitest/browser';
import { Temporal } from 'temporal-polyfill';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';
import type { EventCalendarViewerEvent } from '@src/presentation/display/eventCalendarViewer/EventCalendarViewerTypes';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import '@src/index.css';

const at = (text: string): Temporal.ZonedDateTime => Temporal.ZonedDateTime.from(text + '[UTC]');
const event = (id: string, start: string, end: string): EventCalendarViewerEvent => ({
  id,
  title: id,
  start: at(start),
  end: at(end),
});

/** Five events on one day, so a month cell draws four chips and a "+1 more", and one event spanning three days. */
const events = [
  ...Array.from({ length: 5 }, (_, index) =>
    event(`Talk ${index + 1}`, `2026-09-16T0${index + 1}:00Z`, `2026-09-16T0${index + 1}:30Z`),
  ),
  event('Expo', '2026-09-09T10:00Z', '2026-09-11T10:00Z'),
];

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});
afterAll(async () => {
  await page.viewport(414, 896);
});

async function mountMonth(size: { width: number; height: number }): Promise<HTMLButtonElement[]> {
  await page.viewport(size.width, size.height);
  wrapper = mount(EventCalendarViewer, {
    props: { events, date: at('2026-09-25T12:00Z'), view: 'month', timeZone: 'UTC' },
    attachTo: document.body,
  });
  const root = wrapper.element as HTMLElement;
  await expect.poll(() => root.querySelectorAll('button').length).toBeGreaterThan(20);
  return [...root.querySelectorAll<HTMLButtonElement>('button')];
}

const box = (button: HTMLElement): { width: number; height: number } => {
  const rect = button.getBoundingClientRect();
  return { width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10 };
};

const named = (buttons: HTMLElement[], label: string): HTMLElement =>
  buttons.find((button) => button.getAttribute('aria-label') === label || button.textContent?.trim() === label)!;

describe('EventCalendarViewer under a fine pointer', () => {
  it('keeps the dense toolbar and cells at 1280px', async () => {
    const buttons = await mountMonth({ width: 1280, height: 800 });
    expect(box(named(buttons, 'Today')).height).toBe(28);
    expect(box(named(buttons, 'Previous'))).toEqual({ width: 28, height: 28 });
    expect(box(named(buttons, 'Next'))).toEqual({ width: 28, height: 28 });
    // A date number is a small text button, and a chip a one-line label: neither grows without a finger.
    const date = buttons.find((button) => button.textContent?.trim() === '16')!;
    expect(box(date).height).toBeLessThan(24);
    const chip = buttons.find((button) => button.getAttribute('aria-label')?.startsWith('Talk 1'))!;
    expect(box(chip).height).toBeLessThan(24);
  });
});

describe.skipIf(!canEmulateCoarsePointer)('EventCalendarViewer under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
  });
  afterEach(async () => {
    await useFinePointer();
  });

  /* 1280 and 1024 are the desktop class, 768 the tablet class: the same finger, the same floor. */
  for (const size of [
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
  ]) {
    it(`gives every toolbar and month button a 44 x 44px hit area at ${size.width}px`, async () => {
      const buttons = await mountMonth(size);
      // Toolbar: Today, previous, next, the five views. Grid: dates, chips, the bar, "+1 more".
      expect(buttons.some((button) => button.textContent?.includes('+1 more'))).toBe(true);
      expect(buttons.some((button) => button.hasAttribute('data-event-bar'))).toBe(true);
      expect(buttons.length).toBeGreaterThan(50);
      for (const button of buttons) {
        const { width, height } = box(button);
        expect(width, `${button.outerHTML.slice(0, 120)} is ${width} x ${height}`).toBeGreaterThanOrEqual(44);
        expect(height, `${button.outerHTML.slice(0, 120)} is ${width} x ${height}`).toBeGreaterThanOrEqual(44);
      }
    });
  }

  it('keeps every phone-layout cell and toolbar button at 44 x 44px at 320px', async () => {
    const buttons = await mountMonth({ width: 320, height: 568 });
    expect(buttons.some((button) => button.getAttribute('aria-haspopup') === 'dialog')).toBe(true);
    for (const button of buttons) {
      const { width, height } = box(button);
      expect(width, `${button.outerHTML.slice(0, 120)} is ${width} x ${height}`).toBeGreaterThanOrEqual(44);
      expect(height, `${button.outerHTML.slice(0, 120)} is ${width} x ${height}`).toBeGreaterThanOrEqual(44);
    }
  });
});
