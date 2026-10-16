import {
  RelativeTime,
  LabelText,
  FieldHelperText,
  LegendText,
  ColorSwatchPreview,
  StepperGroup,
  StepperGroupList,
  StepperGroupStep,
  StepperGroupPanel,
  OnboardingChecklistCard,
  OnboardingChecklistCardTask,
  NotificationCenterGroup,
  NotificationItem,
  AccordionGroup,
  AccordionGroupContent,
  AccordionGroupItem,
  AccordionGroupTrigger,
  ActivityTimeline,
  ActivityItem,
  AnimatedNumberText,
  AnnotationBadge,
  AudioPlayer,
  AudioWaveformPreview,
  Avatar,
  AvatarGroup,
  Badge,
  BadgeOverlay,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Carousel,
  CarouselDot,
  CarouselDots,
  CarouselNext,
  CarouselPrev,
  CarouselSlide,
  CarouselSlides,
  CarouselViewport,
  CellsGlyph,
  ChatBubbleCard,
  CodeText,
  CollapsibleGroup,
  CollapsibleGroupContent,
  CollapsibleGroupTrigger,
  Comment,
  CommentThreadGroup,
  ConfettiOverlay,
  CountBadge,
  CountUpText,
  DataTable,
  DaySeparator,
  DescriptionGroup,
  DiffViewer,
  DotsGlyph,
  EmptyState,
  EventCalendarViewer,
  EyebrowText,
  FeatureCard,
  FrameGlyph,
  GanttTimeline,
  GradientText,
  Heading,
  HeatmapCalendarGrid,
  HighlightText,
  HorizontalBarsGlyph,
  ImagePreview,
  InfoRow,
  KbdText,
  KeyboardShortcutText,
  ListGroup,
  ListGroupItem,
  MarkText,
  MarqueeGroup,
  MessageGroup,
  MetaInlineText,
  MetricBadge,
  NotificationIndicator,
  PdfViewer,
  PricingCard,
  QuoteText,
  RadiusGlyph,
  ReactionBar,
  ScheduleView,
  ScrollRevealGroup,
  SectionHeading,
  SnippetText,
  Sparkline,
  StatCard,
  Status,
  StepCard,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableRow,
  TabsGroup,
  TabsGroupList,
  TabsGroupPanel,
  TabsGroupTab,
  Tag,
  Text,
  TruncatedText,
  CountdownText,
  ThreadView,
  Timeline,
  TimelineDescription,
  TimelineItem,
  TimelineTitle,
  TreeViewer,
  TreeViewerGroup,
  TreeViewerItem,
  TypewriterText,
  VerticalBarsGlyph,
  VideoPlayer,
  OverflowGroup,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
} from '../../../../../src/presentation/display';
import { h, type VNode } from 'vue';

const inKanban = (node: VNode): VNode => h(KanbanBoard, null, () => node);
const inKanbanColumn = (node: VNode): VNode =>
  inKanban(h(KanbanColumn, { columnKey: 'todo', title: 'To do' }, () => node));
import { Temporal } from 'temporal-polyfill';
import { smokeCase, type SmokeCase } from './Example';

/* `StepperGroupPanel` renders its slot only while the stepper's value matches its own, so the root
   is seeded with the value the cases below declare. `StepperGroupStep` additionally reads the
   roving-focus context that `StepperGroupList` owns. */
const inStepper = (node: VNode): VNode => h(StepperGroup, { defaultValue: 'one' }, { default: () => node });

const inStepperList = (node: VNode): VNode => inStepper(h(StepperGroupList, null, { default: () => node }));

/* Wrappers for the compound parts — each renders the part inside the root whose `provide` it
   injects, so the part is smoke-tested in the shape it actually ships in. */
const inChecklist = (node: VNode): VNode => h(OnboardingChecklistCard, null, () => node);

const inNotificationCenter = (node: VNode): VNode => h(NotificationCenterGroup, null, () => node);

/* One task is enough to exercise the whole GanttTimeline render path — the tier asks whether it renders
   at all, not whether the bars land in the right columns. */
const ganttTask = {
  id: 't1',
  label: 'Port the SDK',
  start: Temporal.PlainDate.from('2026-01-05'),
  end: Temporal.PlainDate.from('2026-01-09'),
};

/* Wrappers for the compound parts — each renders the part inside the root whose `provide` it
   injects, so the part is smoke-tested in the shape it actually ships in. */
