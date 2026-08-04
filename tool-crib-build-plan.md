# Tool Crib — Build Plan v1.1

This file supersedes tooling-inventory-spec.md entirely. If both exist, this one
wins; delete the other.

Zero to deployed. Written to be handed to Claude Code as the working spec.
Decisions are final unless marked OPEN. v2 items listed at the end — do not build them.

---

## 0. What this is

Single-file web app for a machine-shop tool crib. Tracks mill tooling identity,
counts, min-stock, and who borrowed what. Two users, both full access. Hosted on
GitHub Pages, data in a private GitHub repo via the Contents API.

Explicitly OUT of scope forever: speeds/feeds, cutting data, CAM libraries,
job routing. If a field looks like it's drifting toward cutting data, it's wrong.
Out of scope for v1: assemblies, insert-to-body stock matching, locations, lathe
tooling, CSV export.

---

## 1. Architecture

```
tool-crib/            public repo, GitHub Pages
  index.html          entire app: HTML + CSS + JS, no build step, no framework
  categories.js       family/type definitions + field schemas; pure data on
                      window.CATEGORIES, loaded via <script src> because
                      fetch() of a local file is blocked on file:// and
                      script tags are not

tool-crib-data/       private repo, personal account
  people.json                 borrower names (read/written via Contents API —
                              runtime data the app writes, and coworker names
                              stay out of the public repo)
  items/EM-0042.json          one file per tool
  tagouts/TO-0118.json        one file per ticket
  log/2026-08/<uuid>.json     one file per count event, append-only
```

- No framework, no bundler. Vanilla JS, one file. ~2–3k lines is fine.
- All writes go through the GitHub Contents API (PUT with sha for updates).
- One file per record means the two users never write-conflict by construction.
- Every commit message: `<user>: <what>` e.g. `leem: EM-0042 qty 6→4`.
  Git history is the undo system. There is no delete anywhere in the app — only
  an `archived: true` flag.

### Auth
- On first load, prompt for: display name (for commit messages) + a GitHub token.
- Store both in localStorage. Re-prompt on 401.
- Token type differs per user and the app must not care which it gets:
  - Leem (repo owner): fine-grained PAT, `tool-crib-data` only, Contents R/W.
  - Crib guy (collaborator): **classic PAT with `repo` scope** — fine-grained
    tokens cannot reach a private repo owned by another user, so this is the
    only option until/unless the repos move into an org.
  Both are sent as `Authorization: Bearer <token>`. Same code path.
- Token setup instructions for both cases live in the README, 90-day expiry.

### Load strategy
- On load: fetch the git tree of `tool-crib-data` (one API call), then fetch
  record files in parallel batches of 20.
- Cache everything in localStorage with the tree SHA as the cache key; on
  revisit, only refetch files whose blob SHA changed. First load is seconds,
  every load after is instant.

### Offline / flaky wifi
- All writes go into a queue in localStorage first, UI updates optimistically,
  queue flushes in the background with retry.
- Header shows sync state: synced / n pending / offline.
- If a PUT fails with 409 (sha mismatch — other user edited same file), refetch,
  reapply the change on top, retry once. If it still fails, surface the record
  in a conflict banner instead of silently losing it.

---

## 2. Data model

### 2.1 Item — items/<ID>.json

```json
{
  "id": "EM-0042",
  "family": "endmill",
  "type": "square",
  "description": "1/2 4FL carbide endmill",
  "substrate": "carbide",
  "fields": { "dia": 0.5, "dia_display": "1/2", "flutes": 4, "loc": 1.25,
              "corner_rad": 0, "oal": 3.0, "shank_dia": 0.5,
              "coating": "AlTiN" },
  "mfr_part_number": "",
  "vendor": "",
  "order_url": "",
  "qty_on_hand": 6,
  "min_qty": 2,
  "consumable": true,
  "location": null,
  "notes": "",
  "archived": false,
  "updated_at": "2026-08-04T15:00:00Z",
  "updated_by": "leem"
}
```

- `fields` is the per-family bag defined by categories.json. Everything above it
  is universal.
- `dia` is always the decimal number (sorting, math). `dia_display` is the
  fractional string when one was entered ("1/2", "3/8", "7/16"). Entry accepts
  either: user types `1/2` → dia 0.5, dia_display "1/2"; user types `.4375` →
  dia 0.4375, dia_display shows nearest fraction if exact within 1/64, else the
  decimal. Display always prefers dia_display.
- `consumable` comes from the family default but is stored per-item and editable.
- `location` stays null in v1. Field exists so v2 needs no migration.
- `min_qty` only means anything when `consumable` is true. Durable items never
  appear on Needs Ordering.

#### Field modes

Every field in a type's resolved schema declares a `mode`:

