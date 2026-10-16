import SpeedDialGroupRoot from './SpeedDialGroup.vue';
import SpeedDialGroupTrigger from './SpeedDialGroupTrigger.vue';
import SpeedDialGroupAction from './SpeedDialGroupAction.vue';

/**
 * The dial root, carrying its parts as properties so `<SpeedDialGroup.Trigger>` /
 * `<SpeedDialGroup.Action>` resolve in a template — the counterpart of the React
 * original's `Object.assign`. Each part is also exported on its own name.
 */
const SpeedDialGroup: typeof SpeedDialGroupRoot & {
  Trigger: typeof SpeedDialGroupTrigger;
  Action: typeof SpeedDialGroupAction;
} = Object.assign(SpeedDialGroupRoot, {
  Trigger: SpeedDialGroupTrigger,
  Action: SpeedDialGroupAction,
});

export { SpeedDialGroup, SpeedDialGroupAction, SpeedDialGroupTrigger };
export {
  SpeedDialGroupDirection,
  SpeedDialGroupKey,
  useSpeedDialContext,
  type SpeedDialGroupContextValue,
  type SpeedDialGroupPosition,
} from './SpeedDialGroupContext';
export type { SpeedDialGroupProps } from './SpeedDialGroup.vue';
export type { SpeedDialGroupTriggerProps } from './SpeedDialGroupTrigger.vue';
export type { SpeedDialGroupActionProps } from './SpeedDialGroupAction.vue';
export default SpeedDialGroup;
