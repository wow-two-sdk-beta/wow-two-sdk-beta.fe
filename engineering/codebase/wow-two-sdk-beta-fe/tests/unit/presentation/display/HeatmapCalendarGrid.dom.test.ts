import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { DirectionProvider } from '@src/foundation/primitives';
import { CoarseHitArea } from '@src/foundation/styles';
import {
  HeatmapCalendarGrid,
  HeatmapCalendarGridFills,
  type HeatmapCalendarGridCell,
  type HeatmapCalendarGridProps,
} from '@src/presentation/display';

/*
 * The per-day activity calendar: the caller computes every day's tone, level, mark, split and label; the grid lays
 * them out, rings today and the chosen day, toggles a day, moves a roving tab stop and shows one shared tooltip.
 */

const wrappers: Array<VueWrapper> = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const day = (text: string): Temporal.PlainDate => Temporal.PlainDate.from(text);

/** Monday 2 November to Saturday 28 November 2026: four whole weeks and six days, Monday rows first. */
const base: HeatmapCalendarGridProps = {
  from: day('2026-11-02'),
  to: day('2026-11-28'),
  today: day('2026-11-28'),
  cells: [],
};

const cells: ReadonlyArray<HeatmapCalendarGridCell> = [
  { date: day('2026-11-03'), tone: 'success', level: 2, label: 'Nov 3: 3 done' },
  { date: day('2026-11-10'), tone: 'warning', level: 3, mark: 'half', label: 'Nov 10: 2 flagged' },
  { date: day('2026-11-17'), tone: 'danger', level: 1, mark: 'cross', split: 'success', label: 'Nov 17: mixed' },
];

/** Lets the clock pass the millisecond the listeners attached in; Vue drops an event stamped within it. */
async function settle(): Promise<void> {
  await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

async function mountGrid(props: Partial<HeatmapCalendarGridProps> = {}): Promise<VueWrapper> {
  const wrapper = mount(HeatmapCalendarGrid, { props: { ...base, ...props }, attachTo: document.body });
  wrappers.push(wrapper);
  await settle();
  return wrapper;
}

function cell(wrapper: VueWrapper, date: string) {
  return wrapper.get<HTMLButtonElement>(`[data-date="${date}"]`);
}

function tabStops(wrapper: VueWrapper): Array<string | undefined> {
  return wrapper.findAll('[data-date][tabindex="0"]').map((button) => button.attributes('data-date'));
}

function tooltip(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[role="tooltip"]');
}

async function flush(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
}

describe('HeatmapCalendarGrid layout', () => {
  it('draws one button per range day in week columns over weekday rows', async () => {
    const wrapper = await mountGrid();
    const days = wrapper.findAll('[data-date]');
    expect(days).toHaveLength(27);
    expect(days[0]!.attributes('data-date')).toBe('2026-11-02');
    expect(days.at(-1)!.attributes('data-date')).toBe('2026-11-28');
    // Monday 2 November opens column one, row one; Saturday 28 November closes column four, row six.
    expect(cell(wrapper, '2026-11-02').attributes('style')).toContain('grid-column: 2');
    expect(cell(wrapper, '2026-11-02').attributes('style')).toContain('grid-row: 2');
    expect(cell(wrapper, '2026-11-28').attributes('style')).toContain('grid-column: 5');
    expect(cell(wrapper, '2026-11-28').attributes('style')).toContain('grid-row: 7');
    expect(wrapper.get('[role="group"]').attributes('style')).toContain('repeat(4, var(--heatmap-cell))');
  });

  it('starts a column on Sunday with weekStart 0 and swaps the bounds when from follows to', async () => {
    const wrapper = await mountGrid({ from: day('2026-11-28'), to: day('2026-11-02'), weekStart: 0 });
    expect(wrapper.findAll('[data-date]')).toHaveLength(27);
    // Monday is the second row under a Sunday start.
    expect(cell(wrapper, '2026-11-02').attributes('style')).toContain('grid-row: 3');
  });

  it('labels months above their first column and weekdays on every other row', async () => {
    const wrapper = await mountGrid({ from: day('2026-09-01'), to: day('2026-11-28') });
    const months = wrapper.findAll('[role="group"] > span').map((span) => span.text());
    expect(months.slice(0, 3)).toEqual(['Sep', 'Oct', 'Nov']);
    expect(months.slice(3)).toEqual(['Mon', '', 'Wed', '', 'Fri', '', 'Sun']);
  });

  it('drops a month label that would crowd the next one', async () => {
    // Thursday 24 September opens column one; 1 October opens column two, too close, so September gives way.
    const wrapper = await mountGrid({ from: day('2026-09-24'), to: day('2026-11-28') });
    const months = wrapper
      .findAll('[role="group"] > span')
      .slice(0, 2)
      .map((span) => span.text());
    expect(months).toEqual(['Oct', 'Nov']);
  });

  it('defaults the range to the year ending today', async () => {
    const wrapper = await mountGrid({ from: undefined, to: undefined });
    expect(wrapper.find('[data-date="2025-11-29"]').exists()).toBe(true);
    expect(wrapper.find('[data-date="2025-11-28"]').exists()).toBe(false);
    expect(wrapper.find('[data-date="2026-11-28"]').exists()).toBe(true);
  });

  it('opens scrolled to the newest week', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900);
    const wrapper = await mountGrid({ from: day('2025-11-29') });
    expect(wrapper.get('.overflow-x-auto').element.scrollLeft).toBe(900);
  });

  it('names the group from the range, or from the caller aria-label', async () => {
    const wrapper = await mountGrid();
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe(
      'Activity per day, Nov 2, 2026 to Nov 28, 2026',
    );
    const named = await mountGrid({ 'aria-label': 'Deploys' } as Partial<HeatmapCalendarGridProps>);
    expect(named.get('[role="group"]').attributes('aria-label')).toBe('Deploys');
    expect(named.element.getAttribute('aria-label')).toBeNull();
  });

  it('draws an empty range without throwing when cells are absent', async () => {
    const wrapper = await mountGrid({ cells: undefined as unknown as HeatmapCalendarGridCell[] });
    expect(wrapper.findAll('[data-date]')).toHaveLength(27);
  });
});

