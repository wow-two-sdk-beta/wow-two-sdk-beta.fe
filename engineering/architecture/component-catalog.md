# Component Catalog

*Last updated: 2026-07-13*

Every shipped component in `@wow-two-beta/ui`, grouped by presentation group + foundation primitives. Import from the group **subpath** (tree-shakes to just that slice); each name links to its source folder (spec + stories live there).

**249 entries** — 232 presentation components across 7 groups + 17 foundation primitives (L2 headless).

## Convention

- **Derived, not hand-maintained.** This file is generated from the component folders (`src/{layer}/{group}/{component}/`) by [`gen-catalog.mjs`](./gen-catalog.mjs). Regenerate after adding/removing a component: `node engineering/architecture/gen-catalog.mjs`. Never hand-edit rows — they drift.
- **Row** = one component folder. **Name** = its `*.spec.md` h1 (or PascalCase folder). **Purpose** = the spec's `## Purpose` line; spec-less components carry a hand-authored one-liner in the generator's `OVERRIDES` map.
- **Import from the group subpath**, not the package root: `@wow-two-beta/ui/presentation/{group}` (or `/foundation/primitives`). Deep single-component paths are not public API.
- A component lands here once its folder ships `{Name}.tsx` + `index.ts`; its stories live under `tests/stories/`.

---

### presentation/actions

`import { … } from '@wow-two-beta/ui/presentation/actions'` · 14 components

