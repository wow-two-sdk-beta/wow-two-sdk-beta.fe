import { Temporal } from 'temporal-polyfill';
import {
  ControlGroupField,
  ToggleInput,
  ToggleGroup,
  OptionTilePicker,
  OptionTileGroupField,
  SegmentedPicker,
  DataGridEditor,
  NodeEditor,
  SortableGroup,
  SortableGroupItem,
  SortableGroupMoveButton,
  SortableGroupHandle,
  AddressEditor,
  CalendarPicker,
  ChatComposerInput,
  CheckboxInput,
  CheckboxField,
  CheckboxGroup,
  ChoiceCard,
  CodeEditor,
  ColorArea,
  ColorInput,
  ColorPicker,
  ColorSliderInput,
  ColorSwatchPicker,
  ColorWheelInput,
  ComboboxPicker,
  ComboboxPickerContent,
  ComboboxPickerEmpty,
  ComboboxPickerGroup,
  ComboboxPickerInput,
  ComboboxPickerItem,
  ComboboxPickerSeparator,
  CronInput,
  CurrencyInput,
  DateInput,
  DatePicker,
  DateRangePicker,
  DateTimeInput,
  EditableInput,
  EditableInputCancel,
  EditableInputInput,
  EditableInputPreview,
  EditableInputSubmit,
  EmailInput,
  EmojiPicker,
  EmojiPickerPopover,
  EmojiSizePicker,
  Field,
  FilePicker,
  FileUploadPicker,
  FontPicker,
  FormField,
  GradientPicker,
  IconPicker,
  JsonEditor,
  KeyboardShortcutPicker,
  KnobInput,
  LabeledField,
  ListboxPicker,
  ListboxPickerEmpty,
  ListboxPickerGroup,
  ListboxPickerItem,
  ListboxPickerSeparator,
  MarkdownEditor,
  MaskedInput,
  MultiSelectPicker,
  MultiSelectPickerContent,
  MultiSelectPickerItem,
  MultiSelectPickerTags,
  MultiSelectPickerTrigger,
  NumberInput,
  ExactNumberInput,
  PasswordInput,
  PercentInput,
  PhoneInput,
  PinInput,
  RadioInput,
  RadioField,
  RadioGroup,
  RangeCalendarPicker,
  RangeSliderInput,
  RatingPicker,
  ReactionPicker,
  RecurrenceEditor,
  SearchInput,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  SliderInput,
  SwitchInput,
  SwitchField,
  TagsInput,
  TelInput,
  TextAreaInput,
  TextInput,
  TimeInput,
  TimePicker,
  UrlInput,
  WizardForm,
  WizardFormFooter,
  WizardFormStep,
  WizardFormSteps,
  TimezonePicker,
  MonthPicker,
  YearPicker,
  DurationInput,
  SignatureInput,
  TransferPicker,
  TreeSelectPicker,
  CascaderPicker,
  ImageCropEditor,
  ImageEditor,
  MentionInput,
} from '../../../../../src/presentation/forms';
import { ExactNumber } from '../../../../../src/foundation/numbers';
const exactNumberExample = ExactNumber.parse('9223372036854775807.125');
import { h, type VNode } from 'vue';
import { memoryStorageBroker } from '../../../../../src/foundation/storage';
import { smokeCase, type SmokeCase } from './Example';

/* DataGridEditor is generic over its row. `PropsOf` instantiates that type parameter at its
   constraint, so the row arrives as `unknown` here and the narrowing has to be explicit — the
   generic cannot be recovered from a conditional type. The cast is confined to these two
   callbacks; everything else about the case is still fully checked. */
interface GridRow {
  id: string;
  name: string;
}

const gridRows: readonly GridRow[] = [{ id: 'r1', name: 'Ada' }];

const inSortable = (node: VNode): VNode => h(SortableGroup, null, () => node);

const inSortableItem = (node: VNode): VNode => inSortable(h(SortableGroupItem, { index: 0 }, () => node));

/* Wrappers for the compound parts — each renders the part inside the root whose `provide` it
   injects. Every root is opened through its UNCONTROLLED path (`defaultOpen` / `defaultEditing`
   / `defaultValue`), never by passing `open`, which doubles as the guard for the port's
   `boolean` cast bug: Vue coerces an absent `boolean` prop to `false` unless the declaration
   owns an explicit `undefined` default, and a root that got that wrong reads as
   controlled-and-closed, so every part below it would render nothing. */
const inListbox = (node: VNode): VNode => h(ListboxPicker, null, () => node);

/* SelectPicker declares a required `default` slot, so its children go in as a slots object — the
   bare-function children form does not satisfy that. Every root below declares one too. */
