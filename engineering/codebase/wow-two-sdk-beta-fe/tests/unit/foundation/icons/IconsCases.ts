import { Check } from 'lucide-vue-next';
import { Icon, Spinner } from '@src/foundation/icons';
import { smokeCase, type SmokeCase } from '../../../support/Smoke';

/**
 * `foundation/icons` — the two SFCs every group above renders through.
 *
 * `Icon` is handed a real lucide icon rather than a stub: it renders whatever adapter it is
 * given and passes attributes through to it, so a stub adapter would make the case assert the
 * stub instead of the wrapper.
 */
export const iconsCases: readonly SmokeCase[] = [
  smokeCase('Icon', Icon, { icon: Check }),
  smokeCase('Spinner', Spinner, {}),
];