const inCollapsible = (node: VNode): VNode => h(CollapsibleGroup, { defaultOpen: true }, () => node);

const inAccordion = (node: VNode): VNode => h(AccordionGroup, { defaultValue: 'item-1' }, () => node);

const inAccordionItem = (node: VNode): VNode => inAccordion(h(AccordionGroupItem, { value: 'item-1' }, () => node));

const inTabs = (node: VNode): VNode => h(TabsGroup, { defaultValue: 'tab-1' }, () => node);
const inTabsList = (node: VNode): VNode => inTabs(h(TabsGroupList, null, () => node));

const inTree = (node: VNode): VNode => h(TreeViewer, null, () => node);
/* TreeViewerGroup renders its children inside `Presence :is-present="isExpanded"`, so the branch has
   to start expanded for the slot to exist at all. */
const inExpandedTree = (node: VNode): VNode => h(TreeViewer, { defaultExpanded: ['group-1'] }, () => node);

const inCarousel = (node: VNode): VNode => h(Carousel, null, () => node);
const inCarouselViewport = (node: VNode): VNode => inCarousel(h(CarouselViewport, null, () => node));

/**
 * Every component `@wow-two-beta/fe/presentation/display` exports, as smoke cases.
 * Imported through the public barrel on purpose — a component missing from `index.ts` fails
 * here before a consumer finds it.
 */
