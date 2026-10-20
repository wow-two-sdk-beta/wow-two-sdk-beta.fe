import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { nativeTab } from '../../../BrowserKeyboard';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, type Component, type VNode } from 'vue';
import { Temporal } from 'temporal-polyfill';
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
import '@src/index.css';

/*
 * A read-only control takes the disabled look without the disabled semantics: the muted surface and text, a default
 * cursor, no hover border, a 1px neutral focus ring, a native `readonly` attribute (or `aria-readonly` on a trigger),
 * focus, and a selectable value. Every case mounts a normal control beside a read-only one, so the read-only look is
 * read as a difference rather than a constant.
 */

// Forced colours replace every fill and border with a system colour by design; structure, focus and cursor still apply.
const isForcedColors = matchMedia('(forced-colors: active)').matches;

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** Distinct resting and hover borders, so a hover emphasis is a visible difference in the default theme. */
const Theme = '--color-input: rgb(0, 0, 255); --color-border-strong: rgb(255, 0, 0); width: 360px; padding: 16px;';

/** Mounts a normal control and a read-only one, both through their surrounding `Field`, in one container. */
async function mountPair(make: () => VNode, className = ''): Promise<HTMLElement> {
  const host = defineComponent({
    render: () =>
      h('div', { class: className, style: Theme }, [
        h(Field, { label: 'Normal' }, () => make()),
        h(Field, { label: 'Read only', isReadOnly: true }, () => make()),
      ]),
  });
  wrapper = mount(host, { attachTo: document.body });
  await nextTick();
  await nextTick();
  return wrapper.element as HTMLElement;
}

/** Resolves a token to the colour the engine computes for it, in the container's theme. */
function tokenColor(container: HTMLElement, property: string, token: string): string {
  const probe = document.createElement('span');
  probe.style.setProperty(property, `var(${token})`);
  container.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return value;
}

/** Presses Tab from the top of the page until the element is focused, so `:focus-visible` sees keyboard modality. */
async function tabTo(element: HTMLElement): Promise<void> {
  // A click leaves the sequential-focus starting point where it landed (and WebKit does not focus a clicked button).
  document.body.tabIndex = -1;
  document.body.focus();
  document.body.removeAttribute('tabindex');
  for (let press = 0; press < 12 && document.activeElement !== element; press++) await nativeTab();
  expect(document.activeElement).toBe(element);
}

