import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';

import { useSpeechRecognition, type SpeechRecognitionControls } from '@src/foundation/speech';

afterEach(() => vi.unstubAllGlobals());

it('keeps the reactive control bag and forwards startup outcomes', () => {
  vi.stubGlobal('SpeechRecognition', undefined);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
  let controls!: SpeechRecognitionControls;
  const wrapper = mount(
    defineComponent({
      setup() {
        controls = useSpeechRecognition();
        return () => h('div');
      },
    }),
  );
  try {
    expect(controls.supported.value).toBe(false);
    expect(controls.start()).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(controls.listening.value).toBe(false);
    expect(controls.stop).toBeTypeOf('function');
    expect(controls.abort).toBeTypeOf('function');
    expect(controls.reset).toBeTypeOf('function');
  } finally {
    wrapper.unmount();
  }
});
