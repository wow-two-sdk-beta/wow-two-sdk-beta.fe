<script setup lang="ts">
import {
  LabelText,
  LegendText,
  FieldHelperText,
  ColorSwatchPreview,
  StepperGroup,
  StepperGroupList,
  StepperGroupStep,
  StepperGroupPanel,
} from '@wow-two-beta/ui-vue/presentation/display';
import {
  FieldErrorCallout,
  CharacterCountCallout,
  PasswordStrengthCallout,
} from '@wow-two-beta/ui-vue/presentation/feedback';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { FieldsetLayout, InputAddonLayout, InputGroup } from '@wow-two-beta/ui-vue/presentation/layout';
import { computed, ref } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { Star } from 'lucide-vue-next';
import * as forms from '@wow-two-beta/ui-vue/presentation/forms';
import Demo from '../gallery/Demo.vue';
import Matrix from '../gallery/Matrix.vue';
import AutoGroup from '../gallery/AutoGroup.vue';
import { formsExamples } from '../gallery/fixtures/FormsExamples';

const {
  CodeEditor,
  NodeEditor,
  SortableGroup,
  SortableGroupItem,
  SortableGroupHandle,
  SortableGroupMoveButton,
  Field,
  TextInput,
  TextAreaInput,
  EmailInput,
  TelInput,
  UrlInput,
  NumberInput,
  PasswordInput,
  SearchInput,
  CheckboxInput,
  RadioInput,
  SwitchInput,
  SliderInput,
  CheckboxField,
  RadioField,
  SwitchField,
  CheckboxGroup,
  RadioGroup,
  PinInput,
  LabeledField,
  TagsInput,
  ListboxPicker,
  ListboxPickerItem,
  ListboxPickerGroup,
  ListboxPickerSeparator,
  SelectPicker,
  SelectPickerTrigger,
  SelectPickerValue,
  SelectPickerContent,
  SelectPickerItem,
  MultiSelectPicker,
  MultiSelectPickerTrigger,
  MultiSelectPickerContent,
  MultiSelectPickerItem,
  ComboboxPicker,
  ComboboxPickerInput,
  ComboboxPickerContent,
  ComboboxPickerItem,
  ComboboxPickerGroup,
  ComboboxPickerEmpty,
  ChoiceCard,
  MaskedInput,
  CalendarPicker,
  RangeCalendarPicker,
  DatePicker,
  DateRangePicker,
  DateInput,
  DateTimeInput,
  TimeInput,
  TimePicker,
  RecurrenceEditor,
  ColorSwatchPicker,
  KnobInput,
  RatingPicker,
  RangeSliderInput,
  WizardForm,
  WizardFormSteps,
  WizardFormStep,
  WizardFormFooter,
  EditableInput,
  EditableInputPreview,
  EditableInputInput,
  EditableInputSubmit,
  EditableInputCancel,
  TimezonePicker,
  MonthPicker,
  YearPicker,
  DurationInput,
  SignatureInput,
  TransferPicker,
  TreeSelectPicker,
  CascaderPicker,
  ImageCropEditor,
  MentionInput,
} = forms;

const covered = [
  'LabelText',
  'Field',
  'FieldsetLayout',
  'LegendText',
  'FieldHelperText',
  'FieldErrorCallout',
  'TextInput',
  'TextAreaInput',
  'EmailInput',
  'TelInput',
  'UrlInput',
  'NumberInput',
  'PasswordInput',
  'SearchInput',
  'CheckboxInput',
  'RadioInput',
  'SwitchInput',
  'SliderInput',
  'CheckboxField',
  'RadioField',
  'SwitchField',
  'CheckboxGroup',
  'RadioGroup',
  'PinInput',
  'CharacterCountCallout',
  'InputAddonLayout',
  'InputGroup',
  'LabeledField',
  'PasswordStrengthCallout',
  'TagsInput',
  'ListboxPicker',
  'ListboxPickerItem',
  'ListboxPickerGroup',
  'ListboxPickerSeparator',
  'SelectPicker',
  'SelectPickerTrigger',
  'SelectPickerValue',
  'SelectPickerContent',
  'SelectPickerItem',
  'MultiSelectPicker',
  'MultiSelectPickerTrigger',
  'MultiSelectPickerContent',
  'MultiSelectPickerItem',
  'ComboboxPicker',
  'ComboboxPickerInput',
  'ComboboxPickerContent',
  'ComboboxPickerItem',
  'ComboboxPickerGroup',
  'ComboboxPickerEmpty',
  'ChoiceCard',
  'MaskedInput',
  'CalendarPicker',
  'RangeCalendarPicker',
  'DatePicker',
  'DateRangePicker',
  'DateInput',
  'DateTimeInput',
  'TimeInput',
  'TimePicker',
  'RecurrenceEditor',
  'ColorSwatchPreview',
  'ColorSwatchPicker',
  'KnobInput',
  'RatingPicker',
  'TimezonePicker',
  'MonthPicker',
  'YearPicker',
  'DurationInput',
  'SignatureInput',
  'TransferPicker',
  'TreeSelectPicker',
  'CascaderPicker',
  'ImageCropEditor',
  'MentionInput',
  'RangeSliderInput',
  'StepperGroup',
  'StepperGroupList',
  'StepperGroupStep',
  'StepperGroupPanel',
  'WizardForm',
  'WizardFormSteps',
  'WizardFormStep',
  'WizardFormFooter',
  'EditableInput',
  'EditableInputPreview',
  'EditableInputInput',
  'EditableInputSubmit',
  'EditableInputCancel',
];