const bg = (element: Element): string => getComputedStyle(element).backgroundColor;
const textColor = (element: Element): string => getComputedStyle(element).color;
const cursorOf = (element: Element): string => getComputedStyle(element).cursor;

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
      wrapper?.unmount();
      document.body.innerHTML = '';
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
    wrapper = mount(
      defineComponent({
        render: () =>
          h(Field, { label: 'Name', isReadOnly: true }, () => [
            h(TextInput, { id: 'own', isReadOnly: false }),
            h(TextInput, { id: 'inherited' }),
          ]),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(document.querySelector('#own')!.hasAttribute('readonly')).toBe(false);
    expect(document.querySelector('#inherited')!.hasAttribute('readonly')).toBe(true);
  });

  it('keeps the invalid border while read-only', async () => {
    wrapper = mount(
      defineComponent({
        render: () => h('div', { style: Theme }, [h(TextInput, { isReadOnly: true, state: 'invalid' })]),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const input = document.querySelector('input')!;
    await userEvent.hover(input);
    expect(input.getAttribute('readonly')).not.toBeNull();
    if (!isForcedColors) {
      expect(getComputedStyle(input).borderTopColor).not.toBe('rgb(0, 0, 255)');
      expect(getComputedStyle(input).borderTopColor).not.toBe('rgb(255, 0, 0)');
    }
  });

  it.skipIf(isForcedColors)('leaves a disabled input on the muted surface it always had', async () => {
    wrapper = mount(
      defineComponent({ render: () => h('div', { style: Theme }, [h(TextInput, { isDisabled: true })]) }),
      { attachTo: document.body },
    );
    await nextTick();
    const root = wrapper.element as HTMLElement;
    expect(bg(root.querySelector('input')!)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(cursorOf(root.querySelector('input')!)).toBe('not-allowed');
  });

  it.skipIf(isForcedColors)('keeps the focus ring off when the caller turned it off', async () => {
    wrapper = mount(
      defineComponent({ render: () => h('div', { style: Theme }, [h(TextInput, { isReadOnly: true, ring: 'none' })]) }),
      { attachTo: document.body },
    );
    await nextTick();
    const input = document.querySelector('input')!;
    await tabTo(input);
    expect(getComputedStyle(input).boxShadow).not.toMatch(/0px 0px 0px [1-9]/);
  });
});

const Triggers: Record<string, { make: () => VNode; opens: string }> = {
  SelectPicker: {
    make: () =>
      h(SelectPicker as Component, { defaultValue: 'a' }, () => [
        h(SelectPickerTrigger, { 'aria-label': 'Kind' }, () => h(SelectPickerValue)),
        h(SelectPickerContent, null, () => h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'All' })),
      ]),
    opens: '[role=listbox]',
  },
  MultiSelectPicker: {
    make: () =>
      h(MultiSelectPicker as Component, { defaultValue: ['a'] }, () => [
        h(MultiSelectPickerTrigger, { 'aria-label': 'Kinds' }),
        h(MultiSelectPickerContent, null, () => h(MultiSelectPickerItem, { value: 'a', label: 'All' })),
      ]),
    opens: '[role=listbox]',
  },
  DatePicker: {
    make: () => h(DatePicker, { 'aria-label': 'Day', defaultValue: Temporal.PlainDate.from('2026-10-21') }),
    opens: '[role=dialog]',
  },
  DateRangePicker: { make: () => h(DateRangePicker, { 'aria-label': 'Days' }), opens: '[role=dialog]' },
  TimePicker: { make: () => h(TimePicker, { 'aria-label': 'Time' }), opens: '[role=dialog]' },
  MonthPicker: { make: () => h(MonthPicker, { 'aria-label': 'Month' }), opens: '[role=dialog]' },
  YearPicker: { make: () => h(YearPicker, { 'aria-label': 'Year' }), opens: '[role=dialog]' },
  CascaderPicker: { make: () => h(CascaderPicker, { 'aria-label': 'Path', options }), opens: '[role=dialog]' },
  TreeSelectPicker: {
    make: () => h(TreeSelectPicker, { 'aria-label': 'Node', nodes: treeNodes }),
    opens: '[role=dialog]',
  },
};

describe.each(Object.entries(Triggers))('read-only %s trigger', (_name, { make, opens }) => {
  const pick = async (): Promise<{ normal: HTMLButtonElement; readOnly: HTMLButtonElement; root: HTMLElement }> => {
    const root = await mountPair(make);
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLButtonElement>('button[aria-haspopup]'));
    return { normal: normal!, readOnly: readOnly!, root };
  };
  const panelOpen = (): boolean => document.querySelector(opens) !== null;

  it('stays focusable and says read-only, not disabled', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.disabled).toBe(false);
    expect(readOnly.getAttribute('aria-readonly')).toBe('true');
    expect(normal.getAttribute('aria-readonly')).toBeNull();
    await tabTo(readOnly);
  });

  it('opens when normal, and neither opens nor changes when read-only', async () => {
    const { normal, readOnly } = await pick();
    await userEvent.click(normal);
    await expect.poll(panelOpen).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(panelOpen).toBe(false);

    await userEvent.click(readOnly);
    await nextTick();
    expect(panelOpen()).toBe(false);
    expect(readOnly.getAttribute('aria-expanded')).not.toBe('true');
    await tabTo(readOnly);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await nextTick();
    expect(panelOpen()).toBe(false);
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
