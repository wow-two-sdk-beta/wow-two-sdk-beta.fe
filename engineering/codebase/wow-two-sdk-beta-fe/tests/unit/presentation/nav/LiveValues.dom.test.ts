import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Menubar from '@src/presentation/nav/menubar/Menubar.vue';
import MenubarMenu from '@src/presentation/nav/menubar/MenubarMenu.vue';
import MenubarTrigger from '@src/presentation/nav/menubar/MenubarTrigger.vue';
import NavigationMenu from '@src/presentation/nav/navigationMenu/NavigationMenu.vue';
import NavigationMenuItem from '@src/presentation/nav/navigationMenu/NavigationMenuItem.vue';
import { useNavigationMenuItemContext } from '@src/presentation/nav/navigationMenu/NavigationMenuContext';

describe('live navigation values', () => {
  it('uses renamed menu identities for keyboard movement', async () => {
    const first = ref('first');
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            Menubar,
            {},
            {
              default: () => [
                h(MenubarMenu, { value: first.value }, { default: () => h(MenubarTrigger, {}, () => 'First') }),
                h(MenubarMenu, { value: 'second' }, { default: () => h(MenubarTrigger, {}, () => 'Second') }),
              ],
            },
          ),
      }),
    );
    try {
      await nextTick();
      first.value = 'renamed';
      await nextTick();
      const [firstTrigger, secondTrigger] = wrapper.findAll('button');
      await firstTrigger!.trigger('click');
      expect(firstTrigger!.attributes('aria-expanded')).toBe('true');
      await firstTrigger!.trigger('keydown', { key: 'ArrowRight' });
      expect(secondTrigger!.attributes('aria-expanded')).toBe('true');
      await secondTrigger!.trigger('keydown', { key: 'ArrowLeft' });
      expect(firstTrigger!.attributes('aria-expanded')).toBe('true');
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps navigation item identity and open state aligned', async () => {
    const value = ref('first');
    const Probe = defineComponent({
      setup() {
        const item = useNavigationMenuItemContext();
        return () => h('output', `${item.value}:${item.open.value}`);
      },
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            NavigationMenu,
            { modelValue: value.value },
            {
              default: () => h(NavigationMenuItem, { value: value.value }, () => h(Probe)),
            },
          ),
      }),
    );
    try {
      expect(wrapper.find('output').text()).toBe('first:true');
      value.value = 'renamed';
      await nextTick();
      expect(wrapper.find('output').text()).toBe('renamed:true');
    } finally {
      wrapper.unmount();
    }
  });
});
