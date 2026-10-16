import { afterEach, describe, expect, it } from 'vitest';
import { h, type Component } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import {
  CheckboxInput,
  Field,
  RadioInput,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  SwitchInput,
  TextAreaInput,
  TextInput,
  ToggleGroup,
  ToggleInput,
} from '@src/presentation/forms';
import { TabsGroup, TabsGroupList, TabsGroupTab } from '@src/presentation/display';
import { expectRegionShapeParity, isForcedColors } from '../../../support/SkeletonParity';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('form fields keep their loaded box as skeletons', () => {
  it('keeps a field label, input, textarea and helper', async () => {
    wrapper = await expectRegionShapeParity(
      () => [
        h(Field, { class: 'field', label: 'Host name', helper: 'Lowercase, no spaces.' }, () =>
          h(TextInput, { class: 'input', modelValue: 'web-01' }),
        ),
        h(TextAreaInput, { class: 'notes', rows: 3, modelValue: 'Primary web node' }),
      ],
      ['.field', '.field label', '.input', '.notes'],
    );
    const input = wrapper.element.querySelector('.input')!;
    if (isForcedColors) expect(getComputedStyle(input).outlineStyle).toBe('solid');
    else expect(getComputedStyle(input).color).toBe('rgba(0, 0, 0, 0)');
  });

  it('keeps a select trigger', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(SelectPicker as Component, { defaultValue: 'a' }, () => [
          h(SelectPickerTrigger, { class: 'trigger', 'aria-label': 'Kind' }, () => h(SelectPickerValue)),
          h(SelectPickerContent, null, () => h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'All hosts' })),
        ]),
      ['.trigger'],
    );
  });

  it('keeps a switch track, a checkbox and a radio circle', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h('div', { class: 'flex items-center gap-3' }, [
          h(SwitchInput, { class: 'switch', modelValue: true, 'aria-label': 'On' }),
          h(CheckboxInput, { class: 'check', modelValue: true, 'aria-label': 'Pick' }),
          h(RadioInput, { class: 'radio', modelValue: true, 'aria-label': 'One' }),
        ]),
      ['.switch > span[aria-hidden]', '.check > span[aria-hidden]', '.radio > span[aria-hidden]'],
    );
  });
});

describe('segments keep their boxes', () => {
  it('keeps toggle segments on a segmented track', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(ToggleGroup as Component, { class: 'group', variant: 'segmented', modelValue: 'day' }, () => [
          h(ToggleInput, { class: 'day', value: 'day' }, () => 'Day'),
          h(ToggleInput, { class: 'week', value: 'week' }, () => 'Week'),
        ]),
      ['.group', '.day', '.week'],
    );
  });

  it('keeps tabs and their list', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(TabsGroup, { modelValue: 'a' }, () =>
          h(TabsGroupList, { class: 'list' }, () => [
            h(TabsGroupTab, { class: 'overview', value: 'a' }, () => 'Overview'),
            h(TabsGroupTab, { class: 'logs', value: 'b' }, () => 'Logs'),
          ]),
        ),
      ['.list', '.overview', '.logs'],
    );
  });
});
