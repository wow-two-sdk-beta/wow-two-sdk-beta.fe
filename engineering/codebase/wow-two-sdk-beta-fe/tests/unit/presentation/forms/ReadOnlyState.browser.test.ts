import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Temporal } from 'temporal-polyfill';
import { h, type Component, type VNode } from 'vue';
import {
  CascaderPicker,
  ComboboxPicker,
  ComboboxPickerContent,
  ComboboxPickerInput,
  ComboboxPickerItem,
  CronInput,
  DateInput,
  DatePicker,
  DateRangePicker,
  DateTimeInput,
  DurationInput,
  EmailInput,
  Field,
  MaskedInput,
  MonthPicker,
  MultiSelectPicker,
  MultiSelectPickerContent,
  MultiSelectPickerItem,
  MultiSelectPickerTrigger,
  NumberInput,
  PasswordInput,
  PhoneInput,
  SearchInput,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  TagsInput,
  TelInput,
  TextAreaInput,
  TextInput,
  TimeInput,
  TimePicker,
  TreeSelectPicker,
  UrlInput,
  YearPicker,
} from '@src/presentation/forms';
import {
  ariaViolations,
  bg,
  cursorOf,
  descriptionOf,
  isForcedColors,
  mountHost,
  mountPair,
  type PairVariant,
  settle,
  Theme,
  textColor,
  tabTo,
  tokenColor,
  unmountAfterEach,
  unmountNow,
} from '../../../support/ReadOnlyHarness';

/*
 * A read-only control takes the disabled look without the disabled semantics: the muted surface and text, a default
 * cursor, no hover border, a 1px neutral focus ring, focus, and a selectable value. Its state reaches assistive
 * technology through a role that allows it: the native `readonly` attribute on an input, `aria-readonly` on a
 * `combobox` trigger, and the accessible description "Read only" on a `button` trigger, whose role has no
 * `aria-readonly`. Every case mounts a normal control beside a read-only one, so the read-only look is read as a
 * difference rather than a constant.
 */

unmountAfterEach();

interface Case {
  readonly make: () => VNode;
  /** Selects the control inside the container; the normal one comes first, the read-only one second. */
  readonly control: string;
  /** Resolves the frame that carries the surface, when it is not the control itself. */
  readonly frame?: (control: HTMLElement) => HTMLElement;
}

const options = [{ value: 'a', label: 'All' }];
const treeNodes = [{ value: 'a', label: 'All' }];

const Inputs: Record<string, Case> = {
  TextInput: { make: () => h(TextInput, { defaultValue: 'prod-net' }), control: 'input' },
  TextAreaInput: { make: () => h(TextAreaInput, { defaultValue: 'prod-net' }), control: 'textarea' },
  NumberInput: { make: () => h(NumberInput, { defaultValue: 5 }), control: 'input[type=number]' },
  EmailInput: { make: () => h(EmailInput, { defaultValue: 'a@b.co' }), control: 'input[type=email]' },
  UrlInput: { make: () => h(UrlInput, { defaultValue: 'https://a.co' }), control: 'input[type=url]' },
  TelInput: { make: () => h(TelInput, { defaultValue: '+99890' }), control: 'input[type=tel]' },
  PasswordInput: { make: () => h(PasswordInput, { defaultValue: 'secret' }), control: 'input' },
  SearchInput: { make: () => h(SearchInput, { defaultValue: 'prod' }), control: 'input[type=search]' },
  MaskedInput: { make: () => h(MaskedInput, { mask: '###-###', defaultValue: '123456' }), control: 'input' },
  CronInput: { make: () => h(CronInput, { defaultValue: '0 9 * * 1' }), control: 'input' },
  DateInput: { make: () => h(DateInput, { defaultValue: Temporal.PlainDate.from('2026-10-21') }), control: 'input' },
  TimeInput: { make: () => h(TimeInput, { defaultValue: Temporal.PlainTime.from('09:30') }), control: 'input' },
  DateTimeInput: {
    make: () => h(DateTimeInput, { defaultValue: Temporal.PlainDateTime.from('2026-10-21T09:30') }),
    control: 'input',
  },
  ComboboxPicker: {
    make: () =>
      h(ComboboxPicker as Component, null, () => [
        h(ComboboxPickerInput, { 'aria-label': 'Kind' }),
        h(ComboboxPickerContent, null, () => h(ComboboxPickerItem, { value: 'a', label: 'All' })),
      ]),
    control: 'input[role=combobox]',
  },
};

