> Lane evidence. The [combined implementation report](full-sweep-implementation.md) owns final package verification.

# Bounded Vue presentation sweep

## Coverage

Inventory: `/private/tmp/vue-presentation-inventory.tsv`, 184 in-scope SFCs: actions14, display106, layout37, feedback27. This is an inventory/pattern screening pass, not a claim that all184 components received new interaction tests.

Deep implementation review and fixes: ResizablePanelsLayout + Panel/Separator/context, StepperGroup + Step/List/Panel/context, AudioPlayer, VideoPlayer, UndoBar, ToastHost. Pattern inspection also covered action implementations (Button, BackToTopButton, CopyButton, DisclosureButton, FabButton, SpeedDialGroup family, Toolbar family), plus MessageGroup, PullToRefreshLayout and SwipeActionsLayout in the initial stateful screening.

Excluded parent-active families stayed untouched: DiffViewer/LineDiff, AudioWaveformPreview, EventCalendarViewer, DataTable, Carousel, PdfViewer, TypewriterText. GoogleSignInButton stayed with integration lane.

## Implemented

- ResizablePanelsLayout registration no longer emits empty/equal intermediate sizes into controlled models. Both-panel feasible constraints are solved as one interval for drag, keyboard and reset. Zero default weights reset equally instead of producing NaN. Drag cleanup restores preexisting cursor/user-select styles and owns global listeners, including separator unmount. Caller-cancelled mousedown is respected.
- Stepper registration now owns a symbol token, updates renamed values in place, and removes exactly its own registration. Numeric zero descriptions render. Existing roving-focus disabled handling was verified in shared primitives; no duplicate workaround added.
- UndoBar independently tracks hover and descendant focus; mouseleave cannot expire a keyboard-focused Undo action. Live duration changes restart the intended budget.
- ToastHost independently tracks hover and descendant focus. Its promise helper returns the full settlement chain, so formatter errors are observable instead of unhandled derived rejections. Dismissal always updates subscribers even when callbacks throw.
- AudioPlayer/VideoPlayer show actual native playback state rather than assuming autoplay succeeded. Source replacement/emptied resets seek and duration. Infinite duration stays outside numeric range controls. Volume respects native0..1 semantics; unsupported/nonfinite playback rates fall back to1.
- Video keyboard focus keeps controls visible. Captions operate only on captions/subtitles, prefer declared default language, display at most one, and leave chapters/metadata alone. Fullscreen/PiP exits only this player’s session. Poster passes the existing safe-resource URL boundary.
- ExactNumberInput now extends shared type-only NativeInputAttributes<'onInvalid'>: native blur/name/etc are accepted while custom invalid(NumberFailure,draft) remains canonical. Parent owns packed compiler fixture.

## Public contract notes

No new presentation props/events. Controlled size initialization emits no user intent. Step values must remain unique for selected state/panel IDs. Internal exported StepperGroupContext registration signature is now token-owned; no component consumer needs to call it. ResizableContext beginDrag returns whether a drag started. toastHost.promise returns an observed promise rather than the original promise identity; value/rejection remains the original outcome unless its formatter throws. Adjacent six specs document behavior.

## Verification

24 focused DOM tests across five files passed (19 existing foundation/control plus presentation cases, then5 media cases after source-reset ordering correction). New presentation regression files contain16 cases:5 Resizable,1 Stepper,5 feedback and5 media. ExactNumberInput’s8 cases also passed with native attribute typing.

Isolated vue-tsc: `/private/tmp/vue-presentation-typecheck.json`.
Owned source/tests ESLint and Prettier checks run. No full suite, package build, staging or commits were performed by this lane.

## Further candidates passed to parent

Not changed in this bounded pass: Button pointerleave cancels its timer but may retain isPressing after pointerup outside; SpeedDialGroup arrow navigation collects disabled menuitems. These are source hypotheses requiring focused reproduction, not verified fixed claims.

## Test artifacts

- tests/unit/presentation/layout/ResizablePanels.dom.test.ts
- tests/unit/presentation/display/StepperGroup.dom.test.ts
- tests/unit/presentation/display/MediaPlayerState.dom.test.ts
- tests/unit/presentation/feedback/FeedbackOwnership.dom.test.ts (split on 2026-11-17 into `ToastHostStack`, `ToastHostTimer` and `UndoBarTimer`)

Parent closure: Button pointer-leave and secondary/IME gesture regressions passed; SpeedDial disabled/focus/exit behavior gained four passing regressions. Combined gates below supersede lane-local snapshots.
