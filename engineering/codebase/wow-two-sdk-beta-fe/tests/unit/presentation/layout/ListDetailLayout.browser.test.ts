import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { page, userEvent } from 'vitest/browser';
import { ListDetailLayout } from '@src/presentation/layout';
import '@src/index.css';

const Items = Array.from({ length: 40 }, (_, index) => `Product ${index + 1}`);

let wrapper: VueWrapper | null = null;
const selected = ref<number | null>(null);

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  selected.value = null;
  document.body.innerHTML = '';
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/* The page scrolls inside a fixed-height region, as an app shell's main area does; the list has its own scroller. */
const Harness = defineComponent({
  setup: () => () =>
    h('div', { 'data-region': '', style: 'height: 500px; overflow-y: auto' }, [
      h('header', { style: 'height: 120px' }, 'Products'),
      h(
        ListDetailLayout,
        { isDetailOpen: selected.value !== null, onBack: () => (selected.value = null) },
        {
          list: () =>
            h('div', { 'data-list-scroller': '', style: 'max-height: 600px; overflow-y: auto' }, [
              ...Items.map((name, index) =>
                h(
                  'button',
                  {
                    type: 'button',
                    'aria-pressed': selected.value === index,
                    style: 'display: block; width: 100%; height: 40px',
                    onClick: () => (selected.value = index),
                  },
                  name,
                ),
              ),
            ]),
          detail: () =>
            selected.value === null
              ? h('p', null, 'Pick a product')
              : h('article', [h('h2', null, Items[selected.value]), h('p', { style: 'height: 1200px' }, 'Settings')]),
        },
      ),
    ]),
});

const region = (): HTMLElement => document.querySelector<HTMLElement>('[data-region]')!;
const listScroller = (): HTMLElement => document.querySelector<HTMLElement>('[data-list-scroller]')!;
const item = (name: string): HTMLElement =>
  [...document.querySelectorAll<HTMLElement>('button')].find((node) => node.textContent === name)!;
/* Rendered boxes, so a control hidden through its row reads as hidden too. */
const visible = (selector: string): boolean => (document.querySelector(selector)?.getClientRects().length ?? 0) > 0;

async function scrollTo(element: HTMLElement, top: number): Promise<void> {
  element.scrollTop = top;
  await expect.poll(() => Math.round(element.scrollTop)).toBe(top);
}

