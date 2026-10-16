export {
  type ClipboardFailure,
  type ClipboardWriteResult,
  type ClipboardWriteStatus,
  type ClipboardReadItem,
  type ClipboardReadTextResult,
  type ClipboardReadItemsResult,
  type ClipboardReadStatus,
  type ClipboardReadOptions,
  type ClipboardCopyOptions,
} from './ClipboardResult';

export { canCopy, canCopyItems, canReadClipboard, canLegacyCopy } from './ClipboardSupport';

export { copyText } from './CopyText';

export { copyItems, copyBlob, type ClipboardWriteItems } from './CopyItems';

export { legacyCopyText } from './LegacyCopy';

export { readText, readItems } from './ReadClipboard';

export { getPasteItems, type PasteItems } from './PasteItems';

export { usePasteHandler, type UsePasteHandlerOptions } from './hooks/UsePasteHandler';

export {
  useClipboardCopy,
  type ClipboardCopyControls,
  type ClipboardCopyState,
  type UseClipboardCopyOptions,
} from './hooks/UseClipboardCopy';

export { getClipboardPermission, type ClipboardPermissionMode } from './ClipboardPermission';

export * from './hooks/UseClipboard';

export { ClipboardFailureCode } from './ClipboardFailureCode';
