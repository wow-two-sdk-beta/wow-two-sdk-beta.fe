import type { Result } from '../../results';
import type { ShareFailure } from '../Share';

/** The completed operation, carrying either its value or its typed failure. */
export type ShareSendOrCopyResult = Result<'shared' | 'copied', ShareFailure>;