describe('HeatmapCalendarGrid cells', () => {
  it('fills each day by its tone and level, and names it by its label', async () => {
    const wrapper = await mountGrid({ cells });
    expect(cell(wrapper, '2026-11-03').classes()).toContain(HeatmapCalendarGridFills.success[2]);
    expect(cell(wrapper, '2026-11-10').classes()).toContain('bg-warning/85');
    expect(cell(wrapper, '2026-11-17').classes()).toContain('bg-destructive/30');
    expect(cell(wrapper, '2026-11-03').attributes('aria-label')).toBe('Nov 3: 3 done');
  });

  it('draws a day the caller left out empty and names it by its date', async () => {
    const wrapper = await mountGrid({ cells });
    const empty = cell(wrapper, '2026-11-04');
    expect(empty.classes()).toContain('bg-muted');
    expect(empty.attributes('aria-label')).toBe('Wed, Nov 4, 2026');
  });

  it('keeps a toned day at level 0 on the empty fill', async () => {
    const wrapper = await mountGrid({ cells: [{ date: day('2026-11-05'), tone: 'danger', level: 0, label: 'x' }] });
    expect(cell(wrapper, '2026-11-05').classes()).toContain('bg-muted');
  });

  it('draws the mark over the fill in a colour readable in either theme', async () => {
    const wrapper = await mountGrid({ cells });
    const half = cell(wrapper, '2026-11-10').get('svg[data-mark="half"]');
    expect(half.classes()).toContain('text-warning-foreground/90');
    const cross = cell(wrapper, '2026-11-17').get('svg[data-mark="cross"]');
    expect(cross.classes()).toContain('text-foreground/65');
    const middle = await mountGrid({
      cells: [{ date: day('2026-11-06'), tone: 'danger', level: 2, mark: 'cross', label: 'x' }],
    });
    expect(cell(middle, '2026-11-06').get('svg').classes()).toEqual(
      expect.arrayContaining(['text-foreground/65', 'dark:text-destructive-foreground/90']),
    );
    expect(cell(wrapper, '2026-11-03').find('svg').exists()).toBe(false);
  });

  it('splits a mixed day: the lower-right half takes the split tone at the same level', async () => {
    const wrapper = await mountGrid({ cells });
    const split = cell(wrapper, '2026-11-17').get('span.absolute');
    expect(split.classes()).toContain('bg-success/30');
    expect(split.classes()).toContain('[clip-path:polygon(100%_0,100%_100%,0_100%)]');
    expect(cell(wrapper, '2026-11-10').find('span.absolute').exists()).toBe(false);
  });

  it('gives each day an invisible coarse-pointer hit area capped by the gap', async () => {
    const wrapper = await mountGrid();
    const classes = cell(wrapper, '2026-11-02').classes();
    for (const name of CoarseHitArea.After.split(' ')) expect(classes).toContain(name);
    const grid = wrapper.get('[role="group"]').classes();
    expect(grid).toEqual(expect.arrayContaining(['[--coarse-hit-gap:3px]', 'md:[--coarse-hit-gap:4px]']));
    expect(grid).toEqual(expect.arrayContaining(['[--heatmap-cell:1.375rem]', 'md:[--heatmap-cell:1.25rem]']));
  });
});