const inSelect = (node: VNode): VNode => h(SelectPicker, { defaultOpen: true }, { default: () => node });
const inSelectTrigger = (node: VNode): VNode => inSelect(h(SelectPickerTrigger, null, () => node));
const inSelectContent = (node: VNode): VNode => inSelect(h(SelectPickerContent, null, () => node));

/* MultiSelectPicker hosts a `Popover`, so its parts need the popover context as well as its own —
   wrapping is what supplies both. `MultiSelectPickerItem` renders a `ListboxPickerItem`, whose ListboxPicker
   lives inside `MultiSelectPickerContent`, so it nests one level deeper. */
const inMultiSelect = (node: VNode): VNode => h(MultiSelectPicker, { defaultOpen: true }, { default: () => node });
const inMultiSelectContent = (node: VNode): VNode =>
  inMultiSelect(h(MultiSelectPickerContent, null, { default: () => node }));

const inCombobox = (node: VNode): VNode => h(ComboboxPicker, { defaultOpen: true }, { default: () => node });
const inComboboxContent = (node: VNode): VNode => inCombobox(h(ComboboxPickerContent, null, { default: () => node }));

/* `WizardForm` seeds its active step from the first one that registers, so a lone `WizardFormStep`
   is the current step and renders its panel. */
const inWizard = (node: VNode): VNode => h(WizardForm, null, { default: () => node });

/* `EditableInput` swaps between two halves of its tree: the preview renders while idle, the input
   and the two commit buttons only while editing. Each part gets the root in the state that
   actually renders it. */
const inEditable = (node: VNode): VNode => h(EditableInput, null, { default: () => node });
const inEditingEditable = (node: VNode): VNode => h(EditableInput, { defaultEditing: true }, { default: () => node });

/**
 * Every component `@wow-two-beta/ui-vue/presentation/forms` exports, as smoke cases.
 * Imported through the public barrel on purpose — a component missing from `index.ts` fails
 * here before a consumer finds it.
 *
 * Cases follow current domain ownership so each gallery group can load independently.
 */
