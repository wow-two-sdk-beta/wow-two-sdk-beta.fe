import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import {
  Avatar,
  AvatarGroup,
  Carousel,
  CarouselNext,
  CarouselSlide,
  CarouselSlides,
  CarouselViewport,
  HighlightText,
} from '@src/presentation/display';
import { SwipeActionsLayout } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];

async function settle(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function render(component: Component, props: Record<string, unknown> = {}, slots = {}): VueWrapper {
  const wrapper = mount(component, { props, slots, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

describe('HighlightText', () => {
  function marks(props: Record<string, unknown>): string[] {
    return render(HighlightText, props)
      .findAll('mark')
      .map((mark) => mark.text());
  }

  it('prefers the longest overlapping term', () => {
    expect(marks({ text: 'I write javascript and java', query: ['java', 'javascript'] })).toEqual([
      'javascript',
      'java',
    ]);
  });

  it('fences whole words in any script, not just ASCII', () => {
    expect(marks({ text: 'Кофе и кофейня', query: 'кофе', isWholeWord: true })).toEqual(['Кофе']);
    expect(marks({ text: 'café au lait, cafés', query: 'café', isWholeWord: true })).toEqual(['café']);
    expect(marks({ text: 'cat catalog', query: 'cat', isWholeWord: true })).toEqual(['cat']);
  });

  it('matches regex symbols literally and keeps the source casing', () => {
    expect(marks({ text: 'Use C++ or c++ (not C)', query: 'c++' })).toEqual(['C++', 'c++']);
    expect(
      render(HighlightText, { text: 'plain', query: ['', ''] })
        .find('mark')
        .exists(),
    ).toBe(false);
  });
});

describe('Avatar', () => {
  // The template opens with a comment, so in a development build the root is a fragment: read the span itself.
  it('names the initials fallback like the image it stands in for', () => {
    const avatar = render(Avatar, { name: 'Aziza Karimova' }).get('span');
    expect(avatar.attributes('role')).toBe('img');
    expect(avatar.attributes('aria-label')).toBe('Aziza Karimova');
    expect(avatar.text()).toBe('AK');
    expect(avatar.get('[aria-hidden=true]').text()).toBe('AK');
  });

  it('reads initials by code point and drops a decorative avatar from the tree', () => {
    expect(render(Avatar, { name: '𝓐lpha  Beta ' }).text()).toBe('𝓐B');
    const decorative = render(Avatar, { name: 'Timur', alt: '' }).get('span');
    expect(decorative.attributes('aria-hidden')).toBe('true');
    expect(decorative.attributes('role')).toBeUndefined();
  });

  it('names the group overflow chip by what it counts', () => {
    const group = render(
      AvatarGroup,
      { max: 2 },
      {
        default: () => ['Ada', 'Bo', 'Cy', 'Di'].map((name) => h(Avatar, { name })),
      },
    );
    const chip = group.findAll('[role=img]').at(-1)!;
    expect(chip.text()).toBe('+2');
    expect(chip.attributes('aria-label')).toBe('2 more');
  });
});

describe('SwipeActionsLayout', () => {
  function mountRow(): VueWrapper {
    return render(
      SwipeActionsLayout,
      { actionWidth: 80 },
      {
        default: () => h('a', { href: '#msg' }, 'Message from Ada'),
        right: () => [h('button', { type: 'button' }, 'Archive'), h('button', { type: 'button' }, 'Delete')],
      },
    );
  }

  function content(wrapper: VueWrapper): HTMLElement {
    return wrapper.get('a').element.parentElement!;
  }

  it('reaches the row before its actions and slides a focused action into view', async () => {
    const wrapper = mountRow();
    await settle();
    const focusables = [...document.querySelectorAll<HTMLElement>('a, button')].map((node) => node.textContent);
    expect(focusables).toEqual(['Message from Ada', 'Archive', 'Delete']);
    expect(wrapper.find('[aria-hidden]').exists()).toBe(false);
    wrapper.get('button').element.focus();
    await nextTick();
    expect(content(wrapper).style.transform).toBe('translateX(-160px)');
  });

  it('closes on Escape and when focus leaves the row', async () => {
    const wrapper = mountRow();
    await settle();
    const outside = document.createElement('button');
    document.body.append(outside);
    wrapper.get('button').element.focus();
    await nextTick();
    wrapper.get('button').element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    expect(content(wrapper).style.transform).toBe('translateX(0px)');
    wrapper.get('button').element.focus();
    await nextTick();
    outside.focus();
    await nextTick();
    expect(content(wrapper).style.transform).toBe('translateX(0px)');
  });
});

describe('Carousel slides', () => {
  it('takes off-screen slides out of the tab order as well as the tree', async () => {
    const wrapper = render(
      Carousel,
      { slidesCount: 3 },
      {
        default: () => [
          h(CarouselViewport, () =>
            h(CarouselSlides, () =>
              [1, 2, 3].map((n) => h(CarouselSlide, { key: n }, () => h('a', { href: `#${n}` }, `Slide ${n}`))),
            ),
          ),
          h(CarouselNext),
        ],
      },
    );
    await nextTick();
    const slides = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[aria-roledescription=slide]')];
    expect(slides().map((slide) => slide.hasAttribute('inert'))).toEqual([false, true, true]);
    await wrapper.get('button').trigger('click');
    await nextTick();
    expect(slides().map((slide) => slide.hasAttribute('inert'))).toEqual([true, false, true]);
  });
});