| Component | Purpose |
|---|---|
| [`BackToTopButton`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/backToTopButton/) | Floating button that appears once the user has scrolled past a threshold; clicks scroll the page (or a custom container) to top. |
| [`Button`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/button/) | The core button — `variant` × `tone` styling, icon slots, and a loading state; renders `<button>` or `asChild`. |
| [`ButtonGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/buttonGroup/) | Group Button / Link / ToggleButton children into a visually connected row or column. |
| [`CopyButton`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/copyButton/) | Button that copies text to the clipboard and flips to a copied state. |
| [`DisclosureButton`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/disclosureButton/) | Trigger button with a chevron that rotates on open. |
| [`FAB`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/fab/) | Floating Action Button — fixed-position circular shadowed button. |
| [`Link`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/link/) | Anchor with focus + hover styling. |
| [`OptionTile`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/optionTile/) | Selectable tile acting as a radio/checkbox option; disable a whole grid via `<fieldset disabled>`. |
| [`OptionTileGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/optionTileGroup/) | Single- or multi-select group of `OptionTile`s. |
| [`SegmentedControl`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/segmentedControl/) | iOS-style connected pill row — visual variant of `ToggleButtonGroup`. |
| [`SpeedDial`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/speedDial/) | Floating Action Button with a stack of secondary actions that fan out when triggered. |
| [`ToggleButton`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/toggleButton/) | Two-state button (on/off) with `aria-pressed` and `data-state="on" \| "off"`. |
| [`ToggleButtonGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/toggleButtonGroup/) | Coordinates a row/column of `ToggleButton` children. |
| [`Toolbar`](../codebase/wow-two-front-beta-sdk/src/presentation/actions/toolbar/) | Container for grouped action controls — buttons, separators, links — sharing a single tab stop with arrow-key navigation between items. |

---

### presentation/display

`import { … } from '@wow-two-beta/ui/presentation/display'` · 73 components

| Component | Purpose |
|---|---|
| [`Accordion`](../codebase/wow-two-front-beta-sdk/src/presentation/display/accordion/) | Vertical list of `Collapsible`-style items where one (or multiple) can be open at a time. |
| [`ActivityFeed`](../codebase/wow-two-front-beta-sdk/src/presentation/display/activityFeed/) | Chronological list of activity / event entries. |
| [`AnimatedNumber`](../codebase/wow-two-front-beta-sdk/src/presentation/display/animatedNumber/) | Smooth-tween a displayed number whenever its `value` prop changes. |
| [`AnnotationMarker`](../codebase/wow-two-front-beta-sdk/src/presentation/display/annotationMarker/) | Clickable marker pinning an annotation to a point on content. |
| [`AudioPlayer`](../codebase/wow-two-front-beta-sdk/src/presentation/display/audioPlayer/) | `<audio>` element wrapped in a styled control bar — play/pause, time display, scrubber (or AudioWaveform if `peaks` provided), volume, speed,… |
| [`AudioWaveform`](../codebase/wow-two-front-beta-sdk/src/presentation/display/audioWaveform/) | Visualize audio amplitude as a strip of vertical bars. |
| [`Avatar`](../codebase/wow-two-front-beta-sdk/src/presentation/display/avatar/) | Person / entity image with initials fallback. |
| [`AvatarGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/display/avatarGroup/) | Stacked row of `Avatar` children with overlap and a "+N" overflow tile. |
| [`Badge`](../codebase/wow-two-front-beta-sdk/src/presentation/display/badge/) | Static pill — status / category / count. |
| [`BadgeOverlay`](../codebase/wow-two-front-beta-sdk/src/presentation/display/badgeOverlay/) | Decorator wrapper that overlays a badge / dot on top of a child element. |
| [`Card`](../codebase/wow-two-front-beta-sdk/src/presentation/display/card/) | Raised surface for grouped content. |
| [`Carousel`](../codebase/wow-two-front-beta-sdk/src/presentation/display/carousel/) | Slide-show. |
| [`ChatBubble`](../codebase/wow-two-front-beta-sdk/src/presentation/display/chatBubble/) | A single chat message bubble (sender side, tail, grouping). |
| [`Code`](../codebase/wow-two-front-beta-sdk/src/presentation/display/code/) | Inline (`<code>`) or block (`<code class="block">`) code styling. |
| [`Collapsible`](../codebase/wow-two-front-beta-sdk/src/presentation/display/collapsible/) | Single show/hide region — a trigger that toggles a panel. |
| [`CommentThread`](../codebase/wow-two-front-beta-sdk/src/presentation/display/commentThread/) | Threaded comment list with nested replies. |
| [`Confetti`](../codebase/wow-two-front-beta-sdk/src/presentation/display/confetti/) | Burst of colorful particles that fall with simple physics. |
| [`CountBadge`](../codebase/wow-two-front-beta-sdk/src/presentation/display/countBadge/) | Numeric badge — inbox/notification counts. |
| [`CountUp`](../codebase/wow-two-front-beta-sdk/src/presentation/display/countUp/) | Animate a number from `from` (default 0) up to `to`. |
| [`DataGrid`](../codebase/wow-two-front-beta-sdk/src/presentation/display/dataGrid/) | Editable spreadsheet-grade table. |
| [`DataTable`](../codebase/wow-two-front-beta-sdk/src/presentation/display/dataTable/) | Data-bound table with built-in column-based sorting. |
| [`DescriptionList`](../codebase/wow-two-front-beta-sdk/src/presentation/display/descriptionList/) | Semantic `<dl>` for label-value pairs — property panels, settings, info cards. |
| [`DiffViewer`](../codebase/wow-two-front-beta-sdk/src/presentation/display/diffViewer/) | Side-by-side or unified line-diff between two text strings. |
| [`EmptyState`](../codebase/wow-two-front-beta-sdk/src/presentation/display/emptyState/) | Empty-list / no-results affordance. |
| [`EventCalendar`](../codebase/wow-two-front-beta-sdk/src/presentation/display/eventCalendar/) | Full event-display calendar with month / week / day / agenda views. |
| [`Eyebrow`](../codebase/wow-two-front-beta-sdk/src/presentation/display/eyebrow/) | Small kicker / eyebrow label rendered above a heading. |
| [`FeatureCard`](../codebase/wow-two-front-beta-sdk/src/presentation/display/featureCard/) | Marketing card highlighting a feature (icon + title + copy). |
| [`FrameGlyph`](../codebase/wow-two-front-beta-sdk/src/presentation/display/frameGlyph/) | Decorative SVG glyph of a rounded frame. |
| [`Gantt`](../codebase/wow-two-front-beta-sdk/src/presentation/display/gantt/) | Tasks × time chart. |
| [`GradientText`](../codebase/wow-two-front-beta-sdk/src/presentation/display/gradientText/) | Text with a gradient color fill via `background-clip: text`. |
| [`Heading`](../codebase/wow-two-front-beta-sdk/src/presentation/display/heading/) | Semantic `h1`–`h6` with independent visual size. |
| [`HeatmapCalendar`](../codebase/wow-two-front-beta-sdk/src/presentation/display/heatmapCalendar/) | GitHub-contributions style year heatmap. |
| [`Highlight`](../codebase/wow-two-front-beta-sdk/src/presentation/display/highlight/) | Wraps each occurrence of `query` inside the text children in a `<Mark>`. |
| [`Image`](../codebase/wow-two-front-beta-sdk/src/presentation/display/image/) | `<img>` wrapper with error fallback. |
| [`InfoRow`](../codebase/wow-two-front-beta-sdk/src/presentation/display/infoRow/) | Single label + value row with optional leading icon. |
| [`Kbd`](../codebase/wow-two-front-beta-sdk/src/presentation/display/kbd/) | Single keyboard key glyph. |
| [`KeyboardShortcut`](../codebase/wow-two-front-beta-sdk/src/presentation/display/keyboardShortcut/) | Render a sequence of `Kbd` keys with connectors. |
| [`List`](../codebase/wow-two-front-beta-sdk/src/presentation/display/list/) | Semantic `<ul>` / `<ol>` with consistent spacing, marker presets, and an `Item` subcomponent that supports primary/secondary content +… |
| [`Mark`](../codebase/wow-two-front-beta-sdk/src/presentation/display/mark/) | Semantic `<mark>` for highlighted/matched text — search results, mentions. |
| [`Marquee`](../codebase/wow-two-front-beta-sdk/src/presentation/display/marquee/) | Continuously scroll content horizontally or vertically. |
| [`MessageList`](../codebase/wow-two-front-beta-sdk/src/presentation/display/messageList/) | Scrollable list of chat messages with grouping. |
| [`MetaInline`](../codebase/wow-two-front-beta-sdk/src/presentation/display/metaInline/) | Inline meta row — small metadata items with an optional trailing actions slot. |
| [`MetricChip`](../codebase/wow-two-front-beta-sdk/src/presentation/display/metricChip/) | Compact chip showing a labeled metric (icon + value + label). |
| [`ModuleGlyphs`](../codebase/wow-two-front-beta-sdk/src/presentation/display/moduleGlyphs/) | Decorative SVG geometry glyphs (spec preview shapes). |
| [`NodeEditor`](../codebase/wow-two-front-beta-sdk/src/presentation/display/nodeEditor/) | Visual graph editor: draggable nodes connected by edges. |
| [`NotificationDot`](../codebase/wow-two-front-beta-sdk/src/presentation/display/notificationDot/) | Tiny colored dot for unread/notification indicators. |
| [`PDFViewer`](../codebase/wow-two-front-beta-sdk/src/presentation/display/pdfViewer/) | View a PDF inline. |
| [`PricingCard`](../codebase/wow-two-front-beta-sdk/src/presentation/display/pricingCard/) | Pricing-tier card — name, price, feature list, and CTA. |
| [`Quote`](../codebase/wow-two-front-beta-sdk/src/presentation/display/quote/) | Block-level `<blockquote>` with left rule and italic body. |
| [`RadiusGlyph`](../codebase/wow-two-front-beta-sdk/src/presentation/display/radiusGlyph/) | Decorative SVG glyph illustrating a corner-radius value. |
| [`ReactionBar`](../codebase/wow-two-front-beta-sdk/src/presentation/display/reactionBar/) | Row of emoji-reaction toggles with counts. |
| [`ScheduleView`](../codebase/wow-two-front-beta-sdk/src/presentation/display/scheduleView/) | Multi-resource time-grid: rooms / people / channels along the Y axis, hours along the X axis. |
| [`ScrollReveal`](../codebase/wow-two-front-beta-sdk/src/presentation/display/scrollReveal/) | Wraps children; observes when the wrapper enters the viewport via `IntersectionObserver`; toggles a `data-revealed` attribute that drives a… |
| [`SectionHeader`](../codebase/wow-two-front-beta-sdk/src/presentation/display/sectionHeader/) | Section / page header — title + optional description + right-aligned actions slot. |
| [`Separator`](../codebase/wow-two-front-beta-sdk/src/presentation/display/separator/) | Hairline divider. |
| [`Snippet`](../codebase/wow-two-front-beta-sdk/src/presentation/display/snippet/) | Code text with a built-in copy button. |
| [`Sortable`](../codebase/wow-two-front-beta-sdk/src/presentation/display/sortable/) | Drag-to-reorder list container (provides sortable context to its items). |
| [`Sparkline`](../codebase/wow-two-front-beta-sdk/src/presentation/display/sparkline/) | Inline tiny chart for trends — line / area / bar / dot. |
| [`Stat`](../codebase/wow-two-front-beta-sdk/src/presentation/display/stat/) | Single metric — label + value + optional trend + helper. |
| [`Status`](../codebase/wow-two-front-beta-sdk/src/presentation/display/status/) | Colored dot + text label. |
| [`StepCard`](../codebase/wow-two-front-beta-sdk/src/presentation/display/stepCard/) | Numbered step card for how-it-works / onboarding sequences. |
| [`SwipeActions`](../codebase/wow-two-front-beta-sdk/src/presentation/display/swipeActions/) | Touch-row pattern: drag a row left/right to reveal action buttons (delete, archive, pin). |
| [`Table`](../codebase/wow-two-front-beta-sdk/src/presentation/display/table/) | Styled wrapper around the native HTML table elements. |
| [`Tabs`](../codebase/wow-two-front-beta-sdk/src/presentation/display/tabs/) | Switch between content panels via a row of tabs. |
| [`Tag`](../codebase/wow-two-front-beta-sdk/src/presentation/display/tag/) | Pill with optional close button. |
| [`Text`](../codebase/wow-two-front-beta-sdk/src/presentation/display/text/) | Body-text atom with `size`, `weight`, `color`, `align`, `isTruncated`, `isTabular` variants. |
| [`ThreadView`](../codebase/wow-two-front-beta-sdk/src/presentation/display/threadView/) | Threaded conversation view. |
| [`Tilt`](../codebase/wow-two-front-beta-sdk/src/presentation/display/tilt/) | 3D card tilt effect — rotateX/rotateY based on mouse position relative to the element. |
| [`Timeline`](../codebase/wow-two-front-beta-sdk/src/presentation/display/timeline/) | Vertical activity / event feed — markers connected by a line, each with title + body content. |
| [`Tooltip`](../codebase/wow-two-front-beta-sdk/src/presentation/display/tooltip/) | Hover- and focus-triggered tooltip. |
| [`Tree`](../codebase/wow-two-front-beta-sdk/src/presentation/display/tree/) | Hierarchical list with expandable folder nodes and selectable leaf nodes. |
| [`Typewriter`](../codebase/wow-two-front-beta-sdk/src/presentation/display/typewriter/) | Type out text one character at a time, with a blinking caret. |
| [`VideoPlayer`](../codebase/wow-two-front-beta-sdk/src/presentation/display/videoPlayer/) | `<video>` wrapped with custom controls — play/pause, time, scrubber, volume, captions toggle, speed, picture-in-picture, fullscreen. |