export const displayExamples: readonly SmokeCase[] = [
  smokeCase('Heading', Heading, {}, { slot: true }),

  smokeCase('Text', Text, {}, { slot: true }),

  smokeCase('TruncatedText', TruncatedText, { lines: 2 }, { slot: true }),

  smokeCase('OverflowGroup', OverflowGroup, { items: ['vue', 'tailwind', 'pnpm'], max: 2 }, { slot: true }),

  smokeCase('KanbanBoard', KanbanBoard, {}, { slot: true }),

  smokeCase('KanbanColumn', KanbanColumn, { columnKey: 'todo', title: 'To do' }, { slot: true, wrap: inKanban }),

  smokeCase('KanbanCard', KanbanCard, { itemKey: 'card-1', index: 0 }, { slot: true, wrap: inKanbanColumn }),

  smokeCase('CountdownText', CountdownText, { to: 1_790_000_000_000, isPaused: true }),

  smokeCase('CodeText', CodeText, {}, { slot: true }),

  smokeCase('KbdText', KbdText, {}, { slot: true }),

  smokeCase('ImagePreview', ImagePreview, {}),

  smokeCase('Avatar', Avatar, {}),

  smokeCase('Badge', Badge, {}, { slot: true }),

  smokeCase('Tag', Tag, {}, { slot: true }),

  smokeCase('MarkText', MarkText, {}, { slot: true }),

  smokeCase('QuoteText', QuoteText, {}, { slot: true }),

  smokeCase('Card', Card, {}, { slot: true }),

  smokeCase('CardHeader', CardHeader, {}, { slot: true }),

  smokeCase('CardTitle', CardTitle, {}, { slot: true }),

  smokeCase('CardDescription', CardDescription, {}, { slot: true }),

  smokeCase('CardBody', CardBody, {}, { slot: true }),

  smokeCase('CardFooter', CardFooter, {}, { slot: true }),

  smokeCase('AvatarGroup', AvatarGroup, {}),

  smokeCase('EmptyState', EmptyState, { title: 'Nothing here' }),

  smokeCase('StatCard', StatCard, { label: 'Revenue', value: '1.2k' }),

  smokeCase('RelativeTime', RelativeTime, { value: Date.UTC(2026, 9, 12), now: Date.UTC(2026, 9, 15) }),

  smokeCase('SnippetText', SnippetText, { text: 'pnpm add @wow-two-beta/fe' }),

  smokeCase('NotificationIndicator', NotificationIndicator, {}),

  smokeCase('CountBadge', CountBadge, { value: 3 }),

  smokeCase('Status', Status, {}, { slot: true }),

  smokeCase('KeyboardShortcutText', KeyboardShortcutText, { keys: ['Meta', 'K'] }),

  smokeCase('DescriptionGroup', DescriptionGroup, { items: [{ label: 'Plan', value: 'Pro' }] }),

  smokeCase('InfoRow', InfoRow, {}),

  smokeCase('MetricBadge', MetricBadge, { label: 'CPU', value: '42%' }),

  smokeCase('EyebrowText', EyebrowText, {}, { slot: true }),

  smokeCase('MetaInlineText', MetaInlineText, {}, { slot: true }),

  smokeCase('BadgeOverlay', BadgeOverlay, {}, { slot: true }),

  smokeCase('SectionHeading', SectionHeading, {}),

  smokeCase('HighlightText', HighlightText, { text: 'hello world', query: 'world' }),

  smokeCase('CollapsibleGroup', CollapsibleGroup, {}, { slot: true }),

  smokeCase('CollapsibleGroupTrigger', CollapsibleGroupTrigger, {}, { slot: true, wrap: inCollapsible }),

  smokeCase('CollapsibleGroupContent', CollapsibleGroupContent, {}, { slot: true, wrap: inCollapsible }),

  smokeCase('AccordionGroup', AccordionGroup, {}, { slot: true }),

  smokeCase('AccordionGroupItem', AccordionGroupItem, { value: 'item-1' }, { slot: true, wrap: inAccordion }),

  smokeCase('AccordionGroupTrigger', AccordionGroupTrigger, {}, { slot: true, wrap: inAccordionItem }),

  smokeCase('AccordionGroupContent', AccordionGroupContent, {}, { slot: true, wrap: inAccordionItem }),

  smokeCase('TabsGroup', TabsGroup, {}, { slot: true }),

  smokeCase('TabsGroupList', TabsGroupList, {}, { slot: true, wrap: inTabs }),

  smokeCase('TabsGroupTab', TabsGroupTab, { value: 'tab-1' }, { slot: true, wrap: inTabsList }),

  smokeCase('TabsGroupPanel', TabsGroupPanel, { value: 'tab-1' }, { slot: true, wrap: inTabs }),

  smokeCase('ListGroup', ListGroup, {}, { slot: true }),

  smokeCase('ListGroupItem', ListGroupItem, {}, { slot: true }),

  smokeCase('Timeline', Timeline, {}),

  smokeCase('TimelineItem', TimelineItem, {}, { slot: true }),

  smokeCase('TimelineTitle', TimelineTitle, {}, { slot: true }),

  smokeCase('TimelineDescription', TimelineDescription, {}, { slot: true }),

  smokeCase('TreeViewer', TreeViewer, {}, { slot: true }),

  smokeCase(
    'TreeViewerGroup',
    TreeViewerGroup,
    { value: 'group-1', label: 'Group' },
    {
      slot: true,
      wrap: inExpandedTree,
    },
  ),

  smokeCase('TreeViewerItem', TreeViewerItem, { value: 'item-1' }, { slot: true, wrap: inTree }),

  smokeCase('Table', Table, {}, { slot: true }),

  smokeCase('TableHead', TableHead, {}, { slot: true }),

  smokeCase('TableBody', TableBody, {}, { slot: true }),

  smokeCase('TableFooter', TableFooter, {}, { slot: true }),

  smokeCase('TableRow', TableRow, {}, { slot: true }),

  smokeCase('TableHeaderCell', TableHeaderCell, {}, { slot: true }),

  smokeCase('TableCell', TableCell, {}, { slot: true }),

  smokeCase('TableCaption', TableCaption, {}, { slot: true }),

  smokeCase('DataTable', DataTable, { columns: [{ key: 'name', header: 'Name' }], data: [{ name: 'Ada' }] }),

  smokeCase('Carousel', Carousel, {}, { slot: true }),

  smokeCase('CarouselViewport', CarouselViewport, {}, { slot: true, wrap: inCarousel }),

  smokeCase('CarouselSlides', CarouselSlides, {}, { wrap: inCarouselViewport }),

  smokeCase('CarouselSlide', CarouselSlide, {}, { slot: true, wrap: inCarouselViewport }),

  smokeCase('CarouselPrev', CarouselPrev, {}, { slot: true, wrap: inCarousel }),

  smokeCase('CarouselNext', CarouselNext, {}, { slot: true, wrap: inCarousel }),

  smokeCase('CarouselDots', CarouselDots, {}, { wrap: inCarousel }),

  smokeCase('CarouselDot', CarouselDot, { slideIndex: 0 }, { wrap: inCarousel }),

  smokeCase('DiffViewer', DiffViewer, { left: 'one', right: 'two' }),

  smokeCase('Sparkline', Sparkline, { data: [1, 4, 2, 8] }),

  smokeCase('RadiusGlyph', RadiusGlyph, { extent: 0.5 }),

  smokeCase('FrameGlyph', FrameGlyph, { frameRx: 0.25, pupilRoundness: 0.5 }),

  smokeCase('DotsGlyph', DotsGlyph, {}),

  smokeCase('VerticalBarsGlyph', VerticalBarsGlyph, {}),

  smokeCase('HorizontalBarsGlyph', HorizontalBarsGlyph, {}),

  smokeCase('CellsGlyph', CellsGlyph, { cornerRx: 0.3 }),

  smokeCase('HeatmapCalendarGrid', HeatmapCalendarGrid, { values: new Map<Temporal.PlainDate, number>() }),

  smokeCase('AudioWaveformPreview', AudioWaveformPreview, { peaks: [0.2, 0.8, 0.4] }),

  smokeCase('AudioPlayer', AudioPlayer, { src: 'https://example.test/audio.mp3' }),

  smokeCase('VideoPlayer', VideoPlayer, { src: 'https://example.test/video.mp4' }),

  smokeCase('PdfViewer', PdfViewer, { src: 'https://example.test/doc.pdf' }),

  smokeCase('ScheduleView', ScheduleView, { resources: [{ id: 'r1', label: 'Room 1' }], bookings: [] }),

  smokeCase('GanttTimeline', GanttTimeline, { tasks: [ganttTask] }),

  smokeCase('EventCalendarViewer', EventCalendarViewer, { events: [] }),

  smokeCase('GradientText', GradientText, {}, { slot: true }),

  smokeCase('CountUpText', CountUpText, { to: 100 }),

  smokeCase('AnimatedNumberText', AnimatedNumberText, { value: 42 }),

  smokeCase('ScrollRevealGroup', ScrollRevealGroup, {}, { slot: true }),

  smokeCase('MarqueeGroup', MarqueeGroup, {}, { slot: true }),

  smokeCase('TypewriterText', TypewriterText, { text: 'hello' }),

  smokeCase('ConfettiOverlay', ConfettiOverlay, {}),

  smokeCase('AnnotationBadge', AnnotationBadge, {}, { slot: true }),

  smokeCase('ReactionBar', ReactionBar, { reactions: [{ key: 'up', emoji: '\u{1F44D}', count: 2 }] }),

  smokeCase('ChatBubbleCard', ChatBubbleCard, {}, { slot: true }),

  smokeCase('MessageGroup', MessageGroup, {}, { slot: true }),

  smokeCase('DaySeparator', DaySeparator, { label: 'Today' }),

  smokeCase('ThreadView', ThreadView, {}, { slot: true }),

  smokeCase('CommentThreadGroup', CommentThreadGroup, {}, { slot: true }),

  smokeCase('Comment', Comment, { author: 'Ada' }, { slot: true }),

  smokeCase('ActivityTimeline', ActivityTimeline, {}, { slot: true }),

  smokeCase('ActivityItem', ActivityItem, {}, { slot: true }),

  smokeCase('FeatureCard', FeatureCard, { title: 'Fast' }, { slot: true }),

  smokeCase('StepCard', StepCard, { step: 1, title: 'Install' }, { slot: true }),

  smokeCase('PricingCard', PricingCard, { name: 'Pro', price: '$9', features: ['Unlimited seats'] }, { slot: true }),

  smokeCase('LabelText', LabelText, {}, { slot: true }),

  smokeCase('FieldHelperText', FieldHelperText, {}, { slot: true }),

  smokeCase('LegendText', LegendText, {}, { slot: true }),

  smokeCase('ColorSwatchPreview', ColorSwatchPreview, {}),

  smokeCase('StepperGroup', StepperGroup, {}, { slot: true }),

  smokeCase('StepperGroupList', StepperGroupList, {}, { slot: true, wrap: inStepper }),

  smokeCase('StepperGroupStep', StepperGroupStep, { value: 'one' }, { slot: true, wrap: inStepperList }),

  smokeCase('StepperGroupPanel', StepperGroupPanel, { value: 'one' }, { slot: true, wrap: inStepper }),

  smokeCase('OnboardingChecklistCard', OnboardingChecklistCard, {}, { slot: true }),

  smokeCase('OnboardingChecklistCardTask', OnboardingChecklistCardTask, {}, { wrap: inChecklist }),

  smokeCase('NotificationCenterGroup', NotificationCenterGroup, {}, { slot: true }),

  smokeCase('NotificationItem', NotificationItem, {}, { wrap: inNotificationCenter }),
];
