import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { RelativeTime } from '@src/presentation/display';
import { Modal, ModalContent, Tooltip } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
  document.body.innerHTML = '';
});

/* Production Vue throws on a ref without an owner where development only warns, so a recorded warning is the crash. */
function mountRecording(component: ReturnType<typeof defineComponent>): { wrapper: VueWrapper; warnings: string[] } {
  const warnings: string[] = [];
  const wrapper = mount(component, {
    attachTo: document.body,
    global: { config: { warnHandler: (message: string) => void warnings.push(message) } },
  });
  wrappers.push(wrapper);
  return { wrapper, warnings };
}

describe('Tooltip ref owner', () => {
  it('keeps its trigger ref owned through a dialog, a live tick, a hover and a route change', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    const dialogOpen = ref(false);
    const route = ref<'servers' | 'other'>('servers');

    const ServersPage = defineComponent({
      setup: () => () =>
        h('section', { 'data-page': 'servers' }, [
          h(RelativeTime, { value: now - 50_000, isLive: true }),
          h(Modal, { open: dialogOpen.value }, () => h(ModalContent, null, () => 'Edit server')),
        ]),
    });
    const OtherPage = defineComponent({ setup: () => () => h('section', { 'data-page': 'other' }, 'Other') });
    const App = defineComponent({
      setup: () => () => h(route.value === 'servers' ? ServersPage : OtherPage),
    });

    const { warnings } = mountRecording(App);
    dialogOpen.value = true;
    await vi.advanceTimersByTimeAsync(300);
    dialogOpen.value = false;
    await vi.advanceTimersByTimeAsync(300);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(document.querySelector('time')?.textContent).toBe('55 seconds ago');

    document.querySelector('time')!.dispatchEvent(new Event('pointerenter'));
    await vi.advanceTimersByTimeAsync(800);
    expect(document.querySelector('[role=tooltip]')).not.toBeNull();

    route.value = 'other';
    await nextTick();
    expect(document.querySelector('[data-page=servers]')).toBeNull();
    expect(document.querySelector('[data-page=other]')).not.toBeNull();
    expect(warnings.filter((message) => message.includes('ref owner'))).toEqual([]);
  });

  it('keeps a consumer ref on the trigger when the trigger re-renders', async () => {
    const label = ref('First');
    const consumerRef = ref<HTMLElement | null>(null);
    const Page = defineComponent({
      setup: () => () => h(Tooltip, { content: 'Hint' }, () => h('button', { ref: consumerRef }, label.value)),
    });
    const { warnings } = mountRecording(Page);
    label.value = 'Second';
    await nextTick();
    expect(consumerRef.value?.textContent).toBe('Second');
    expect(warnings.filter((message) => message.includes('ref owner'))).toEqual([]);
  });
});
