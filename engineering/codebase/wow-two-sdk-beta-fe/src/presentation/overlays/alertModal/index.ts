export { default as AlertModal, type AlertModalProps } from './AlertModal.vue';
export { default as AlertModalContent, type AlertModalContentProps } from './AlertModalContent.vue';
export { default as AlertModalAction, type AlertModalActionProps } from './AlertModalAction.vue';
export { default as AlertModalCancel, type AlertModalCancelProps } from './AlertModalCancel.vue';

/**
 * @deprecated `AlertDialog*` was renamed to `AlertModal*`. These aliases are kept
 * for one release so consumers can migrate; they are removed next.
 */
export { default as AlertDialog, type AlertModalProps as AlertDialogProps } from './AlertModal.vue';
export { default as AlertDialogContent } from './AlertModalContent.vue';
export {
  default as AlertDialogAction,
  type AlertModalActionProps as AlertDialogActionProps,
} from './AlertModalAction.vue';
export {
  default as AlertDialogCancel,
  type AlertModalCancelProps as AlertDialogCancelProps,
} from './AlertModalCancel.vue';