describe.each(Object.entries(Inputs))('read-only %s', (_name, { make, control, frame }) => {
  const pick = async (className = ''): Promise<{ normal: HTMLElement; readOnly: HTMLElement; root: HTMLElement }> => {
    const root = await mountPair(make, className);
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLElement>(control));
    return { normal: normal!, readOnly: readOnly!, root };
  };

  it('carries the native readonly attribute, keeps the focus and ignores typing', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.hasAttribute('readonly')).toBe(true);
    expect(readOnly.hasAttribute('disabled')).toBe(false);
    expect(readOnly.getAttribute('aria-disabled')).toBeNull();
    expect(normal.hasAttribute('readonly')).toBe(false);
    const before = (readOnly as HTMLInputElement).value;
    await tabTo(readOnly);
    await userEvent.keyboard('zz');
    expect((readOnly as HTMLInputElement).value).toBe(before);
  });

  it('shows a default cursor, and the value stays selectable', async () => {
    const { readOnly } = await pick();
    expect(cursorOf(readOnly)).toBe('default');
    expect(getComputedStyle(readOnly).userSelect).not.toBe('none');
  });

  it.skipIf(isForcedColors)('takes the muted surface and text of a disabled control', async () => {
    const { normal, readOnly, root } = await pick();
    const surface = frame ?? ((element: HTMLElement) => element);
    expect(bg(surface(readOnly))).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(textColor(readOnly)).toBe(tokenColor(root, 'color', '--color-muted-foreground'));
    expect(bg(surface(normal))).not.toBe(bg(surface(readOnly)));
    expect(textColor(normal)).not.toBe(textColor(readOnly));
  });

  it.skipIf(isForcedColors)('shows no hover emphasis', async () => {
    const { normal, readOnly } = await pick();
    const surface = frame ?? ((element: HTMLElement) => element);
    const resting = getComputedStyle(surface(readOnly)).borderTopColor;
    await userEvent.hover(surface(normal));
    // The border colour transitions, so the hover emphasis arrives a few frames after the pointer.
    await expect.poll(() => getComputedStyle(surface(normal)).borderTopColor).toBe('rgb(255, 0, 0)');
    await userEvent.hover(surface(readOnly));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(getComputedStyle(surface(readOnly)).borderTopColor).toBe(resting);
  });

  it('keeps a minimal accessible focus indicator', async () => {
    const { readOnly } = await pick();
    await tabTo(readOnly);
    const style = getComputedStyle(readOnly);
    if (isForcedColors) {
      // Box shadows are not drawn in forced colours; the transparent outline becomes a system-colour one.
      expect(style.outlineStyle).not.toBe('none');
      expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(1);
      return;
    }
    expect(style.boxShadow).toMatch(/0px 0px 0px 1px/);
    expect(style.boxShadow).not.toMatch(/0px 0px 0px 2px/);
  });

  it.skipIf(isForcedColors)('keeps the focus ring neutral, in the light and the dark theme', async () => {
    for (const theme of ['', 'dark']) {
      const { readOnly, root } = await pick(theme);
      await tabTo(readOnly);
      const ring = tokenColor(root, 'color', '--color-muted-foreground');
      expect(getComputedStyle(readOnly).boxShadow).toContain(ring);
      unmountNow();
    }
  });
});