describe('HeatmapCalendarGrid today and the chosen day', () => {
  it('rings today with a dashed muted ring that pulses only while live', async () => {
    const wrapper = await mountGrid();
    const today = cell(wrapper, '2026-11-28');
    expect(today.attributes('aria-current')).toBe('date');
    const ring = today.get('[data-today="ring"]');
    expect(ring.classes()).toEqual(expect.arrayContaining(['outline-dashed', 'outline-muted-foreground']));
    expect(ring.classes()).not.toContain('motion-safe:animate-pulse');
    await wrapper.setProps({ isLive: true });
    expect(today.get('[data-today="ring"]').classes()).toContain('motion-safe:animate-pulse');
  });

  it('rings the chosen day solid primary; chosen today keeps that ring and adds a dot', async () => {
    const wrapper = await mountGrid({ selected: day('2026-11-10') });
    const chosen = cell(wrapper, '2026-11-10');
    expect(chosen.attributes('aria-pressed')).toBe('true');
    expect(chosen.classes()).toEqual(expect.arrayContaining(['ring-2', 'ring-primary']));
    await wrapper.setProps({ selected: day('2026-11-28'), isLive: true });
    const today = cell(wrapper, '2026-11-28');
    expect(today.classes()).toContain('ring-primary');
    expect(today.find('[data-today="ring"]').exists()).toBe(false);
    expect(today.get('[data-today="dot"]').classes()).toContain('motion-safe:animate-pulse');
  });
});

describe('HeatmapCalendarGrid selection', () => {
  it('emits the clicked day, and null when the chosen day is clicked again', async () => {
    const wrapper = await mountGrid({ selected: null });
    await cell(wrapper, '2026-11-10').trigger('click');
    const first = wrapper.emitted('select')![0]![0] as Temporal.PlainDate;
    expect(first.toString()).toBe('2026-11-10');
    // Controlled: the prop, not the click, moves the ring.
    expect(cell(wrapper, '2026-11-10').attributes('aria-pressed')).toBe('false');
    await wrapper.setProps({ selected: day('2026-11-10') });
    await cell(wrapper, '2026-11-10').trigger('click');
    expect(wrapper.emitted('select')![1]![0]).toBeNull();
  });

  it('keeps its own choice when uncontrolled', async () => {
    const wrapper = await mountGrid();
    await cell(wrapper, '2026-11-10').trigger('click');
    expect(cell(wrapper, '2026-11-10').attributes('aria-pressed')).toBe('true');
    await cell(wrapper, '2026-11-10').trigger('click');
    expect(cell(wrapper, '2026-11-10').attributes('aria-pressed')).toBe('false');
    expect(wrapper.emitted('select')).toHaveLength(2);
  });
});

