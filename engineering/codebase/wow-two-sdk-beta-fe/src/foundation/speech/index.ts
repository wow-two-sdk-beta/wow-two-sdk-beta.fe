export { canSpeak, canRecognizeSpeech, getSpeechSupport, type SpeechSupport } from './SpeechSupport';

export { type SpeechFailure, type SpeechSpeakResult, type SpeakStatus } from './SpeechResult';

export { speak, type SpeakOptions, type SpeechHandle } from './Speak';

export { cancelSpeech, pauseSpeech, resumeSpeech, isSpeaking, isSpeechPaused } from './SpeechControls';

export {
  listVoices,
  listVoicesSync,
  findVoice,
  voicesForLang,
  DefaultVoicesTimeoutMs,
  type ListVoicesOptions,
} from './ListVoices';

export { useSpeechSynthesis, type SpeechSynthesisControls } from './hooks/UseSpeechSynthesis';

export {
  type SpeechRecognitionStatus,
  type SpeechRecognitionFailure,
  type SpeechTranscript,
} from './SpeechRecognitionResult';

export {
  createSpeechRecognizer,
  type SpeechRecognizer,
  type SpeechRecognizerOptions,
  type RecognizerStartResult,
  type RecognizerStartFailure,
} from './CreateSpeechRecognizer';

export {
  useSpeechRecognition,
  type SpeechRecognitionControls,
  type UseSpeechRecognitionOptions,
} from './hooks/UseSpeechRecognition';

export type {
  SpeechRecognitionLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionResultLike,
  SpeechRecognitionResultListLike,
  SpeechRecognitionAlternativeLike,
  SpeechRecognitionConstructor,
} from './SpeechRecognitionTypes';

export { SpeechFailureCode } from './enums/SpeechFailureCode';

export { RecognizerStartFailureCode } from './enums/RecognizerStartFailureCode';
