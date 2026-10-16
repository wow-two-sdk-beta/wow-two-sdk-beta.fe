import type { Result } from '../../results';
import type { ClipboardReadItem } from '../ClipboardResult';
import type { ClipboardFailure } from './ClipboardFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type ClipboardReadItemsResult = Result<ReadonlyArray<ClipboardReadItem>, ClipboardFailure>;
