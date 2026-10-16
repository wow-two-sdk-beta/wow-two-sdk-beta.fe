import type { Result } from '../../results';
import type { SpeechFailure } from './SpeechFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type SpeechSpeakResult = Result<void, SpeechFailure>;
