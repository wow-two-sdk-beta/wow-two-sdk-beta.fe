import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { DataRegion } from '@src/presentation/feedback/dataRegion';
import {
  SkeletonStateGroup,
  SkeletonStateSlot,
  provideSkeletonState,
  useSkeletonItems,
  useSkeletonState,
} from '@src/presentation/feedback/skeletonState';
import { SkeletonStateLine } from '@src/presentation/feedback/skeletonState/SkeletonStateLine';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

/** A stand-in for any SDK component: it reports the skeleton mode it resolved. */
const Probe = defineComponent({
  props: { isSkeleton: { type: Boolean, default: undefined } },
  setup(props) {
    const skeleton = useSkeletonState(() => props.isSkeleton);
    return () =>
      h('span', { class: ['probe', skeleton.boxClass.value], 'data-skeleton': skeleton.isSkeleton.value || undefined });
  },
});

function region(props: Record<string, unknown>, slots: Record<string, unknown> = {}) {
  const wrapper = mount(DataRegion, {
    props,
    slots: { default: () => [h(Probe), h(SkeletonStateSlot, { class: 'value' }, () => '42')], ...slots },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('DataRegion first load', () => {
  it('renders the real content in skeleton mode, inert and announced busy', () => {
    const wrapper = region({ isFirstLoad: true, loadingLabel: 'Loading hosts' });
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.attributes('data-state')).toBe('first-load');
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    expect(wrapper.get('[role="status"]').text()).toBe('Loading hosts');
    expect(wrapper.get('[data-region-content]').attributes()).toHaveProperty('inert');
    expect(wrapper.get('.probe').attributes('data-skeleton')).toBe('true');
    expect(wrapper.get('.probe').classes()).toContain('bg-muted');
    expect(wrapper.get('.value').attributes('data-loading')).toBe('true');
  });

  it('lets a skeleton slot replace content that cannot render without data', () => {
    const wrapper = region({ isFirstLoad: true }, { skeleton: () => h('p', { class: 'stand-in' }, 'shape') });
    expect(wrapper.find('.stand-in').exists()).toBe(true);
    expect(wrapper.find('.probe').exists()).toBe(false);
  });

  it('keeps an explicit component override over the region', () => {
    const wrapper = mount(DataRegion, {
      props: { isFirstLoad: true },
      slots: { default: () => h(Probe, { isSkeleton: false }) },
    });
    wrappers.push(wrapper);
    expect(wrapper.get('.probe').attributes('data-skeleton')).toBeUndefined();
  });

  it('switches to the content when the first load settles', async () => {
    const wrapper = region({ isFirstLoad: true });
    await wrapper.setProps({ isFirstLoad: false });
    expect(wrapper.attributes('aria-busy')).toBeUndefined();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.get('[data-region-content]').attributes()).not.toHaveProperty('inert');
    expect(wrapper.get('.probe').attributes('data-skeleton')).toBeUndefined();
    expect(wrapper.get('.value').attributes('data-loading')).toBeUndefined();
  });

  it('draws a nested region as a skeleton while its parent loads', () => {
    const wrapper = mount(DataRegion, {
      props: { isFirstLoad: true },
      slots: { default: () => h(DataRegion, { isEmpty: true, error: 'gone' }, () => h(Probe)) },
    });
    wrappers.push(wrapper);
    expect(wrapper.get('.probe').attributes('data-skeleton')).toBe('true');
    expect(wrapper.find('[data-region-error]').exists()).toBe(false);
  });

  it('keeps a refresh group inside a loading region painting', () => {
    const wrapper = mount(DataRegion, {
      props: { isFirstLoad: true },
      slots: {
        default: () =>
          h(SkeletonStateGroup, { isLoading: false }, () => [
            h(Probe),
            h(SkeletonStateSlot, { class: 'value' }, () => '1'),
          ]),
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.get('.probe').attributes('data-skeleton')).toBe('true');
    expect(wrapper.get('.value').attributes('data-loading')).toBe('true');
  });
});

describe('DataRegion settled states', () => {
  it('keeps the content through a refresh with no skeleton', () => {
    const wrapper = region({ isRefreshing: true });
    expect(wrapper.attributes('data-state')).toBe('ready');
    expect(wrapper.attributes('data-refreshing')).toBe('true');
    expect(wrapper.attributes('aria-busy')).toBeUndefined();
    expect(wrapper.get('.probe').attributes('data-skeleton')).toBeUndefined();
    expect(wrapper.get('.value').attributes('data-loading')).toBeUndefined();
  });

  it('replaces empty content with an error state and a retry', async () => {
    const onRetry = vi.fn();
    const wrapper = region({ error: { message: 'Hosts are unreachable' }, onRetry });
    expect(wrapper.attributes('data-state')).toBe('error');
    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain('Hosts are unreachable');
    expect(wrapper.find('.probe').exists()).toBe(false);
    await alert.get('button').trigger('click');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no retry button nobody can act on', () => {
    const wrapper = region({ error: 'Hosts are unreachable' });
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('shows a failure above data that is still on screen', () => {
    const wrapper = region({ error: 'Refresh failed', hasData: true, onRetry: () => undefined });
    expect(wrapper.attributes('data-state')).toBe('ready');
    expect(wrapper.get('[role="alert"]').text()).toContain('Refresh failed');
    expect(wrapper.find('.probe').exists()).toBe(true);
    expect(wrapper.get('[role="alert"]').element.compareDocumentPosition(wrapper.get('.probe').element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('lets the error and retry slots replace the defaults', () => {
    const wrapper = region(
      { error: 'Down' },
      {
        error: ({ message, retry }: { message: string; retry: () => void }) =>
          h('button', { class: 'custom', onClick: retry }, `Again: ${message}`),
      },
    );
    expect(wrapper.get('.custom').text()).toBe('Again: Down');
    expect(wrapper.emitted('retry')).toBeUndefined();
  });

  it('replaces loaded-but-empty content with the plain empty state', () => {
    const wrapper = region(
      { isEmpty: true, emptyTitle: 'No hosts', emptyDescription: 'Add one to start.' },
      { emptyActions: () => h('button', { class: 'add' }, 'Add host') },
    );
    expect(wrapper.attributes('data-state')).toBe('empty');
    expect(wrapper.text()).toContain('No hosts');
    expect(wrapper.text()).toContain('Add one to start.');
    expect(wrapper.find('.add').exists()).toBe(true);
    expect(wrapper.find('.probe').exists()).toBe(false);
  });

  it('puts the first load before a failure and an empty result', () => {
    const wrapper = region({ isFirstLoad: true, error: 'Down', isEmpty: true });
    expect(wrapper.attributes('data-state')).toBe('first-load');
    expect(wrapper.find('[data-region-error]').exists()).toBe(false);
  });
});

describe('skeleton composition helpers', () => {
  it('stands in placeholder items until the source loads, and keeps a loaded empty list', async () => {
    const source = ref<ReadonlyArray<{ id: string }> | undefined>(undefined);
    let items: ReturnType<typeof useSkeletonItems<{ id: string }>> | undefined;
    mount(
      defineComponent({
        setup() {
          items = useSkeletonItems(source, 4);
          return () => null;
        },
      }),
    ).unmount();
    expect(items!.value).toEqual([undefined, undefined, undefined, undefined]);
    source.value = [{ id: 'a' }];
    expect(items!.value).toEqual([{ id: 'a' }]);
    source.value = [];
    expect(items!.value).toEqual([]);
  });

  it('lets a container switch every component inside with one flag', () => {
    const Container = defineComponent({
      props: { isSkeleton: { type: Boolean, default: undefined } },
      setup(props, { slots }) {
        provideSkeletonState(useSkeletonState(() => props.isSkeleton));
        return () => h('div', slots.default?.());
      },
    });
    const wrapper = mount(Container, { props: { isSkeleton: true }, slots: { default: () => h(Probe) } });
    wrappers.push(wrapper);
    expect(wrapper.get('.probe').attributes('data-skeleton')).toBe('true');
  });

  it('draws text as a bar, an empty value as a default bar, and lets components draw themselves', async () => {
    const isSkeleton = ref(true);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h('div', [
            h(
              'p',
              { class: 'text' },
              h(SkeletonStateLine, { isSkeleton: isSkeleton.value }, () => 'Hello'),
            ),
            h(
              'p',
              { class: 'empty' },
              h(SkeletonStateLine, { isSkeleton: isSkeleton.value }, () => ''),
            ),
            h(
              'p',
              { class: 'fixed' },
              h(SkeletonStateLine, { isSkeleton: isSkeleton.value, width: '40%' }, () => 'Hi'),
            ),
            h(
              'p',
              { class: 'cell' },
              h(SkeletonStateLine, { isSkeleton: isSkeleton.value, isText: false }, () => h(Probe)),
            ),
          ]),
      }),
    );
    wrappers.push(wrapper);
    const bar = wrapper.get('.text [data-skeleton-line]');
    expect(bar.text()).toBe('Hello');
    expect(bar.attributes('aria-hidden')).toBe('true');
    expect(bar.classes()).toEqual(expect.arrayContaining(['bg-muted', 'text-transparent', 'box-decoration-clone']));
    expect((wrapper.get('.empty [data-skeleton-line]').element as HTMLElement).style.paddingInlineEnd).toBe('8em');
    expect((wrapper.get('.fixed [data-skeleton-line]').element as HTMLElement).style.paddingInlineEnd).toBe('40%');
    expect(wrapper.get('.fixed [data-skeleton-line]').text()).not.toContain('Hi');
    expect(wrapper.find('.cell [data-skeleton-line]').exists()).toBe(false);
    isSkeleton.value = false;
    await nextTick();
    expect(wrapper.find('[data-skeleton-line]').exists()).toBe(false);
    expect(wrapper.get('.text').text()).toBe('Hello');
  });
});