---

### presentation/feedback

`import { … } from '@wow-two-beta/ui/presentation/feedback'` · 27 components

| Component | Purpose |
|---|---|
| [`Alert`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/alert/) | Slotted alert composing `AlertSimple` + Icon + Title + Description + Actions + optional close button. |
| [`AlertSimple`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/alertSimple/) | Atomic styled alert container — colored box, free-form `children`. |
| [`Banner`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/banner/) | Slotted full-width banner — Icon + Title + Description + Actions + close on top of `BannerSimple`. |
| [`BannerSimple`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/bannerSimple/) | Full-width tinted banner — top-of-app status broadcast. |
| [`Callout`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/callout/) | Inline doc-style note — colored left rule, no fill. |
| [`FeedbackToasts`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/feedbackToasts/) | Presentation adapter that renders the headless feedback bus as toasts. |
| [`InlineSpinner`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/inlineSpinner/) | Spinner + label inline — for inside buttons, list rows, anywhere a brief loading affordance is needed. |
| [`LiveCursor`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/liveCursor/) | Renders a remote user's live cursor (colored pointer + label) for multiplayer presence. |
| [`LoadingOverlay`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/loadingOverlay/) | Blocks interaction with a region (or the whole viewport) while a long-running task is in flight. |
| [`LoadingState`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/loadingState/) | Centered Spinner + title + description for full-section/page loads. |
| [`MeterBar`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/meterBar/) | Like `ProgressBar`, but the fill color reflects threshold zones (green / amber / red). |
| [`NotificationCenter`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/notificationCenter/) | Panel listing notifications with read / unread state. |
| [`OnboardingChecklist`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/onboardingChecklist/) | First-run task list that tracks per-task completion + total progress; collapsible card; auto-dismissable when 100%. |
| [`PresenceIndicator`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/presenceIndicator/) | Online / away / offline status dot for a user or avatar. |
| [`ProgressBar`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/progressBar/) | Linear progress. |
| [`ProgressCircle`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/progressCircle/) | Circular progress indicator. |
| [`ProgressSteps`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/progressSteps/) | Visual N-of-M step indicator with connectors. |
| [`Skeleton`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/skeleton/) | Placeholders shaped like content that has not arrived. |
| [`Spinner`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/spinner/) | Indeterminate loading spinner. |
| [`StatusIndicator`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/statusIndicator/) | Two-line status block — colored dot + label + helper. |
| [`Toast`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/toast/) | Slotted toast — visual only. |
| [`ToastSimple`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/toastSimple/) | Atomic toast card — visual only, accepts free-form `children`. |
| [`Toaster`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/toaster/) | Queue + viewport for transient notifications. |
| [`Tour`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/tour/) | Step-by-step product walkthrough. |
| [`TrendIndicator`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/trendIndicator/) | Up / down / flat arrow + value + optional label. |
| [`TypingIndicator`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/typingIndicator/) | Animated "user is typing…" indicator. |
| [`UndoBar`](../codebase/wow-two-front-beta-sdk/src/presentation/feedback/undoBar/) | Snackbar-style notification with a single "Undo" action. |

