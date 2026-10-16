import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import * as actions from '../../../src/presentation/actions';
import * as display from '../../../src/presentation/display';
import * as feedback from '../../../src/presentation/feedback';
import * as forms from '../../../src/presentation/forms';
import * as layout from '../../../src/presentation/layout';
import * as nav from '../../../src/presentation/nav';
import * as overlays from '../../../src/presentation/overlays';
import { actionsExamples } from '../../../apps/playground/src/gallery/fixtures/ActionsExamples';
import { displayExamples } from '../../../apps/playground/src/gallery/fixtures/DisplayExamples';
import { feedbackExamples } from '../../../apps/playground/src/gallery/fixtures/FeedbackExamples';
import { formsExamples } from '../../../apps/playground/src/gallery/fixtures/FormsExamples';
import { layoutExamples } from '../../../apps/playground/src/gallery/fixtures/LayoutExamples';
import { navExamples } from '../../../apps/playground/src/gallery/fixtures/NavExamples';
import { overlaysExamples } from '../../../apps/playground/src/gallery/fixtures/OverlaysExamples';
import Demo from '../../../apps/playground/src/gallery/Demo.vue';
import { diagnostics } from '../../../apps/playground/src/diagnostics';

describe('gallery fixture ownership', () => {
  it.each([
    ['actions', actions, actionsExamples],
    ['display', display, displayExamples],
    ['feedback', feedback, feedbackExamples],
    ['forms', forms, formsExamples],
    ['layout', layout, layoutExamples],
    ['nav', nav, navExamples],
    ['overlays', overlays, overlaysExamples],
  ] as const)('keeps every %s example available in its independently loaded family', (_, namespace, examples) => {
    expect(examples.length).toBeGreaterThan(0);
    expect(new Set(examples.map((example) => example.name)).size).toBe(examples.length);
    for (const example of examples) {
      expect((namespace as Record<string, unknown>)[example.name], example.name).toBe(example.component);
    }
  });

  it('records a caught demo failure while retaining its local error boundary', async () => {
    const broken = defineComponent({
      setup() {
        throw new Error('broken demo');
      },
    });
    const wrapper = mount(Demo, { props: { name: 'Broken example' }, slots: { default: () => h(broken) } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-demo-error]').text()).toContain('broken demo');
    expect(diagnostics.find((item) => item.component === 'Broken example')?.message).toBe('broken demo');
    wrapper.unmount();
  });
});
