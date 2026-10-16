import { afterEach, describe, expect, it } from 'vitest';
import { h, type Component, type VNode } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { DataRegion } from '@src/presentation/feedback/dataRegion';
import {
  Avatar,
  Badge,
  Card,
  CardDescription,
  CardTitle,
  FieldHelperText,
  Heading,
  LabelText,
  SectionHeading,
  Text,
} from '@src/presentation/display';
import { Button } from '@src/presentation/actions';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

/** Mounts `content` inside a region on its first load. */
function inRegion(content: () => VNode | VNode[], isFirstLoad = true): VueWrapper {
  const wrapper = mount(DataRegion, { props: { isFirstLoad }, slots: { default: content } });
  wrappers.push(wrapper);
  return wrapper;
}

function standalone(component: Component, props: Record<string, unknown>, slot?: () => unknown): VueWrapper {
  const wrapper = mount(component, { props, slots: slot ? { default: slot } : {} });
  wrappers.push(wrapper);
  return wrapper;
}

describe('text components draw bars in their own element', () => {
  it.each([
    ['Text', Text, 'p'],
    ['Heading', Heading, 'h2'],
    ['LabelText', LabelText, 'label'],
    ['FieldHelperText', FieldHelperText, 'p'],
    ['CardTitle', CardTitle, 'h3'],
    ['CardDescription', CardDescription, 'p'],
  ] as const)('%s keeps its element and masks its copy inside a first load', (_, component, tag) => {
    const wrapper = inRegion(() => h(component as Component, { class: 'subject' }, () => 'Fleet health'));
    const root = wrapper.get('.subject');
    expect(root.element.tagName.toLowerCase()).toBe(tag);
    expect(root.attributes('data-skeleton')).toBe('true');
    const bar = root.get('[data-skeleton-line]');
    expect(bar.text()).toBe('Fleet health');
    expect(bar.attributes('aria-hidden')).toBe('true');
  });

  it('renders text as it is outside a region and after the first load', async () => {
    const wrapper = inRegion(() => h(Text, { class: 'subject' }, () => 'Ready'), false);
    expect(wrapper.find('[data-skeleton-line]').exists()).toBe(false);
    expect(wrapper.get('.subject').attributes('data-skeleton')).toBeUndefined();
    expect(
      standalone(Text, {}, () => 'Plain')
        .find('[data-skeleton-line]')
        .exists(),
    ).toBe(false);
  });

  it('lets an explicit flag override the region either way', () => {
    expect(
      standalone(Text, { isSkeleton: true }, () => 'Solo')
        .find('[data-skeleton-line]')
        .exists(),
    ).toBe(true);
    const wrapper = inRegion(() => h(Heading, { isSkeleton: false, class: 'subject' }, () => 'Live'));
    expect(wrapper.get('.subject').find('[data-skeleton-line]').exists()).toBe(false);
  });

  it('draws a fixed-width bar for a skeleton width and an empty value', () => {
    const fixed = standalone(Text, { isSkeleton: true, skeletonWidth: '12ch' }, () => 'Anything');
    const bar = fixed.get('[data-skeleton-line]').element as HTMLElement;
    expect(bar.style.paddingInlineEnd).toBe('12ch');
    expect(bar.textContent).toBe(' ');
    const empty = standalone(Heading, { isSkeleton: true }, () => '');
    expect((empty.get('[data-skeleton-line]').element as HTMLElement).style.paddingInlineEnd).toBe('8em');
  });

  it('hides the required asterisk without dropping its space', () => {
    const wrapper = inRegion(() => h(LabelText, { isRequired: true, class: 'subject' }, () => 'Name'));
    expect(wrapper.get('.subject span[aria-hidden="true"]:last-child').classes()).toContain('invisible');
  });
});

describe('boxed components keep their box and mask their content', () => {
  it('turns a badge into its own pill-shaped placeholder', () => {
    const wrapper = inRegion(() => h(Badge, { variant: 'success', class: 'subject' }, () => 'Online'));
    const badge = wrapper.get('.subject');
    expect(badge.attributes('data-skeleton')).toBe('true');
    expect(badge.attributes('aria-hidden')).toBe('true');
    expect(badge.classes()).toEqual(expect.arrayContaining(['rounded-full', 'bg-muted', 'text-transparent']));
    expect(badge.classes()).not.toContain('bg-success-soft');
    expect(badge.text()).toBe('Online');
  });

  it('gives an empty badge a short stand-in width', () => {
    const wrapper = standalone(Badge, { isSkeleton: true }, () => '');
    expect(wrapper.get('span > span').classes()).toContain('w-[4ch]');
  });

  it('follows the region with a button and keeps it out of action', () => {
    const wrapper = inRegion(() => h(Button, { class: 'subject', shape: 'square' }, () => 'Go'));
    const button = wrapper.get('.subject');
    expect(button.attributes('data-state')).toBe('skeleton');
    expect(button.attributes('tabindex')).toBe('-1');
    expect(button.classes()).toEqual(expect.arrayContaining(['data-[state=skeleton]:bg-muted!']));
  });

  it('keeps an explicit button state over the region', () => {
    const wrapper = inRegion(() => h(Button, { class: 'subject', isSkeleton: false }, () => 'Go'));
    expect(wrapper.get('.subject').attributes('data-state')).toBeUndefined();
  });

  it('draws an avatar as a tile of its own shape', () => {
    const wrapper = inRegion(() => [
      h(Avatar, { class: 'disc', name: 'Ada Lovelace' }),
      h(Avatar, { class: 'tile', name: 'Ada Lovelace', shape: 'square', isLoading: false }),
    ]);
    const disc = wrapper.get('.disc');
    expect(disc.attributes('data-loading')).toBe('true');
    expect(disc.classes()).toContain('rounded-full');
    expect(wrapper.get('.tile').attributes('data-loading')).toBeUndefined();
  });
});

describe('containers keep their chrome and switch what is inside', () => {
  it('keeps a card surface and draws its title and description as bars', () => {
    const wrapper = standalone(Card, { isSkeleton: true, class: 'card' }, () => [
      h(CardTitle, () => 'Hosts'),
      h(CardDescription, () => 'All regions'),
      h(Badge, { class: 'inner' }, () => '3'),
    ]);
    const card = wrapper.get('.card');
    expect(card.attributes('aria-busy')).toBe('true');
    expect(card.classes().some((name) => name.startsWith('rounded'))).toBe(true);
    expect(card.findAll('[data-skeleton-line]')).toHaveLength(2);
    expect(card.get('.inner').attributes('data-skeleton')).toBe('true');
  });

  it('switches a section heading title, description and actions with one flag', () => {
    const wrapper = mount(SectionHeading, {
      props: { title: 'Fleet', description: 'Every host', isSkeleton: true },
      slots: { actions: () => h(Button, { class: 'action' }, () => 'Add') },
    });
    wrappers.push(wrapper);
    expect(wrapper.attributes('data-skeleton')).toBe('true');
    expect(wrapper.findAll('[data-skeleton-line]')).toHaveLength(2);
    expect(wrapper.get('.action').attributes('data-state')).toBe('skeleton');
    expect(wrapper.classes()).toContain('border-b');
  });
});
