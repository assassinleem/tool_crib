# Acceptance checks — Phase 2.5

The four checks from the Phase 2.5 spec, written so they can be run by hand in
a browser. No tooling: open the app, use the Import Library screen, and read
the numbers off the preview. Checks that need to look inside the stored record
give a console one-liner.

Start each run from a clean slate: open the app, then in the console

```js
localStorage.removeItem("tc_cache"); localStorage.removeItem("tc_writeQueue"); location.reload();
```

and confirm the sync panel reads **build phase-2.5** or later before starting.

Fixture files are the two real Fusion exports, `SHOP_TOOLS.tools` (134 tools)
and `SHOP_TOOLS_1.tools` (137 tools, 113 guids shared with the first).

Library records live one file per library, `library/<library_id>.json`, keyed
by guid. An import writes only its own library's file. If the Import screen
shows a "Split now" banner, the data repo still holds the old combined
`library.json`; press it before running these, and expect one commit per
library plus one that empties the combined file.

---

## Check 1 — a re-import of an unchanged library is a no-op

**Steps.** Import `SHOP_TOOLS.tools`, confirm. Import the same file again
without changing it.

**Expect.** The second preview reads:

| new | updated | unchanged | archived |
|-----|---------|-----------|----------|
| 0   | 0       | **134**   | 0        |

The confirm button reads *Import nothing* and is disabled. The word "archive"
appears nowhere in the preview — there is no archive-on-absence behaviour left
to trigger.

**Status: PASS.** Second import reported `{new: 0, updated: 0, unchanged: 134}`,
0 archived records in the store, no "archive" text rendered.

### Check 1b — the same, over a store an earlier build wrote

Check 1 on its own does **not** catch a merge-key mismatch, because a store
built by the current code always matches itself. Run it again over records
written by an earlier build — that is the case that broke.

**Steps.** With `library.json` holding records from before the composite key
(bare guid keys, or a `presets` array of `{name, v_c, …}` rather than merge
entries), import that library's own file unchanged.

**Expect.** Still 0 new / 0 updated / N unchanged, and the total number of
stored preset entries **must not grow**:

```js
Object.values(store.library).reduce((n, r) => n + r.presets.length, 0)
// same before and after the import
```

If instead every row reads `+N presets … N presets not in this file — kept:
(unnamed preset)`, the stored presets are not in merge-entry shape and the
import is about to double them. The import is blocked in that case; open a
flagged row to see which key the merge used.

**Status: PASS.** 35 preset entries before, 35 after, `{new: 0, updated: 0,
unchanged: 10}`.

---

## Check 2 — two libraries coexist, nothing archived, presets intact

**Steps.** From a clean slate, import `SHOP_TOOLS.tools`, then
`SHOP_TOOLS_1.tools`. Leave the Library field at its default for each.

**Expect.** The second preview reads **137 new**, 0 updated, 0 unchanged — the
shared guids are a second library's records, not updates to the first. Nothing
is archived. `SHOP_TOOLS`'s own presets are untouched by the second file.

```js
// records per library, and the presets the checks name
Object.values(store.library).reduce((a,r)=>{a[r.library_id]=(a[r.library_id]||0)+1;return a;},{})
// => { SHOP_TOOLS: 134, SHOP_TOOLS_1: 137 }

Object.values(store.library).filter(r => r.archived).length          // => 0
Object.keys(store.library).every(k => k.includes("::"))              // => true

store.library["SHOP_TOOLS::<3/8 HARVI I TE guid>"].presets.map(e => e.raw.name)
// must still contain: "1018", "304 cond a live y", "cres"
```

**Status: PASS.** `{SHOP_TOOLS: 134, SHOP_TOOLS_1: 137}`, 0 archived, every key
composite, and `3/8 HARVI I TE` under `SHOP_TOOLS` still carries all three
presets. The `SHOP_TOOLS_1` copy of the same tool is its own record with its
own preset set, not a merge over the first.

---

## Check 3 — no record's `raw` is modified by either import

**Steps.** After Check 2, compare every stored `raw` against the tool object in
the source file it came from.

**Expect.** Byte-identical, for all 271 records. `raw` is the export copy; the
app's own fields live outside it and the preset union is composed at export
time rather than written back into `raw`.

```js
// paste the file's own JSON as `src` (the tools.json inside the .tools zip)
src.data.filter(t => JSON.stringify(store.library["SHOP_TOOLS::" + t.guid].raw)
                     !== JSON.stringify(t)).length   // => 0
```

**Status: PASS.** 271 of 271 byte-identical, zero mismatches.

---

## Check 4 — `.25" long ball` surfaces a flute-count conflict

`SHOP_TOOLS` gives this tool `NOF 4`; `SHOP_TOOLS_1` gives the same guid
`NOF 1`. The app must **surface the disagreement** rather than silently taking
one value.

**Expect.** The conflict is visible to the operator — the way a preset whose
values differ between libraries already renders as a flagged conflict row in
the crib drawer.

**Status: PASS** (Part B).

Importing `SHOP_TOOLS_1` over a store holding `SHOP_TOOLS` raises
`.25" long ball · geometry.NOF · 4 vs 1` as a **High** conflict, and the
import will not complete until it is answered — the confirm button reads
*Answer 1 High conflict first*. Both values remain stored under their own
composite keys with their own `raw`; the answer is written as an override plus
a history entry naming the rejected value.

Assert this on the conflicts the import **raises**, not on the records
afterwards: once the conflict is answered the two records agree, which is the
whole point of answering it.

### Note on checks 1–3 after Part B

Check 2's procedure now includes answering the High conflicts the second
import raises. That is Part B working, not a regression — an import that
silently took one side of a flute-count disagreement is the thing Part B
exists to prevent. The assertions themselves are unchanged: 137 new, nothing
archived, `SHOP_TOOLS`'s presets intact, and no `raw` modified (a resolution
is an override stored beside `raw`, never a write into it).

---

## Check 5 — round trip over overlapping libraries

The one test that proves the export loop. Run it from **Export → Run
round-trip test** after any change to import or export code.

**Steps.** With a store holding **two libraries that share guids**, press the
button. It exports the whole merged library, re-imports the result through the
app's own importer, and compares.

**Expect.** `PASS — N stored records merged to M tools, P presets, zero
drift`. Per tool, three numbers must agree:

| | what it is |
|---|---|
| union | preset keys across every stored record for that guid, computed straight from the store |
| written | presets `buildExportFile` put in the file |
| read back | presets the importer got out of it again |

The union figure is deliberately **not** derived from the export path.
Computing the expectation with `mergeForExport` and then checking a file built
by `mergeForExport` proves nothing about it: both sides move together, and a
union that silently collapsed to one library's array still passes.

Never assert a **per-library record's** preset count against the merged file.
A guid held by two libraries is one tool in the file carrying the union of
both preset sets, so that comparison reports a difference for every shared
guid — twice — and calls a correct export broken. That is the bug this check
replaced.

**Status: PASS.** 268 stored records across two libraries → 163 tools, 278
presets, 105 guids held by more than one library, zero tools whose three
counts disagree. `3/8 HARVI I TE` (5 presets in one library, 2 in the other)
comes out union 5 / written 5 / read back 5.

**A fixture without overlapping guids does not exercise this.** The suite's
seven-tool fixture passed while the assertion was wrong. If you change the
fixtures, keep guids shared across libraries with differing preset sets, and
run the button against the real files too — that is the only run that counts.
