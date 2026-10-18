import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { LocaleProvider } from '@src/foundation/i18n';
import ToastHost, { toastHost } from '@src/presentation/feedback/toastHost/ToastHost.vue';

const wrappers: VueWrapper[] = [];

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  toastHost.dismissAll();
  document.body.innerHTML = '';
});

const settle = async () => {
  await nextTick();
  await nextTick();
};

describe('toast stack landmark', () => {
  it('exposes the stack as a named region only while a toast shows', async () => {
    wrappers.push(mount(ToastHost, { props: { defaultDuration: 5000 }, attachTo: document.body }));
    await settle();
    expect(document.querySelector('[role="region"]')).toBeNull();

    toastHost.toast({ title: 'Saved' });
    await settle();
    const regions = document.querySelectorAll('[role="region"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]!.getAttribute('aria-label')).toBe('Notifications');
    expect(regions[0]!.textContent).toContain('Saved');
  });

  it('localizes the region name', async () => {
    wrappers.push(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages: { 'ToastHost.notifications': 'Bildirishnomalar' } }, () =>
              h(ToastHost, { defaultDuration: 5000 }),
            ),
        }),
        { attachTo: document.body },
      ),
    );
    toastHost.toast({ title: 'Saqlandi' });
    await settle();
    expect(document.querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('Bildirishnomalar');
  });
});
