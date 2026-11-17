export {
  default as NotificationCenterButton,
  type NotificationCenterButtonProps,
} from './NotificationCenterButton.vue';
export { default as NotificationCenterGroup, type NotificationCenterGroupProps } from './NotificationCenterGroup.vue';
export {
  default as NotificationCenterGroupItem,
  type NotificationCenterGroupItemProps,
} from './NotificationCenterGroupItem.vue';

/** @deprecated Use `NotificationCenterGroupItem`; this alias is removed next release. */
export { default as NotificationItem } from './NotificationCenterGroupItem.vue';

/** @deprecated Use `NotificationCenterGroupItemProps`; this alias is removed next release. */
export type { NotificationCenterGroupItemProps as NotificationItemProps } from './NotificationCenterGroupItem.vue';