---

### presentation/forms

`import { … } from '@wow-two-beta/ui/presentation/forms'` · 75 components

| Component | Purpose |
|---|---|
| [`AddressForm`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/addressForm/) | Country-aware address form. |
| [`Calendar`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/calendar/) | Standalone month-grid date picker — header with prev/next month nav, a 7×6 day grid, click-to-select. |
| [`CharacterCount`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/characterCount/) | Counter beneath a length-limited input. |
| [`ChatComposer`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/chatComposer/) | Message composer — multiline input with send / attachment actions. |
| [`Checkbox`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/checkbox/) | Native `<input type="checkbox">` with custom visual. |
| [`CheckboxField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/checkboxField/) | Checkbox + right-side label + optional description, wrapped in a `<label>` so clicking text toggles. |
| [`CheckboxGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/checkboxGroup/) | Multi-select group of `CheckboxField` children inside a `Fieldset` + optional `Legend`. |
| [`ChoiceCard`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/choiceCard/) | Radio styled as a clickable card with title + description + optional icon. |
| [`CodeEditor`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/codeEditor/) | Lightweight code-input field with line numbers and Tab handling. |
| [`ColorArea`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/colorArea/) | 2D saturation/value picker — the square gradient at the heart of every color picker. |
| [`ColorField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/colorField/) | Text input for hex colors with a leading swatch preview. |
| [`ColorPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/colorPicker/) | Full color picker — a trigger swatch that opens a popover containing a saturation/value area, a hue slider, an optional alpha slider, a hex input,… |
| [`ColorSlider`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/colorSlider/) | Horizontal slider for one channel of a color (`hue`, `saturation`, `value`, or `alpha`). |
| [`ColorSwatch`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/colorSwatch/) | Small color-preview chip — a square or circle filled with a color. |
| [`ColorSwatchPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/colorSwatchPicker/) | Grid of clickable color swatches — pick one preset color from a curated palette. |
| [`ColorWheel`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/colorWheel/) | Circular hue picker — a ring with the hue spectrum painted as a conic gradient. |
| [`Combobox`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/combobox/) | Text-input + dropdown — type to filter/search a list of options. |
| [`CronInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/cronInput/) | Text field for cron expressions with a live human-readable preview ("Every 5 minutes", "At 09:00 on Monday and Friday"). |
| [`CurrencyInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/currencyInput/) | `NumberInput` with a leading currency symbol decoration. |
| [`DateField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/dateField/) | Atomic date input — wraps `<input type="date">` with our styling. |
| [`DatePicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/datePicker/) | Date input with a calendar popover — click the trigger to open a `Calendar` for selection. |
| [`DateRangePicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/dateRangePicker/) | Date-range input with a `RangeCalendar` popover. |
| [`DateTimeField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/dateTimeField/) | Combined date + time input field. |
| [`Editable`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/editable/) | Inline-edit text. |
| [`EmailInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/emailInput/) | `<input type="email">` with `autocomplete="email"`, email `inputmode`, spellcheck disabled. |
| [`EmojiPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/emojiPicker/) | Emoji picker over the full bundled emoji catalog (`domain/emoji`, ~1870 base emoji): search + a "recently used" bucket + a swappable category nav. |
| [`EmojiSizeControl`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/emojiSizeControl/) | Standalone emoji size control — a small single-select tile set that previews a given glyph at each preset size (Small / Medium / Large), emitting… |
| [`FormField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/field/) | Label + control + helper + error wrapper. |
| [`Fieldset`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/fieldset/) | Semantic `<fieldset>` reset to remove default browser styles. |
| [`FilePicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/filePicker/) | Basic file picker — styled trigger + visually-hidden native `<input type="file">`. |
| [`FileUpload`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/fileUpload/) | Drag-drop file zone with click-to-pick fallback. |
| [`FontPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/fontPicker/) | Searchable font-family picker with live preview. |
| [`FormErrorMessage`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/formErrorMessage/) | Error copy under a form control. |
| [`FormHelperText`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/formHelperText/) | Hint copy under a form control. |
| [`GradientPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/gradientPicker/) | Visual editor for CSS gradients. |
| [`IconPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/iconPicker/) | Searchable grid for picking an icon by name. |
| [`InputAddon`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/inputAddon/) | Wrap any input with leading and/or trailing addon slots — connected visually to the input. |
| [`InputGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/inputGroup/) | Visually joins a row / column of inputs — collapses inner radii like `ButtonGroup` does for buttons. |
| [`JSONEditor`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/jsonEditor/) | Edit JSON either as raw text (with parse-validation) or via a collapsible tree view. |
| [`KeyboardShortcutPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/keyboardShortcutPicker/) | Capture a keyboard chord by recording the user's next key combination. |
| [`Knob`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/knob/) | Rotational input — a circular dial whose pointer angle maps to a numeric value. |
| [`Label`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/label/) | `<label>` element. |
| [`LabeledInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/labeledInput/) | Lighter alternative to `FormField` — `Label` + control, with id wiring. |
| [`Legend`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/legend/) | `<legend>` styled to match `Label`. |
| [`Listbox`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/listbox/) | Selection list with keyboard navigation. |
| [`MarkdownEditor`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/markdownEditor/) | Markdown input with live HTML preview. |
| [`MaskedInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/maskedInput/) | Text input that enforces a character-class mask. |
| [`MultiSelect`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/multiSelect/) | Multi-select dropdown — button trigger that opens a floating listbox in `isMultiple` mode. |
| [`NumberInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/numberInput/) | `<input type="number">` with stepper buttons. |
| [`PasswordInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/passwordInput/) | `<input type="password">` with optional visibility toggle. |
| [`PasswordStrength`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/passwordStrength/) | Strength meter beneath a password field. |
| [`PercentInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/percentInput/) | `NumberInput` with a trailing `%` decoration. |
| [`PhoneInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/phoneInput/) | International phone input. |
| [`PinInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/pinInput/) | One-time-code / PIN entry — N single-character cells. |
| [`PointControl`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/pointControl/) | Accessible pointer, touch, and keyboard control for selecting a normalized two-dimensional point. |
| [`Radio`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/radio/) | Single radio button. |
| [`RadioField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/radioField/) | Radio + right-side label + optional description, wrapped in a `<label>`. |
| [`RadioGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/radioGroup/) | Mutex group of `RadioField` children. |
| [`RangeCalendar`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/rangeCalendar/) | Date-range picker — same calendar grid as `Calendar` but selects a `{ start, end }` range. |
| [`ReactionPicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/reactionPicker/) | Popover picker for choosing an emoji reaction. |
| [`RecurrenceEditor`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/recurrenceEditor/) | Build an iCal RRULE string visually. |
| [`SearchInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/searchInput/) | `<input type="search">` with leading magnifier and optional clear button. |
| [`Select`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/select/) | Single-select dropdown — a button trigger that opens a floating `role="listbox"`. |
| [`Slider`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/slider/) | Single-value range slider. |
| [`Stepper`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/stepper/) | Multi-step workflow indicator + panel switcher. |
| [`Switch`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/switch/) | Toggle switch — native checkbox with `role="switch"`, styled as track + thumb. |
| [`SwitchField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/switchField/) | Switch + label + optional description in one clickable `<label>`. |
| [`TagsInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/tagsInput/) | Free-form tag entry. |
| [`TelInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/telInput/) | `<input type="tel">` with `autocomplete="tel"` and `inputmode="tel"`. |
| [`TextAreaInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/textAreaInput/) | Multi-line text input. |
| [`TextInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/textInput/) | Single-line `<input type="text">`. |
| [`TimeField`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/timeField/) | Atomic time input — wraps `<input type="time">` with our styling. |
| [`TimePicker`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/timePicker/) | Time input with a popover containing hour and minute lists. |
| [`UrlInput`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/urlInput/) | `<input type="url">` with `autocomplete="url"`, `inputmode="url"`, spellcheck off. |
| [`Wizard`](../codebase/wow-two-front-beta-sdk/src/presentation/forms/wizard/) | Multi-step form flow: one step visible at a time, with prev/next navigation, per-step validation, optional jump-back-to-edit. |

