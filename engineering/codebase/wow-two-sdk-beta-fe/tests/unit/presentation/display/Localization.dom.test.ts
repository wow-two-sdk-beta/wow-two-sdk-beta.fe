import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { LocaleProvider } from '@src/foundation/i18n';
import { Alert, PresenceIndicator, TypingIndicator } from '@src/presentation/feedback';
import { HeatmapCalendarGrid, OnboardingChecklistCard, OnboardingChecklistCardTask } from '@src/presentation/display';
import { Pagination } from '@src/presentation/nav';

const wrappers: Array<VueWrapper> = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

describe('component locale ownership', () => {
  it('updates default prop labels and template labels when provider messages change', async () => {
    const wrapper = mount(LocaleProvider, {
      props: { messages: { 'Alert.closeLabel': 'Fermer', 'Pagination.nextPage': 'Suivante' } },
      slots: { default: () => [h(Alert, { onClose: () => {} }, () => 'Notice'), h(Pagination, { page: 1, total: 3 })] },
    });
    wrappers.push(wrapper);
    expect(wrapper.find('[aria-label="Fermer"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Suivante"]').exists()).toBe(true);
    await wrapper.setProps({ messages: { 'Alert.closeLabel': 'Schließen', 'Pagination.nextPage': 'Weiter' } });
    expect(wrapper.find('[aria-label="Schließen"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Weiter"]').exists()).toBe(true);
  });

  it('keeps explicit labels ahead of provider defaults', () => {
    const wrapper = mount(LocaleProvider, {
      props: { messages: { 'Alert.closeLabel': 'Localized', 'Pagination.pagination': 'Pages' } },
      slots: {
        default: () => [
          h(Alert, { onClose: () => {}, closeLabel: 'Owned' }),
          h(Pagination, { page: 1, total: 2, 'aria-label': 'Product pages' }),
        ],
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.find('[aria-label="Owned"]').exists()).toBe(true);
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Product pages');
  });

  it('interpolates complete sentences with consumer-controlled word order', async () => {
    const wrapper = mount(LocaleProvider, {
      props: {
        messages: {
          'OnboardingChecklistCard.progress': '{total} tasks; {done} finished',
          'TypingIndicator.named': 'Typing: {name}',
          'PresenceIndicator.online': 'Available',
        },
      },
      slots: {
        default: () => [
          h(OnboardingChecklistCard, {}, () => [
            h(OnboardingChecklistCardTask, { label: 'One', isDone: true }),
            h(OnboardingChecklistCardTask, { label: 'Two' }),
          ]),
          h(TypingIndicator, { who: 'Sam' }),
          h(PresenceIndicator, { status: 'online' }),
        ],
      },
    });
    wrappers.push(wrapper);
    await nextTick();
    expect(wrapper.text()).toContain('2 tasks; 1 finished');
    expect(wrapper.find('[aria-label="Typing: Sam"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Available"]').exists()).toBe(true);
  });

  it('reformats calendar headings reactively without replacing explicit labels', async () => {
    const values = new Map([[Temporal.PlainDate.from('2024-01-01'), 1]]);
    const wrapper = mount(LocaleProvider, {
      props: { locale: 'de-DE' },
      slots: { default: () => h(HeatmapCalendarGrid, { values, year: 2024 }) },
    });
    wrappers.push(wrapper);
    expect(wrapper.text()).toContain('Mär');
    await wrapper.setProps({ locale: 'fr-FR' });
    expect(wrapper.text()).toContain('mars');
    const explicit = mount(LocaleProvider, {
      props: { locale: 'de-DE' },
      slots: {
        default: () =>
          h(HeatmapCalendarGrid, {
            values,
            year: 2024,
            monthLabels: Array.from({ length: 12 }, (_, i) => `Month-${i}`),
          }),
      },
    });
    wrappers.push(explicit);
    expect(explicit.text()).toContain('Month-2');
  });
});