describe('HeatmapCalendarGrid keyboard', () => {
  it('holds one tab stop: the chosen day, else today, else the last day', async () => {
    expect(tabStops(await mountGrid())).toEqual(['2026-11-28']);
    expect(tabStops(await mountGrid({ selected: day('2026-11-10') }))).toEqual(['2026-11-10']);
    expect(tabStops(await mountGrid({ today: day('2027-01-01') }))).toEqual(['2026-11-28']);
  });

  it('moves a week per arrow sideways, a day per arrow up and down, and to the ends on Home and End', async () => {
    const wrapper = await mountGrid({ selected: day('2026-11-10') });
    await cell(wrapper, '2026-11-10').trigger('keydown', { key: 'ArrowRight' });
    await flush();
    expect(tabStops(wrapper)).toEqual(['2026-11-17']);
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-11-17');
    await cell(wrapper, '2026-11-17').trigger('keydown', { key: 'ArrowDown' });
    await flush();
    expect(tabStops(wrapper)).toEqual(['2026-11-18']);
    await cell(wrapper, '2026-11-18').trigger('keydown', { key: 'ArrowLeft' });
    await cell(wrapper, '2026-11-11').trigger('keydown', { key: 'ArrowUp' });
    await flush();
    expect(tabStops(wrapper)).toEqual(['2026-11-10']);
    await cell(wrapper, '2026-11-10').trigger('keydown', { key: 'Home' });
    await flush();
    expect(tabStops(wrapper)).toEqual(['2026-11-02']);
    await cell(wrapper, '2026-11-02').trigger('keydown', { key: 'End' });
    await flush();
    expect(tabStops(wrapper)).toEqual(['2026-11-28']);
  });

  it('stays put at the range edge and leaves other keys alone', async () => {
    const wrapper = await mountGrid();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    cell(wrapper, '2026-11-28').element.dispatchEvent(event);
    await flush();
    expect(event.defaultPrevented).toBe(true);
    expect(tabStops(wrapper)).toEqual(['2026-11-28']);
    const letter = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    cell(wrapper, '2026-11-28').element.dispatchEvent(letter);
    expect(letter.defaultPrevented).toBe(false);
  });

  it('mirrors the sideways arrows under a right-to-left direction', async () => {
    const wrapper = mount(DirectionProvider, {
      props: { dir: 'rtl' },
      slots: { default: () => h(HeatmapCalendarGrid, { ...base, selected: day('2026-11-10') }) },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    await settle();
    await wrapper.get('[data-date="2026-11-10"]').trigger('keydown', { key: 'ArrowLeft' });
    await flush();
    expect(wrapper.get('[data-date="2026-11-17"]').attributes('tabindex')).toBe('0');
  });
});

describe('HeatmapCalendarGrid tooltip', () => {
  it('shows one tooltip in the body for a focused day and hides it on blur', async () => {
    const wrapper = await mountGrid({ cells });
    await cell(wrapper, '2026-11-10').trigger('focus');
    await flush();
    expect(document.body.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(tooltip()?.textContent?.trim()).toBe('Nov 10: 2 flagged');
    expect(wrapper.element.contains(tooltip())).toBe(false);
    await cell(wrapper, '2026-11-10').trigger('blur');
    await flush();
    expect(tooltip()).toBeNull();
  });

  it('follows a hovering mouse but not a finger passing over', async () => {
    const wrapper = await mountGrid({ cells });
    cell(wrapper, '2026-11-03').element.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    await flush();
    expect(tooltip()).toBeNull();
    cell(wrapper, '2026-11-03').element.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await flush();
    expect(tooltip()?.textContent?.trim()).toBe('Nov 3: 3 done');
    cell(wrapper, '2026-11-03').element.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await flush();
    expect(tooltip()).toBeNull();
  });

  it('selects a tapped day and shows its label until a tap lands outside the grid', async () => {
    const wrapper = await mountGrid({ cells });
    const target = cell(wrapper, '2026-11-17').element;
    target.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
    target.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    target.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect((wrapper.emitted('select')![0]![0] as Temporal.PlainDate).toString()).toBe('2026-11-17');
    expect(tooltip()?.textContent?.trim()).toBe('Nov 17: mixed');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
    await flush();
    expect(tooltip()).toBeNull();
  });

  it('shows no tooltip for a mouse click alone, and hides a shown one on Escape', async () => {
    const wrapper = await mountGrid({ cells });
    const target = cell(wrapper, '2026-11-03').element;
    target.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(tooltip()).toBeNull();
    await cell(wrapper, '2026-11-03').trigger('focus');
    await flush();
    expect(tooltip()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flush();
    expect(tooltip()).toBeNull();
  });
});