---

### presentation/layout

`import { … } from '@wow-two-beta/ui/presentation/layout'` · 24 components

| Component | Purpose |
|---|---|
| [`AppShell`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/appShell/) | Top-level page frame: Header / Sidebar / Main / Aside / Footer slots arranged in a CSS grid. |
| [`AspectRatio`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/aspectRatio/) | Constrain children to a `width / height` ratio. |
| [`Box`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/box/) | Lowest-level layout primitive — a polymorphic `div` (or any HTML element) for styling shells when no other layout atom fits. |
| [`Center`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/center/) | Flex shorthand: `flex items-center justify-center`. |
| [`Cluster`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/cluster/) | Centered wrapping row — auth pages, hero CTA pairs, footer link groups. |
| [`Container`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/container/) | Centered max-width wrapper with horizontal padding. |
| [`ControlGroup`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/controlGroup/) | Groups a labelled set of controls into one connected block (label + content). |
| [`Divider`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/divider/) | A rule between content — plain, or with a centered label; orientation is required. |
| [`Flex`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/flex/) | Bare `display: flex` container. |
| [`Frame`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/frame/) | Bordered shell with padding + radius — `Card`'s visuals without the slot semantics. |
| [`Grid`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/grid/) | CSS grid container with `columns` (1–12) and `gap` variants. |
| [`HStack`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/hStack/) | `Stack` preset with `direction="row"`. |
| [`Inline`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/inline/) | Wrapping horizontal row with consistent gap. |
| [`Navbar`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/navbar/) | Lightweight header band (`<header>`) with `start` / `center` / `end` slots laid out in a row inside a centered `Container`. |
| [`Overlay`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/overlay/) | Layout primitive that absolutely-positions a child within its nearest positioned ancestor, with optional reveal-on-hover/focus and mount/unmount… |
| [`PullToRefresh`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/pullToRefresh/) | Mobile gesture: drag down past a threshold while at scrollTop=0 to trigger an async refresh. |
| [`ResizablePanels`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/resizablePanels/) | Split-pane layout with draggable separators. |
| [`ScrollArea`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/scrollArea/) | Native-scrollbar container. |
| [`Section`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/section/) | Full-bleed `<section>` band with an inner centered `Container`. |
| [`Spacer`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/spacer/) | Flexible empty box. |
| [`Stack`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/stack/) | Flex container with `direction`, `gap`, `align`, `justify`, `wrap` variants. |
| [`Surface`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/surface/) | Themed surface container atom — background, border, and elevation tokens. |
| [`TwoColumn`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/twoColumn/) | Two-pane layout — fixed-width aside + flexible main. |
| [`VStack`](../codebase/wow-two-front-beta-sdk/src/presentation/layout/vStack/) | `Stack` preset with `direction="column"` — matches `Stack`'s default but provided for symmetry with `HStack`. |

