import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { inputBaseVariants } from '@src/presentation/forms/InputStyles';
import RadioInput from '@src/presentation/forms/radioInput/RadioInput.vue';

describe('required control indicator token bindings', () => {
  it('keeps default, hover and focus input boundaries on verified indicator tokens', () => {
    const classes = inputBaseVariants({ state: 'default', ring: 'md' });
    expect(classes).toContain('border-input');
    expect(classes).toContain('hover:border-border-strong');
    expect(classes).toContain('focus-visible:ring-ring');
  });

  it('uses the contrasting destructive foreground for invalid input borders and focus', () => {
    const classes = inputBaseVariants({ state: 'invalid', ring: 'md' }).split(' ');
    expect(classes).toContain('border-destructive-soft-foreground');
    expect(classes).toContain('focus-visible:ring-destructive-soft-foreground');
    expect(classes).not.toContain('border-destructive');
    expect(classes).not.toContain('focus-visible:ring-destructive');
  });

  it('renders the selected radio border and dot using the contrasting primary foreground', () => {
    const wrapper = mount(RadioInput, { props: { modelValue: true } });
    const input = wrapper.get('input');
    expect((input.element as HTMLInputElement).checked).toBe(true);
    const visual = wrapper.get('[aria-hidden="true"]');
    expect(visual.classes()).toContain('border-input');
    expect(visual.classes()).toContain('peer-checked:border-primary-soft-foreground');
    expect(visual.classes()).toContain('peer-focus-visible:ring-ring');
    expect(visual.get('span').classes()).toContain('bg-primary-soft-foreground');
    wrapper.unmount();
  });
});
