# GanttTimeline

Renders a GanttTimeline chart — a task label column beside a day-scaled timeline of bars and milestones.

Source: [GanttTimeline.vue](GanttTimeline.vue).

Public import: `import { GanttTimeline } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `tasks` | `ReadonlyArray<GanttTimelineTask>` | yes | `() => []` | Declared by the source contract. |
| `dependencies` | `ReadonlyArray<GanttTimelineDependency>` | no | `() => []` | Declared by the source contract. |
| `milestones` | `ReadonlyArray<GanttTimelineMilestone>` | no | `() => []` | Declared by the source contract. |
| `from` | `Temporal.PlainDate` | no | — | Declared by the source contract. |
| `to` | `Temporal.PlainDate` | no | — | Declared by the source contract. |
| `cellWidth` | `number` | no | `40` | Declared by the source contract. |
| `rowHeight` | `number` | no | `36` | Declared by the source contract. |
| `labelWidth` | `number` | no | `200` | Declared by the source contract. |
| `hasWeekends` | `boolean` | no | `true` | Declared by the source contract. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `task-click` | `'task-click': [task: GanttTimelineTask];` | Fires when a task bar is clicked. Replaces the legacy `onTaskClick`. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `task` | `task?(props: { task: GanttTimelineTask }): unknown;` | Overrides a task's label, in both the label column and the bar. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