---

### presentation/nav

`import { … } from '@wow-two-beta/ui/presentation/nav'` · 11 components

| Component | Purpose |
|---|---|
| [`Breadcrumb`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/breadcrumb/) | Linear position trail — links + separator. |
| [`CommandPalette`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/commandPalette/) | Cmd/Ctrl-K-style searchable action menu. |
| [`ContextMenu`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/contextMenu/) | Right-click menu — wraps a target area; opens at the pointer position. |
| [`DropdownMenu`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/dropdownMenu/) | Button-triggered menu — most common menu shape. |
| [`Menu`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/menu/) | Raw floating menu primitive — bring-your-own-anchor and bring-your-own-open-state. |
| [`Menubar`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/menubar/) | Horizontal menu strip — File · Edit · View pattern from desktop apps. |
| [`NavItem`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/navItem/) | Sidebar / nav row — icon + label + trailing slot + active state. |
| [`NavigationMenu`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/navigationMenu/) | Top-level site/app navigation with optional rich content panels per item — the "mega menu" pattern. |
| [`Pagination`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/pagination/) | Page-number row with prev/next + ellipses for skipped ranges. |
| [`ScrollSpy`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/scrollSpy/) | Observe a list of section elements and emit which one is currently in view. |
| [`TableOfContents`](../codebase/wow-two-front-beta-sdk/src/presentation/nav/tableOfContents/) | Auto-generated outline of headings in a document, paired with `ScrollSpy` to highlight the section currently in view. |

