import {
  FieldErrorCallout,
  CharacterCountCallout,
  PasswordStrengthCallout,
  Alert,
  AlertSimple,
  Banner,
  BannerSimple,
  Callout,
  DataRegion,
  FeedbackToastHost,
  InlineSpinner,
  LiveCursorIndicator,
  LoadingOverlay,
  LoadingState,
  ErrorBoundary,
  MeterBar,
  PresenceIndicator,
  ProgressBar,
  ProgressCircleIndicator,
  ProgressStepsIndicator,
  ReportAction,
  SkeletonState,
  SkeletonStateGroup,
  SkeletonStateSlot,
  SkeletonStateText,
  Spinner,
  SplashScreen,
  StatusIndicator,
  Toast,
  ToastHost,
  ToastSimple,
  TrendIndicator,
  TypingIndicator,
  UndoBar,
} from '../../../../../src/presentation/feedback';
import { smokeCase, type SmokeCase } from './Example';

/**
 * Every component `@wow-two-beta/ui-vue/presentation/feedback` exports, as smoke cases.
 * Imported through the public barrel on purpose — a component missing from `index.ts` fails
 * here before a consumer finds it.
 */
export const feedbackExamples: readonly SmokeCase[] = [
  smokeCase('Spinner', Spinner, {}),

  smokeCase('SkeletonState', SkeletonState, {}, { slot: true }),

  smokeCase('SkeletonStateSlot', SkeletonStateSlot, { isLoading: true }, { slot: true }),

  smokeCase('SkeletonStateGroup', SkeletonStateGroup, { isLoading: true }, { slot: true }),

  smokeCase('SkeletonStateText', SkeletonStateText, { lines: 2 }),

  smokeCase('DataRegion', DataRegion, { isFirstLoad: true }, { slot: true }),

  smokeCase('ProgressBar', ProgressBar, {}),

  smokeCase('ProgressCircleIndicator', ProgressCircleIndicator, {}),

  smokeCase('AlertSimple', AlertSimple, {}, { slot: true }),

  smokeCase('BannerSimple', BannerSimple, {}, { slot: true }),

  smokeCase('ToastSimple', ToastSimple, {}, { slot: true }),

  smokeCase('Alert', Alert, {}, { slot: true }),

  smokeCase('Banner', Banner, {}, { slot: true }),

  smokeCase('Toast', Toast, {}, { slot: true }),

  smokeCase('Callout', Callout, {}, { slot: true }),

  smokeCase('InlineSpinner', InlineSpinner, {}, { slot: true }),

  smokeCase('LoadingState', LoadingState, {}),

  smokeCase('ErrorBoundary', ErrorBoundary, {}, { slot: true }),

  smokeCase('ProgressStepsIndicator', ProgressStepsIndicator, { steps: ['Plan', 'Build'], current: 0 }),

  smokeCase('StatusIndicator', StatusIndicator, {}),

  smokeCase('MeterBar', MeterBar, { value: 50 }),

  smokeCase('TrendIndicator', TrendIndicator, { value: 5 }),

  smokeCase('ToastHost', ToastHost, {}),

  smokeCase('ReportAction', ReportAction, { send: () => Promise.resolve({ id: 'FB-1' }) }),

  smokeCase('FeedbackToastHost', FeedbackToastHost, {}),

  smokeCase('LoadingOverlay', LoadingOverlay, {}, { slot: true }),

  smokeCase('SplashScreen', SplashScreen, { value: 40 }, { slot: true }),

  smokeCase('UndoBar', UndoBar, { open: true }),

  smokeCase('TypingIndicator', TypingIndicator, {}),

  smokeCase('PresenceIndicator', PresenceIndicator, {}),

  smokeCase('LiveCursorIndicator', LiveCursorIndicator, { x: 10, y: 20 }),

  smokeCase('FieldErrorCallout', FieldErrorCallout, {}, { slot: true }),

  smokeCase('CharacterCountCallout', CharacterCountCallout, { value: 3, max: 10 }),

  smokeCase('PasswordStrengthCallout', PasswordStrengthCallout, { value: 'hunter2' }),
];
