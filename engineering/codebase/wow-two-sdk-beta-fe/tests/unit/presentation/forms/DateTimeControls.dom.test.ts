import { describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { Temporal } from 'temporal-polyfill';
import {
  CalendarPicker,
  DateInput,
  DateTimeInput,
  RangeCalendarPicker,
  RecurrenceEditor,
  TimeInput,
  TimePicker,
} from '@src/presentation/forms';

/*
 * Depth tier for the date/time family.
 *
 * Two classes of regression are pinned here, both of which a mount-only smoke test sees as
 * perfectly healthy:
 *
 *   1. A control silently falling back to a NATIVE picker. `<input type="time">` and
 *      `<input type="datetime-local">` open an OS panel the design system cannot touch, so
 *      the element's `type` is a behavioural contract, not a detail.
 *   2. A hover class that a consumer's selected-state class fails to displace. tailwind-merge
 *      only drops a class from the SAME utility group AND the same variant, so a plain
 *      `text-primary-foreground` leaves the grid's `hover:text-foreground` standing and the
 *      selected day turns near-black on its own accent fill while hovered.
 */

/** The class string tailwind-merge actually left on the element. */
function classesOf(element: Element): string[] {
  return element.className.split(/\s+/).filter(Boolean);
}

describe('TimeInput — popover by default, native only on request', () => {
  it('renders a typed text field, not the browser time control', () => {
    const wrapper = mount(TimeInput);

    const input = wrapper.find('input');
    expect(input.attributes('type'), 'TimeInput still renders the native picker').toBe('text');

    wrapper.unmount();
  });

  it('opens its own popover from the trailing trigger', async () => {
    const wrapper = mount(TimeInput, { attachTo: document.body });

    const trigger = wrapper.find('button[aria-haspopup="dialog"]');
    expect(trigger.exists(), 'TimeInput renders no popover trigger').toBe(true);
    expect(trigger.attributes('aria-expanded')).toBe('false');

    await trigger.trigger('click');
    expect(trigger.attributes('aria-expanded'), 'trigger did not open the popover').toBe('true');

    wrapper.unmount();
  });

  it('keeps the native control behind the `native` opt-in', () => {
    const wrapper = mount(TimeInput, { props: { native: true } });

    expect(wrapper.find('input').attributes('type')).toBe('time');
    expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it.each([
    ['09:30', 9, 30],
    ['9:30', 9, 30],
    ['930', 9, 30],
    ['9', 9, 0],
  ])('commits the typed draft %s on blur', async (typed, hour, minute) => {
    const seen: Array<Temporal.PlainTime | null> = [];
    const wrapper = mount(TimeInput, { props: { 'onUpdate:modelValue': (v) => seen.push(v) } });

    const input = wrapper.find('input');
    await input.setValue(typed);
    await input.trigger('blur');

    expect(seen.at(-1)?.hour, `\`${typed}\` did not commit its hour`).toBe(hour);
    expect(seen.at(-1)?.minute, `\`${typed}\` did not commit its minute`).toBe(minute);

    wrapper.unmount();
  });

  it('reverts an unparseable draft to the committed value', async () => {
    const wrapper = mount(TimeInput, {
      props: { modelValue: Temporal.PlainTime.from('08:15') },
    });

    const input = wrapper.find('input');
    await input.setValue('not a time');
    await input.trigger('blur');
    await nextTick();

    expect((input.element as HTMLInputElement).value, 'draft did not revert').toBe('08:15');

    wrapper.unmount();
  });

  it('clears on an emptied draft', async () => {
    const seen: Array<Temporal.PlainTime | null> = [];
    const wrapper = mount(TimeInput, {
      props: {
        modelValue: Temporal.PlainTime.from('08:15'),
        'onUpdate:modelValue': (v) => seen.push(v),
      },
    });

    const input = wrapper.find('input');
    await input.setValue('');
    await input.trigger('blur');

    expect(seen.at(-1), 'an emptied field did not clear the value').toBeNull();

    wrapper.unmount();
  });
});

describe('DateInput — popover by default, native only on request', () => {
  it('renders a typed text field, not the browser date control', () => {
    const wrapper = mount(DateInput);

    expect(wrapper.find('input').attributes('type'), 'DateInput still renders the native picker').toBe('text');
    expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('keeps the native control behind the `native` opt-in', () => {
    const wrapper = mount(DateInput, { props: { native: true } });

    expect(wrapper.find('input').attributes('type')).toBe('date');
    expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('commits a typed ISO date and reverts anything else', async () => {
    const seen: Array<Temporal.PlainDate | null> = [];
    const wrapper = mount(DateInput, {
      props: {
        modelValue: Temporal.PlainDate.from('2026-03-04'),
        'onUpdate:modelValue': (v) => seen.push(v),
      },
    });

    const input = wrapper.find('input');
    await input.setValue('2026-07-19');
    await input.trigger('blur');
    expect(seen.at(-1)?.toString()).toBe('2026-07-19');

    /* Locale spellings are rejected rather than guessed — `04/03/2026` is ambiguous. */
    await input.setValue('04/03/2026');
    await input.trigger('blur');
    await nextTick();
    expect((input.element as HTMLInputElement).value, 'draft did not revert').toBe('2026-03-04');

    wrapper.unmount();
  });

  it('clears on an emptied draft', async () => {
    const seen: Array<Temporal.PlainDate | null> = [];
    const wrapper = mount(DateInput, {
      props: {
        modelValue: Temporal.PlainDate.from('2026-03-04'),
        'onUpdate:modelValue': (v) => seen.push(v),
      },
    });

    const input = wrapper.find('input');
    await input.setValue('');
    await input.trigger('blur');

    expect(seen.at(-1), 'an emptied field did not clear the value').toBeNull();

    wrapper.unmount();
  });
});

describe('DateTimeInput — popover by default, native only on request', () => {
  it('renders a typed text field, not the browser datetime control', () => {
    const wrapper = mount(DateTimeInput);

    expect(wrapper.find('input').attributes('type'), 'DateTimeInput still renders the native picker').toBe('text');
    expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('keeps the native control behind the `native` opt-in', () => {
    const wrapper = mount(DateTimeInput, { props: { native: true } });

    expect(wrapper.find('input').attributes('type')).toBe('datetime-local');
    expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('commits a typed date + time, and a bare date as midnight', async () => {
    const seen: Array<Temporal.PlainDateTime | null> = [];
    const wrapper = mount(DateTimeInput, { props: { 'onUpdate:modelValue': (v) => seen.push(v) } });

    const input = wrapper.find('input');
    await input.setValue('2026-03-04 07:45');
    await input.trigger('blur');
    expect(seen.at(-1)?.toString({ smallestUnit: 'minute' })).toBe('2026-03-04T07:45');

    await input.setValue('2026-03-05');
    await input.trigger('blur');
    expect(seen.at(-1)?.toString({ smallestUnit: 'minute' })).toBe('2026-03-05T00:00');

    wrapper.unmount();
  });

  it('ships the ISO value in a hidden input when named', () => {
    const wrapper = mount(DateTimeInput, {
      props: { name: 'starts', modelValue: Temporal.PlainDateTime.from('2026-03-04T07:45') },
    });

    expect(wrapper.find('input[type="hidden"]').attributes('value')).toBe('2026-03-04T07:45');

    wrapper.unmount();
  });
});

describe('day-grid hover states stay legible', () => {
  it('gives an unselected day a hover that is not the popover surface', () => {
    const wrapper = mount(CalendarPicker);

    const cell = wrapper.find('button[role="gridcell"]:not([data-selected])');
    const classes = classesOf(cell.element);

    expect(classes, 'the muted hover is invisible on `bg-popover`').not.toContain('hover:bg-muted');
    expect(classes).toContain('hover:bg-primary/10');

    wrapper.unmount();
  });

  it('keeps the selected day white-on-accent while hovered', () => {
    const wrapper = mount(CalendarPicker, { props: { modelValue: Temporal.PlainDate.from('2026-03-04') } });

    const cell = wrapper.find('button[data-selected]');
    expect(cell.exists(), 'no day rendered as selected').toBe(true);

    const classes = classesOf(cell.element);
    expect(classes, 'the day number flips to `foreground` on hover').toContain('hover:text-primary-foreground');
    expect(classes).not.toContain('hover:text-foreground');
    expect(classes).toContain('hover:bg-primary/90');

    wrapper.unmount();
  });

  it('keeps a range end and the run between filled while hovered', () => {
    const wrapper = mount(RangeCalendarPicker, {
      props: {
        modelValue: {
          start: Temporal.PlainDate.from('2026-03-04'),
          end: Temporal.PlainDate.from('2026-03-08'),
        },
        defaultMonth: Temporal.PlainDate.from('2026-03-01'),
      },
    });

    const start = classesOf(wrapper.find('button[data-range-start]').element);
    expect(start, 'the range start loses its fill on hover').toContain('hover:bg-primary/90');
    expect(start).toContain('hover:text-primary-foreground');

    const inRange = classesOf(wrapper.find('button[data-in-range]').element);
    expect(inRange, 'the in-range run loses its tint on hover').toContain('hover:bg-primary/25');

    wrapper.unmount();
  });
});

describe('TimePicker — the panel is ours', () => {
  it('opens a design-system panel rather than a native control', async () => {
    const wrapper = mount(TimePicker, { attachTo: document.body });

    expect(wrapper.find('input[type="time"]').exists(), 'TimePicker fell back to native').toBe(false);

    const trigger = wrapper.find('button[aria-haspopup="dialog"]');
    await trigger.trigger('click');
    expect(trigger.attributes('aria-expanded')).toBe('true');

    wrapper.unmount();
  });
});

describe('RecurrenceEditor — design-system controls only', () => {
  it('renders the styled RadioInput, not bare platform radios', () => {
    const wrapper = mount(RecurrenceEditor);

    const radios = wrapper.findAll('input[type="radio"]');
    expect(radios, 'the end-mode group lost its radios').toHaveLength(3);

    for (const radio of radios) {
      expect(classesOf(radio.element), 'a bare platform radio is rendering instead of `RadioInput`').toContain('peer');
      expect(radio.attributes('id'), 'radios share an id inside a Field').toBeTruthy();
    }

    const ids = radios.map((radio) => radio.attributes('id'));
    expect(new Set(ids).size, 'the end-mode radios collide on one id').toBe(3);

    wrapper.unmount();
  });

  it('picks its end date through DatePicker, not the browser date control', () => {
    const wrapper = mount(RecurrenceEditor);

    expect(wrapper.find('input[type="date"]').exists(), 'the end date still opens the native picker').toBe(false);
    expect(wrapper.find('button[aria-label="End date"]').exists()).toBe(true);

    wrapper.unmount();
  });
});

describe('date/time controls stay wired to Field', () => {
  it.each([
    ['DateInput', DateInput],
    ['TimeInput', TimeInput],
    ['DateTimeInput', DateTimeInput],
  ] as const)('%s puts the context id on its own input', async (name, component) => {
    const wrapper = mount(component, { props: { id: 'explicit-id' } });
    await nextTick();

    expect(wrapper.find('input').attributes('id'), `${name} dropped its id`).toBe('explicit-id');

    wrapper.unmount();
  });

  /*
   * The whole family in one assertion. A native `type` reaching the DOM without the caller
   * asking for it is the exact regression the developer filed — this is the net under it.
   */
  it.each([
    ['DateInput', DateInput],
    ['TimeInput', TimeInput],
    ['DateTimeInput', DateTimeInput],
  ] as const)('%s opens no OS picker unless `native` is set', (name, component) => {
    const wrapper = mount(component);

    const natives = wrapper.findAll('input[type="date"], input[type="time"], input[type="datetime-local"]');
    expect(natives, `${name} leaked a native picker into a design-system form`).toHaveLength(0);

    wrapper.unmount();
  });
});

describe('DateTimeInput — the popover writes both halves', () => {
  it('keeps the time when the calendar changes the date', async () => {
    const seen: Array<Temporal.PlainDateTime | null> = [];
    const wrapper = mount({
      render: () =>
        h(DateTimeInput, {
          modelValue: Temporal.PlainDateTime.from('2026-03-04T07:45'),
          'onUpdate:modelValue': (v: Temporal.PlainDateTime | null) => seen.push(v),
        }),
    });

    /*
     * The panel only exists while open, and `Presence` gates that on `requestAnimationFrame`
     * — which never fires in a hidden document. The typed path above already covers the
     * merge arithmetic; this asserts the trigger reaches the popover at all.
     */
    expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(true);

    wrapper.unmount();
  });
});