---

### presentation/overlays

`import { … } from '@wow-two-beta/ui/presentation/overlays'` · 8 components

| Component | Purpose |
|---|---|
| [`ActionSheet`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/actionSheet/) | iOS-style list of actions sliding up from the bottom of the viewport. |
| [`AlertDialog`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/alertModal/) | Confirm-style dialog — a `Dialog` variant that requires explicit user action to close. |
| [`Backdrop`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/backdrop/) | Raw scrim primitive — fixed-position, full-viewport, semi-transparent layer. |
| [`BottomSheet`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/bottomSheet/) | Mobile-style bottom sheet with drag handle and snap points. |
| [`Drawer`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/drawer/) | Side-anchored modal — slides in from the edge of the viewport. |
| [`HoverCard`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/hoverCard/) | Hover- and focus-triggered floating panel — richer than `Tooltip`, less interruptive than `Popover`. |
| [`Dialog`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/modal/) | Modal dialog — blocking overlay that traps focus and dims the page. |
| [`Popover`](../codebase/wow-two-front-beta-sdk/src/presentation/overlays/popover/) | Click-triggered floating panel anchored to a trigger element. |

---

### foundation/primitives

`import { … } from '@wow-two-beta/ui/foundation/primitives'` · 17 primitives (L2 headless)

