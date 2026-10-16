import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { StatCard } from '@src/presentation/display';
import { MeterBar } from '@src/presentation/feedback';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

function render<C>(component: C, props: Record<string, unknown>, slots: Record<string, () => unknown> = {}) {
  const wrapper = mount(component as never, { props: props as never, slots, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

describe('StatCard trend', () => {
  it('reads a fall as good when lower is better, and zero as neutral', () => {
    const down = render(StatCard, {
      label: 'p95',
      value: '180 ms',
      trend: { value: -12, text: '−12 ms' },
      isLowerBetter: true,
    });
    const trend = down.get('span.inline-flex');
    expect(trend.text()).toContain('−12 ms');
    expect(trend.classes()).toContain('text-success-soft-foreground');

    const up = render(StatCard, { label: 'Errors', value: 4, trend: { value: 3 }, isLowerBetter: true });
    expect(up.get('span.inline-flex').classes()).toContain('text-destructive-soft-foreground');
    expect(up.get('span.inline-flex').text()).toContain('+3%');

    const flat = render(StatCard, { label: 'Deploys', value: 9, trend: { value: 0 } });
    expect(flat.get('span.inline-flex').classes()).toContain('text-muted-foreground');
  });

  it('shows the helper and the trend together, from the prop or the slot', () => {
    const wrapper = render(
      StatCard,
      { label: 'Deploys', value: 9, trend: { value: 5, label: 'vs prior 30 days' } },
      {
        helper: () => h('span', { 'data-helper': '' }, 'Across every target'),
      },
    );
    expect(wrapper.find('[data-helper]').exists()).toBe(true);
    expect(wrapper.text()).toContain('vs prior 30 days');
  });
});

describe('StatCard interaction', () => {
  it('turns the label into a button stretched over the tile', async () => {
    const onClick = vi.fn();
    const wrapper = render(StatCard, { label: 'Failed', value: 2, onClick });
    const button = wrapper.get('button');
    expect(button.attributes('type')).toBe('button');
    expect(button.text()).toBe('Failed');
    expect(button.classes()).toContain('after:inset-0');
    expect(document.getElementById(button.attributes('aria-describedby')!)?.textContent).toContain('2');
    await button.trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('turns the label into a link with href', () => {
    const link = render(StatCard, { label: 'Failed', value: 2, href: '/deployments?status=failed' }).get('a');
    expect(link.attributes('href')).toBe('/deployments?status=failed');
  });

  it('stays static without href or onClick', () => {
    const wrapper = render(StatCard, { label: 'Failed', value: 2 });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('a').exists()).toBe(false);
  });
});

describe('MeterBar header and loading', () => {
  it('keeps the bar as the root without a visible label', () => {
    const wrapper = render(MeterBar, { value: 40, label: 'CPU' });
    expect(wrapper.attributes('role')).toBe('meter');
    expect(wrapper.attributes('aria-label')).toBe('CPU');
  });

  it('draws the label and a readout above the bar, naming the meter by the label', () => {
    const wrapper = render(MeterBar, { value: 62.4, label: 'Memory', isLabelVisible: true });
    const meter = wrapper.get('[role=meter]');
    const label = document.getElementById(meter.attributes('aria-labelledby')!);
    expect(label?.textContent).toBe('Memory');
    expect(wrapper.text()).toContain('62%');
    expect(
      render(MeterBar, { value: 6.2, max: 10, label: 'Disk', isLabelVisible: true, valueLabel: '6.2 of 10 GB' }).text(),
    ).toContain('6.2 of 10 GB');
  });

  it('pulses without a fill while loading', () => {
    const wrapper = render(MeterBar, { value: 0, label: 'Memory', isLabelVisible: true, isLoading: true });
    const meter = wrapper.get('[role=meter]');
    expect(meter.attributes('aria-busy')).toBe('true');
    expect(meter.attributes('aria-valuetext')).toBe('Loading');
    expect(meter.classes()).toContain('motion-safe:animate-pulse');
    expect(meter.element.children).toHaveLength(0);
    const bars = wrapper.findAll('[data-skeleton-line]');
    expect(bars.map((bar) => bar.attributes('aria-hidden'))).toEqual(['true', 'true']);
    expect(bars[1]!.text()).toContain('%');
  });
});
