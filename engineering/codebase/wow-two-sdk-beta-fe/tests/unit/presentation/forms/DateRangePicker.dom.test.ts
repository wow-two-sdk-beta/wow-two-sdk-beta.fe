import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { DateRangePicker } from '@src/presentation/forms';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function day(date: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
}

it('opens over a saved range, then picks a start and an end day and closes', async () => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  wrapper = mount(DateRangePicker, {
    props: {
      defaultValue: {
        start: Temporal.PlainDate.from('2026-09-01'),
        end: Temporal.PlainDate.from('2026-09-02'),
      },
      isDateDisabled: (date: Temporal.PlainDate) => date.day === 20,
      name: 'stay',
    },
    attrs: { 'aria-label': 'Stay' },
    attachTo: document.body,
  });
  await wrapper.get('[aria-label="Stay"]').trigger('click');
  await settle();
  // A preset complete range must not close the panel the moment it opens.
  expect(wrapper.get('[aria-label="Stay"]').attributes('aria-expanded')).toBe('true');
  expect(day('2026-09-20').getAttribute('aria-disabled')).toBe('true');
  day('2026-09-10').click();
  await settle();
  day('2026-09-14').click();
  await settle();
  const range = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as {
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
  };
  expect([range.start.toString(), range.end.toString()]).toEqual(['2026-09-10', '2026-09-14']);
  expect(wrapper.get('[aria-label="Stay"]').attributes('aria-expanded')).toBe('false');
});
