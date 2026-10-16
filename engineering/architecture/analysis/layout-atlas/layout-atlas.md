# Layout atlas — layouts, patterns and themes

*Last updated: 2026-09-28*

> Research behind the **Atlas** app (`engineering/codebase/wow-two-sdk-beta-fe/apps/atlas`): which layout,
> navigation, panel and collection patterns exist, what our own products teach, and where each pattern shines.
> The app renders this taxonomy as grey wireframes plus a live layout lab. It is a place to brainstorm, not a
> set of locked decisions.

## Status

- Sources: four product UIs read from source and screenshots; external guidance checked 2026-09-28 (§ Sources).
- The atlas app renders every archetype and pattern below from one wireframe composer (`LayoutSpec`).
- Verdicts are guidance for scaffolding and reviews. A product's own design research still wins for that product.
- Enrichment queue: § Roadmap.

---

## What our products teach

| App | Shell | Panels | Content | Surface and density | Why it works |
|---|---|---|---|---|---|
| **TNIS** studio | tool row + scenario tabs across the top; no sidebar | right analysis dock, docked and resizable, collapsible to a tab; map overlays float in the canvas corners | full-bleed map | dark console; one 6px gutter between regions; 12px type floor; 20/28/30px control ladder; 3px control radius | the map is the work, the dock holds long evidence (accordion of readings) without covering the map, and the gutter makes regions read as tiles |
| **Ocharo** studio | wordmark + one chip of local navigation; editorial page title | left library, centre work card, right preview/inspector — three rounded **islands** with gaps on a warm canvas; bottom camera island in the 3D editor | a hero object (garment, material) | warm ivory, serif display type, large radius, soft shadow, generous padding | the object is the hero; islands frame it without chrome touching the viewport edges; few controls are visible at once |
| **Haven** CRM | sticky translucent top bar: app switcher + local view navigation + account | a listing **drawer** over the collection; filters in a toolbar | kanban board, photo grid and table over one filtered collection | neutral working surfaces, teal primary, compact rows | the collection stays visible; the detail is occasional, so it overlays instead of taking permanent width |
| **Wheelhouse** | glass top navigation (five destinations) | left navigator (products, environments), right inspector | selected environment: release, readiness, services, deployments | chalk and forest light, pine dark; glass only on navigation chrome, opaque data surfaces | object → work → controls stay side by side (Ocharo's logic applied to operations) |

Shared lessons:

1. **Name the hero first.** A canvas (map, 3D, image) wants floating or docked panels around it; a collection wants
   full width and an overlay detail; an object with evidence wants a studio three-pane.
2. **One gutter, one radius family.** TNIS and Ocharo both read as designed because every region shares one gap and
   one corner rule. The token set should carry them, not each page.
3. **Glass is chrome, never data.** Wheelhouse restricts translucency to navigation; data surfaces stay opaque.
4. **Density is a product decision.** TNIS is a compact console, Ocharo is spacious and editorial, Haven sits between.
   One SDK serves all three only if density is a switch rather than per-component overrides.

---

## Layout archetypes

Each archetype is a preset of the atlas composer. "Shines" lists the task shapes it serves; "avoid" lists the
failures seen when it is misapplied.

| # | Archetype | Anatomy | Shines | Avoid when | Our example |
|---|---|---|---|---|---|
| 1 | **Top-bar workspace** | top bar (brand · 3–7 destinations · actions), full-width content | content-first apps with few top destinations; wide boards, tables and galleries | more than ~7 destinations, deep hierarchies, many areas switched constantly | Haven, Wheelhouse |
| 2 | **Sidebar shell** | vertical navigation with groups, header, content | many or growing destinations, grouped sections, long labels, admin consoles | canvas tools, small apps that waste the width | SDK `SidebarMenu` + `AppShell` |
| 3 | **Icon rail + list** | slim icon rail, contextual list panel, content | tools with a few modes, each owning its own list (files, search, versions) | novices who need labels; more than ~7 modes | — (VS Code, Linear pattern) |
| 4 | **Studio three-pane** | navigator · work · inspector | a selected object with context and details, acting without leaving the page | narrow screens without a sheet fallback; objects with no inspectable parts | Wheelhouse |
| 5 | **Canvas + floating islands** | full-bleed canvas; library, inspector and tools float as rounded islands | the canvas is the hero (3D, maps, media, boards); immersive and creative work; few panels at a time | dense data entry; long panels; many panels at once; heavy panning (content slides under islands) | Ocharo |
| 6 | **Canvas + docked console** | top toolbar; canvas; resizable docked inspector; overlays in canvas corners | analysis where the side panel is long and must not cover the canvas; power users | casual users; phones without a sheet | TNIS |
| 7 | **Master–detail split** | list pane · detail pane side by side | triage of many similar records with keyboard stepping | records needing full width; phones (collapse to push navigation) | Wheelhouse deployments |
| 8 | **Collection + drawer** | full-width collection; detail opens in a drawer | detail is occasional; the collection context must stay visible | detail used for long editing sessions (promote to a page) | Haven CRM |
| 9 | **Dashboard / bento** | KPI row and tiles in a grid | monitoring and overview; glanceable status with a path into records | performing tasks; dashboards of unrelated metrics | Wheelhouse overview |
| 10 | **Board (kanban)** | columns by stage, cards move across | flow work with stages and limited work in progress; status at a glance | more than a few dozen cards per column; attribute comparison; many-axis sorting | Haven CRM board |
| 11 | **Gallery grid** | uniform cards with dominant media | visual recognition and comparison (photos, swatches, products) | attribute-heavy comparison; text-only items | Haven listings, Ocharo materials |
| 12 | **Data console** | toolbar with filters, dense table, bulk bar, pagination | many attributes, sorting, filtering and bulk operations | casual browsing; visual items | Haven table view |
| 13 | **Docs / reading** | section navigation · article · on-this-page | long-form reading, reference and learning | task-driven apps | this atlas |
| 14 | **Settings** | section list · grouped form | many independent preferences | linear tasks (use a wizard) | — |
| 15 | **Wizard** | steps · one task per screen · footer actions | linear tasks with dependencies, onboarding | expert repeat work (use a form) | SDK `WizardForm` |
| 16 | **Inbox / chat** | conversation list · thread · context | messaging, support queues | non-conversational records | — |
| 17 | **Feed** | single column stream with side context | chronological updates, activity | comparison or bulk work | — |
| 18 | **Mobile tab app** | top title, content, bottom tab bar (3–5) | phone-first products with few peer destinations | more than five destinations; desktop-only tools | SDK `BottomNavMenu` |
| 19 | **Map + bottom sheet** | full map, draggable sheet | location-first phone apps | desktop analysis (use archetype 6) | TNIS rider |
| 20 | **Landing** | hero, feature sections, call to action | marketing, onboarding into an app | the working app itself | Ocharo landing |

---

## Navigation

| Pattern | Use | Width rule |
|---|---|---|
| Top bar | 3–7 stable destinations with short labels; content-first | desktop; collapses to a menu button on phones |
| Sidebar | many, grouped or growing destinations; long labels | expanded windows |
| Icon rail | modes rather than pages; power users; maximum content width | medium and expanded windows |
| Rail + flyout/list | a mode owns a list (files, results, layers) | expanded windows |
| Bottom tab bar | 3–5 peer destinations on phones | compact windows |
| Toolbar only | a single-purpose tool (canvas editors) | any; destinations live elsewhere |
| Command palette | every destination and action by keyboard | a complement, never the only route |

Decision guide:

- **How many top-level destinations?** 3–7 short labels → top bar. More, or growing → sidebar. Modes over pages → rail.
- **Is the content wide?** Boards, tables and canvases gain from a top bar or a collapsible rail.
- **How deep?** Two or more levels → sidebar groups, or top bar plus local tabs. Never three levels in one bar.
- **Phones:** follow window classes — compact (<600dp) → navigation bar; medium (600–839dp) → rail; expanded
  (≥840dp) → drawer or expanded rail (Material 3). Keep desktop navigation visible; do not hide it behind a menu (NN/g).

---

## Panels

| Mode | Behaviour | Shines | Costs |
|---|---|---|---|
| **Docked** | attached to the frame; the canvas shrinks | long or frequently used panels; precise work; resizable width | less canvas; the frame looks denser |
| **Floating islands** | rounded cards over the canvas with gaps | canvas-first, immersive work; a few short panels; brand and mood | content slides under panels while panning; long panels cover the work; harder alignment |
| **Overlay drawer** | slides over content on demand | occasional detail; keeps the collection visible | hides what it covers; not for side-by-side comparison |
| **Bottom sheet** | draggable sheet on phones | map and canvas apps on phones | limited height; needs snap points |
| **Collapsible dock** | docked with a collapse tab | analysis consoles; lets the canvas win when needed | one more control to learn |

Evidence: Figma's UI3 launched floating panels and returned to docked, resizable panels after beta feedback —
speed and distraction while panning outweighed the visual gain; floating remains where the canvas dominates
(Minimize UI, FigJam, Slides grid).

Decision guide:

- Is a canvas the hero and are panels short-lived? → **floating islands** (Ocharo).
- Is a panel long, data-heavy or always open? → **docked**, resizable, collapsible (TNIS).
- Is the detail occasional over a collection? → **drawer** (Haven).
- Must two things be compared side by side? → **split**, never an overlay.
- On phones: panels become sheets or pages; keep an explicit way back to the selection.

---

## Collections

| View | Answers | Shines | Avoid |
|---|---|---|---|
| **Table** | which row has the highest value in this column? | many attributes, sorting, filtering, bulk actions | visual items; phones without a card fallback |
| **List** | what's next? | scanning one line per item; inboxes, feeds, mobile | comparing many attributes |
| **Card grid / gallery** | which one looks right? | media carries the decision; catalogues | attribute comparison |
| **Kanban board** | where is each item in the flow? | stage-based work with limited items per stage; drag to progress | large columns; multi-axis sorting |
| **Calendar / timeline** | when? | dates, durations, scheduling | undated work |
| **Map** | where? | spatial questions | non-spatial data |
| **Tree** | inside what? | hierarchies, file systems | flat data |

Start with a list; move to a table when column comparison becomes the job; choose a grid when visuals do the
deciding; choose a board when stage progression is the job. Offer view switching over **one** collection with
shared filters (Haven's lesson: board and list must represent the same scope).

---

## Surfaces, density and themes

The theme engine (`src/foundation/themes`) generates colour tokens from seeds in OKLCH and validates WCAG AA in
light and dark: 184 themes (24 curated seeds, the authored `smart-qr` and `ocharo`, and a generated pool), plus a
`radius` knob. What products still hand-roll is **the shell character**:

| Axis | Values | Carried today by |
|---|---|---|
| Surface | flat (borders) · cards · islands (gap + shadow + radius) · glass (translucent chrome) | page code |
| Gutter | one region gap (TNIS 6px, Ocharo ~16px) | page code |
| Density | compact · comfortable · spacious — control heights, type floor, padding | ✅ SDK `data-density` (spacing + `Button` scale; type untouched) |
| Canvas vs chrome | a canvas colour distinct from panel surfaces | page code (TNIS `--canvas`, Ocharo ivory) |
| Ambient | a coloured glow behind glass | React SDK only (`--theme-ambient`) |

Proposal for the SDK (not yet built): a **shell preset** beside the colour theme — `surface`, `gutter`, `density`
and `canvas` tokens applied by one class, so the atlas lab's switches become real products' switches. The React
SDK's Wheelhouse boards (`glass-harbor`, `frost`, `bento-deck`, `harbor-frost`) are the first themes that need it;
the Vue SDK does not carry them yet.

---

## The atlas app

- **Layouts** — the 20 archetypes as wireframes with anatomy, shines, avoid and our examples; each opens in the lab.
- **Patterns** — navigation, panels, collections, surfaces and density side by side.
- **Guides** — decision guides as questions with recommended archetypes.
- **Lab** — compose navigation × panels × content × surface × density × device over any theme, live.
- **Components** — every exported component rendered live from the gallery fixtures, grouped by family.
- **Themes** — the catalogue as swatch cards; apply any theme to the whole atlas; tokens per mode.

The playground remains the smoke and regression gallery; the atlas is the curated learning and discussion site.

---

## Roadmap

- Shell presets in the SDK (surface · gutter · density · canvas) driven from the lab — density shipped as
  `data-density` (2026-09-28); surface, gutter and canvas remain.
- ✅ Port the Wheelhouse glass themes and the ambient token to the Vue SDK.
- Component wireframes per family (the lab currently draws layouts; components render live).
- Real-component renderings of each archetype (AppShell, SidebarMenu, KanbanBoard, DataTable) beside the wireframe.
- Product snapshots: TNIS, Ocharo, Haven and Wheelhouse archetypes annotated with their tokens.
- Mobile variants for every archetype, checked at 390px.

---

## Sources

- Material Design 3 — navigation bar, rail and drawer guidance by window size class:
  [navigation bar](https://m3.material.io/components/navigation-bar/guidelines),
  [navigation rail](https://m3.material.io/components/navigation-rail/guidelines),
  [navigation drawer](https://m3.material.io/components/navigation-drawer/overview).
- NN/g — [Left-side vertical navigation](https://www.nngroup.com/articles/vertical-nav/) (scalability, scanning,
  content-to-chrome trade-off; do not hide desktop navigation).
- Figma — [UI3: we shipped it, you shaped it](https://www.figma.com/blog/figma-2024-we-shipped-it-you-shaped-it/),
  [UI3 feedback forum](https://forum.figma.com/share-your-feedback-26/ui3-feedback-3058) (floating panels reverted to docked).
- [Cards vs lists vs tables vs data grids](https://smart-interface-design-patterns.com/articles/cards-vs-lists-vs-tables-vs-data-grids/),
  [table vs list vs cards](https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards).
- Product sources: TNIS `apps/studio` (StudioPage, theme.css, docs/console.png) · Ocharo `architecture/design.md` and
  `research/material-studio-desktop.png` · Haven `research/design-research/` and `packages/ui/src/shell/AppFrame.vue` ·
  Wheelhouse `research/design-research/` and `research/design-directions/`.
