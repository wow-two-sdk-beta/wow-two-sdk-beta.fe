import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import {
  CollapsibleGroup,
  CollapsibleGroupContent,
  CollapsibleGroupTrigger,
  Tag,
  TreeViewer,
  TreeViewerGroup,
  TreeViewerItem,
} from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

async function press(key: string): Promise<void> {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
  await settle();
}

describe('TreeViewer', () => {
  function mountTree(props: Record<string, unknown> = {}): VueWrapper {
    const wrapper = mount(TreeViewer, {
      props,
      attrs: { 'aria-label': 'Files' },
      slots: {
        default: () => [
          h(TreeViewerGroup, { value: 'src', label: 'src' }, () => [
            h(TreeViewerItem, { value: 'index' }, () => 'index.ts'),
            h(TreeViewerItem, { value: 'app' }, () => 'App.vue'),
          ]),
          h(TreeViewerItem, { value: 'readme' }, () => 'README.md'),
        ],
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function row(label: string): HTMLElement {
    return [...document.querySelectorAll<HTMLElement>('[role=treeitem]')].find(
      (node) => node.textContent?.trim() === label,
    )!;
  }

  it('names the tree, levels its rows and expands a branch on click', async () => {
    const wrapper = mountTree();
    expect(wrapper.get('[role=tree]').attributes('aria-label')).toBe('Files');
    expect(row('src').getAttribute('aria-level')).toBe('1');
    expect(row('src').getAttribute('aria-expanded')).toBe('false');
    expect(row('index.ts')).toBeUndefined();
    row('src').click();
    await settle();
    expect(row('src').getAttribute('aria-expanded')).toBe('true');
    expect(row('index.ts').getAttribute('aria-level')).toBe('2');
    expect(wrapper.emitted('update:expanded')).toEqual([[['src']]]);
  });

  it('selects a leaf and reports its value', async () => {
    const wrapper = mountTree({ defaultExpanded: ['src'] });
    row('App.vue').click();
    await settle();
    expect(row('App.vue').getAttribute('aria-selected')).toBe('true');
    expect(wrapper.emitted('update:modelValue')).toEqual([['app']]);
  });

  it('opens and closes branches with the arrow keys', async () => {
    mountTree();
    row('src').focus();
    await settle();
    await press('ArrowRight');
    expect(row('src').getAttribute('aria-expanded')).toBe('true');
    await press('ArrowLeft');
    expect(row('src').getAttribute('aria-expanded')).toBe('false');
  });
});

describe('CollapsibleGroup', () => {
  it('wires the trigger to its pane and toggles it', async () => {
    const wrapper = mount(CollapsibleGroup, {
      slots: {
        default: () => [h(CollapsibleGroupTrigger, () => 'More'), h(CollapsibleGroupContent, () => 'Hidden text')],
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    const trigger = wrapper.get('button');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(wrapper.text()).not.toContain('Hidden text');
    await trigger.trigger('click');
    await settle();
    expect(trigger.attributes('aria-expanded')).toBe('true');
    const pane = document.getElementById(trigger.attributes('aria-controls')!);
    expect(pane?.textContent).toContain('Hidden text');
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
  });

  it('ignores the trigger while disabled', async () => {
    const wrapper = mount(CollapsibleGroup, {
      props: { isDisabled: true },
      slots: { default: () => [h(CollapsibleGroupTrigger, () => 'More'), h(CollapsibleGroupContent, () => 'x')] },
    });
    wrappers.push(wrapper);
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('update:open')).toBeUndefined();
  });
});

describe('Tag', () => {
  it('offers a named close button only when someone listens', async () => {
    const quiet = mount(Tag, { slots: { default: () => 'vue' } });
    wrappers.push(quiet);
    expect(quiet.find('button').exists()).toBe(false);
    const closable = mount(Tag, {
      props: { closeLabel: 'Remove vue' },
      attrs: { onClose: () => undefined },
      slots: { default: () => 'vue' },
    });
    wrappers.push(closable);
    const button = closable.get('button');
    expect(button.attributes('aria-label')).toBe('Remove vue');
    await button.trigger('click');
    expect(closable.emitted('close')).toHaveLength(1);
  });
});
