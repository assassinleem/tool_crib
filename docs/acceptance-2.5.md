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

**Status: FAIL — expected, until Part B.**

Both values are stored and neither is silently taken: they are two records
under two composite keys, `SHOP_TOOLS::…` with `NOF 4` and `SHOP_TOOLS_1::…`
with `NOF 1`, and each keeps its own `raw`. What is missing is the surfacing.
Phase 2.5 raises conflicts for **presets** (`aggregatePresets` flags a preset
key whose values differ across libraries) but nothing compares **geometry**
across the records linked to one crib item, so the flute-count disagreement is
recorded and never shown.

Part B is what closes this.
