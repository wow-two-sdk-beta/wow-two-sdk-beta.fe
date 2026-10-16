import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  LabelText,
  SectionHeading,
  Text,
} from '@src/presentation/display';
import { Button } from '@src/presentation/actions';
import { expectRegionShapeParity, isForcedColors } from '../../../support/SkeletonParity';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const Paragraph =
  'Every host in the fleet reports uptime, memory and disk once a minute, and a missed report raises an alert.';

describe('text keeps its loaded box as a skeleton', () => {
  it('keeps wrapped body text, a large heading and a label at their loaded size', async () => {
    wrapper = await expectRegionShapeParity(
      () => [
        h(Text, { class: 'body', size: 'sm' }, () => Paragraph),
        h(Heading, { class: 'title', size: 'xl' }, () => 'Fleet health'),
        h(LabelText, { class: 'label', isRequired: true }, () => 'Host name'),
      ],
      ['.body', '.title', '.label'],
    );
    const bars = wrapper.element.querySelector('.body [data-skeleton-line]')!;
    expect(bars.getClientRects().length).toBeGreaterThan(1);
  });

  it('keeps one line for a value that is still empty', async () => {
    wrapper = await expectRegionShapeParity(
      (isFirstLoad) => h(Text, { class: 'value' }, () => (isFirstLoad ? '' : 'web-01')),
      ['.value'],
    );
  });
});

describe('boxed components keep their size and radius', () => {
  it('keeps a badge, a button and an icon button', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h('div', { class: 'flex items-center gap-2' }, [
          h(Badge, { class: 'badge', variant: 'success' }, () => 'Online'),
          h(Button, { class: 'button' }, () => 'Add host'),
          h(Button, { class: 'icon', shape: 'circle', 'aria-label': 'Add' }, () =>
            h('svg', { class: 'size-4', viewBox: '0 0 16 16' }, h('path', { d: 'M8 2v12M2 8h12' })),
          ),
        ]),
      ['.badge', '.button', '.icon'],
    );
    const badge = wrapper.element.querySelector('.badge')!;
    if (isForcedColors) expect(getComputedStyle(badge).outlineStyle).toBe('solid');
    else expect(getComputedStyle(badge).color).toBe('rgba(0, 0, 0, 0)');
  });

  it('keeps an avatar disc and an avatar square', async () => {
    wrapper = await expectRegionShapeParity(
      () => [
        h(Avatar, { class: 'disc', name: 'Ada Lovelace', size: 'lg' }),
        h(Avatar, { class: 'square', name: 'Ada Lovelace', shape: 'square' }),
      ],
      ['.disc', '.square'],
    );
  });
});

describe('containers keep their chrome', () => {
  it('keeps a card and its title, description and body', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(Card, { class: 'card' }, () => [
          h(CardHeader, () => [
            h(CardTitle, { class: 'card-title' }, () => 'Hosts'),
            h(CardDescription, { class: 'card-description' }, () => 'Every region, refreshed each minute.'),
          ]),
          h(CardBody, () => h(Text, () => Paragraph)),
        ]),
      ['.card', '.card-title', '.card-description'],
    );
  });

  it('keeps a section heading with its actions', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(
          SectionHeading,
          { class: 'section', title: 'Fleet', description: 'Every host' },
          { actions: () => h(Button, { size: 'sm' }, () => 'Add') },
        ),
      ['.section'],
    );
  });
});
