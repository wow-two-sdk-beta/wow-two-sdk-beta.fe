export { default as Modal, ModalRole, type ModalProps } from './Modal.vue';
export { default as ModalTrigger, type ModalTriggerProps } from './ModalTrigger.vue';
export { default as ModalContent, ModalPhoneLayout, ModalSize, type ModalContentProps } from './ModalContent.vue';

/*
 * Shared chrome re-exported under the Modal namespace. React attached these as
 * `Modal.Header` / `Modal.Title` / … via `Object.assign`; Vue has no component
 * statics, so the flat names are the whole API — which is what consumers
 * already import.
 */
export { default as ModalHeader } from '../OverlayHeader.vue';
export { default as ModalTitle } from '../OverlayTitle.vue';
export { default as ModalDescription } from '../OverlayDescription.vue';
export { default as ModalBody } from '../OverlayBody.vue';
export { default as ModalFooter } from '../OverlayFooter.vue';
export { default as ModalClose } from '../OverlayCloseButton.vue';

/**
 * @deprecated `Dialog*` was renamed to `Modal*` (overlay role → `*Modal`). These
 * aliases are kept for one release so consumers can migrate; they are removed next.
 */
export { default as Dialog, type ModalProps as DialogProps } from './Modal.vue';
export { default as DialogTrigger, type ModalTriggerProps as DialogTriggerProps } from './ModalTrigger.vue';
export { default as DialogContent, type ModalContentProps as DialogContentProps } from './ModalContent.vue';
export { default as DialogHeader } from '../OverlayHeader.vue';
export { default as DialogTitle } from '../OverlayTitle.vue';
export { default as DialogDescription } from '../OverlayDescription.vue';
export { default as DialogBody } from '../OverlayBody.vue';
export { default as DialogFooter } from '../OverlayFooter.vue';
export { default as DialogClose } from '../OverlayCloseButton.vue';
