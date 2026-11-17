# Toast notifications

*Last updated: 2026-11-17*

The toast confirms an outcome, keeps the current task in place, and offers a shortcut when one exists. Users can
return to consequential information through the affected resource, task activity, or notification history.

[Shipped work: v0.1 Iteration 25](../../planning/version-track/v0.1/v0.1.md#iteration-25--notifications-overhaul) · [Notifications backlog](../../planning/backlog.md#notifications)

## Current behavior

| Area | In the fe sdk today | What the lab exposes |
|---|---|---|
| Placement | Top right by default, with left, right and centered anchors on both edges. | Four corners and shell offsets at desktop, tablet and phone widths. |
| Motion | `ToastMotion` selects the animation. Presence keeps the leaving card in place before the stack closes the gap. | Side slide and three vertical transitions at full or quarter speed. |
| Delivery | Priority order with FIFO ties. Capacity follows available height and the host's count limit. | Eight notices in Burst, a scrollable overflow view, and repeated runs grouped by pipeline. |
| Timer | Explicit deadlines, per-notice overrides, configurable priority defaults, and no countdown while `progress` runs. | A ring around Close, a tracked task with section progress, and a six-second Urgent Undo. |
| Anatomy | Severity glyph, title, optional description, progress, actions and details, Pin when eligible, and Close, on a solid or glass `surface`. A single retained notice also has Delete. | Actual SDK cards in two themes and both surfaces. Exercise wrapping, control density, and overlap with the app shell. |
| Assistive technology | One named landmark reachable with F8, polite and assertive live regions with batched arrivals, swipe on touch, and focus that moves to a neighbor when a focused card closes. | A screen-reader log of every announcement, the F8 hint, and focus after closing. |
| History | Transient and retained notices, arrival times, unread marks, Mark all read, Clear all, a 200-entry cap, and Delete shared with the live toast. | Optional History button, a switch for retaining confirmations, a pause that urgent notices can break through, and a simulated snooze. |

SDK source: [host and defaults](https://github.com/wow-two-sdk-beta/wow-two-sdk-beta.fe/blob/fb7fd24702bc41d5a997ae35dfe4ce9cd0e7e9f3/engineering/codebase/wow-two-sdk-beta-fe/src/presentation/feedback/toastHost/ToastHost.vue#L447),
[live region](https://github.com/wow-two-sdk-beta/wow-two-sdk-beta.fe/blob/fb7fd24702bc41d5a997ae35dfe4ce9cd0e7e9f3/engineering/codebase/wow-two-sdk-beta-fe/src/presentation/feedback/toastHost/ToastHost.vue#L521),
[notice categories](https://github.com/wow-two-sdk-beta/wow-two-sdk-beta.fe/blob/fb7fd24702bc41d5a997ae35dfe4ce9cd0e7e9f3/engineering/codebase/wow-two-sdk-beta-fe/src/feedback/FeedbackBus.ts#L31),
[history panel](https://github.com/wow-two-sdk-beta/wow-two-sdk-beta.fe/blob/fb7fd24702bc41d5a997ae35dfe4ce9cd0e7e9f3/engineering/codebase/wow-two-sdk-beta-fe/src/presentation/display/notificationCenterGroup/NotificationCenterGroup.spec.md).
Consumer example: [Ocharo Studio offsets](https://github.com/ocharo-hq/ocharo-studio/blob/bb4fd8b547fbbd09bce86224e24e922ed16d7372/engineering/codebase/ocharo-studio.frontend-services/apps/web/src/bootstrap/styles/studio.css#L665).

The host promotes the next queued card as a slot frees. Announcements are queued per arrival and change,
so a burst or an in-place update with the same title still reaches a screen reader.

## Where the message lives

| Situation | Toast | Where users can return |
|---|---|---|
| Routine confirmation with an obvious result | Short confirmation when it adds information. Transient by default. | The changed control or resource. |
| One queued harvest | “Harvest queued.” Offer **Open run** where the app has a stable route to that run. | Run details or the source activity view. |
| Batch of two or more queued harvests | “2 harvests queued.” Offer **View activity**. The count is the accepted work. | Source activity and its run rows. |
| Created resource | Name the result. Offer **Open product** in the Ocharo catalogue example. | Product list and detail. Product policy decides whether to retain the confirmation. |
| Reminder or review item | Offer **Remind later** only where the product can schedule it. Show a short receipt after scheduling. | The underlying reminder or task, and history when enabled. |
| Failure that needs correction | Use a short toast if the outcome needs to be visible away from where the command started. | Field or task for recovery, persistent status for a continuing condition. |

The user can ignore a timed shortcut and take the same action later. Keep a notice on screen or supply a persistent
route when that action would otherwise disappear. Check screen reader output without moving focus on arrival.
[WCAG 2.2 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable),
[WCAG 2.2 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html),
[Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast).

## Iterations

| Round | Compare | Review with |
|---|---|---|
| 1. Entry and exit | Current reference, 12 px rise, full-card slide, 24 px rise with slight scale. | Play the same batch and single-run notices. Test dismissal mid-entry, expiry, rapid arrivals and reduced motion. |
| 2. Placement and stack | Desktop end, tablet center or end, phone above bottom navigation. Expanded stack, compact stack, or one visible. | Portrait and landscape, safe areas, save bars, keyboard, dialogs, focus order and long localized copy. |
| 3. Shape and elevation | Radius, border contrast, shadow and severity treatment. | Same notice on light and dark SCFD and Ocharo surfaces. |
| 4. Content and interactions | Single-line confirmation, description, overflow and expansion, timer presentation, Close and one context action. | Try the countdown on Close first. Then check long messages, translated button labels, touch targets, hover and focus pause, optional Report. |
| 5. History | Opt-in trigger, automatic versus configurable retention, Close versus Delete, review and reminder behavior. | Empty and busy panels. Decide read state, persistence, scoping, caps, expiry, and action availability after reload. |
| 6. Adoption | One approved SDK treatment integrated first in Ocharo and SCFD. | Check product-specific destination links, existing placement overrides and dev builds before promotion. |

Prefer the short rise as the first candidate. Its small travel should make the origin legible while leaving more of
the app visible. Measure stack movement and the time from command completion to legible text before choosing.
Material's snackbar anchors low and shows one message at a time. Sonner shows a stacked alternative with hover
expansion. Carbon keeps actionable notification content available for later use. These are comparisons for rounds
1 and 2. [Material Snackbar](https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md),
[Sonner motion source](https://github.com/emilkowalski/sonner/blob/main/src/styles.css),
[Carbon notification guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines).

## Toast lifetime

The first round tested a bottom bar, top bar, separate ring, and seconds. All four were rejected. The lab now
defaults to the approved placement and timing behavior below.

| Reference | What to borrow |
|---|---|
| [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/toast/usage) | Brief confirmations dismiss on a timer. Progress follows the operation, and a communication toast can point back to a durable notification. |
| [Adobe Spectrum](https://react-spectrum.adobe.com/Toast#dismissal) and [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines#actionable) | Both keep actionable notices available. Spectrum pauses a timed toast on hover or focus. |
| [W3C timing guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) and [Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast#action) | A temporary shortcut can expire when its information and function remain accessible elsewhere. |
| [Gmail Undo Send](https://support.google.com/mail/answer/2819488?hl=en#zippy=%2Crecall-an-email-with-undo-send) and [Telegram Undo](https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/ui/Components/UndoView.java) | Some actions have a real deadline. Gmail lets people set the cancellation window. Telegram draws a countdown in its Undo view. |

**Decision.** Show a full ring around the existing Close button as soon as a timed toast appears and drain it
over the entire display time. Keep the X visible and pause the ring and dismissal together on hover or keyboard
focus. Reserve separate progress UI for work that is running. The 8-second scenario is a lab value.

| Situation | Lifetime |
|---|---|
| SCFD queues work or Ocharo creates a product | The confirmation expires. The created runs or product stay accessible through Activity or the product list. The toast's action is a shortcut. |
| Review or reminder needs attention | Keep the underlying item available until resolved or snoozed. A retained history entry is useful when the app has opted into history. |
| Action itself expires | Use explicit copy such as “Undo available for 10 s” tied to the actual deadline, or provide a recoverable action. |

## Stack motion and priority

The lab defaults to top right and exposes all four corners. On phones, cards fill the width between the
safe-area gutters. The short slide travels 12 px toward the anchor over 200 ms. Top cards enter from below,
and bottom cards enter from above. Exit reverses the motion over 150 ms. Once a card fades, survivors slide
toward the anchor over 200 ms. Keeping the departing card in its original slot lets neighbors stay legible
throughout the exit. [Vue move transitions](https://vuejs.org/guide/built-ins/transition-group#move-transitions)

**Priority stack** plays a 10 s task, a 4 s refresh, and an 8 s confirmation. The middle refresh takes a
short explicit duration to exercise gap closing. **Urgent Undo** added to that stack moves from the opposite
end toward the selected anchor. The earlier cards move to their new slots with their elapsed time preserved.

Set `NoticePriority` by the consequence of missing a notice. Reserve Urgent for an immediate decision, use
High for a task outcome or progress update people are waiting on, Normal for a routine confirmation, and
Low for passive updates with a visible result. The SDK defaults to 4 s, 6 s, 10 s, and 10 s respectively.
Equal priorities keep their arrival order. Products can configure the defaults once with `priorityDurations`.
[Apple interruption-level guidance](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)

A real deadline uses `expiresAtMs`, so its remaining time follows the operation even while offscreen or
hovered. A six-second Undo can outrank a ten-second running task. For a product Undo, keep recovery available
through the resource when possible and have the operation enforce the actual deadline.
[WCAG Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable)

Default Pin to available on standard timed cards, including confirmations, failures, created resources,
and running tasks. Skip it for sticky notices, custom renderers with their own controls, and hard deadlines
such as Undo. Use `canPin: false` for an isolated notice that should remain brief. Pin removes the countdown.
Unpin restarts at the full configured duration. The toggle exposes a stable label and a pressed state.
[WAI toggle button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

## Overflow and grouping

**Show N more notifications** counts additional live cards waiting for space. Opening it keeps the cards in
a scrollable list and focuses the first hidden card. Earlier cards can scroll out of sight while the reader
looks farther down. **Show fewer notifications** or Escape restores the short stack. Regular clocks pause
while browsing. Actual deadlines keep running. History remains accessible from its shell trigger.

An explicit group key joins matching cards immediately, even with spare room. Use the stable pipeline ID
plus the event type. Use each run ID for the notice itself so an update replaces that run's row and each
new run adds a row. **Show details** reveals the individual items. Keep each item's **Open** and any useful
secondary actions beside it, where they wrap in a full-width row. Pin and Dismiss apply to the live group.
History retains each notice according to its own policy. A deadline occupies its own card.

The first card keeps its place and grows to fit the group summary. In **Full card merge**, the incoming
preview passes over the intervening cards from the free end of the visible stack. When the group is open,
it folds into the top of the list. **Count highlight** updates the new total immediately and applies a glow
to the count text. A whole-card highlight marks a status change such as task completion. Both cues reach
peak quickly, hold briefly, then fade slowly so the update stays visible after it draws the eye.

The list shows its newest items first and fits up to
three rows in the available height. If someone has scrolled or focused a row, the list preserves their
reading position. Older runs remain accessible by scrolling. Reduced motion shows a brief steady highlight.

The compact row puts the first action alongside the copy and wraps actions when horizontal space runs out.
The divider below the group summary spans the width of the card. Separators inside the list align to the
row text and actions, keeping the header boundary visually stronger.
The group summary can carry the pipeline and source. Each run can supply a short label such as “Run 2” and
keeps its own actions. The overflow list uses the same compact layout. When a publisher supplies full copy
only, the compact row uses that copy with the tighter spacing.

The overflow disclosure aligns with the live cards and follows their inset width on a phone.
“Show 5 more notifications” and a chevron clarify the action. On touch devices the control and the
compact row's SDK action buttons have a minimum height of 44 px.

### Review cases

Replay **Queue one → Priority stack → Queue one** in **Full card merge** mode. The existing run stays at
the anchor and the new preview passes the intervening cards. **Count highlight** cues the same arrival inline.

Replay the same three grouped runs and use **Burst** at desktop, tablet and phone widths. The desktop
fixture shows **Show 5 more notifications**. Shorter previews can hide more cards.
Check wrapped labels, per-run **Open**, secondary actions, keyboard focus on expansion and collapse,
and an Urgent Undo arriving while the stack is full.

In the progress replay, update a single run through “2 of 3 sections complete” and then partial failure.
Check the space used when details wrap, and make sure a task can still be found in Activity.
[Fluent progress toasts](https://fluent2.microsoft.design/components/web/react/core/toast/usage)

Check that pinned tasks stay accessible when urgency displaces them and that History opens during a burst.
Test meaningful updates with a screen reader and keep focus on the current task.
[WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

## Running work

A notice with `progress` describes an operation that is still running. The toast stays up with no countdown
and no Pin, and shows a slim progress bar under its copy: determinate when `progress.value` is set (`max`
defaults to 1), indeterminate otherwise, with `progress.label` as short status text. Republishing the same id
updates the bar without a highlight. Republishing it without `progress` marks completion: the card highlights,
its countdown starts fresh, and the announcer reads the outcome. A grouped run shows its own bar in the row,
and the group card stays up while any member is running.

`bus.track(work, { running, success, failure })` wraps that lifecycle. It publishes `running` under a stable
id, passes a `report(progress)` callback to a function `work`, and republishes the same id with the success or
failure notice when the work settles. It returns the work's value or rethrows its original error.
`bus.dismiss(id)` closes a live toast from the publisher, for a cancelled task, and never touches History.

| Situation | Publish |
|---|---|
| Queued or running with unknown length | `progress: {}` with a label such as "Queued" |
| Sections or files counted | `progress: { value: 2, max: 3, label: '2 of 3 sections' }` |
| Finished | The same id without `progress`, a success tone and a shortcut such as **Open run** |
| Partly failed | The same id without `progress`, a warning tone and **Retry** |
| Cancelled | `bus.dismiss(id)` |

## Surface, touch and keyboard

`surface` on the host selects the card material once at the shell: `ToastSurface.Solid` (default) or
`ToastSurface.Glass`, the menu glass with its edge hairline, shadow and inner highlight. Reduced transparency
falls back to an opaque fill. A toast can override the host's surface. The shell sets the card width with
`--toast-width` (default 20 rem); cards still fill the inset width on phones.

On touch and pen, a horizontal drag follows the finger and a release past 40% of the card or a flick toward
the anchored side dismisses it; centered stacks accept both directions. Shorter drags spring back, vertical
scrolling keeps working, and drags starting on a button are ignored. Reduced motion skips the follow and
spring but still dismisses.

`hotkey` (default F8) moves focus to the newest toast, and the region is named "Notifications (F8)". Escape
returns focus to where the reader was, after first collapsing an open overflow list. `hotkey: false` turns
it off. [Radix Toast hotkey](https://www.radix-ui.com/primitives/docs/components/toast#viewport)

## Announcements

The host keeps one polite and one assertive live region. Danger tones and urgent notices use the assertive
region; everything else is polite. Each arrival, in-place content change, group growth and progress
completion is read as the title and description. Arrivals within 120 ms are batched, and more than three read
as "N new notifications" with the most urgent one's text. Identical text is cleared and set again so it is
heard twice. Progress value changes are not announced.
[WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

## Product registration

Create a feedback bus for the product's application scope and mount one `FeedbackToastHost` at the shell.
Feature code publishes through that bus, and the shell can bind its optional History trigger and
`NotificationCenterGroup` to the same bus. Restore retained entries for the current account or workspace
without replaying them as new toasts. Setting `priorityDurations` gives existing unclassified publishers
the Normal duration while features adopt their own priorities.
[Feedback bus contract](../../codebase/wow-two-sdk-beta-fe/src/feedback/FeedbackBus.spec.md)

The app shell can declare the following options once.

```ts
import { createFeedbackBus } from '@wow-two-beta/fe/feedback';
import { OverlayPosition } from '@wow-two-beta/fe/foundation/styles';
import {
  DefaultToastPriorityDurations,
  ToastMotion,
  ToastSurface,
  ToastTimer,
  type ToastHostProps,
} from '@wow-two-beta/fe/presentation/feedback';

const feedback = createFeedbackBus({ maxRetained: 200 });
const toastOptions = {
  position: OverlayPosition.TopRight,
  motion: ToastMotion.ShortSlide,
  timer: ToastTimer.CloseRing,
  surface: ToastSurface.Glass,
  priorityDurations: DefaultToastPriorityDurations,
} satisfies ToastHostProps;
```

```vue
<FeedbackToastHost :bus="feedback" v-bind="toastOptions" />
```

Keep one placement and motion across desktop, tablet, and phone. Fit the stack to the available width
and height through responsive layout. The shell supplies `--toast-top-offset` and `--toast-bottom-offset`
for its header and bottom navigation. The host adds the safe-area insets.
The host respects the user's reduced-motion preference on every screen.

| Control | Responsibility |
|---|---|
| Dismiss | The SDK closes the live toast. Retained notices remain available in History. |
| Pin and Unpin | The SDK holds a pin-eligible toast and removes its countdown. Unpin restores the full configured duration. |
| Remind later | Register a delay and scheduler once in `createFeedbackBus({ reminders })`. Publish a stable `reminderKey` on eligible notices. The SDK waits for scheduling to succeed, closes the toast, and acknowledges it. The product delivers due notices through its bus. |
| Open | The product supplies the action and resolves the run, catalogue, or other resource through its router. For persisted history, store the resource reference and bind the live action when rendering. |
| Pause and resume pop-ups | The same bus handles the delivery preference. The product can restore the preference for the current account. The bell still signals deliveries during a pause. |

### Product pilots

The SDK build and lab are the review surface. The product checkouts currently pin published SDK packages.
Validate the candidate first in SCFD and Ocharo Catalogue, using each app's genuine development routes and
the published SDK version. Update the exact dependencies and workspace lockfile together in each checkout.

| Product | Existing entry point | Upgrade work |
|---|---|---|
| SCFD | `ConsoleSession.vue` | Bind the shell options. Carry each accepted `RunModel.id` from `startRun` and use a pipeline event key. Add a run target to the source Activity route before labeling the action Open run. |
| Files | Files web `AppRoot.vue` | Re-pin the SDK and mount the host for app-owned operation results. |
| Identity | Identity web `AppRoot.vue` | Re-pin the SDK and mount the host in the appropriate account scope. Keep field feedback beside forms. |
| Ocharo | Catalogue, Events, Brand, Brand Workspace, Studio, Assets lab, Marketing and Editorial | Reuse their existing hosts. Catalogue already has a History trigger. Check the common options in each app shell. The public marketing sites have their own dependencies and no notification hosts. |
| ForeverPin | `AppRoot.vue` | Re-pin and configure the existing publisher and host. |
| Haven | `HavenShell.vue` | Update the shared FE workspace and register the options in the shell used by its apps. |

## Playground

Run `pnpm --filter playground dev` from the Vue package and open [Toast motion lab](http://127.0.0.1:5176/?g=toast-lab).
The existing playground aliases imports to SDK source. A same-origin frame gives each preview real desktop
(1440 px), tablet (768 px), and phone (390 px) viewport rules. Two neutral samples carry the previews: a
**Console** that collects events from sources into runs, and a **Catalogue** that creates products. Both reuse
`AppFrame`, `SidebarMenu`, `Card`, `TabsGroup`, `SearchInput`, `ToggleGroup`, `Badge`, and the SDK toast host with
its `surface` and `--toast-width` options. The screens, generated post photographs, runs, catalogue records, and
five-second reminder are fixtures. Quarter speed applies to entry and exit. History saves lab confirmations by
default and resets when the app context or the pause-bypass setting changes. The browser keeps the lab's pop-up
pause preference across reloads.

The **Features** panel lists every implemented capability with a Replay button where a scenario shows it, and
the upcoming backlog items. The **Screen reader** panel logs the last eight announcements from the host's polite
and assertive regions. Scenarios cover Queue batch or one (Console), Create product (Catalogue), Priority stack,
Task update, Track progress, Partial failure, Grouped progress, Cancel task, Urgent Undo, Reminder, Long message,
Burst and Clear toasts. Settings add **Urgent breaks through pause** and **Hotkey F8**.

`pnpm --filter playground build` produces `apps/playground/dist`. The built lab uses query routes and static assets
from its own origin. The platform hosting path is a dev static service for that build. Service registration and a
host binding are pending. The existing GitHub Pages workflow targets the legacy React package.

### Preview photographs

The built-in ImageGen output is cropped into [piano](../../codebase/wow-two-sdk-beta-fe/apps/playground/src/toastLab/assets/piano.webp),
[recital](../../codebase/wow-two-sdk-beta-fe/apps/playground/src/toastLab/assets/recital.webp),
[quartet](../../codebase/wow-two-sdk-beta-fe/apps/playground/src/toastLab/assets/quartet.webp), and
[organ](../../codebase/wow-two-sdk-beta-fe/apps/playground/src/toastLab/assets/organ.webp).
The images depict fictional performers and a concert hall.

> Use case: photorealistic-natural. Create one 2-by-2 contact sheet of four original editorial concert images for
> sample cards in a dark event-posts console. Square image partitioned at exactly 50% width and 50% height into four
> edge-to-edge equal quadrants, with clean straight seams, ZERO gutters, borders, text, logos, or watermark. Each
> photograph is designed to be cropped independently from its quadrant. Top left: a fictional Central Asian woman
> in a simple black evening gown as vocalist beside a glossy grand piano in a pale recital hall, soft daylight,
> subject centered. Top right: a fictional middle-aged Central Asian classical pianist at a concert piano in a
> silver-gray stage rehearsal room, editorial seated portrait, subject centered. Bottom left: a fictional acoustic
> quartet gathered in a cool blue-gray venue, the faces and instruments all arranged in the central 70% of the tile,
> believable editorial portrait. Bottom right: warm golden Baroque concert hall with monumental ornate pipe organ,
> candle-amber tones against pale stone. Natural photography for an arts magazine, restrained realistic contrast,
> distinct warm vs cool images, detailed but uncluttered, designed to test a translucent UI layer against
> representative busy and bright imagery. Absolutely no words or lettering.

## History integration

The shell uses `NotificationCenterButton` with `NotificationCenterGroup` on the same bus. The bell badge
counts unread retained entries the reader can find in the panel. Opening History hides the badge and marks
the unread rows; closing it marks them read. Each row shows when it arrived (`publishedAtMs`, kept when the
same id is republished). **Mark all read** and **Clear all** sit in the header; `canClear: false` hides the
second. The bus keeps the newest 200 entries by default (`maxRetained`).
When pop-ups are paused, every suppressed publication gives the bell a brief cue. With
`createFeedbackBus({ pauseBypass: NoticePriority.Urgent })`, urgent notices such as a deadline Undo still pop up
during a pause; the default lets nothing through. Transient confirmations
remain useful for changes visible in the product. Retained notices stay available after dismissal or expiry.
[Carbon notification recovery](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines#toast)

| Action | History behavior |
|---|---|
| Open, View activity | The product opens the current resource or activity. The entry remains in History. |
| Retry | The product offers it while the operation can still be retried. A notice can supply a different `historyAction` or use `false` for a toast-only action. |
| Undo a deletion | The action remains available through its real deadline. The product callback restores the resource and republishes the same notice id with the result after success. The SDK removes the expired action and preserves the original outcome in History. |
| Delete notification | The SDK removes the history entry and its live pop-up. |

For a product that restores history after reload, persist scoped resource IDs and action intent, then bind
the authorized actions when rendering. The product's scheduler accepts the bus's stable reminder key and
delivers due notices after the tab closes.