/** Nine options — enough to overflow a `max-visible-tags=3` trigger and show the `+N` block. */
const GREEK = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
  { value: 'd', label: 'Delta' },
  { value: 'e', label: 'Epsilon' },
  { value: 'f', label: 'Zeta' },
  { value: 'g', label: 'Eta' },
  { value: 'h', label: 'Theta' },
  { value: 'i', label: 'Iota' },
] as const;

const PLANS = [
  { value: 'free', label: 'Free', description: 'One project, community support.' },
  { value: 'pro', label: 'Pro', description: '$12/mo — unlimited projects.' },
  { value: 'team', label: 'Team', description: '$40/mo — shared workspaces + SSO.' },
] as const;

const FRUIT_GROUPS = [
  { label: 'Pome', items: ['Apple', 'Pear', 'Quince'] },
  { label: 'Berry', items: ['Banana', 'Cranberry', 'Grape'] },
  { label: 'Stone', items: ['Cherry', 'Peach', 'Plum'] },
] as const;

const INPUT_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
const CHECKBOX_VARIANTS = ['solid', 'soft', 'outline', 'ghost', 'glass', 'glass-surface'] as const;
const TONES = ['primary', 'neutral', 'danger', 'success', 'warning'] as const;
const BORDERS = ['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const;

const code = ref('const greeting = "Hello";');
const orderedSteps = ref(['Design', 'Build', 'Verify']);
const graphNodes = ref([
  { id: 'start', label: 'Start', x: 40, y: 70 },
  { id: 'finish', label: 'Finish', x: 260, y: 170 },
]);
function reorderSteps(from: number, to: number): void {
  const next = [...orderedSteps.value];
  const item = next.splice(from, 1)[0];
  if (item !== undefined) next.splice(to, 0, item);
  orderedSteps.value = next;
}
const text = ref('typed value');
const num = ref<number | null>(42);
const switched = ref(true);
const slider = ref(40);
const pin = ref('12');
const tags = ref(['vue', 'tailwind']);
const selected = ref<string | null>('b');
const multi = ref<string[]>(['a']);
const multiMany = ref<string[]>(GREEK.map((o) => o.value));
const combo = ref('');
const comboQuery = ref('');
const plan = ref('pro');
const masked = ref('');

/* Rows register their label only while the panel is mounted, so a preselected value shows its
   raw key ("a") until the first open. `get-option-label` is the closed-trigger resolver. */
function greekLabel(value: string): string | null {
  return GREEK.find((o) => o.value === value)?.label ?? null;
}

/* Filtering is the consumer's job — `ComboboxPicker` registers whatever rows are rendered. Groups
   left empty by the query drop out, so `ComboboxPickerEmpty` can gate on the group count. */
const comboGroups = computed(() => {
  const q = comboQuery.value.trim().toLowerCase();
  return FRUIT_GROUPS.map((g) => ({
    label: g.label,
    items: q ? g.items.filter((f) => f.toLowerCase().includes(q)) : [...g.items],
  })).filter((g) => g.items.length > 0);
});
const radioValue = ref('two');
const checkboxes = ref<string[]>(['a']);
const color = ref('#7c3aed');
const knob = ref(35);
const rating = ref<number | null>(3.5);
const timeZone = ref<string | null>('Asia/Tashkent');
const billingMonth = ref<Temporal.PlainYearMonth | null>(Temporal.PlainYearMonth.from('2026-09'));
const fiscalYear = ref<number | null>(null);
const meetingLength = ref<Temporal.Duration | null>(Temporal.Duration.from({ minutes: 45 }));
const signature = ref<string | null>(null);
/** The permissions the transfer demo moves between its lists. */
const PERMISSIONS = [
  { key: 'codes.read', label: 'Read codes', description: 'List and open QR codes' },
  { key: 'codes.write', label: 'Edit codes' },
  { key: 'codes.delete', label: 'Delete codes' },
  { key: 'stats.read', label: 'View statistics' },
  { key: 'billing.manage', label: 'Manage billing', isDisabled: true },
  { key: 'team.invite', label: 'Invite members' },
];
const granted = ref<string[]>(['codes.read']);
/** The folder tree the tree-select demo picks from. */
const FOLDERS = [
  {
    value: 'marketing',
    label: 'Marketing',
    children: [
      { value: 'marketing/print', label: 'Print', children: [{ value: 'marketing/print/flyers', label: 'Flyers' }] },
      { value: 'marketing/events', label: 'Events' },
    ],
  },
  { value: 'menus', label: 'Menus', children: [{ value: 'menus/summer', label: 'Summer menu' }] },
  { value: 'archive', label: 'Archive', isDisabled: true },
];
const folder = ref<string | null>('marketing/print/flyers');
/** The region tree the cascader demo walks. */
const REGIONS = [
  {
    value: 'uz',
    label: 'Uzbekistan',
    children: [
      {
        value: 'tashkent',
        label: 'Tashkent',
        children: [
          { value: 'yunusabad', label: 'Yunusabad' },
          { value: 'chilanzar', label: 'Chilanzar' },
        ],
      },
      { value: 'samarkand', label: 'Samarkand', children: [{ value: 'registan', label: 'Registan' }] },
    ],
  },
  { value: 'kz', label: 'Kazakhstan', children: [{ value: 'almaty', label: 'Almaty' }] },
  { value: 'other', label: 'Somewhere else' },
];
const region = ref<string[] | null>(null);
/** An inline SVG "photo", so the crop demo needs no network. */
const CROP_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">' +
    '<defs><linearGradient id="s" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs>' +
    '<rect width="960" height="640" fill="url(#s)"/><circle cx="700" cy="200" r="90" fill="#f97316"/>' +
    '<path d="M0 520 L240 300 L420 480 L600 260 L960 560 V640 H0Z" fill="#166534"/></svg>',
)}`;
const cropArea = ref<{ x: number; y: number; width: number; height: number } | null>(null);
const cropEditor = ref<{ toDataURL: () => string | null } | null>(null);
const croppedPreview = ref<string | null>(null);
/** The people the mention demo suggests. */
const TEAM = [
  { value: 'ada', label: 'Ada Lovelace', description: 'Design' },
  { value: 'alan', label: 'Alan Turing', description: 'Backend' },
  { value: 'grace', label: 'Grace Hopper', description: 'Compilers' },
  { value: 'linus', label: 'Linus Torvalds', description: 'Kernel' },
];
const comment = ref('');
const mentioned = ref<string[]>([]);
const priceRange = ref<readonly [number, number]>([20, 80]);
const committedRange = ref<readonly [number, number]>([20, 80]);
const editable = ref('click to edit');
const listboxValue = ref<unknown>('b');

/* The date/time family. Seeded rather than empty: the selected-day and in-range hover states
   are the whole reason these demos are curated, and an empty control shows neither. */
const day = ref<Temporal.PlainDate | null>(Temporal.Now.plainDateISO());
const range = ref<{ start: Temporal.PlainDate; end: Temporal.PlainDate } | null>({
  start: Temporal.Now.plainDateISO(),
  end: Temporal.Now.plainDateISO().add({ days: 4 }),
});
const clock = ref<Temporal.PlainTime | null>(Temporal.PlainTime.from('09:30'));
const stamp = ref<Temporal.PlainDateTime | null>(
  Temporal.Now.plainDateISO().toPlainDateTime(Temporal.PlainTime.from('09:30')),
);
</script>

<template>
  <div class="space-y-6">
    <h2 class="font-mono text-sm font-bold uppercase tracking-wide">forms</h2>

    <Demo name="TextInput" note="size × state — invalid must be visibly different">
      <Matrix row-axis="size" col-axis="state" :rows="INPUT_SIZES" :cols="['default', 'invalid']">
        <template #default="{ row, col }">
          <TextInput :size="row as never" :state="col as never" placeholder="placeholder" class="w-40" />
        </template>
      </Matrix>
    </Demo>

    <Demo name="TextInput" note="border × ring">
      <Matrix row-axis="border" col-axis="ring" :rows="BORDERS" :cols="['none', 'sm', 'md', 'lg']">
        <template #default="{ row, col }">
          <TextInput :border="row as never" :ring="col as never" class="w-28" placeholder="Aa" />
        </template>
      </Matrix>
    </Demo>

    <Demo name="CheckboxInput" note="variant × tone, checked">
      <Matrix row-axis="variant" col-axis="tone" :rows="CHECKBOX_VARIANTS" :cols="TONES">
        <template #default="{ row, col }">
          <CheckboxInput :variant="row as never" :tone="col as never" :default-value="true" />
        </template>
      </Matrix>
    </Demo>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-3">
      <Demo name="Text-ish inputs" note="every single-line input type, size md">
        <div class="space-y-2">
          <TextInput v-model="text" placeholder="TextInput" />
          <EmailInput placeholder="EmailInput" />
          <TelInput placeholder="TelInput" />
          <UrlInput placeholder="UrlInput" />
          <NumberInput v-model="num" />
          <PasswordInput placeholder="PasswordInput" has-toggle />
          <SearchInput placeholder="SearchInput" is-clearable />
          <TextAreaInput :rows="3" placeholder="TextAreaInput" />
        </div>
      </Demo>

      <Demo name="CheckboxInput / RadioInput / SwitchInput" note="size axis + disabled + indeterminate">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <CheckboxInput v-for="s in ['sm', 'md', 'lg']" :key="s" :size="s as never" default-value />
            <CheckboxInput is-indeterminate />
            <CheckboxInput is-disabled />
            <CheckboxInput default-value is-disabled />
          </div>
          <div class="flex items-center gap-3">
            <RadioInput v-for="s in ['sm', 'md', 'lg']" :key="s" :size="s as never" default-value />
            <RadioInput is-disabled />
          </div>
          <div class="flex items-center gap-3">
            <SwitchInput v-for="s in ['sm', 'md', 'lg']" :key="s" :size="s as never" default-value />
            <SwitchInput v-model="switched" />
            <SwitchInput is-disabled />
          </div>
        </div>
      </Demo>

      <Demo name="Field" note="label / helper / error / required">
        <div class="space-y-3">
          <Field label="Email" helper="We never share it." is-required>
            <TextInput placeholder="you@example.com" />
          </Field>
          <Field label="Email" error="That address is already taken.">
            <TextInput state="invalid" placeholder="you@example.com" />
          </Field>
          <Field label="Disabled" is-disabled>
            <TextInput is-disabled placeholder="disabled" />
          </Field>
        </div>
      </Demo>

      <Demo name="LabelText / FieldHelperText / FieldErrorCallout / FieldsetLayout / LegendText">
        <FieldsetLayout>
          <LegendText>Contact</LegendText>
          <LabelText is-required for="pg-name">Name</LabelText>
          <TextInput id="pg-name" placeholder="Ada" />
          <FieldHelperText>Your full legal name.</FieldHelperText>
          <FieldErrorCallout message="Name is required." />
        </FieldsetLayout>
      </Demo>

      <Demo name="SliderInput" note="size axis">
        <div class="space-y-3">
          <SliderInput v-for="s in ['sm', 'md', 'lg']" :key="s" v-model="slider" :size="s as never" />
          <p class="text-xs text-subtle-foreground">value = {{ slider }}</p>
        </div>
      </Demo>

      <Demo name="KnobInput" note="drag to rotate">
        <div class="flex items-center gap-4">
          <KnobInput v-model="knob" />
          <KnobInput :model-value="80" tone="success" />
          <KnobInput :model-value="15" tone="danger" />
          <span class="text-xs text-subtle-foreground">{{ knob }}</span>
        </div>
      </Demo>

      <Demo name="RatingPicker" note="half steps · press the picked mark again to clear · read-only below">
        <div class="flex flex-col items-start gap-2">
          <RatingPicker v-model="rating" :step="0.5" aria-label="Quality" />
          <RatingPicker :model-value="rating" is-read-only size="sm" tone="primary" />
          <p class="text-xs text-subtle-foreground">rating = {{ rating ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="MonthPicker" note="year page of months · Mar 2025 – Dec 2026 selectable · arrows cross years">
        <div class="flex flex-col items-start gap-2">
          <MonthPicker
            v-model="billingMonth"
            :min="Temporal.PlainYearMonth.from('2025-03')"
            :max="Temporal.PlainYearMonth.from('2026-12')"
            aria-label="Billing month"
            class="w-56"
          />
          <p class="text-xs text-subtle-foreground">month = {{ billingMonth?.toString() ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="YearPicker" note="decade page framed by its neighbours · PageUp/Down turn decades">
        <div class="flex flex-col items-start gap-2">
          <YearPicker v-model="fiscalYear" :max="2030" aria-label="Fiscal year" class="w-40" />
          <p class="text-xs text-subtle-foreground">year = {{ fiscalYear ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="DurationInput" note="type 90 in minutes, then leave the field · arrows step, Shift × 10">
        <div class="flex flex-col items-start gap-2">
          <DurationInput v-model="meetingLength" aria-label="Meeting length" class="w-40" />
          <DurationInput :units="['days', 'hours']" aria-label="Retention" class="w-40" />
          <p class="text-xs text-subtle-foreground">length = {{ meetingLength?.toString() ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="SignatureInput" note="draw with mouse, pen or finger · the SVG preview updates when a stroke ends">
        <div class="flex w-full flex-col gap-2">
          <SignatureInput v-model="signature" aria-label="Customer signature" />
          <img
            v-if="signature"
            :src="signature"
            alt="Signature preview"
            class="h-12 self-start rounded border border-border"
          />
        </div>
      </Demo>

      <Demo name="TransferPicker" note="check options, then move · double-click moves one · billing is locked">
        <div class="flex w-full flex-col gap-2">
          <TransferPicker
            v-model="granted"
            :options="PERMISSIONS"
            source-label="Available"
            target-label="Granted"
            is-searchable
          />
          <p class="text-xs text-subtle-foreground">granted = {{ granted.join(', ') || '—' }}</p>
        </div>
      </Demo>

      <Demo name="TreeSelectPicker" note="branches expand, leaves pick · the trigger shows the full path">
        <div class="flex flex-col items-start gap-2">
          <TreeSelectPicker v-model="folder" :nodes="FOLDERS" is-path-shown aria-label="Folder" class="w-64" />
          <p class="text-xs text-subtle-foreground">folder = {{ folder ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="CascaderPicker" note="each pick opens the next column · arrows travel across columns">
        <div class="flex flex-col items-start gap-2">
          <CascaderPicker v-model="region" :options="REGIONS" aria-label="Region" class="w-72" />
          <p class="text-xs text-subtle-foreground">path = {{ region?.join(' → ') ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="ImageCropEditor" note="drag the box or a corner · arrows move, Alt+arrows resize · square ratio">
        <div class="flex w-full flex-col items-start gap-2">
          <ImageCropEditor ref="cropEditor" v-model="cropArea" :src="CROP_PHOTO" :aspect-ratio="1" max-height="14rem" />
          <div class="flex items-center gap-2">
            <Button size="sm" variant="soft" @click="croppedPreview = cropEditor?.toDataURL() ?? null">Crop</Button>
            <img
              v-if="croppedPreview"
              :src="croppedPreview"
              alt="Cropped preview"
              class="size-12 rounded border border-border"
            />
            <span class="text-xs text-subtle-foreground">{{
              cropArea ? `${cropArea.width}×${cropArea.height} @ ${cropArea.x},${cropArea.y}` : 'default crop'
            }}</span>
          </div>
        </div>
      </Demo>

      <Demo name="MentionInput" note="type @ then a name · arrows pick, Enter or Tab inserts, Escape dismisses">
        <div class="flex w-full flex-col gap-2">
          <MentionInput
            v-model="comment"
            :options="TEAM"
            placeholder="Leave a comment…"
            aria-label="Comment"
            @mention="(person) => mentioned.push(person.label)"
          />
          <p class="text-xs text-subtle-foreground">mentioned = {{ mentioned.join(', ') || '—' }}</p>
        </div>
      </Demo>

      <Demo name="TimezonePicker" note="every runtime zone, offset-labelled west to east · type to search">
        <div class="flex flex-col items-start gap-2">
          <TimezonePicker v-model="timeZone" is-clearable aria-label="Time zone" class="w-72" />
          <p class="text-xs text-subtle-foreground">zone = {{ timeZone ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="RangeSliderInput" note="drag either thumb · min gap 10 · commit fires on release">
        <div class="space-y-3">
          <RangeSliderInput
            v-model="priceRange"
            :min-distance="10"
            :format-value="(v: number) => `$${v}`"
            @commit="(range) => (committedRange = range)"
          />
          <p class="text-xs text-subtle-foreground">
            value = {{ priceRange.join(' – ') }} · committed = {{ committedRange.join(' – ') }}
          </p>
        </div>
      </Demo>

      <Demo name="PinInput" note="numeric + masked">
        <div class="space-y-2">
          <PinInput v-model="pin" :length="4" />
          <PinInput :length="4" is-masked />
          <PinInput :length="4" type="alphanumeric" />
        </div>
      </Demo>

      <Demo name="CheckboxField / RadioField / SwitchField">
        <div class="space-y-2">
          <CheckboxField label="Ship weekly digest" description="Every Monday, 9am." />
          <RadioField label="Standard delivery" description="3–5 business days." />
          <SwitchField label="Dark mode" description="Follows the theme toggle." />
        </div>
      </Demo>

      <Demo name="CheckboxGroup / RadioGroup" note="horizontal + vertical">
        <div class="space-y-3">
          <CheckboxGroup v-model="checkboxes" legend="Toppings">
            <CheckboxField value="a" label="Cheese" />
            <CheckboxField value="b" label="Basil" />
          </CheckboxGroup>
          <RadioGroup v-model="radioValue" legend="Plan" name="pg-plan" orientation="horizontal">
            <RadioField value="one" label="Free" />
            <RadioField value="two" label="Pro" />
          </RadioGroup>
          <p class="text-xs text-subtle-foreground">{{ checkboxes }} / {{ radioValue }}</p>
        </div>
      </Demo>

      <!-- `InputAddonLayout` WRAPS the input — the addons are its own `leading`/`trailing` props,
           not siblings. Used as siblings inside an `InputGroup` the input becomes a group
           segment and takes `[&>*]:rounded-none`, which is the square-bordered input that
           looked like a component bug. `InputGroup` is for joining whole controls. -->
      <Demo name="InputGroup / InputAddonLayout / LabeledField" note="focus a segment — the ring rings the group">
        <div class="space-y-2">
          <InputAddonLayout leading="https://" trailing=".io">
            <TextInput placeholder="example.com" />
          </InputAddonLayout>
          <InputGroup>
            <TextInput placeholder="First" />
            <TextInput placeholder="Last" />
          </InputGroup>
          <!-- The default slot is SCOPED: React cloned the child to inject the label's id,
               Vue hands it to the consumer to bind. Unbound, the label points at nothing. -->
          <LabeledField label="Amount" trailing="USD">
            <template #default="{ id }">
              <TextInput :id="id" placeholder="0.00" />
            </template>
          </LabeledField>
        </div>
      </Demo>

      <Demo name="CharacterCountCallout / PasswordStrengthCallout">
        <div class="space-y-3">
          <CharacterCountCallout :value="42" :max="120" is-max-shown />
          <CharacterCountCallout :value="130" :max="120" />
          <PasswordStrengthCallout value="hunter2" :score="1" />
          <PasswordStrengthCallout value="c0rrect-h0rse-battery" :score="4" />
        </div>
      </Demo>

      <Demo name="TagsInput">
        <TagsInput v-model="tags" placeholder="Add a tag…" />
        <p class="mt-1 text-xs text-subtle-foreground">{{ tags }}</p>
      </Demo>

      <Demo name="ListboxPicker" note="groups, separators, selection indicator">
        <ListboxPicker v-model="listboxValue" class="w-56">
          <ListboxPickerGroup label="Fruit">
            <ListboxPickerItem value="a">Apple</ListboxPickerItem>
            <ListboxPickerItem value="b">Banana</ListboxPickerItem>
          </ListboxPickerGroup>
          <ListboxPickerSeparator />
          <ListboxPickerGroup label="Veg">
            <ListboxPickerItem value="c">Carrot</ListboxPickerItem>
            <ListboxPickerItem value="d" is-disabled>Disabled</ListboxPickerItem>
          </ListboxPickerGroup>
        </ListboxPicker>
      </Demo>

      <!-- The trigger shows the RAW KEY until the content has mounted once: `SelectPickerValue`
           resolves label → item registry → captured label → cache → `getOptionLabel` →
           `serializeKey`. With a preset value and a never-opened menu only the last step
           can fire, so pass `getOptionLabel` (or `options`) to label a closed trigger. -->
      <Demo name="SelectPicker" note="preset value, menu never opened — shows the raw key 'b'">
        <SelectPicker v-model="selected">
          <SelectPickerTrigger><SelectPickerValue placeholder="Pick one" /></SelectPickerTrigger>
          <SelectPickerContent>
            <SelectPickerItem :item-key="'a'" label="Alpha" />
            <SelectPickerItem :item-key="'b'" label="Beta" />
            <SelectPickerItem :item-key="'c'" label="Gamma" is-disabled />
          </SelectPickerContent>
        </SelectPicker>
        <p class="mt-1 text-xs text-subtle-foreground">value = {{ selected }}</p>

        <p class="mt-3 mb-1 text-xs text-subtle-foreground">same, with `getOptionLabel`:</p>
        <SelectPicker
          v-model="selected"
          :get-option-label="(k) => ({ a: 'Alpha', b: 'Beta', c: 'Gamma' })[k as string] ?? null"
        >
          <SelectPickerTrigger><SelectPickerValue placeholder="Pick one" /></SelectPickerTrigger>
          <SelectPickerContent>
            <SelectPickerItem :item-key="'a'" label="Alpha" />
            <SelectPickerItem :item-key="'b'" label="Beta" />
          </SelectPickerContent>
        </SelectPicker>
      </Demo>

      <Demo name="SelectPicker" note="size axis on the trigger">
        <div class="space-y-2">
          <SelectPicker v-for="s in INPUT_SIZES" :key="s">
            <SelectPickerTrigger :size="s"><SelectPickerValue :placeholder="`size ${s}`" /></SelectPickerTrigger>
            <SelectPickerContent><SelectPickerItem :item-key="'x'" label="Item" /></SelectPickerContent>
          </SelectPicker>
        </div>
      </Demo>

      <!-- `label` is not optional decoration: the chip registry cannot capture a slot, so a
           row with only slot content registers under its raw `value` and the trigger shows
           "a" instead of "Alpha". The slot still renders the row. -->
      <Demo name="MultiSelectPicker" note="selected values render as tags in the trigger">
        <MultiSelectPicker v-model="multi" :get-option-label="greekLabel">
          <MultiSelectPickerTrigger />
          <MultiSelectPickerContent>
            <MultiSelectPickerItem v-for="o in GREEK" :key="o.value" :value="o.value" :label="o.label">
              {{ o.label }}
            </MultiSelectPickerItem>
          </MultiSelectPickerContent>
        </MultiSelectPicker>
        <p class="mt-1 text-xs text-subtle-foreground">{{ multi }}</p>
      </Demo>

      <Demo name="MultiSelectPicker" note="9 selected, max-visible-tags=3 — the rest collapse to +N">
        <MultiSelectPicker v-model="multiMany" :get-option-label="greekLabel">
          <MultiSelectPickerTrigger :max-visible-tags="3" />
          <MultiSelectPickerContent>
            <MultiSelectPickerItem v-for="o in GREEK" :key="o.value" :value="o.value" :label="o.label">
              {{ o.label }}
            </MultiSelectPickerItem>
          </MultiSelectPickerContent>
        </MultiSelectPicker>
        <p class="mt-2 mb-1 text-xs text-subtle-foreground">uncapped — every chip, trigger wraps:</p>
        <MultiSelectPicker v-model="multiMany" :get-option-label="greekLabel">
          <MultiSelectPickerTrigger />
          <MultiSelectPickerContent>
            <MultiSelectPickerItem v-for="o in GREEK" :key="o.value" :value="o.value" :label="o.label">
              {{ o.label }}
            </MultiSelectPickerItem>
          </MultiSelectPickerContent>
        </MultiSelectPicker>
      </Demo>

      <!-- Filtering is the CONSUMER's job — `ComboboxPicker` is a registry over whatever rows are
           rendered, and `ComboboxPickerEmpty` has no gate of its own. Rendering every row plus an
           always-on Empty gives blank options under a permanent "No matches.". `label` feeds
           the fill-on-select registry; the row text is the default slot. -->
      <Demo name="ComboboxPicker / ComboboxPickerGroup" note="type to filter — 'an' keeps Banana">
        <ComboboxPicker v-model="combo" v-model:input-value="comboQuery">
          <ComboboxPickerInput placeholder="Search fruit…" />
          <ComboboxPickerContent>
            <ComboboxPickerGroup v-for="group in comboGroups" :key="group.label" :label="group.label">
              <ComboboxPickerItem v-for="f in group.items" :key="f" :value="f" :label="f">
                {{ f }}
              </ComboboxPickerItem>
            </ComboboxPickerGroup>
            <ComboboxPickerEmpty v-if="comboGroups.length === 0">No matches.</ComboboxPickerEmpty>
          </ComboboxPickerContent>
        </ComboboxPicker>
        <p class="mt-1 text-xs text-subtle-foreground">value = {{ combo || '—' }}</p>
      </Demo>

      <Demo name="CalendarPicker" note="hover the selected day — it must stay white-on-accent">
        <CalendarPicker v-model="day" />
      </Demo>

      <Demo name="RangeCalendarPicker" note="hover a range end and the run between — both keep their fill">
        <RangeCalendarPicker v-model="range" />
      </Demo>

      <Demo name="DatePicker" note="click to open the calendar popover">
        <DatePicker v-model="day" placeholder="Pick a date" />
      </Demo>

      <Demo name="DateRangePicker" note="two-ended popover; auto-closes once both ends are set">
        <DateRangePicker v-model="range" placeholder="Pick a range" />
      </Demo>

      <!-- The three below are the ex-native-picker family. All of them now open OUR popover;
           `native` is the documented opt-in that hands the panel back to the browser. Both
           variants are shown so the difference is one glance apart. -->
      <Demo name="DateInput" note="typed YYYY-MM-DD + CalendarPicker popover — `native` is the opt-out">
        <div class="space-y-2">
          <DateInput v-model="day" class="w-44" />
          <DateInput is-native class="w-44" />
          <p class="text-xs text-subtle-foreground">{{ day?.toString() ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="TimeInput" note="typed HH:MM + our popover — `native` is the opt-out">
        <div class="space-y-2">
          <TimeInput v-model="clock" class="w-40" />
          <TimeInput is-native class="w-40" />
          <p class="text-xs text-subtle-foreground">{{ clock?.toString() ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="DateTimeInput" note="typed date + time with a CalendarPicker/columns popover">
        <div class="space-y-2">
          <DateTimeInput v-model="stamp" class="w-60" />
          <DateTimeInput is-native class="w-60" />
          <p class="text-xs text-subtle-foreground">{{ stamp?.toString() ?? 'null' }}</p>
        </div>
      </Demo>

      <Demo name="TimePicker" note="trigger + hour/minute columns, shared with TimeInput">
        <TimePicker v-model="clock" placeholder="Pick a time" />
      </Demo>

      <Demo name="RecurrenceEditor" note="end-mode radios are the styled RadioInput; end date is DatePicker">
        <RecurrenceEditor />
      </Demo>

      <!-- `ColorSwatchPicker` opens NOTHING despite the name — it is an inline palette of
           fixed swatches with two-axis roving focus, same as the React original. The
           component that opens a picker surface is `ColorPicker`. -->
      <Demo
        name="ColorSwatchPreview / ColorSwatchPicker"
        note="picker = inline palette, no popover — use ColorPicker for that"
      >
        <div class="space-y-3">
          <Matrix row-axis="size" col-axis="shape" :rows="['xs', 'sm', 'md', 'lg']" :cols="['square', 'circle']">
            <template #default="{ row, col }">
              <ColorSwatchPreview color="#7c3aed" :size="row as never" :shape="col as never" />
            </template>
          </Matrix>
          <ColorSwatchPicker
            v-model="color"
            aria-label="Accent color"
            :colors="['#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']"
          />
          <p class="text-xs text-subtle-foreground">{{ color }}</p>
        </div>
      </Demo>

      <!-- Bare-mounted, `ChoiceCard` renders an empty outline: it has no default slot, so the
           auto-gallery's child text is dropped and `label` is what fills the card. -->
      <Demo name="ChoiceCard" note="radio as a card — label / description / icon">
        <RadioGroup v-model="plan" legend="Plan" name="pg-choice">
          <div class="space-y-2">
            <ChoiceCard
              v-for="p in PLANS"
              :key="p.value"
              :value="p.value"
              :label="p.label"
              :description="p.description"
            >
              <template #icon><Star :size="16" /></template>
            </ChoiceCard>
          </div>
        </RadioGroup>
        <p class="mt-1 text-xs text-subtle-foreground">value = {{ plan }}</p>
      </Demo>

      <!-- `mask` is REQUIRED. Bare-mounted it is undefined, and every keystroke used to throw
           out of `applyMask`; it now passes the raw value through, but a mask is still the
           point of the component. -->
      <Demo name="MaskedInput" note="# digit · A letter · * alphanumeric · anything else literal">
        <div class="space-y-2">
          <MaskedInput mask="###-###-####" placeholder="555-867-5309" class="w-full" />
          <MaskedInput mask="##/##/####" placeholder="31/12/2026" class="w-full" />
          <MaskedInput v-model="masked" mask="AAA-####" class="w-full" />
          <p class="text-xs text-subtle-foreground">AAA-#### = {{ masked || '—' }}</p>
        </div>
      </Demo>

      <Demo name="StepperGroup" note="step statuses pending / active / complete">
        <StepperGroup default-value="profile">
          <StepperGroupList>
            <StepperGroupStep value="account">Account</StepperGroupStep>
            <StepperGroupStep value="profile">Profile</StepperGroupStep>
            <StepperGroupStep value="done" is-disabled>Done</StepperGroupStep>
          </StepperGroupList>
          <StepperGroupPanel value="account"><p class="p-2 text-sm">Account panel</p></StepperGroupPanel>
          <StepperGroupPanel value="profile"><p class="p-2 text-sm">Profile panel</p></StepperGroupPanel>
        </StepperGroup>
      </Demo>

      <!-- `WizardFormSteps` renders the tablist from the CONTEXT REGISTRY and has no slot;
           the `WizardFormStep` panels are its SIBLINGS, not its children. Nesting them inside
           `WizardFormSteps` renders an empty tablist and no panels. -->
      <Demo name="WizardForm" note="steps register from sibling panels, not from WizardFormSteps' slot">
        <WizardForm default-current-step="one">
          <WizardFormSteps />
          <WizardFormStep id="one" label="One"><p class="text-sm">Panel one</p></WizardFormStep>
          <WizardFormStep id="two" label="Two" is-final><p class="text-sm">Panel two</p></WizardFormStep>
          <WizardFormFooter />
        </WizardForm>
      </Demo>

      <Demo name="EditableInput" note="click the preview to enter edit mode">
        <EditableInput v-model="editable">
          <EditableInputPreview />
          <EditableInputInput />
          <EditableInputSubmit>Save</EditableInputSubmit>
          <EditableInputCancel>Cancel</EditableInputCancel>
        </EditableInput>
      </Demo>
    </div>

    <h3 class="border-t border-border pt-4 font-mono text-xs uppercase text-subtle-foreground">auto-mounted tail</h3>
    <Demo name="CodeEditor" note="Escape then Tab leaves the editor">
      <CodeEditor v-model="code" aria-label="Example source code" />
    </Demo>
    <Demo name="SortableGroup" note="Drag the handle or use the movement buttons">
      <SortableGroup @reorder="reorderSteps">
        <SortableGroupItem v-for="(step, index) in orderedSteps" :key="step" :index="index" class="flex gap-3 p-2">
          <SortableGroupHandle :aria-label="`Move ${step}`">↕</SortableGroupHandle>
          <span>{{ step }}</span>
          <SortableGroupMoveButton direction="previous" />
          <SortableGroupMoveButton direction="next" />
        </SortableGroupItem>
      </SortableGroup>
    </Demo>
    <Demo name="NodeEditor" note="Focus a node and use arrows, or select it and click a movement action">
      <NodeEditor
        :nodes="graphNodes"
        @update:nodes="graphNodes = $event.map((node) => ({ ...node, label: String(node.label ?? node.id) }))"
      />
    </Demo>
    <AutoGroup
      :examples="formsExamples"
      :namespace="forms"
      :covered="[
        ...covered,
        'CodeEditor',
        'NodeEditor',
        'SortableGroup',
        'SortableGroupItem',
        'SortableGroupHandle',
        'SortableGroupMoveButton',
      ]"
    />
  </div>
</template>