describe('read-only text inputs', () => {
  it('keeps the value selectable and copyable', async () => {
    const root = await mountPair(() => h(TextInput, { defaultValue: 'prod-net' }));
    const readOnly = root.querySelectorAll<HTMLInputElement>('input')[1]!;
    readOnly.focus();
    readOnly.select();
    expect(readOnly.selectionStart).toBe(0);
    expect(readOnly.selectionEnd).toBe('prod-net'.length);
    expect(
      document.getSelection()?.toString() ?? readOnly.value.slice(readOnly.selectionStart!, readOnly.selectionEnd!),
    ).toBe('prod-net');
  });

  it('takes its own flag, which wins over the surrounding Field', async () => {
    await mountHost(() =>
      h(Field, { label: 'Name', isReadOnly: true }, () => [
        h(TextInput, { id: 'own', isReadOnly: false }),
        h(TextInput, { id: 'inherited' }),
      ]),
    );
    expect(document.querySelector('#own')!.hasAttribute('readonly')).toBe(false);
    expect(document.querySelector('#inherited')!.hasAttribute('readonly')).toBe(true);
  });

  it('keeps the invalid border while read-only', async () => {
    await mountHost(() => h('div', { style: Theme }, [h(TextInput, { isReadOnly: true, state: 'invalid' })]));
    const input = document.querySelector('input')!;
    await userEvent.hover(input);
    expect(input.getAttribute('readonly')).not.toBeNull();
    if (!isForcedColors) {
      expect(getComputedStyle(input).borderTopColor).not.toBe('rgb(0, 0, 255)');
      expect(getComputedStyle(input).borderTopColor).not.toBe('rgb(255, 0, 0)');
    }
  });

  it.skipIf(isForcedColors)('leaves a disabled input on the muted surface it always had', async () => {
    const root = await mountHost(() => h('div', { style: Theme }, [h(TextInput, { isDisabled: true })]));
    expect(bg(root.querySelector('input')!)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(cursorOf(root.querySelector('input')!)).toBe('not-allowed');
  });

  it.skipIf(isForcedColors)('keeps the focus ring off when the caller turned it off', async () => {
    await mountHost(() => h('div', { style: Theme }, [h(TextInput, { isReadOnly: true, ring: 'none' })]));
    const input = document.querySelector('input')!;
    await tabTo(input);
    expect(getComputedStyle(input).boxShadow).not.toMatch(/0px 0px 0px [1-9]/);
  });
});

interface TriggerCase {
  /** Builds the picker; `onChange` reports every value change, tagged by the instance that made it. */
  readonly make: (variant: PairVariant, onChange: (variant: PairVariant) => void) => VNode;
  readonly opens: string;
  /** `combobox` carries `aria-readonly`; a `button` has no such attribute and is described instead. */
  readonly role: 'combobox' | 'button';
  /** Keys that change the value of a normal closed trigger, to prove the read-only one ignores them. */
  readonly mutatingKey?: string;
}

const Triggers: Record<string, TriggerCase> = {
  SelectPicker: {
    make: (variant, onChange) =>
      h(SelectPicker as Component, { defaultValue: 'a', 'onUpdate:modelValue': () => onChange(variant) }, () => [
        h(SelectPickerTrigger, { 'aria-label': 'Kind' }, () => h(SelectPickerValue)),
        h(SelectPickerContent, null, () => [
          h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'All' }),
          h(SelectPickerItem, { itemKey: 'b', value: 'b', label: 'Beta' }),
        ]),
      ]),
    opens: '[role=listbox]',
    role: 'combobox',
    mutatingKey: 'b',
  },
  MultiSelectPicker: {
    make: (variant, onChange) =>
      h(MultiSelectPicker as Component, { defaultValue: ['a'], 'onUpdate:modelValue': () => onChange(variant) }, () => [
        h(MultiSelectPickerTrigger, { 'aria-label': 'Kinds' }),
        h(MultiSelectPickerContent, null, () => h(MultiSelectPickerItem, { value: 'a', label: 'All' })),
      ]),
    opens: '[role=listbox]',
    role: 'combobox',
    mutatingKey: 'Backspace',
  },
  DatePicker: {
    make: (variant, onChange) =>
      h(DatePicker, {
        'aria-label': 'Day',
        defaultValue: Temporal.PlainDate.from('2026-10-21'),
        'onUpdate:modelValue': () => onChange(variant),
      }),
    opens: '[role=dialog]',
    role: 'button',
  },
  DateRangePicker: {
    make: (variant, onChange) =>
      h(DateRangePicker, { 'aria-label': 'Days', 'onUpdate:modelValue': () => onChange(variant) }),
    opens: '[role=dialog]',
    role: 'button',
  },
  TimePicker: {
    make: (variant, onChange) =>
      h(TimePicker, { 'aria-label': 'Time', 'onUpdate:modelValue': () => onChange(variant) }),
    opens: '[role=dialog]',
    role: 'button',
  },
  MonthPicker: {
    make: (variant, onChange) =>
      h(MonthPicker, { 'aria-label': 'Month', 'onUpdate:modelValue': () => onChange(variant) }),
    opens: '[role=dialog]',
    role: 'button',
  },
  YearPicker: {
    make: (variant, onChange) =>
      h(YearPicker, { 'aria-label': 'Year', 'onUpdate:modelValue': () => onChange(variant) }),
    opens: '[role=dialog]',
    role: 'button',
  },
  CascaderPicker: {
    make: (variant, onChange) =>
      h(CascaderPicker, { 'aria-label': 'Path', options, 'onUpdate:modelValue': () => onChange(variant) }),
    opens: '[role=dialog]',
    role: 'button',
  },
  TreeSelectPicker: {
    make: (variant, onChange) =>
      h(TreeSelectPicker, { 'aria-label': 'Node', nodes: treeNodes, 'onUpdate:modelValue': () => onChange(variant) }),
    opens: '[role=dialog]',
    role: 'button',
  },
};

