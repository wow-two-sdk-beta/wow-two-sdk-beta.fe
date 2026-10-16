import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { BackToTopButton } from '@src/presentation/actions';
import { Banner } from '@src/presentation/feedback';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Banner', () => {
  it('announces politely and offers a named dismiss only when someone listens', async () => {
    const quiet = mount(Banner, { props: { severity: 'warning', title: 'Maintenance', description: 'Tonight' } });
    wrappers.push(quiet);
    expect(quiet.get('[role=status]').text()).toContain('Maintenance');
    expect(quiet.find('button').exists()).toBe(false);

    const onClose = vi.fn();
    const closable = mount(Banner, { props: { title: 'Saved', onClose } });
    wrappers.push(closable);
    const dismiss = closable.get('button');
    expect(dismiss.attributes('aria-label')).toBe('Dismiss');
    await dismiss.trigger('click');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lets a consumer raise the urgency of the live region', () => {
    const urgent = mount(Banner, { props: { severity: 'danger', title: 'Payment failed' }, attrs: { role: 'alert' } });
    wrappers.push(urgent);
    expect(urgent.find('[role=alert]').exists()).toBe(true);
  });
});

describe('BackToTopButton', () => {
  function scrollContainer(top: number): HTMLDivElement {
    const container = document.createElement('div');
    document.body.append(container);
    Object.defineProperty(container, 'scrollTop', { value: top, writable: true, configurable: true });
    container.scrollTo = vi.fn() as never;
    return container;
  }

  it('appears past the threshold of its container and scrolls it back to the top', async () => {
    const container = scrollContainer(120);
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    const wrapper = mount(BackToTopButton, { props: { scrollContainer: container, threshold: 200 } });
    wrappers.push(wrapper);
    await nextTick();
    expect(wrapper.find('button').exists()).toBe(false);
    container.scrollTop = 480;
    container.dispatchEvent(new Event('scroll'));
    await nextTick();
    const button = wrapper.get('button');
    expect(button.attributes('aria-label')).toBe('Back to top');
    await button.trigger('click');
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('jumps without animation for reduced motion and yields to a prevented click', async () => {
    const container = scrollContainer(900);
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const wrapper = mount(BackToTopButton, { props: { scrollContainer: container } });
    wrappers.push(wrapper);
    await nextTick();
    await wrapper.get('button').trigger('click');
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });

    const guarded = mount(BackToTopButton, {
      props: { scrollContainer: container },
      attrs: { onClick: (event: MouseEvent) => event.preventDefault() },
    });
    wrappers.push(guarded);
    await nextTick();
    await guarded.get('button').trigger('click');
    expect(container.scrollTo).toHaveBeenCalledTimes(1);
  });
});