| Primitive | Purpose |
|---|---|
| [`AccessibleIcon`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/accessibleIcon/) | Pairs a decorative (aria-hidden) icon with a visually-hidden accessible label. |
| [`AnchoredPositioner`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/anchoredPositioner/) | Positions a floating element against an anchor (placement, offset, flip, shift). |
| [`Announce`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/announce/) | Visually-hidden ARIA live region for screen-reader announcements. |
| [`Collection`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/collection/) | Tracks descendant items in DOM order for keyboard-navigable components. |
| [`ColorModeProvider`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/colorModeProvider/) | Provides and toggles light / dark color mode via context + the `dark` class. |
| [`DirectionProvider`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/directionProvider/) | Provides text direction (ltr / rtl) to descendants. |
| [`DismissableLayer`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/dismissableLayer/) | Dismisses content on outside-pointer / Escape, coordinating nested layers. |
| [`FocusScope`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/focusScope/) | Contains / traps focus within a region and restores it on unmount. |
| [`FormControlContext`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/formControlContext/) | Shares a Field's id / label / error / disabled wiring down to its control. |
| [`OverlayArrow`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/overlayArrow/) | Positioned arrow pointing from a floating panel to its anchor. |
| [`Portal`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/portal/) | Renders children into another DOM node (default `document.body`). |
| [`Presence`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/presence/) | Keeps an element mounted across enter / exit so transitions can play before unmount. |
| [`RovingFocusGroup`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/rovingFocusGroup/) | Single tab-stop group with arrow-key roving focus across items (DOM order). |
| [`ScrollLockProvider`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/scrollLockProvider/) | Locks body scroll with scrollbar-gutter compensation while an overlay is open. |
| [`ScrollViewport`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/scrollViewport/) | Scrollable region that reserves the scrollbar gutter to avoid layout shift. |
| [`Slot`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/slot/) | Merges its props and ref onto a single child element (the `asChild` primitive). |
| [`VisuallyHidden`](../codebase/wow-two-front-beta-sdk/src/foundation/primitives/visuallyHidden/) | Hides content visually while keeping it available to screen readers. |