describe.each(Object.entries(Triggers))('read-only %s trigger', (_name, { make, opens, role, mutatingKey }) => {
  const changes: PairVariant[] = [];
  const pick = async (): Promise<{ normal: HTMLButtonElement; readOnly: HTMLButtonElement; root: HTMLElement }> => {
    changes.length = 0;
    const root = await mountPair((variant) => make(variant, (changed) => changes.push(changed)));
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLButtonElement>('button[aria-haspopup]'));
    return { normal: normal!, readOnly: readOnly!, root };
  };
  const panelOpen = (): boolean => document.querySelector(opens) !== null;

  it('stays focusable and exposes its read-only state through a role that allows it', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.disabled).toBe(false);
    expect(readOnly.hasAttribute('aria-disabled')).toBe(false);
    if (role === 'combobox') {
      // A combobox allows `aria-readonly`, which assistive technology announces as read only.
      expect(readOnly.getAttribute('role')).toBe('combobox');
      expect(normal.getAttribute('role')).toBe('combobox');
      expect(readOnly.getAttribute('aria-readonly')).toBe('true');
      expect(normal.getAttribute('aria-readonly')).toBeNull();
    } else {
      // A button has no `aria-readonly`: the state is its accessible description instead.
      expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
      expect(normal.hasAttribute('aria-readonly')).toBe(false);
      expect(descriptionOf(readOnly)).toBe('Read only');
      expect(descriptionOf(normal)).toBe('');
      expect(readOnly.hasAttribute('data-readonly')).toBe(true);
      expect(normal.hasAttribute('data-readonly')).toBe(false);
    }
    await tabTo(readOnly);
  });

  it('passes the ARIA validity rules, normal and read-only alike', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('opens when normal', async () => {
    const { normal } = await pick();
    await userEvent.click(normal);
    await expect.poll(panelOpen).toBe(true);
  });

  it('neither opens nor changes when read-only, on a click or a key', async () => {
    const { readOnly } = await pick();
    await userEvent.click(readOnly);
    // One keyboard call keeps real input to a minimum: Enter and Space click a button, the arrows open a combobox.
    readOnly.focus();
    await userEvent.keyboard('{Enter} {ArrowDown}{ArrowUp}{Alt>}{ArrowDown}{/Alt}');
    await settle();
    expect(panelOpen()).toBe(false);
    expect(readOnly.getAttribute('aria-expanded')).not.toBe('true');
    expect(document.activeElement).toBe(readOnly);
    expect(changes).toEqual([]);
  });

  it.skipIf(role !== 'combobox')('opens a normal combobox on the arrow keys', async () => {
    const { normal } = await pick();
    normal.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(panelOpen).toBe(true);
  });

  // A synthetic key event: WebKit navigates back on a real Backspace that no handler consumed.
  it.skipIf(mutatingKey === undefined)('ignores the keys that change a normal closed trigger', async () => {
    const { normal, readOnly } = await pick();
    const press = (target: HTMLElement): boolean =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key: mutatingKey!, bubbles: true, cancelable: true }));
    press(normal);
    await expect.poll(() => changes).toEqual(['normal']);
    changes.length = 0;
    press(readOnly);
    await settle();
    expect(changes).toEqual([]);
  });

  it('shows a default cursor', async () => {
    const { readOnly } = await pick();
    expect(cursorOf(readOnly)).toBe('default');
  });

  it.skipIf(isForcedColors)('rests on the field and reads read-only on the muted surface', async () => {
    const { normal, readOnly, root } = await pick();
    expect(bg(normal)).toBe(tokenColor(root, 'background-color', '--color-field'));
    expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    await userEvent.hover(readOnly);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(getComputedStyle(readOnly).borderTopColor).toBe('rgb(0, 0, 255)');
  });

  it('keeps a minimal accessible focus indicator', async () => {
    const { readOnly } = await pick();
    await tabTo(readOnly);
    const style = getComputedStyle(readOnly);
    if (isForcedColors) {
      expect(style.outlineStyle).not.toBe('none');
      return;
    }
    expect(style.boxShadow).toMatch(/0px 0px 0px 1px/);
  });
});