- `input` — user types it; renders in the entry form, in schema-declared
  tab order
- `fixed: <value>` — implied by the type (square endmill → corner_rad 0);
  never rendered
- `derived: <expr>` — computed from other fields on the same record
  (ball endmill → corner_rad `dia / 2`), or via a named lookup table
  (center drill size # → body dia); never rendered

**The resolved value is always stored on the record** regardless of mode, so
search/sort/filter treat every record uniformly — a search for .250 radius
finds ball endmills that never had a radius typed in. Only `input` fields
appear in the form.

Derived expressions stay trivial: one field, basic arithmetic, or a named
lookup table (tables live in `CATEGORIES.lookups`). If an expression wants
more than that, it should be an input.

Required at entry: `id`, `family`, `type` — nothing else. Every other field
is skippable.

### 2.2 Tag-out ticket — tagouts/<ID>.json

```json
{
  "id": "TO-0118",
  "person": "Dave M.",
  "opened_at": "2026-07-29T12:00:00Z",
  "opened_by": "cribguy",
  "status": "open",
  "lines": [
    { "item_id": "HB-0007", "qty": 1, "state": "out" },
    { "item_id": "EM-0042", "qty": 2, "state": "consumed" },
    { "item_id": "CO-0031", "qty": 1, "state": "returned" }
  ],
  "closed_at": null
}
```

- Line states: `out` → `returned` (durable path) or `out` → `consumed`
  (consumable path). Per-line, so partial returns are normal.
- Ticket auto-closes when no line is `out`.
- **Count math:** `available = qty_on_hand − Σ(open "out" lines)`.
  `qty_on_hand` only changes when a line flips to `consumed` (decrement, plus a
  log event) — never on tag-out or return.

### 2.3 Log event — log/<yyyy-mm>/<uuid>.json

```json
{ "ts": "...", "user": "leem", "item_id": "EM-0042",
  "type": "receive | consume | correction | archive",
  "delta": -2, "qty_after": 4, "ref": "TO-0118", "reason": "" }
```

Append-only, never edited. Monthly folders keep the tree fetch sane.

### 2.4 ID scheme

`<PREFIX>-<4 digits>`, per family (see §3 table). Next ID = max existing for
that prefix + 1, derived from filenames at write time, retry once on collision.
No counter file.

Reserved for v2 lathe families (do not reuse): TH (OD holder), BB (boring bar),
GR (grooving/parting), TR (threading holder), and TO stays taken by tag-out
tickets.

---

## 3. Families and types (categories.js)

Structure per family: prefix, label, decals (inline SVG ids), consumable
default, min_qty default, core field list in tab order, per-type
overrides/drops/adds, description template. Every field carries a mode
(§2.1 Field modes). Substrate is a regular field with `context_strip: true` —
it renders in the sticky context strip, not the field row; fixed-mode
substrate shows as a quiet note.

Per-type resolution: start from the family core list (tab order), shallow-
merge type overrides by key, remove dropped keys, append type adds.

Required at entry: id, family, type only. Everything else skippable.

| Family | Prefix | Types | Consumable | Core fields (tab order) |
|---|---|---|---|---|
| Endmills | EM | square, ball, corner rad, chamfer, corner rounding, thread mill, rougher | yes | dia, flutes, loc, corner_rad (per-type mode, below), oal, shank_dia, coating, substrate (fixed: carbide, hidden) |
| Drills | DR | twist, spot, center, countersink | yes | dia, point_angle, flute_length, oal, substrate (input, visible: HSS/cobalt/carbide, default HSS), coating, coolant_thru (y/n) |
| Taps | TP | form, cut, spiral flute, spiral point, pipe | yes | thread_size (ONE free-text field: "1/4-20", "M6x1" — not split into size+pitch), class (2B/3B select), substrate (visible, default HSS), coating, thru_or_blind |
| Reamers | RM | chucking, over/under | yes | dia, tolerance (free text, "+.0000/-.0002" style), flutes, substrate (visible, default carbide), shank_dia |
| Insert tooling | IT | shell mill, indexable endmill, insert drill | **no** | dia, insert_designation (free text, e.g. "SEHT1204" — identity-tier, powers v2 insert matching), pocket_count, mount (arbor size or shank dia), max_doc |
| Inserts | IN | square, round, diamond, drill-specific | yes | designation (full ISO/mfr string), grade, nose_rad, coating, chipbreaker |
| Holders | HB | ER chuck, shrink fit, shell arbor, drill chuck, tap holder | **no** | interface (CAT40/BT30/… select), capacity (free text: ER size / arbor dia / chuck range), gage_length, coolant (none/TSC/flange select) |
| Hardware | MS | collet, pull stud, insert screw, wrench, misc | yes | size, fits (free text). Nothing more. |

### Per-type variance

**Endmills** — the corner-radius field is the canonical field-modes example:

| Type | corner_rad | extra inputs |
|---|---|---|
| square | fixed 0 | — |
| ball | derived dia/2 | — |
| corner rad | input | — |
| chamfer | fixed 0 | included_angle, tip_dia |
| corner rounding | (none) | form_radius, pilot_dia |
| thread mill | (none) | thread_range (free text, e.g. "1/4-20 – 1/2-13" or pitch) |
| rougher | fixed 0 | chipbreaker_style (fine/coarse) |

**Drills**

| Type | changes from core |
|---|---|
| twist | core as-is; dia additionally accepts letter and wire-gauge sizes (below) |
| spot | drop flute_length + coolant_thru; point_angle is the key identity field |
| center | replace dia with size_number (#1–#7 select); body_dia derived via lookup table; drop point_angle |
| countersink | add included_angle, body_dia, flutes; drop flute_length |

**Taps** — pipe type: thread_size format is NPT-style, drop class.

### Dia-like fields

Every dia-like field (dia, shank_dia, tip_dia, body_dia, pilot_dia,
form_radius, nose_rad, etc.) uses the §2.1 fractional pattern: parse `1/2`,
`1 1/4`, `.4375`, `0.500`; store decimal for sort/math + display string.
**Twist drills additionally accept letter (A–Z) and wire-gauge (#1–#80)
sizes** via lookup tables in `CATEGORIES.lookups` → decimal + display
string. One shared parse/format utility, used everywhere.

- Description auto-builds from template, editable:
  endmill → `{dia_display} {flutes}FL {substrate} {type} endmill`.
- HSS badge: any item with substrate `HSS` or `cobalt` gets a small amber `HSS`
  chip in every list row. This is the one substrate exception in the shop and it
  must be visible at a glance.
- categories.js is data, not code. Adding a type or field later must require
  zero JS changes. Lathe families ship in the file with `enabled: false`.

---

## 4. Screens

Nav: **Crib · Add Tools · Tag-Out · Needs Ordering · Log**. Persistent left rail
on desktop, bottom bar on phone widths.

### 4.1 Crib (default)
- Dense table: ID, decal (small), description, badges (HSS / low / archived),
  available / on-hand, family, order button (only if order_url set).
- Search box autofocused, filters as-you-type across id, description,
  mfr_part_number. Chips: family, low-stock, out-on-tagout, show-archived.
- Row click → right-side detail drawer (no navigation): all fields editable,
  qty inline-editable with +/− steppers and direct type-in (writes a
  `correction` log event), open tag-out lines shown with who/when, archive
  button, order button.
- Inline qty edit directly in the table on the count cell — click, type, Enter.

### 4.2 Add Tools (survey mode)
- Sticky context strip: family/type (two-level card picker with decals) +
  substrate selector when the family shows one. Context persists across entries.
- Field row renders from categories.json in defined tab order. Only family/type
  required; qty defaults 1; min_qty defaults from family (endmills 2, drills 2,
  inserts 4, hardware 1, durable 0).
- Enter commits + refocuses first field. Ctrl+D duplicates last record into the
  form. ID auto-generates, shown, editable.
- Fractional input everywhere a dia field appears: accepts `1/2`, `.500`,
  `0.500`, `1 1/4`.
- Session list below: everything entered this session, newest first, click to
  fix. Rows show sync state (pending/synced/failed-red).
- Picker is for creation only. Editing an existing item uses plain dropdowns in
  the drawer.

### 4.3 Tag-Out
- New ticket: person (dropdown from people.json + inline "add person", which
  appends to people.json in the data repo via API), then add lines by
  searching items. Durable
  items default state `out`; consumables also start `out` (they're expected to
  be consumed, but the crib guy closes them explicitly so accidental returns of
  unused endmills stay possible).
- Open tickets list, **sorted oldest-first, always**. Age chip: gray <3d,
  amber 3–14d, red >14d.
- Ticket view: per-line Return / Consumed buttons, whole-ticket "return all
  durables" shortcut. Consumed lines write the log event + decrement.
- Closed tickets collapse into a history section.

### 4.4 Needs Ordering
- Every consumable, non-archived item with `qty_on_hand <= min_qty`.
- Columns: ID, description, vendor, mfr part number, on hand, min, order button.
- **Copy as text** button → clipboard, tab-separated with header row, so it
  pastes clean into Excel or an email. This is the only export in v1.

### 4.5 Log
- Read-only, reverse-chron, filter by item and user. Lazy-load by month.

---

## 5. Visual design

Dark, deep red accent. Shop-floor legible: high contrast, dense but not cramped,
readable at arm's length on a laptop with coolant-fogged glasses.

```css
--bg:        #121214;   /* app background, near-black warm gray */
--surface:   #1b1b1f;   /* cards, table */
--surface-2: #232329;   /* hover, inputs */
--border:    #2e2e35;
--text:      #e8e6e3;
--text-2:    #a3a09b;
--accent:    #b91c2e;   /* deep red — primary actions, active nav, focus rings */
--accent-hi: #e6394f;   /* hover / emphasis */
--low:       #ff5d5d;   /* low stock — hotter red, distinct from accent */
--warn:      #d99a2b;   /* HSS badge, aging 3–14d */
--ok:        #3fae6a;   /* synced, returned */
```

- Low-stock and overdue run hotter/brighter than the accent so "red theme" and
  "red alert" never blur together. If they read too close in practice, low-stock
  rows also get a left border + bold count so color isn't the only signal.
- Type: system UI stack for text, monospace (ui-monospace) for IDs, counts,
  part numbers — always.
- Decals: inline SVG sprite in index.html, `currentColor` stroke so they inherit
  theme. ~28 silhouettes per the mockups already reviewed.
- Density: 36–40px table rows, 15px base font. No card grids for data — tables.
- Interactions: focus states everywhere (keyboard-first app), 120ms transitions,
  no animation longer than that. Buttons look like buttons.

---

## 6. Build order

Each step ends runnable. Test with a local `data/` folder mock of the API
(simple fetch-wrapper flag) before wiring real GitHub calls.

1. **Skeleton + theme.** index.html, nav, palette, empty screens. Deploy to
   Pages immediately so the pipe works from day one.
2. **categories.js + decals.** Full family/type data, SVG sprite, card picker
   as an isolated component.
3. **GitHub layer.** Auth prompt, tree fetch, batched reads, localStorage cache,
   write queue, 409 handling, commit messages. This is the hard 20%.
4. **Add Tools.** Survey mode end-to-end: picker, dynamic fields, fractional
   input, ID generation, Enter/Ctrl+D flow, session list.
5. **Crib.** Table, search, chips, drawer, inline qty with log events, archive.
6. **Tag-Out.** Tickets, people.json append, per-line states, available math,
   aging list.
7. **Needs Ordering + Log.** Both are pure views over existing data + the
   clipboard export.
8. **Hardening.** Phone-width pass, empty states, failed-write recovery UI,
   README with PAT setup for the crib guy.

Milestone that matters: after step 5 you can walk the crib. Do that before
building 6–7 — real data will shake out field-list mistakes cheaper than any
review.

### Definition of done (v1)
- Both users can enter, edit, count, tag out, and see needs-ordering from their
  own machines with their own PATs.
- Kill the wifi mid-entry: nothing lost, queue flushes on reconnect.
- Both users edit the same item within a minute: no silent overwrite.
- 300 items load in under ~2s warm, no API rate-limit errors in a normal day
  (5,000 req/hr/user is the budget; the cache keeps you far under).

---

## 7. Setup checklist (once, before step 3)

1. On Leem's personal GitHub: `tool-crib` (public) + `tool-crib-data` (private).
2. Pages on `tool-crib`: main / root.
3. `.gitkeep` in items/, tagouts/, log/; `people.json` containing `[]`.
4. Crib guy: GitHub account (he likely has none — walk him through signup), then
   add him as a collaborator on `tool-crib-data` with Write.
5. Leem's token: fine-grained PAT, resource owner = his account, only
   `tool-crib-data`, Contents read/write, 90 days.
6. Crib guy's token: classic PAT, `repo` scope, 90 days. Note the tradeoff in the
   README so it's a known decision, not an accident.
7. Fallback if his GitHub setup stalls on survey day: Leem holds the only token
   and enters records while the crib guy calls out numbers. Slower, not blocking.
8. Data repo main branch: **no** branch protection (it blocks Contents API writes).

---

## 8. OPEN items (decide during build, none block starting)

- Exact type lists for taps/reamers/hardware — confirm against the crib guy's
  Excel sheets before survey day.
- min_qty family defaults — placeholder numbers above, tune with crib guy.
- Whether countersinks live under Drills (current) or Endmills.

## 9. v2 parking lot — do not build

- Assemblies (recipes) + tool page showing memberships
- Insert-designation ↔ insert-stock matching on insert-tooling pages
- Locations (cabinet/drawer/bin) — schema field already exists
- Lathe families (uncomment in categories.json)
- Move both repos into a GitHub org, which unlocks fine-grained tokens for the
  crib guy and makes the project transferable if it ever goes official
- CSV export, GitHub Action reorder notifications
- index.json build-time cache if the crib outgrows the tree-fetch approach
