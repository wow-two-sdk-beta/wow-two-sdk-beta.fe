# Vue component message catalogue

*Source snapshot: 2026-09-25 full SDK sweep; gap-close keys added 2026-09-26 and 2026-09-28; app switcher and
password toggle keys added 2026-10-18.*

Static component keys and English fallbacks extracted from source. Supply overrides through
`LocaleProvider.messages`. Placeholders retain their names; complete messages can reorder them.
Explicit text props and slots override these defaults. Dynamic validation/enum keys are described
in their capability specifications and are not inferred by this catalogue.

| Key | English fallback | Source |
|---|---|---|
| `ActionSheetCancel.cancel` | Cancel | [ActionSheetCancel.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/actionSheet/ActionSheetCancel.vue) |
| `AddressEditor.addressLine1` | Address line 1 | [AddressEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/addressEditor/AddressEditor.vue) |
| `AddressEditor.addressLine2` | Address line 2 | [AddressEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/addressEditor/AddressEditor.vue) |
| `AddressEditor.city` | City | [AddressEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/addressEditor/AddressEditor.vue) |
| `AddressEditor.country` | Country | [AddressEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/addressEditor/AddressEditor.vue) |
| `AddressEditor.optional` | (optional) | [AddressEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/addressEditor/AddressEditor.vue) |
| `AddressEditor.other` | Other | [AddressEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/addressEditor/AddressEditor.vue) |
| `AgendaView.noUpcomingEvents` | No upcoming events. | [AgendaView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/AgendaView.vue) |
| `Alert.closeLabel` | Dismiss | [Alert.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/alert/Alert.vue) |
| `AppShell.skipToContent` | Skip to content | [AppShell.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/layout/appShell/AppShell.vue) |
| `AppSwitcherMenu.closeLabel` | Close | [AppSwitcherMenu.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/appSwitcherMenu/AppSwitcherMenu.vue) |
| `AppSwitcherMenu.newTabLabel` | (opens in a new tab) | [AppSwitcherMenu.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/appSwitcherMenu/AppSwitcherMenu.vue) |
| `AppSwitcherMenu.sitesLabel` | Sites | [AppSwitcherMenu.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/appSwitcherMenu/AppSwitcherMenu.vue) |
| `AppSwitcherMenu.title` | Apps | [AppSwitcherMenu.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/appSwitcherMenu/AppSwitcherMenu.vue) |
| `AppSwitcherMenu.triggerLabel` | {app} — switch app | [AppSwitcherMenu.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/appSwitcherMenu/AppSwitcherMenu.vue) |
| `AudioPlayer.audioPlayer` | Audio player | [AudioPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/audioPlayer/AudioPlayer.vue) |
| `AudioPlayer.playbackSpeed` | Playback speed | [AudioPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/audioPlayer/AudioPlayer.vue) |
| `AudioPlayer.seek` | Seek | [AudioPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/audioPlayer/AudioPlayer.vue) |
| `AudioWaveformPreview.audioWaveform` | Audio waveform | [AudioWaveformPreview.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/audioWaveformPreview/AudioWaveformPreview.vue) |
| `BackToTopButton.label` | Back to top | [BackToTopButton.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/actions/backToTopButton/BackToTopButton.vue) |
| `Banner.closeLabel` | Dismiss | [Banner.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/banner/Banner.vue) |
| `BottomNavMenu.label` | Primary | [BottomNavMenu.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/bottomNavMenu/BottomNavMenu.vue) |
| `Breadcrumb.breadcrumb` | Breadcrumb | [Breadcrumb.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/breadcrumb/Breadcrumb.vue) |
| `Carousel.pauseLabel` | Pause slides | [Carousel.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/Carousel.vue) |
| `Carousel.resumeLabel` | Resume slides | [Carousel.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/Carousel.vue) |
| `CarouselDot.goToSlide` | Go to slide {index} | [CarouselDot.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/CarouselDot.vue) |
| `CarouselNext.nextSlide` | Next slide | [CarouselNext.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/CarouselNext.vue) |
| `CarouselPrev.previousSlide` | Previous slide | [CarouselPrev.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/CarouselPrev.vue) |
| `CarouselSlides.position` | {index} of {total} | [CarouselSlides.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/CarouselSlides.vue) |
| `CarouselSlides.slide` | slide | [CarouselSlides.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/CarouselSlides.vue) |
| `CarouselViewport.carousel` | carousel | [CarouselViewport.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/CarouselViewport.vue) |
| `CarouselViewport.label` | Carousel | [CarouselViewport.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/carousel/CarouselViewport.vue) |
| `CascaderPicker.placeholder` | Pick an option | [CascaderPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/cascaderPicker/CascaderPicker.vue) |
| `CategoryNav.emojiCategories` | Emoji categories | [CategoryNav.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/emojiPicker/CategoryNav.vue) |
| `CellEditor.false` | false | [CellEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/dataGridEditor/CellEditor.vue) |
| `CellEditor.true` | true | [CellEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/dataGridEditor/CellEditor.vue) |
| `ChatBubbleCard.status` | Status: {status} | [ChatBubbleCard.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/chatBubbleCard/ChatBubbleCard.vue) |
| `ChatComposerInput.placeholder` | Write a message… | [ChatComposerInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/chatComposerInput/ChatComposerInput.vue) |
| `ChatComposerInput.sendMessage` | Send message | [ChatComposerInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/chatComposerInput/ChatComposerInput.vue) |
| `CodeEditor.keyboardExitLabel` | Press Escape, then Tab to leave the editor. | [CodeEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/codeEditor/CodeEditor.vue) |
| `ColorArea.saturation` | Saturation | [ColorArea.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorArea/ColorArea.vue) |
| `ColorArea.value` | Brightness | [ColorArea.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorArea/ColorArea.vue) |
| `ColorPicker.alpha` | Alpha | [ColorPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorPicker/ColorPicker.vue) |
| `ColorPicker.colorPicker` | Color picker | [ColorPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorPicker/ColorPicker.vue) |
| `ColorPicker.hexColor` | Hex color | [ColorPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorPicker/ColorPicker.vue) |
| `ColorPicker.hue` | Hue | [ColorPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorPicker/ColorPicker.vue) |
| `Comment.collapse` | Collapse | [Comment.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/commentThreadGroup/Comment.vue) |
| `CommentThreadGroup.comments` | Comments | [CommentThreadGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/commentThreadGroup/CommentThreadGroup.vue) |
| `ConfirmPopover.cancelLabel` | Cancel | [ConfirmPopover.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/confirmPopover/ConfirmPopover.vue) |
| `ConfirmPopover.confirmLabel` | Confirm | [ConfirmPopover.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/confirmPopover/ConfirmPopover.vue) |
| `CountdownText.days` | {days}d | [CountdownText.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/countdownText/CountdownText.vue) |
| `DataTable.collapseRow` | Hide details | [DataTable.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/dataTable/DataTable.vue) |
| `DataTable.emptyContent` | No results. | [DataTable.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/dataTable/DataTable.vue) |
| `DataTable.expandColumn` | Details | [DataTable.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/dataTable/DataTable.vue) |
| `DataTable.expandRow` | Show details | [DataTable.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/dataTable/DataTable.vue) |
| `DataTable.selectAll` | Select all rows | [DataTable.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/dataTable/DataTable.vue) |
| `DataTable.selectColumn` | Select | [DataTable.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/dataTable/DataTable.vue) |
| `DataTable.selectRow` | Select row | [DataTable.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/dataTable/DataTable.vue) |
| `DateInput.chooseDate` | Choose date | [DateInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/dateInput/DateInput.vue) |
| `DatePicker.placeholder` | Pick a date | [DatePicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/datePicker/DatePicker.vue) |
| `DateRangePicker.placeholder` | Pick a range | [DateRangePicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/dateRangePicker/DateRangePicker.vue) |
| `DateTimeInput.chooseDateAndTime` | Choose date and time | [DateTimeInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/dateTimeInput/DateTimeInput.vue) |
| `DiffViewer.leftLabel` | Before | [DiffViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/diffViewer/DiffViewer.vue) |
| `DiffViewer.rightLabel` | After | [DiffViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/diffViewer/DiffViewer.vue) |
| `EditableInput.placeholder` | Click to edit | [EditableInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/editableInput/EditableInput.vue) |
| `EditableInputCancel.cancel` | Cancel | [EditableInputCancel.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/editableInput/EditableInputCancel.vue) |
| `EditableInputSubmit.submit` | Submit | [EditableInputSubmit.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/editableInput/EditableInputSubmit.vue) |
| `EmojiGrid.emoji` | Emoji | [EmojiGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/emojiPicker/EmojiGrid.vue) |
| `EmojiPicker.label` | Emoji | [EmojiPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/emojiPicker/EmojiPicker.vue) |
| `EmojiPicker.none` | None | [EmojiPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/emojiPicker/EmojiPicker.vue) |
| `EmojiPicker.searchEmoji` | Search emoji… | [EmojiPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/emojiPicker/EmojiPicker.vue) |
| `EmojiPickerPopover.chooseEmoji` | Choose emoji | [EmojiPickerPopover.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/emojiPicker/EmojiPickerPopover.vue) |
| `ErrorBoundary.retryLabel` | Try again | [ErrorBoundary.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/errorBoundary/ErrorBoundary.vue) |
| `ErrorBoundary.title` | Something went wrong | [ErrorBoundary.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/errorBoundary/ErrorBoundary.vue) |
| `EventCalendarViewer.allDay` | All day | [AgendaView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/AgendaView.vue) |
| `EventCalendarViewer.eventAt` | {title} at {time} | [MonthView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/MonthView.vue) |
| `EventCalendarViewer.next` | Next | [EventCalendarViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue) |
| `EventCalendarViewer.previous` | Previous | [EventCalendarViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue) |
| `EventCalendarViewer.slotAt` | {date} at {time} | [TimeGridView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/TimeGridView.vue) |
| `EventCalendarViewer.today` | Today | [EventCalendarViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue) |
| `EventCalendarViewer.untitled` | (no title) | [TimeGridView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/TimeGridView.vue) |
| `EventCalendarViewer.upcomingFrom` | Upcoming from {date} | [EventCalendarViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue) |
| `EventCalendarViewer.view` | View | [EventCalendarViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue) |
| `ExactNumberInput.invalidMessage` | Enter a complete decimal number using a dot as the decimal separator. | [ExactNumberInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/exactNumberInput/ExactNumberInput.vue) |
| `FilePicker.label` | Choose file | [FilePicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/filePicker/FilePicker.vue) |
| `FileUploadPicker.label` | Drop files here, or click to browse | [FileUploadPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/fileUploadPicker/FileUploadPicker.vue) |
| `FontPicker.fonts` | Fonts | [FontPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/fontPicker/FontPicker.vue) |
| `FontPicker.noFontsMatch` | No fonts match. | [FontPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/fontPicker/FontPicker.vue) |
| `FontPicker.placeholder` | SelectPicker font… | [FontPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/fontPicker/FontPicker.vue) |
| `FontPicker.previewText` | The quick brown fox | [FontPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/fontPicker/FontPicker.vue) |
| `FontPicker.searchFonts` | Search fonts… | [FontPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/fontPicker/FontPicker.vue) |
| `GanttTimeline.ganttTimelineChart` | GanttTimeline chart | [GanttTimeline.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/ganttTimeline/GanttTimeline.vue) |
| `GanttTimeline.task` | Task | [GanttTimeline.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/ganttTimeline/GanttTimeline.vue) |
| `GradientPicker.addStop` | Add stop | [GradientPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/gradientPicker/GradientPicker.vue) |
| `GradientPicker.angle` | Angle | [GradientPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/gradientPicker/GradientPicker.vue) |
| `GradientPicker.gradientKind` | Gradient kind | [GradientPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/gradientPicker/GradientPicker.vue) |
| `GradientPicker.removeStop` | Remove stop | [GradientPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/gradientPicker/GradientPicker.vue) |
| `GradientPicker.stopColor` | Stop color | [GradientPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/gradientPicker/GradientPicker.vue) |
| `GradientPicker.stopColorHex` | Stop color hex | [GradientPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/gradientPicker/GradientPicker.vue) |
| `GradientPicker.stopPosition` | Stop position | [GradientPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/gradientPicker/GradientPicker.vue) |
| `GradientText.pauseLabel` | Pause animation | [GradientText.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/gradientText/GradientText.vue) |
| `GradientText.resumeLabel` | Resume animation | [GradientText.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/gradientText/GradientText.vue) |
| `HeatmapCalendarGrid.less` | Less | [HeatmapCalendarGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/heatmapCalendarGrid/HeatmapCalendarGrid.vue) |
| `HeatmapCalendarGrid.more` | More | [HeatmapCalendarGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/heatmapCalendarGrid/HeatmapCalendarGrid.vue) |
| `IconPicker.icons` | Icons | [IconPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/iconPicker/IconPicker.vue) |
| `IconPicker.noIconsMatch` | No icons match. | [IconPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/iconPicker/IconPicker.vue) |
| `IconPicker.placeholder` | Search icons… | [IconPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/iconPicker/IconPicker.vue) |
| `ImageCropEditor.hint` | Arrow keys move the crop; Alt with arrow keys resizes it; Shift moves ten times farther. | [ImageCropEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/imageCropEditor/ImageCropEditor.vue) |
| `ImageCropEditor.label` | Crop area | [ImageCropEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/imageCropEditor/ImageCropEditor.vue) |
| `ImageCropEditor.status` | {width} × {height} at {x}, {y} | [ImageCropEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/imageCropEditor/ImageCropEditor.vue) |
| `InlineSpinner.loading` | Loading… | [InlineSpinner.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/inlineSpinner/InlineSpinner.vue) |
| `JsonEditor.jsonMode` | JSON mode | [JsonEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/jsonEditor/JsonEditor.vue) |
| `JsonEditorTextView.jsonSource` | JSON source | [JsonEditorTextView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/jsonEditor/JsonEditorTextView.vue) |
| `JsonEditorTreeNode.collapse` | Collapse | [JsonEditorTreeNode.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/jsonEditor/JsonEditorTreeNode.vue) |
| `JsonEditorTreeNode.editValue` | Edit value | [JsonEditorTreeNode.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/jsonEditor/JsonEditorTreeNode.vue) |
| `JsonEditorTreeNode.expand` | Expand | [JsonEditorTreeNode.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/jsonEditor/JsonEditorTreeNode.vue) |
| `KanbanBoard.hint` | Press Alt with the arrow keys to move this card. | [KanbanBoard.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/kanbanBoard/KanbanBoard.vue) |
| `KanbanBoard.moved` | Moved {card} to {column}, position {position} of {total} | [KanbanBoard.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/kanbanBoard/KanbanBoard.vue) |
| `KeyboardShortcutPicker.placeholder` | Click to record | [KeyboardShortcutPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/keyboardShortcutPicker/KeyboardShortcutPicker.vue) |
| `KeyboardShortcutPicker.recordLabel` | Press keys… | [KeyboardShortcutPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/keyboardShortcutPicker/KeyboardShortcutPicker.vue) |
| `KnobInput.label` | Knob | [KnobInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/knobInput/KnobInput.vue) |
| `LightboxModal.counter` | {current} of {total} | [LightboxModal.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/lightboxModal/LightboxModal.vue) |
| `LightboxModal.label` | Image viewer | [LightboxModal.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/lightboxModal/LightboxModal.vue) |
| `LightboxModal.next` | Next image | [LightboxModal.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/lightboxModal/LightboxModal.vue) |
| `LightboxModal.previous` | Previous image | [LightboxModal.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/lightboxModal/LightboxModal.vue) |
| `LoadingOverlay.label` | Loading… | [LoadingOverlay.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/loadingOverlay/LoadingOverlay.vue) |
| `LoadingOverlay.loading` | Loading | [LoadingOverlay.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/loadingOverlay/LoadingOverlay.vue) |
| `LoadingState.title` | Loading… | [LoadingState.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/loadingState/LoadingState.vue) |
| `MarkdownEditor.markdownFormatting` | Markdown formatting | [MarkdownEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/markdownEditor/MarkdownEditor.vue) |
| `MarkdownEditor.preview` | Preview | [MarkdownEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/markdownEditor/MarkdownEditor.vue) |
| `MarkdownEditor.viewMode` | View mode | [MarkdownEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/markdownEditor/MarkdownEditor.vue) |
| `MarqueeGroup.pauseLabel` | Pause animation | [MarqueeGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/marqueeGroup/MarqueeGroup.vue) |
| `MarqueeGroup.resumeLabel` | Resume animation | [MarqueeGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/marqueeGroup/MarqueeGroup.vue) |
| `MentionInput.label` | Suggestions | [MentionInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/mentionInput/MentionInput.vue) |
| `MentionInput.suggestions` | {count} suggestions | [MentionInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/mentionInput/MentionInput.vue) |
| `MessageGroup.jumpToLatest` | Jump to latest | [MessageGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/messageGroup/MessageGroup.vue) |
| `MonthGrid.nextMonth` | Next month | [MonthGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/MonthGrid.vue) |
| `MonthGrid.previousMonth` | Previous month | [MonthGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/MonthGrid.vue) |
| `MonthPicker.placeholder` | Pick a month | [MonthPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/monthPicker/MonthPicker.vue) |
| `MonthView.more` | +{count} more | [MonthView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/eventCalendarViewer/MonthView.vue) |
| `NotificationCenterGroup.notifications` | Notifications | [NotificationCenterGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/notificationCenterGroup/NotificationCenterGroup.vue) |
| `NotificationCenterGroup.title` | Notifications | [NotificationCenterGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/notificationCenterGroup/NotificationCenterGroup.vue) |
| `NotificationCenterGroup.youreAllCaughtUp` | You're all caught up. | [NotificationCenterGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/notificationCenterGroup/NotificationCenterGroup.vue) |
| `NotificationItem.dismissNotification` | Dismiss notification | [NotificationItem.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/notificationCenterGroup/NotificationItem.vue) |
| `NumberInput.decrementLabel` | Decrement | [NumberInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/numberInput/NumberInput.vue) |
| `NumberInput.incrementLabel` | Increment | [NumberInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/numberInput/NumberInput.vue) |
| `OnboardingChecklistCard.progress` | {done} of {total} tasks complete | [OnboardingChecklistCard.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/onboardingChecklistCard/OnboardingChecklistCard.vue) |
| `OnboardingChecklistCard.title` | Get started | [OnboardingChecklistCard.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/onboardingChecklistCard/OnboardingChecklistCard.vue) |
| `OverflowGroup.hiddenItems` | {count} more | [OverflowGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/overflowGroup/OverflowGroup.vue) |
| `OverflowGroup.overflowLabel` | +{count} | [OverflowGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/overflowGroup/OverflowGroup.vue) |
| `OverlayCloseButton.close` | Close | [OverlayCloseButton.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/OverlayCloseButton.vue) |
| `Pagination.firstPage` | First page | [Pagination.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/pagination/Pagination.vue) |
| `Pagination.lastPage` | Last page | [Pagination.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/pagination/Pagination.vue) |
| `Pagination.nextPage` | Next page | [Pagination.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/pagination/Pagination.vue) |
| `Pagination.pagination` | Pagination | [Pagination.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/pagination/Pagination.vue) |
| `Pagination.previousPage` | Previous page | [Pagination.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/pagination/Pagination.vue) |
| `PasswordInput.concealLabel` | Hide password | [PasswordInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/passwordInput/PasswordInput.vue) |
| `PasswordInput.revealLabel` | Show password | [PasswordInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/passwordInput/PasswordInput.vue) |
| `PdfViewer.downloadPDF` | Download PDF | [PdfViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pdfViewer/PdfViewer.vue) |
| `PdfViewer.nextPage` | Next page | [PdfViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pdfViewer/PdfViewer.vue) |
| `PdfViewer.pageNumber` | Page {page} | [PdfViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pdfViewer/PdfViewer.vue) |
| `PdfViewer.previousPage` | Previous page | [PdfViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pdfViewer/PdfViewer.vue) |
| `PdfViewer.title` | PDF document | [PdfViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pdfViewer/PdfViewer.vue) |
| `PdfViewer.zoomIn` | Zoom in | [PdfViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pdfViewer/PdfViewer.vue) |
| `PdfViewer.zoomOut` | Zoom out | [PdfViewer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pdfViewer/PdfViewer.vue) |
| `PeriodGrid.nextDecade` | Next decade | [PeriodGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/PeriodGrid.vue) |
| `PeriodGrid.nextYear` | Next year | [PeriodGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/PeriodGrid.vue) |
| `PeriodGrid.previousDecade` | Previous decade | [PeriodGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/PeriodGrid.vue) |
| `PeriodGrid.previousYear` | Previous year | [PeriodGrid.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/PeriodGrid.vue) |
| `PhoneInput.country` | Country | [PhoneInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/phoneInput/PhoneInput.vue) |
| `PinInput.character` | Character {index} of {length} | [PinInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/pinInput/PinInput.vue) |
| `PinInput.digit` | Digit {index} of {length} | [PinInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/pinInput/PinInput.vue) |
| `PricingCard.badgeLabel` | Most popular | [PricingCard.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/pricingCard/PricingCard.vue) |
| `RangeSliderInput.endLabel` | Maximum | [RangeSliderInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/rangeSliderInput/RangeSliderInput.vue) |
| `RangeSliderInput.startLabel` | Minimum | [RangeSliderInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/rangeSliderInput/RangeSliderInput.vue) |
| `RatingPicker.noRating` | No rating | [RatingPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/ratingPicker/RatingPicker.vue) |
| `RatingPicker.valueText` | {value} of {max} | [RatingPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/ratingPicker/RatingPicker.vue) |
| `ReactionBar.addReaction` | Add reaction | [ReactionBar.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/reactionBar/ReactionBar.vue) |
| `ReactionBar.reactions` | Reactions | [ReactionBar.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/reactionBar/ReactionBar.vue) |
| `ReactionPicker.moreReactions` | More reactions | [ReactionPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/reactionPicker/ReactionPicker.vue) |
| `ReactionPicker.reactionPicker` | Reaction picker | [ReactionPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/reactionPicker/ReactionPicker.vue) |
| `RecurrenceEditor.after` | After | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.daysOfWeek` | Days of week | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.endDate` | End date | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.endMode` | End mode | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.every` | Every | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.frequency` | Frequency | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.never` | Never | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.nextOccurrences` | Next occurrences | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.occurrenceCount` | Occurrence count | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.occurrences` | occurrences | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.ofTheMonth` | of the month | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.on` | On | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.onDay` | On day | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `RecurrenceEditor.pickADate` | Pick a date | [RecurrenceEditor.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/recurrenceEditor/RecurrenceEditor.vue) |
| `ScheduleView.schedule` | Schedule | [ScheduleView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/scheduleView/ScheduleView.vue) |
| `SearchInput.clearSearch` | Clear search | [SearchInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/searchInput/SearchInput.vue) |
| `SelectPicker.clearLabel` | Clear selection | [SelectPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPicker.vue) |
| `SelectPicker.loadingLabel` | Loading options… | [SelectPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPicker.vue) |
| `SelectPickerContent.noResultsLabel` | No results | [SelectPickerContent.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPickerContent.vue) |
| `SelectPickerContent.searchPlaceholder` | Search… | [SelectPickerContent.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPickerContent.vue) |
| `SidebarMenu.label` | Sidebar | [SidebarMenu.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/sidebarMenu/SidebarMenu.vue) |
| `SignatureInput.clear` | Clear | [SignatureInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/signatureInput/SignatureInput.vue) |
| `SignatureInput.label` | Signature | [SignatureInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/signatureInput/SignatureInput.vue) |
| `SignatureInput.placeholder` | Sign here | [SignatureInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/signatureInput/SignatureInput.vue) |
| `SignatureInput.signed` | Signed | [SignatureInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/signatureInput/SignatureInput.vue) |
| `SignatureInput.undo` | Undo | [SignatureInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/signatureInput/SignatureInput.vue) |
| `SignatureInput.unsigned` | Not signed | [SignatureInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/signatureInput/SignatureInput.vue) |
| `SortableGroupHandle.dragToReorder` | Drag to reorder | [SortableGroupHandle.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/sortableGroup/SortableGroupHandle.vue) |
| `Sparkline.ariaLabel` | Trend | [Sparkline.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/sparkline/Sparkline.vue) |
| `SpeedDialGroupTrigger.label` | Toggle actions | [SpeedDialGroupTrigger.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/actions/speedDialGroup/SpeedDialGroupTrigger.vue) |
| `Spinner.label` | Loading | [Spinner.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/spinner/Spinner.vue) |
| `TableOfContents.tableOfContents` | Table of contents | [TableOfContents.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/nav/tableOfContents/TableOfContents.vue) |
| `Tag.closeLabel` | Remove | [Tag.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/tag/Tag.vue) |
| `TagsInput.placeholder` | Add tag… | [TagsInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/tagsInput/TagsInput.vue) |
| `ThreadView.closeThread` | Close thread | [ThreadView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/threadView/ThreadView.vue) |
| `ThreadView.thread` | Thread | [ThreadView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/threadView/ThreadView.vue) |
| `ThreadView.title` | Thread | [ThreadView.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/threadView/ThreadView.vue) |
| `TimeColumns.hours` | Hours | [TimeColumns.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/TimeColumns.vue) |
| `TimeColumns.minutes` | Minutes | [TimeColumns.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/TimeColumns.vue) |
| `TimeInput.chooseTime` | Choose time | [TimeInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/timeInput/TimeInput.vue) |
| `TimePicker.placeholder` | Pick a time | [TimePicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/timePicker/TimePicker.vue) |
| `TimezonePicker.placeholder` | Pick a time zone | [TimezonePicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/timezonePicker/TimezonePicker.vue) |
| `TimezonePicker.searchPlaceholder` | Search time zones… | [TimezonePicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/timezonePicker/TimezonePicker.vue) |
| `Toast.closeLabel` | Dismiss | [Toast.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/toast/Toast.vue) |
| `ToastHost.notifications` | Notifications | [ToastHost.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/toastHost/ToastHost.vue) |
| `TourPopover.back` | Back | [TourPopover.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/tourPopover/TourPopover.vue) |
| `TourPopover.skip` | Skip | [TourPopover.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/overlays/tourPopover/TourPopover.vue) |
| `TransferPicker.addAll` | Add all | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.addChecked` | Add checked | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.count` | {checked}/{total} | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.empty` | Nothing here | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.noMatches` | No matches | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.removeAll` | Remove all | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.removeChecked` | Remove checked | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.search` | Filter | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.sourceLabel` | Available | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TransferPicker.targetLabel` | Selected | [TransferPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/transferPicker/TransferPicker.vue) |
| `TreeSelectPicker.placeholder` | Pick an item | [TreeSelectPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/treeSelectPicker/TreeSelectPicker.vue) |
| `TruncatedText.lessLabel` | Show less | [TruncatedText.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/truncatedText/TruncatedText.vue) |
| `TruncatedText.moreLabel` | Show more | [TruncatedText.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/truncatedText/TruncatedText.vue) |
| `TypewriterText.pauseLabel` | Pause animation | [TypewriterText.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/typewriterText/TypewriterText.vue) |
| `TypewriterText.resumeLabel` | Resume animation | [TypewriterText.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/typewriterText/TypewriterText.vue) |
| `TypingIndicator.named` | {name} is typing | [TypingIndicator.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/typingIndicator/TypingIndicator.vue) |
| `TypingIndicator.typing` | Typing | [TypingIndicator.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/typingIndicator/TypingIndicator.vue) |
| `UndoBar.undoLabel` | Undo | [UndoBar.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/undoBar/UndoBar.vue) |
| `VideoPlayer.pictureInPicture` | Picture in picture | [VideoPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/videoPlayer/VideoPlayer.vue) |
| `VideoPlayer.play` | Play | [VideoPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/videoPlayer/VideoPlayer.vue) |
| `VideoPlayer.playbackSpeed` | Playback speed | [VideoPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/videoPlayer/VideoPlayer.vue) |
| `VideoPlayer.seek` | Seek | [VideoPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/videoPlayer/VideoPlayer.vue) |
| `VideoPlayer.videoPlayer` | Video player | [VideoPlayer.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/display/videoPlayer/VideoPlayer.vue) |
| `WizardFormSteps.optional` | (optional) | [WizardFormSteps.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/wizardForm/WizardFormSteps.vue) |
| `WizardFormSteps.wizardformSteps` | WizardForm steps | [WizardFormSteps.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/wizardForm/WizardFormSteps.vue) |
| `YearPicker.placeholder` | Pick a year | [YearPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/yearPicker/YearPicker.vue) |
