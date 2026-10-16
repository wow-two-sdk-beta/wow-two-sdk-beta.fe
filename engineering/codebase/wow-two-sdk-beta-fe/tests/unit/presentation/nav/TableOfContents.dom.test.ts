import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { TableOfContents } from '@src/presentation/nav';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

const Items = [
  { id: 'intro', label: 'Intro' },
  { id: 'usage', label: 'Usage', depth: 1 },
];

function mountOutline(props: Record<string, unknown> = {}): VueWrapper {
  const article = document.createElement('article');
  article.innerHTML = '<h2 id="intro">Intro</h2><h3 id="usage">Usage</h3>';
  document.body.append(article);
  const wrapper = mount({ render: () => h(TableOfContents, { items: Items, ...props }) }, { attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function link(wrapper: VueWrapper, id: string): HTMLAnchorElement {
  return wrapper.get<HTMLAnchorElement>(`a[href="#${id}"]`).element;
}

describe('TableOfContents', () => {
  it('lists entries as hash links indented by depth', () => {
    const wrapper = mountOutline();
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Table of contents');
    expect(link(wrapper, 'usage').parentElement!.style.paddingLeft).toBe('12px');
  });

  it('leaves a plain link alone by default', async () => {
    const wrapper = mountOutline();
    await settle();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link(wrapper, 'usage').dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it('follows an entry in place, focusing its heading, when the URL is not its to change', async () => {
    const scroll = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scroll;
    onTestFinished(() => {
      Element.prototype.scrollIntoView = original;
    });
    const wrapper = mountOutline({ canUpdateHash: false });
    await settle();
    const before = location.hash;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link(wrapper, 'usage').dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(location.hash).toBe(before);
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
    expect(document.activeElement?.id).toBe('usage');
    expect(document.getElementById('usage')?.getAttribute('tabindex')).toBe('-1');
  });

  it('keeps a modified click, for a new tab or window, as a link', async () => {
    const wrapper = mountOutline({ canUpdateHash: false });
    await settle();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    link(wrapper, 'intro').dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });
});
