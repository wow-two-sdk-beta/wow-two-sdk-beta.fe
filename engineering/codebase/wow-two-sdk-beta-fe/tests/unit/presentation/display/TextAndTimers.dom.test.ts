import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { LocaleProvider } from '@src/foundation/i18n';
import { CountdownText, TruncatedText } from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Makes every element report a box `scroll`px tall inside a `client`px clamp (happy-dom lays nothing out). */
function layout(scroll: number, client: number): void {
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(scroll);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(client);
}

describe('TruncatedText', () => {
  it('shows no toggle while the copy fits its clamp', async () => {
    layout(40, 40);
    const wrapper = track(mount(TruncatedText, { slots: { default: () => 'Short copy.' } }));
    await nextTick();
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.get('[data-state]').classes()).toContain('line-clamp-(--truncated-lines)');
    expect(wrapper.get('[data-state]').attributes('style')).toContain('--truncated-lines: 3');
  });

  it('offers a named toggle for overflowing copy and expands it in place', async () => {
    layout(120, 60);
    const wrapper = track(mount(TruncatedText, { props: { lines: 2 }, slots: { default: () => 'Long copy.' } }));
    await nextTick();
    const content = wrapper.get('[data-state]');
    const toggle = wrapper.get('button');
    expect(content.attributes('style')).toContain('--truncated-lines: 2');
    expect(toggle.text()).toBe('Show more');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(toggle.attributes('aria-controls')).toBe(content.attributes('id'));
    await toggle.trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    expect(content.classes()).not.toContain('line-clamp-(--truncated-lines)');
    expect(toggle.text()).toBe('Show less');
    await toggle.trigger('click');
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
    expect(content.attributes('data-state')).toBe('closed');
  });

  it('requests changes without applying them while controlled and takes a custom toggle', async () => {
    layout(120, 60);
    const wrapper = track(
      mount(TruncatedText, {
        props: { open: false },
        slots: {
          default: () => 'Long copy.',
          toggle: ({ open, toggle }: { open: boolean; toggle: () => void }) =>
            h('a', { href: '#', 'data-custom': '', onClick: toggle }, open ? 'less' : 'more'),
        },
      }),
    );
    await nextTick();
    await wrapper.get('[data-custom]').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    expect(wrapper.get('[data-custom]').text()).toBe('more');
  });

  it('localizes the default toggle text', async () => {
    layout(120, 60);
    const wrapper = track(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages: { 'TruncatedText.moreLabel': 'Mehr' } }, () =>
              h(TruncatedText, null, () => 'Langer Text.'),
            ),
        }),
      ),
    );
    await nextTick();
    expect(wrapper.get('button').text()).toBe('Mehr');
  });
});

describe('CountdownText', () => {
  const start = new Date('2026-09-26T12:00:00.000Z').getTime();

  it('ticks down on second boundaries and completes once at zero', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const wrapper = track(mount(CountdownText, { props: { to: start + 65_000 } }));
    const timer = wrapper.get('[role=timer]');
    expect(timer.text()).toBe('01:05');
    expect(timer.attributes('datetime')).toBe('PT0H1M5S');
    await vi.advanceTimersByTimeAsync(1000);
    expect(timer.text()).toBe('01:04');
    await vi.advanceTimersByTimeAsync(64_000);
    expect(timer.text()).toBe('00:00');
    expect(timer.attributes('data-complete')).toBe('');
    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.emitted('complete')).toHaveLength(1);
  });

  it('shows hours and days in the default clock and accepts a Temporal instant', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const wrapper = track(
      mount(CountdownText, { props: { to: Temporal.Instant.fromEpochMilliseconds(start + 3_723_000) } }),
    );
    expect(wrapper.text()).toBe('1:02:03');
    await wrapper.setProps({ to: start + 2 * 86_400_000 + 3_723_000 });
    expect(wrapper.text()).toBe('2d 01:02:03');
    expect(wrapper.get('time').attributes('datetime')).toBe('P2DT1H2M3S');
  });

  it('holds while paused and resumes from the real clock', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const wrapper = track(mount(CountdownText, { props: { to: start + 10_000, isPaused: true } }));
    await vi.advanceTimersByTimeAsync(4000);
    expect(wrapper.text()).toBe('00:10');
    await wrapper.setProps({ isPaused: false });
    expect(wrapper.text()).toBe('00:06');
  });

  it('completes on mount for a passed target and restarts for a new one', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const wrapper = track(mount(CountdownText, { props: { to: start - 1000 } }));
    expect(wrapper.emitted('complete')).toHaveLength(1);
    await wrapper.setProps({ to: start + 2000 });
    expect(wrapper.text()).toBe('00:02');
    await vi.advanceTimersByTimeAsync(2000);
    expect(wrapper.emitted('complete')).toHaveLength(2);
  });

  it('renders a custom format, a slot and localized days', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const formatted = track(
      mount(CountdownText, {
        props: { to: start + 90_000, format: ({ minutes, seconds }) => `${minutes}m ${seconds}s left` },
      }),
    );
    expect(formatted.text()).toBe('1m 30s left');
    const slotted = track(
      mount(CountdownText, {
        props: { to: start + 5000 },
        slots: { default: ({ parts }: { parts: { seconds: number } }) => h('b', `${parts.seconds}!`) },
      }),
    );
    expect(slotted.get('b').text()).toBe('5!');
    const localized = track(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages: { 'CountdownText.days': '{days} T.' } }, () =>
              h(CountdownText, { to: start + 86_400_000 }),
            ),
        }),
      ),
    );
    expect(localized.text()).toBe('1 T. 00:00:00');
  });

  it('keeps its text when the target is not finite and reports completion', () => {
    const target = ref(Number.NaN);
    const wrapper = track(mount(CountdownText, { props: { to: target.value } }));
    expect(wrapper.text()).toBe('00:00');
    expect(wrapper.emitted('complete')).toHaveLength(1);
  });
});
