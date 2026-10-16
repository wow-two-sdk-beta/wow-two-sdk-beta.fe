import type { Result } from '../../results';
import type { MediaStreamFailure } from './MediaStreamFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type MediaStreamRequestResult = Result<MediaStream, MediaStreamFailure>;
