import { describe, it } from 'vitest';
import { Check } from 'lucide-vue-next';
import { CopyButton, FabButton } from '@src/presentation/actions';
import { ToggleInput } from '@src/presentation/forms';
import { Icon } from '@src/foundation/icons';
import { assertAriaLabelReachesDom } from '../../../support/Contract';

/*
 * The port's camelization rule, as a standing guard.
 *
 * Vue camelizes declared prop keys, so a `'aria-label'` listed in `defineProps` arrives as
 * `props.ariaLabel`, is stripped out of `attrs`, and — unless the template happens to read the
 * camel spelling — renders nowhere, leaving the control with no accessible name. Every
 * component below deliberately keeps `aria-label` OUT of its declared props and reads it off
 * `attrs` instead; these assertions are what stop that from being quietly undone.
 */
describe('actions — aria-label passthrough', () => {
  it('FabButton carries its aria-label', () => {
    assertAriaLabelReachesDom('FabButton', FabButton, {}, { default: () => 'plus' });
  });

  it('CopyButton carries its aria-label', () => {
    assertAriaLabelReachesDom('CopyButton', CopyButton, { text: 'copied' });
  });

  it('ToggleInput carries its aria-label', () => {
    assertAriaLabelReachesDom('ToggleInput', ToggleInput, {}, { default: () => 'bold' });
  });
});

describe('foundation/icons — aria-label passthrough', () => {
  /*
   * Icon is the sharpest case: the label is what flips it from decorative (`aria-hidden`) to
   * semantic (`role="img"`), so losing it silently changes the a11y meaning rather than just
   * dropping an attribute.
   */
  it('Icon carries its aria-label', () => {
    // A real lucide icon, not a stub: `Icon` relies on attribute fallthrough onto whatever the
    // adapter renders, so an adapter that renders nothing would pass no element to carry the
    // label and the assertion would be testing the stub.
    assertAriaLabelReachesDom('Icon', Icon, { icon: Check });
  });
});
