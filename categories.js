/* categories.js — family/type definitions + field schemas. DATA ONLY.
   Adding a family, type, or field here must never require a JS edit in
   index.html. Loaded via <script src> instead of fetch() so the app still
   works when index.html is opened straight from disk (file:// blocks fetch).

   Field kinds the app understands:
     dia    - dimension; accepts fractions ("1/2", "1 1/4") or decimals.
              A dia field may also carry "accepts" to widen parsing, e.g.
              twist-drill dia takes letter (A-Z) and wire-gauge (#1-#80)
              sizes via the lookup tables below. Stored as decimal for
              sort/math plus a display string. One shared parse/format
              utility handles every dia-like field.
     int    - whole number
     number - decimal number
     text   - free text
     bool   - yes/no checkbox
     select - one of "options"

   Field modes (every field declares one):
     "input"   - user types it; renders in the entry form
     "fixed"   - implied by the type; never rendered. Carries "value".
     "derived" - computed from other fields on the same record; never
                 rendered. Carries either "expr" (trivial arithmetic over
                 one field, e.g. "dia / 2") or "lookup" + "from" (a named
                 table in CATEGORIES.lookups keyed by another field).
   The RESOLVED VALUE IS ALWAYS STORED ON THE RECORD regardless of mode,
   so search/sort/filter treat every record uniformly. Only "input" fields
   appear in the form, in the order they appear after resolution. Derived
   expressions stay trivial (one field, basic arithmetic, or a named
   lookup); if an expression wants more than that, make it an input.

   Per-type resolution (family x type -> field list):
     1. start from family.fields (this is the tab order)
     2. shallow-merge type.overrides[key] into the matching field; if the
        override changes "mode", first discard the field's old
        value/expr/lookup/from so nothing stale survives the mode switch
     3. remove keys listed in type.drop
     4. append type.add in order
   Types with no overrides/drop/add use family.fields as-is.

   Required at entry: id, family, type. Every other field is skippable.

   Per-field extras:
     unit          - display hint shown next to the input
     default       - preselected value for selects
     hint          - placeholder/format example shown in the input
     accepts       - widened parse forms for a dia field
     context_strip - render in the sticky context strip (substrate lives
                     there), not in the field row; fixed-mode substrate
                     shows as a quiet note instead of a control
*/
window.CATEGORIES = {

  /* Named tables for derived fields and widened dia parsing.
     All values are decimal inches. */
  "lookups": {

    /* center drill size number -> body diameter */
    "center_drill_body_dia": {
      "#1": 0.125, "#2": 0.1875, "#3": 0.25, "#4": 0.3125,
      "#5": 0.4375, "#6": 0.5, "#7": 0.625
    },

    /* letter drill sizes A-Z */
    "drill_letter_sizes": {
      "A": 0.234, "B": 0.238, "C": 0.242, "D": 0.246, "E": 0.25,
      "F": 0.257, "G": 0.261, "H": 0.266, "I": 0.272, "J": 0.277,
      "K": 0.281, "L": 0.29,  "M": 0.295, "N": 0.302, "O": 0.316,
      "P": 0.323, "Q": 0.332, "R": 0.339, "S": 0.348, "T": 0.358,
      "U": 0.368, "V": 0.377, "W": 0.386, "X": 0.397, "Y": 0.404,
      "Z": 0.413
    },

    /* wire-gauge (number) drill sizes #1-#80 */
    "drill_wire_gauge_sizes": {
      "#1": 0.228,  "#2": 0.221,  "#3": 0.213,  "#4": 0.209,
      "#5": 0.2055, "#6": 0.204,  "#7": 0.201,  "#8": 0.199,
      "#9": 0.196,  "#10": 0.1935, "#11": 0.191, "#12": 0.189,
      "#13": 0.185, "#14": 0.182, "#15": 0.18,  "#16": 0.177,
      "#17": 0.173, "#18": 0.1695, "#19": 0.166, "#20": 0.161,
      "#21": 0.159, "#22": 0.157, "#23": 0.154, "#24": 0.152,
      "#25": 0.1495, "#26": 0.147, "#27": 0.144, "#28": 0.1405,
      "#29": 0.136, "#30": 0.1285, "#31": 0.12,  "#32": 0.116,
      "#33": 0.113, "#34": 0.111, "#35": 0.11,  "#36": 0.1065,
      "#37": 0.104, "#38": 0.1015, "#39": 0.0995, "#40": 0.098,
      "#41": 0.096, "#42": 0.0935, "#43": 0.089, "#44": 0.086,
      "#45": 0.082, "#46": 0.081, "#47": 0.0785, "#48": 0.076,
      "#49": 0.073, "#50": 0.07,  "#51": 0.067, "#52": 0.0635,
      "#53": 0.0595, "#54": 0.055, "#55": 0.052, "#56": 0.0465,
      "#57": 0.043, "#58": 0.042, "#59": 0.041, "#60": 0.04,
      "#61": 0.039, "#62": 0.038, "#63": 0.037, "#64": 0.036,
      "#65": 0.035, "#66": 0.033, "#67": 0.032, "#68": 0.031,
      "#69": 0.0292, "#70": 0.028, "#71": 0.026, "#72": 0.025,
      "#73": 0.024, "#74": 0.0225, "#75": 0.021, "#76": 0.02,
      "#77": 0.018, "#78": 0.016, "#79": 0.0145, "#80": 0.0135
    }
  },

  "families": [
    {
      "key": "endmill",
      "prefix": "EM",
      "label": "Endmills",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "description_template": "{dia_display} {flutes}FL {substrate} {type} endmill",
      "fields": [
        { "key": "dia",        "label": "Dia",        "kind": "dia",  "mode": "input" },
        { "key": "flutes",     "label": "Flutes",     "kind": "int",  "mode": "input" },
        { "key": "loc",        "label": "LOC",        "kind": "dia",  "mode": "input" },
        { "key": "corner_rad", "label": "Corner rad", "kind": "dia",  "mode": "fixed", "value": 0 },
        { "key": "oal",        "label": "OAL",        "kind": "dia",  "mode": "input" },
        { "key": "shank_dia",  "label": "Shank dia",  "kind": "dia",  "mode": "input" },
        { "key": "coating",    "label": "Coating",    "kind": "text", "mode": "input" },
        { "key": "substrate",  "label": "Substrate",  "kind": "select",
          "mode": "fixed", "value": "carbide", "context_strip": true }
      ],
      "types": [
        { "key": "square", "label": "Square", "decal": "d-em-square" },
        { "key": "ball", "label": "Ball", "decal": "d-em-ball",
          "overrides": { "corner_rad": { "mode": "derived", "expr": "dia / 2" } } },
        { "key": "corner_rad", "label": "Corner rad", "decal": "d-em-corner-rad",
          "overrides": { "corner_rad": { "mode": "input" } } },
        { "key": "chamfer", "label": "Chamfer", "decal": "d-em-chamfer",
          "add": [
            { "key": "included_angle", "label": "Incl angle", "kind": "number", "unit": "°", "mode": "input" },
            { "key": "tip_dia",        "label": "Tip dia",    "kind": "dia",    "mode": "input" }
          ] },
        { "key": "corner_rounding", "label": "Cnr round", "decal": "d-em-corner-round",
          "drop": ["corner_rad"],
          "add": [
            { "key": "form_radius", "label": "Form radius", "kind": "dia", "mode": "input" },
            { "key": "pilot_dia",   "label": "Pilot dia",   "kind": "dia", "mode": "input" }
          ] },
        { "key": "thread_mill", "label": "Thread mill", "decal": "d-em-thread-mill",
          "drop": ["corner_rad"],
          "add": [
            { "key": "thread_range", "label": "Thread range", "kind": "text", "mode": "input",
              "hint": "1/4-20 – 1/2-13, or a pitch" }
          ] },
        { "key": "rougher", "label": "Rougher", "decal": "d-em-rougher",
          "add": [
            { "key": "chipbreaker_style", "label": "Chipbreaker", "kind": "select",
              "options": ["fine", "coarse"], "mode": "input" }
          ] }
      ]
    },
    {
      "key": "drill",
      "prefix": "DR",
      "label": "Drills",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "description_template": "{dia_display} {substrate} {type} drill",
      "fields": [
        { "key": "dia",          "label": "Dia",          "kind": "dia",    "mode": "input" },
        { "key": "point_angle",  "label": "Point angle",  "kind": "number", "mode": "input", "unit": "°" },
        { "key": "flute_length", "label": "Flute length", "kind": "dia",    "mode": "input" },
        { "key": "oal",          "label": "OAL",          "kind": "dia",    "mode": "input" },
        { "key": "substrate",    "label": "Substrate",    "kind": "select",
          "options": ["HSS", "cobalt", "carbide"], "default": "HSS",
          "mode": "input", "context_strip": true },
        { "key": "coating",      "label": "Coating",      "kind": "text",   "mode": "input" },
        { "key": "coolant_thru", "label": "Coolant thru", "kind": "bool",   "mode": "input" }
      ],
      "types": [
        { "key": "twist", "label": "Twist", "decal": "d-dr-twist",
          "overrides": { "dia": { "accepts": ["fraction", "decimal", "letter", "wire_gauge"] } } },
        { "key": "spot", "label": "Spot", "decal": "d-dr-spot",
          /* point_angle is the key identity field for spots */
          "drop": ["flute_length", "coolant_thru"] },
        { "key": "center", "label": "Center", "decal": "d-dr-center",
          "drop": ["dia", "point_angle"],
          "add": [
            { "key": "size_number", "label": "Size #", "kind": "select",
              "options": ["#1", "#2", "#3", "#4", "#5", "#6", "#7"], "mode": "input" },
            { "key": "body_dia", "label": "Body dia", "kind": "dia",
              "mode": "derived", "lookup": "center_drill_body_dia", "from": "size_number" }
          ] },
        { "key": "countersink", "label": "Countersink", "decal": "d-dr-countersink",
          "drop": ["flute_length"],
          "add": [
            { "key": "included_angle", "label": "Incl angle", "kind": "number", "unit": "°", "mode": "input" },
            { "key": "body_dia",       "label": "Body dia",   "kind": "dia",    "mode": "input" },
            { "key": "flutes",         "label": "Flutes",     "kind": "int",    "mode": "input" }
          ] }
      ]
    },
    {
      "key": "tap",
      "prefix": "TP",
      "label": "Taps",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "description_template": "{thread_size} {type} tap",
      "fields": [
        { "key": "thread_size",   "label": "Thread size", "kind": "text", "mode": "input",
          "hint": "1/4-20, M6x1 — size + pitch, one field" },
        { "key": "class",         "label": "Class",       "kind": "select",
          "options": ["2B", "3B"], "mode": "input" },
        { "key": "substrate",     "label": "Substrate",   "kind": "select",
          "options": ["HSS", "cobalt", "carbide"], "default": "HSS",
          "mode": "input", "context_strip": true },
        { "key": "coating",       "label": "Coating",     "kind": "text", "mode": "input" },
        { "key": "thru_or_blind", "label": "Thru/blind",  "kind": "select",
          "options": ["thru", "blind"], "mode": "input" }
      ],
      "types": [
        { "key": "form",         "label": "Form",         "decal": "d-tap" },
        { "key": "cut",          "label": "Cut",          "decal": "d-tap" },
        { "key": "spiral_flute", "label": "Spiral flute", "decal": "d-tap" },
        { "key": "spiral_point", "label": "Spiral point", "decal": "d-tap" },
        { "key": "pipe", "label": "Pipe", "decal": "d-tap",
          "drop": ["class"],
          "overrides": { "thread_size": { "hint": "NPT style: 1/8-27 NPT" } } }
      ]
    },
    {
      "key": "reamer",
      "prefix": "RM",
      "label": "Reamers",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "description_template": "{dia_display} {type} reamer",
      "fields": [
        { "key": "dia",       "label": "Dia",       "kind": "dia",  "mode": "input" },
        { "key": "tolerance", "label": "Tol (+/-)", "kind": "text", "mode": "input",
          "hint": "+.0000/-.0002" },
        { "key": "flutes",    "label": "Flutes",    "kind": "int",  "mode": "input" },
        { "key": "substrate", "label": "Substrate", "kind": "select",
          "options": ["HSS", "cobalt", "carbide"], "default": "carbide",
          "mode": "input", "context_strip": true },
        { "key": "shank_dia", "label": "Shank dia", "kind": "dia",  "mode": "input" }
      ],
      "types": [
        { "key": "chucking",   "label": "Chucking",   "decal": "d-reamer" },
        { "key": "over_under", "label": "Over/under", "decal": "d-reamer" }
      ]
    },
    {
      "key": "insert_tooling",
      "prefix": "IT",
      "label": "Insert tooling",
      "enabled": true,
      "consumable_default": false,
      "min_qty_default": 0,
      "description_template": "{dia_display} {type}",
      "fields": [
        { "key": "dia",                "label": "Dia",           "kind": "dia",  "mode": "input" },
        /* identity-tier: this powers v2 insert-to-body matching */
        { "key": "insert_designation", "label": "Insert desig.", "kind": "text", "mode": "input",
          "hint": "SEHT1204" },
        { "key": "pocket_count",       "label": "Pockets",       "kind": "int",  "mode": "input" },
        { "key": "mount",              "label": "Mount",         "kind": "text", "mode": "input",
          "hint": "arbor size or shank dia" },
        { "key": "max_doc",            "label": "Max DOC",       "kind": "dia",  "mode": "input" }
      ],
      "types": [
        { "key": "shell_mill",   "label": "Shell mill",   "decal": "d-it-shellmill" },
        { "key": "indexable_em", "label": "Indexable EM", "decal": "d-it-indexable" },
        { "key": "insert_drill", "label": "Insert drill", "decal": "d-it-insertdrill" }
      ]
    },
    {
      "key": "insert",
      "prefix": "IN",
      "label": "Inserts",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 4,
      "description_template": "{designation} {grade} insert",
      "fields": [
        { "key": "designation", "label": "Designation", "kind": "text", "mode": "input",
          "hint": "full ISO/mfr string" },
        { "key": "grade",       "label": "Grade",       "kind": "text", "mode": "input" },
        { "key": "nose_rad",    "label": "Nose rad",    "kind": "dia",  "mode": "input" },
        { "key": "coating",     "label": "Coating",     "kind": "text", "mode": "input" },
        { "key": "chipbreaker", "label": "Chipbreaker", "kind": "text", "mode": "input" }
      ],
      "types": [
        { "key": "square",         "label": "Square",         "decal": "d-in-square" },
        { "key": "round",          "label": "Round",          "decal": "d-in-round" },
        { "key": "diamond",        "label": "Diamond",        "decal": "d-in-diamond" },
        { "key": "drill_specific", "label": "Drill-specific", "decal": "d-in-drilltip" }
      ]
    },
    {
      "key": "holder",
      "prefix": "HB",
      "label": "Holders",
      "enabled": true,
      "consumable_default": false,
      "min_qty_default": 0,
      "description_template": "{interface} {type} {capacity}",
      "fields": [
        { "key": "interface",   "label": "Interface",   "kind": "select",
          "options": ["CAT40", "CAT50", "BT30", "BT40", "HSK63A", "R8"], "mode": "input" },
        { "key": "capacity",    "label": "Capacity",    "kind": "text",   "mode": "input",
          "hint": "ER size / arbor dia / chuck range" },
        { "key": "gage_length", "label": "Gage length", "kind": "number", "mode": "input" },
        { "key": "coolant",     "label": "Coolant",     "kind": "select",
          "options": ["none", "TSC", "flange"], "mode": "input" }
      ],
      "types": [
        { "key": "er_chuck",    "label": "ER chuck",    "decal": "d-hb-er" },
        { "key": "shrink_fit",  "label": "Shrink fit",  "decal": "d-hb-shrink" },
        { "key": "shell_arbor", "label": "Shell arbor", "decal": "d-hb-shell-arbor" },
        { "key": "drill_chuck", "label": "Drill chuck", "decal": "d-hb-drill-chuck" },
        { "key": "tap_holder",  "label": "Tap holder",  "decal": "d-hb-tap-holder" }
      ]
    },
    {
      "key": "hardware",
      "prefix": "MS",
      "label": "Hardware",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 1,
      "description_template": "{type} {size}",
      "fields": [
        { "key": "size", "label": "Size", "kind": "text", "mode": "input" },
        { "key": "fits", "label": "Fits", "kind": "text", "mode": "input" }
      ],
      "types": [
        { "key": "collet",       "label": "Collet",       "decal": "d-ms-collet" },
        { "key": "pull_stud",    "label": "Pull stud",    "decal": "d-ms-pullstud" },
        { "key": "insert_screw", "label": "Insert screw", "decal": "d-ms-insert-screw" },
        { "key": "wrench",       "label": "Wrench",       "decal": "d-ms-wrench" },
        { "key": "misc",         "label": "Misc",         "decal": "d-ms-misc" }
      ]
    },

    /* ---- v2 lathe families: shipped disabled, prefixes reserved (plan 2.4).
       Flip "enabled" and fill in types/fields when lathe tooling lands. ---- */
    {
      "key": "od_holder", "prefix": "TH", "label": "OD holders", "enabled": false,
      "consumable_default": false, "min_qty_default": 0,
      "description_template": "{type}", "types": [], "fields": []
    },
    {
      "key": "boring_bar", "prefix": "BB", "label": "Boring bars", "enabled": false,
      "consumable_default": false, "min_qty_default": 0,
      "description_template": "{type}", "types": [], "fields": []
    },
    {
      "key": "grooving", "prefix": "GR", "label": "Grooving/parting", "enabled": false,
      "consumable_default": false, "min_qty_default": 0,
      "description_template": "{type}", "types": [], "fields": []
    },
    {
      "key": "threading", "prefix": "TR", "label": "Threading holders", "enabled": false,
      "consumable_default": false, "min_qty_default": 0,
      "description_template": "{type}", "types": [], "fields": []
    }
  ]
};
