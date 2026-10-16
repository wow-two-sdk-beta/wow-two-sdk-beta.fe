import type { Result } from '../../results';
import type { ClipboardFailure } from './ClipboardFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type ClipboardReadTextResult = Result<string, ClipboardFailure>;