describe('the ARIA validity check', () => {
  it('rejects an aria-readonly on a button, the mistake the trigger tests guard against', async () => {
    const root = await mountHost(() => h('div', [h('button', { type: 'button', 'aria-readonly': 'true' }, 'Day')]));
    expect((await ariaViolations(root)).join('\n')).toContain('aria-allowed-attr');
  });
});

const Composites: Record<string, { make: () => VNode; control: string; frame: (control: HTMLElement) => HTMLElement }> =
  {
    PhoneInput: {
      make: () => h(PhoneInput, { defaultValue: '+998901234567' }),
      control: 'input[type=tel]',
      frame: (control) => control.parentElement!,
    },
    DurationInput: {
      make: () => h(DurationInput, { defaultValue: Temporal.Duration.from({ hours: 1, minutes: 30 }) }),
      control: 'input[data-unit]',
      frame: (control) => control.closest<HTMLElement>('[role=group]')!,
    },
    TagsInput: {
      make: () => h(TagsInput, { defaultValue: ['prod', 'dev'] }),
      control: 'input[type=text]',
      frame: (control) => control.closest<HTMLElement>('[role=group]')!,
    },
  };

describe.each(Object.entries(Composites))('read-only %s frame', (_name, { make, control, frame }) => {
  const pick = async (): Promise<{ normal: HTMLElement; readOnly: HTMLElement; root: HTMLElement }> => {
    const root = await mountPair(make);
    // A duration has several segments: the read-only Field's first one follows the normal Field's segments.
    const all = Array.from(root.querySelectorAll<HTMLElement>(control));
    return { normal: all[0]!, readOnly: all[all.length / 2]!, root };
  };

  it('marks the frame read-only and keeps its input focusable', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.hasAttribute('readonly')).toBe(true);
    expect(readOnly.hasAttribute('disabled')).toBe(false);
    expect(normal.hasAttribute('readonly')).toBe(false);
    await tabTo(readOnly);
    expect(cursorOf(readOnly)).toBe('default');
  });

  it.skipIf(isForcedColors)('puts the whole frame on the muted surface', async () => {
    const { normal, readOnly, root } = await pick();
    expect(bg(frame(readOnly))).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(bg(frame(normal))).not.toBe(bg(frame(readOnly)));
  });
});
