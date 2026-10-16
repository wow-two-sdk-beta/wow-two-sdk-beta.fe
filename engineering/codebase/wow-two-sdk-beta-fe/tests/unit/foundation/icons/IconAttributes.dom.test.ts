import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { Circle } from 'lucide-vue-next';
import { Icon, Spinner } from '@src/foundation/icons';

describe('icon native attributes', () => {
  it('merges native class overrides while preserving accessible names', () => {
    const wrapper = mount(Icon, { props: { icon: Circle }, attrs: { class: 'shrink', 'aria-label': 'Status' } });
    try {
      expect(wrapper.classes()).toContain('shrink');
      expect(wrapper.classes()).not.toContain('shrink-0');
      expect(wrapper.attributes('role')).toBe('img');
      expect(wrapper.attributes('aria-hidden')).toBeUndefined();
      expect(wrapper.attributes('aria-label')).toBe('Status');
    } finally {
      wrapper.unmount();
    }
  });
  it('lets native classes override spinner geometry and keeps reduced-motion styling', () => {
    const wrapper = mount(Spinner, { attrs: { class: 'size-8' } });
    try {
      expect(wrapper.get('svg').classes()).toContain('size-8');
      expect(wrapper.get('svg').classes()).not.toContain('size-[1em]');
      expect(wrapper.get('svg').classes()).toContain('motion-reduce:animate-none');
    } finally {
      wrapper.unmount();
    }
  });
});
