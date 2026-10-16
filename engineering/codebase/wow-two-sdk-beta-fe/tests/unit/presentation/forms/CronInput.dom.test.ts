import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { CronInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

function describeCron(value: string): { preview: string; isInvalid: boolean } {
  const wrapper = mount(CronInput, { props: { modelValue: value } });
  wrappers.push(wrapper);
  return {
    preview: wrapper.find('[aria-live]').text(),
    isInvalid: wrapper.get('input').attributes('aria-invalid') === 'true',
  };
}

describe('CronInput preview', () => {
  it.each([
    ['*/15 * * * *', 'Every 15 minutes'],
    ['* */2 * * *', 'Every 2 hours'],
    ['30 6 * * *', 'Every day at 06:30'],
    ['0 9 * * 1,3,5', 'At 09:00 on Monday, Wednesday, Friday'],
    ['0 9 * * 1-5', 'At 09:00 on Monday through Friday'],
    ['0 18 * * 7', 'At 18:00 on Sunday'],
    ['* * * * *', 'Every minute'],
    ['0 0 1 1 *', 'minute: 0 · hour: 0 · day: 1 · month: January'],
  ])('reads %s as "%s"', (value, preview) => {
    expect(describeCron(value)).toEqual({ preview, isInvalid: false });
  });

  it.each(['61 * * * *', '* 24 * * *', '* * 0 * *', '* * * 13 *', '* * * * 8', '5-1 * * * *', '*/0 * * * *'])(
    'flags the out-of-range %s',
    (value) => {
      expect(describeCron(value)).toEqual({ preview: 'Invalid cron expression.', isInvalid: true });
    },
  );

  it('asks for five fields, but leaves an empty field unflagged', () => {
    expect(describeCron('* * *').isInvalid).toBe(true);
    expect(describeCron('* * *').preview).toContain('5 fields');
    expect(describeCron('   ')).toEqual({ preview: '', isInvalid: false });
  });
});

describe('CronInput editing', () => {
  it('reports each edit and submits the raw expression', async () => {
    const wrapper = mount(CronInput, { props: { name: 'schedule' } });
    wrappers.push(wrapper);
    expect(wrapper.get<HTMLInputElement>('input[name=schedule]').element.value).toBe('*/5 * * * *');
    const input = wrapper.get<HTMLInputElement>('input[type=text]').element;
    input.value = '0 12 * * 1-5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([['0 12 * * 1-5']]);
    expect(wrapper.find('[aria-live]').text()).toBe('At 12:00 on Monday through Friday');
    expect(wrapper.get<HTMLInputElement>('input[name=schedule]').element.value).toBe('0 12 * * 1-5');
  });

  it('holds a composition until it ends', async () => {
    const wrapper = mount(CronInput);
    wrappers.push(wrapper);
    const input = wrapper.get<HTMLInputElement>('input').element;
    input.value = '0 1';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([['0 1']]);
  });
});