describe('below the breakpoint', () => {
  beforeAll(async () => {
    await page.viewport(375, 812);
  });

  it('swaps to the detail, focuses its heading, and returns to the same item and scroll', async () => {
    wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(visible('[data-list-detail-pane="list"]')).toBe(true);
    expect(visible('[data-list-detail-pane="detail"]')).toBe(false);
    await scrollTo(region(), 100);
    await scrollTo(listScroller(), 400);
    await userEvent.click(item('Product 12'));
    await expect.poll(() => visible('[data-list-detail-pane="detail"]')).toBe(true);
    expect(visible('[data-list-detail-pane="list"]')).toBe(false);
    await expect.poll(() => document.activeElement?.textContent).toBe('Product 12');
    expect(document.activeElement?.tagName).toBe('H2');
    expect(visible('[data-list-detail-back]')).toBe(true);
    await userEvent.click(document.querySelector<HTMLElement>('[data-list-detail-back]')!);
    await expect.poll(() => visible('[data-list-detail-pane="list"]')).toBe(true);
    await expect.poll(() => document.activeElement).toBe(item('Product 12'));
    expect(Math.round(listScroller().scrollTop)).toBe(400);
    expect(Math.round(region().scrollTop)).toBe(100);
  });

  it('brings the detail to the top when the list was scrolled past it', async () => {
    wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    await scrollTo(region(), 200);
    item('Product 3').focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement?.tagName).toBe('H2');
    const layoutTop = document.querySelector('[data-view]')!.getBoundingClientRect().top;
    expect(Math.round(layoutTop)).toBe(Math.round(region().getBoundingClientRect().top));
  });

  it('returns focus to the item tapped last, not the one focus stayed on', async () => {
    wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    /* The first return focuses Product 3. A touch tap in iOS Safari clicks without moving focus, so focus stays
       there; `click()` models that tap in every engine. */
    await userEvent.click(item('Product 3'));
    await expect.poll(() => document.activeElement?.tagName).toBe('H2');
    await userEvent.click(document.querySelector<HTMLElement>('[data-list-detail-back]')!);
    await expect.poll(() => document.activeElement).toBe(item('Product 3'));
    item('Product 7').click();
    await expect.poll(() => document.querySelector('h2')?.textContent).toBe('Product 7');
    await userEvent.click(document.querySelector<HTMLElement>('[data-list-detail-back]')!);
    await expect.poll(() => document.activeElement).toBe(item('Product 7'));
  });

  it('returns focus to the item activated from the keyboard', async () => {
    wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    item('Product 4').focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement?.tagName).toBe('H2');
    await userEvent.click(document.querySelector<HTMLElement>('[data-list-detail-back]')!);
    await expect.poll(() => document.activeElement).toBe(item('Product 4'));
  });

  it('names a keyed option the activator over a click just before it', async () => {
    const open = ref<number | null>(null);
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            ListDetailLayout,
            { isDetailOpen: open.value !== null, onBack: () => (open.value = null) },
            {
              list: () => [
                h('button', { type: 'button', 'data-filter': '' }, 'Filter'),
                ...Items.slice(0, 5).map((name, index) =>
                  h(
                    'div',
                    {
                      role: 'option',
                      tabindex: 0,
                      onKeydown: (event: KeyboardEvent) => {
                        if (event.key === 'Enter') open.value = index;
                      },
                    },
                    name,
                  ),
                ),
              ],
              detail: () => h('h2', null, open.value === null ? 'None' : Items[open.value]),
            },
          ),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    document.querySelector<HTMLElement>('[data-filter]')!.click();
    const option = [...document.querySelectorAll<HTMLElement>('[role=option]')][2]!;
    option.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement?.tagName).toBe('H2');
    await userEvent.click(document.querySelector<HTMLElement>('[data-list-detail-back]')!);
    await expect.poll(() => document.activeElement).toBe(option);
  });

  it('pads the back row through backClass', async () => {
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            ListDetailLayout,
            { isDetailOpen: true, backClass: 'px-4' },
            { list: () => h('p', null, 'List'), detail: () => h('h2', null, 'Detail') },
          ),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const root = document.querySelector('[data-view]')!.getBoundingClientRect();
    const control = document.querySelector('[data-list-detail-back]')!.getBoundingClientRect();
    expect(Math.round(control.left)).toBeGreaterThan(Math.round(root.left));
  });

  it('returns focus to the selected item when the detail opened from the route', async () => {
    selected.value = 5;
    wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(visible('[data-list-detail-pane="list"]')).toBe(false);
    /* A deep link does not take focus on load. */
    expect(document.activeElement).toBe(document.body);
    /* Leave through the route, keeping the selection marked as many lists do. */
    wrapper.unmount();
    const route = ref(true);
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            ListDetailLayout,
            { isDetailOpen: route.value },
            {
              list: () =>
                Items.slice(0, 8).map((name, index) =>
                  h('button', { type: 'button', 'aria-pressed': index === 5 }, name),
                ),
              detail: () => h('h2', null, 'Product 6'),
            },
          ),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    route.value = false;
    await expect.poll(() => document.activeElement?.textContent).toBe('Product 6');
    expect(document.activeElement?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('from the breakpoint up', () => {
  beforeAll(async () => {
    await page.viewport(1280, 800);
  });

  it('keeps both panes side by side without moving focus or showing the back control', async () => {
    wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(visible('[data-list-detail-pane="list"]')).toBe(true);
    expect(visible('[data-list-detail-pane="detail"]')).toBe(true);
    const list = document.querySelector('[data-list-detail-pane="list"]')!.getBoundingClientRect();
    const detail = document.querySelector('[data-list-detail-pane="detail"]')!.getBoundingClientRect();
    expect(Math.round(list.width)).toBe(320);
    expect(Math.round(detail.left)).toBeGreaterThanOrEqual(Math.round(list.right));
    await userEvent.click(item('Product 2'));
    await expect.poll(() => document.querySelector('h2')?.textContent).toBe('Product 2');
    expect(document.activeElement?.tagName).not.toBe('H2');
    expect(visible('[data-list-detail-back]')).toBe(false);
    expect(visible('[data-list-detail-pane="list"]')).toBe(true);
  });
});
