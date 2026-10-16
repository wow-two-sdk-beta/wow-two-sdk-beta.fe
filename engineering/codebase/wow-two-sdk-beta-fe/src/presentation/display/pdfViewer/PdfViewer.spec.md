# PdfViewer

Renders a PDF inline with page and zoom controls over the browser built-in viewer.

Source: [PdfViewer.vue](PdfViewer.vue).

Public import: `import { PdfViewer } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Resource and download URLs accept HTTP(S), blob and relative sources; executable/data URLs do not reach the iframe.
- URL bindings select an allowed scheme through UrlExtensions before rendering. Custom slots remain caller-owned content.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `src` | `string` | yes | — | The PDF URL. |
| `page` | `number` | no | `undefined` | The controlled page number (1-based). |
| `defaultPage` | `number` | no | `1` | The uncontrolled initial page. Default `1`. |
| `zoom` | `number` | no | `undefined` | The controlled zoom percentage. |
| `defaultZoom` | `number` | no | `100` | The uncontrolled initial zoom percentage. Default `100`. |
| `pageCount` | `number` | no | `undefined` | The total page count, when known — enables `n / total` and clamps `next`. |
| `title` | `string` | no | `'PDF document'` | The iframe title. Default `PDF document`. |
| `canDownload` | `boolean` | no | `true` | The download-link state. Default `true`. |
| `height` | `string` | no | `'70vh'` | The CSS height of the document area. Default `70vh`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:page` | `'update:page': [page: number];` | Fires when the reader moves to another page, with the next page number. |
| `update:zoom` | `'update:zoom': [zoom: number];` | Fires when the reader zooms in or out, with the next zoom percentage. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [PreviewTrust.dom.test.ts](../../../../tests/unit/presentation/forms/PreviewTrust.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
