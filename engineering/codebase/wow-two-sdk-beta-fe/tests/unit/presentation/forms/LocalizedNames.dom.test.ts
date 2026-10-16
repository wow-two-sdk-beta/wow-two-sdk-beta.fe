import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, type Component } from 'vue';
import { Star } from 'lucide-vue-next';
import { LocaleProvider } from '@src/foundation/i18n';
import { IconPicker, JsonEditor, KnobInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

/** Mounts `node` under a locale provider carrying `messages`. */
function localized(messages: Record<string, string>, node: () => ReturnType<typeof h>): VueWrapper {
  const wrapper = mount(defineComponent({ render: () => h(LocaleProvider, { messages }, node) }));
  wrappers.push(wrapper);
  return wrapper;
}

describe('localized fallback names', () => {
  it('names an unlabelled knob from the locale instead of the component name', () => {
    const plain = localized({}, () => h(KnobInput as Component));
    expect(plain.get('[role=slider]').attributes('aria-label')).toBe('Knob');
    const german = localized({ 'KnobInput.label': 'Drehregler' }, () => h(KnobInput as Component));
    expect(german.get('[role=slider]').attributes('aria-label')).toBe('Drehregler');
  });

  it('names an unlabelled icon grid from the locale', () => {
    const icons = { star: Star };
    const plain = localized({}, () => h(IconPicker as Component, { icons }));
    expect(plain.get('[role=group]').attributes('aria-label')).toBe('Icons');
    const german = localized({ 'IconPicker.icons': 'Symbole' }, () => h(IconPicker as Component, { icons }));
    expect(german.get('[role=group]').attributes('aria-label')).toBe('Symbole');
  });

  it('names JSON tree toggles from the locale', () => {
    const german = localized(
      { 'JsonEditorTreeNode.collapse': 'Einklappen', 'JsonEditorTreeNode.expand': 'Ausklappen' },
      () => h(JsonEditor as Component, { defaultValue: { nested: { a: 1 } }, defaultMode: 'tree' }),
    );
    const labels = german.findAll('[role=treeitem] button').map((node) => node.attributes('aria-label'));
    expect(labels.some((label) => label === 'Einklappen' || label === 'Ausklappen')).toBe(true);
    expect(labels).not.toContain('Collapse');
    expect(labels).not.toContain('Expand');
  });
});