export const formsExamples: readonly SmokeCase[] = [
  smokeCase('TextInput', TextInput, {}),

  smokeCase('EmailInput', EmailInput, {}),

  smokeCase('TelInput', TelInput, {}),

  smokeCase('UrlInput', UrlInput, {}),

  smokeCase('NumberInput', NumberInput, {}),
  smokeCase('ExactNumberInput', ExactNumberInput, {
    defaultValue: exactNumberExample.ok ? exactNumberExample.value : null,
  }),

  smokeCase('PasswordInput', PasswordInput, {}),

  smokeCase('SearchInput', SearchInput, {}),

  smokeCase('TextAreaInput', TextAreaInput, {}),

  smokeCase('CheckboxInput', CheckboxInput, {}),

  smokeCase('RadioInput', RadioInput, {}),

  smokeCase('SwitchInput', SwitchInput, {}),

  smokeCase('SliderInput', SliderInput, {}),

  smokeCase('RangeSliderInput', RangeSliderInput, { defaultValue: [20, 80] }),

  smokeCase('RatingPicker', RatingPicker, { defaultValue: 3, step: 0.5 }),

  smokeCase('MonthPicker', MonthPicker, { defaultValue: Temporal.PlainYearMonth.from('2026-09') }),

  smokeCase('YearPicker', YearPicker, { defaultValue: 2026, max: 2030 }),

  smokeCase('DurationInput', DurationInput, { defaultValue: Temporal.Duration.from({ minutes: 90 }) }),

  smokeCase('SignatureInput', SignatureInput, { penWidth: 3 }),

  smokeCase('TransferPicker', TransferPicker, {
    options: [
      { key: 'read', label: 'Read' },
      { key: 'write', label: 'Write' },
    ],
    defaultValue: ['read'],
  }),

  smokeCase('TreeSelectPicker', TreeSelectPicker, {
    nodes: [{ value: 'docs', label: 'Docs', children: [{ value: 'guide', label: 'Guide' }] }],
    defaultValue: 'guide',
  }),

  smokeCase('CascaderPicker', CascaderPicker, {
    options: [{ value: 'uz', label: 'Uzbekistan', children: [{ value: 'tas', label: 'Tashkent' }] }],
    defaultValue: ['uz', 'tas'],
  }),

  smokeCase('ImageEditor', ImageEditor, {
    src: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="400" height="600" fill="#2563eb"/><rect x="400" width="400" height="600" fill="#eab308"/></svg>')}`,
    naturalWidth: 800,
    naturalHeight: 600,
  }),

  smokeCase('ImageCropEditor', ImageCropEditor, {
    src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    aspectRatio: 1,
  }),

  smokeCase('MentionInput', MentionInput, {
    options: [{ value: 'ada', label: 'Ada Lovelace' }],
    defaultValue: 'Thanks @Ada Lovelace',
  }),

  smokeCase('TimezonePicker', TimezonePicker, { defaultValue: 'Asia/Tashkent', timeZones: ['UTC', 'Asia/Tashkent'] }),

  smokeCase('Field', Field, {}, { slot: true }),

  smokeCase('FormField', FormField, {}, { slot: true }),

  smokeCase('CheckboxField', CheckboxField, {}),

  smokeCase('RadioField', RadioField, {}),

  smokeCase('SwitchField', SwitchField, {}),

  smokeCase('CheckboxGroup', CheckboxGroup, {}, { slot: true }),

  smokeCase('RadioGroup', RadioGroup, {}, { slot: true }),

  smokeCase('PinInput', PinInput, {}),

  smokeCase('MaskedInput', MaskedInput, { mask: '999-999' }),

  smokeCase('CurrencyInput', CurrencyInput, {}),

  smokeCase('PercentInput', PercentInput, {}),

  smokeCase('LabeledField', LabeledField, {}, { slot: true }),

  smokeCase('ChoiceCard', ChoiceCard, {}),

  smokeCase('FilePicker', FilePicker, {}),

  smokeCase('ListboxPicker', ListboxPicker, {}, { slot: true }),

  smokeCase('ListboxPickerItem', ListboxPickerItem, { value: 'one' }, { slot: true, wrap: inListbox }),

  smokeCase('ListboxPickerGroup', ListboxPickerGroup, {}, { slot: true, wrap: inListbox }),

  smokeCase('ListboxPickerSeparator', ListboxPickerSeparator, {}, { wrap: inListbox }),

  smokeCase('ListboxPickerEmpty', ListboxPickerEmpty, {}, { slot: true, wrap: inListbox }),

  smokeCase('SelectPicker', SelectPicker, {}, { slot: true }),

  smokeCase('SelectPickerTrigger', SelectPickerTrigger, {}, { slot: true, wrap: inSelect }),

  smokeCase('SelectPickerValue', SelectPickerValue, {}, { slot: true, wrap: inSelectTrigger }),

  smokeCase('SelectPickerContent', SelectPickerContent, {}, { slot: true, wrap: inSelect }),

  smokeCase(
    'SelectPickerItem',
    SelectPickerItem,
    { itemKey: 'one', label: 'One' },
    { slot: true, wrap: inSelectContent },
  ),

  smokeCase('MultiSelectPicker', MultiSelectPicker, {}, { slot: true }),

  smokeCase('MultiSelectPickerTrigger', MultiSelectPickerTrigger, {}, { slot: true, wrap: inMultiSelect }),

  // Its only slot is `placeholder`; the tags themselves come from the root's value.
  smokeCase('MultiSelectPickerTags', MultiSelectPickerTags, {}, { wrap: inMultiSelect }),

  smokeCase('MultiSelectPickerContent', MultiSelectPickerContent, {}, { slot: true, wrap: inMultiSelect }),

  smokeCase(
    'MultiSelectPickerItem',
    MultiSelectPickerItem,
    { value: 'one' },
    { slot: true, wrap: inMultiSelectContent },
  ),

  smokeCase('ComboboxPicker', ComboboxPicker, {}, { slot: true }),

  // Renders a bare `<input>` — no slot to probe.
  smokeCase('ComboboxPickerInput', ComboboxPickerInput, {}, { wrap: inCombobox }),

  smokeCase('ComboboxPickerContent', ComboboxPickerContent, {}, { slot: true, wrap: inCombobox }),

  smokeCase('ComboboxPickerItem', ComboboxPickerItem, { value: 'one' }, { slot: true, wrap: inComboboxContent }),

  smokeCase('ComboboxPickerGroup', ComboboxPickerGroup, {}, { slot: true, wrap: inComboboxContent }),

  smokeCase('ComboboxPickerSeparator', ComboboxPickerSeparator, {}, { wrap: inComboboxContent }),

  smokeCase('ComboboxPickerEmpty', ComboboxPickerEmpty, {}, { slot: true, wrap: inComboboxContent }),

  smokeCase('CalendarPicker', CalendarPicker, {}),

  smokeCase('DateInput', DateInput, {}),

  smokeCase('DateTimeInput', DateTimeInput, {}),

  smokeCase('TimeInput', TimeInput, {}),

  smokeCase('RangeCalendarPicker', RangeCalendarPicker, {}),

  smokeCase('DatePicker', DatePicker, {}),

  smokeCase('TimePicker', TimePicker, {}),

  smokeCase('DateRangePicker', DateRangePicker, {}),

  smokeCase('ColorInput', ColorInput, {}),

  smokeCase('ColorSliderInput', ColorSliderInput, {}),

  smokeCase('ColorArea', ColorArea, {}),

  smokeCase('ColorWheelInput', ColorWheelInput, {}),

  smokeCase('ColorSwatchPicker', ColorSwatchPicker, { colors: ['#ff0000', '#00ff00'] }),

  smokeCase('ColorPicker', ColorPicker, {}),

  smokeCase('TagsInput', TagsInput, {}),

  smokeCase('FileUploadPicker', FileUploadPicker, {}, { slot: true }),

  smokeCase('EditableInput', EditableInput, {}, { slot: true }),

  // The preview renders the committed value as text and takes no slot; it is also the half
  // that renders while idle, so it gets the root in its default state.
  smokeCase('EditableInputPreview', EditableInputPreview, {}, { wrap: inEditable }),

  smokeCase('EditableInputInput', EditableInputInput, {}, { wrap: inEditingEditable }),

  smokeCase('EditableInputSubmit', EditableInputSubmit, {}, { slot: true, wrap: inEditingEditable }),

  smokeCase('EditableInputCancel', EditableInputCancel, {}, { slot: true, wrap: inEditingEditable }),

  smokeCase('WizardForm', WizardForm, {}, { slot: true }),

  // The strip renders one tab per registered step; the footer renders its two buttons. Both
  // take only named slots.
  smokeCase('WizardFormSteps', WizardFormSteps, {}, { wrap: inWizard }),

  smokeCase('WizardFormStep', WizardFormStep, { id: 'one' }, { slot: true, wrap: inWizard }),

  smokeCase('WizardFormFooter', WizardFormFooter, {}, { wrap: inWizard }),

  smokeCase('CodeEditor', CodeEditor, {}),

  smokeCase('MarkdownEditor', MarkdownEditor, {}),

  smokeCase('JsonEditor', JsonEditor, {}),

  smokeCase('RecurrenceEditor', RecurrenceEditor, {}),

  smokeCase('KnobInput', KnobInput, {}),

  smokeCase('KeyboardShortcutPicker', KeyboardShortcutPicker, {}),

  smokeCase('IconPicker', IconPicker, {}),

  smokeCase('FontPicker', FontPicker, {}),

  smokeCase('CronInput', CronInput, {}),

  smokeCase('GradientPicker', GradientPicker, {}),

  smokeCase('AddressEditor', AddressEditor, {}),

  smokeCase('PhoneInput', PhoneInput, {}),

  smokeCase('EmojiPicker', EmojiPicker, { storage: memoryStorageBroker() }),

  smokeCase('EmojiPickerPopover', EmojiPickerPopover, { storage: memoryStorageBroker() }),

  smokeCase('EmojiSizePicker', EmojiSizePicker, { glyph: '\u{1F600}' }),

  smokeCase('ReactionPicker', ReactionPicker, {}),

  smokeCase('ChatComposerInput', ChatComposerInput, {}),

  smokeCase('ControlGroupField', ControlGroupField, { label: 'Density' }, { slot: true }),

  smokeCase('ToggleInput', ToggleInput, {}, { slot: true }),

  smokeCase('ToggleGroup', ToggleGroup, {}, { slot: true }),

  smokeCase('OptionTilePicker', OptionTilePicker, { selected: false, label: 'Option' }, { slot: true }),

  smokeCase('OptionTileGroupField', OptionTileGroupField, { label: 'Tiles' }, { slot: true }),

  smokeCase('SegmentedPicker', SegmentedPicker, {}, { slot: true }),

  smokeCase('DataGridEditor', DataGridEditor, {
    columns: [{ key: 'name', header: 'Name', accessor: (row) => (row as GridRow).name }],
    rows: gridRows,
    rowKey: (row) => (row as GridRow).id,
  }),

  smokeCase('NodeEditor', NodeEditor, { nodes: [{ id: 'n1', x: 0, y: 0 }] }),

  smokeCase('SortableGroup', SortableGroup, {}, { slot: true }),

  smokeCase('SortableGroupItem', SortableGroupItem, { index: 0 }, { slot: true, wrap: inSortable }),

  smokeCase('SortableGroupMoveButton', SortableGroupMoveButton, { direction: 'next' }, { wrap: inSortableItem }),

  smokeCase('SortableGroupHandle', SortableGroupHandle, {}, { slot: true, wrap: inSortableItem }),
];
