import type { Result } from '../../results';
import type { ShareFailure } from './ShareFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type ShareSendResult = Result<void, ShareFailure>;
