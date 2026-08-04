/* categories.js — family/type definitions + field schemas. DATA ONLY.
   Adding a family, type, or field here must never require a JS edit in
   index.html. Loaded via <script src> instead of fetch() so the app still
   works when index.html is opened straight from disk (file:// blocks fetch).

   Field kinds the app understands:
     dia    - dimension; accepts fractions ("1/2", "1 1/4") or decimals
     int    - whole number
     number - decimal number
     text   - free text
     bool   - yes/no checkbox
     select - one of "options"

   Per-field extras:
     unit       - display hint shown next to the input
     only_types - field only appears for these type keys
*/
window.CATEGORIES = {
  "families": [
    {
      "key": "endmill",
      "prefix": "EM",
      "label": "Endmills",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "substrate": { "mode": "hidden", "default": "carbide" },
      "description_template": "{dia_display} {flutes}FL {substrate} {type} endmill",
      "types": [
        { "key": "square",          "label": "Square",      "decal": "d-em-square" },
        { "key": "ball",            "label": "Ball",        "decal": "d-em-ball" },
        { "key": "corner_rad",      "label": "Corner rad",  "decal": "d-em-corner-rad" },
        { "key": "chamfer",         "label": "Chamfer",     "decal": "d-em-chamfer" },
        { "key": "corner_rounding", "label": "Cnr round",   "decal": "d-em-corner-round" },
        { "key": "thread_mill",     "label": "Thread mill", "decal": "d-em-thread-mill" },
        { "key": "rougher",         "label": "Rougher",     "decal": "d-em-rougher" }
      ],
      "fields": [
        { "key": "dia",        "label": "Dia",        "kind": "dia" },
        { "key": "flutes",     "label": "Flutes",     "kind": "int" },
        { "key": "loc",        "label": "LOC",        "kind": "dia" },
        { "key": "corner_rad", "label": "Corner rad", "kind": "dia", "only_types": ["corner_rad"] },
        { "key": "coating",    "label": "Coating",    "kind": "text" }
      ]
    },
    {
      "key": "drill",
      "prefix": "DR",
      "label": "Drills",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "substrate": { "mode": "visible", "options": ["HSS", "cobalt", "carbide"], "default": "HSS" },
      "description_template": "{dia_display} {substrate} {type} drill",
      "types": [
        { "key": "twist",       "label": "Twist",       "decal": "d-dr-twist" },
        { "key": "spot",        "label": "Spot",        "decal": "d-dr-spot" },
        { "key": "center",      "label": "Center",      "decal": "d-dr-center" },
        { "key": "countersink", "label": "Countersink", "decal": "d-dr-countersink" }
      ],
      "fields": [
        { "key": "dia",          "label": "Dia",          "kind": "dia" },
        { "key": "point_angle",  "label": "Point angle",  "kind": "number", "unit": "°" },
        { "key": "flute_length", "label": "Flute length", "kind": "dia" },
        { "key": "coolant_thru", "label": "Coolant thru", "kind": "bool" }
      ]
    },
    {
      "key": "tap",
      "prefix": "TP",
      "label": "Taps",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "substrate": { "mode": "visible", "options": ["HSS", "cobalt", "carbide"], "default": "HSS" },
      "description_template": "{thread_size} {type} tap",
      "types": [
        { "key": "form",         "label": "Form",         "decal": "d-tap" },
        { "key": "cut",          "label": "Cut",          "decal": "d-tap" },
        { "key": "spiral_flute", "label": "Spiral flute", "decal": "d-tap" },
        { "key": "spiral_point", "label": "Spiral point", "decal": "d-tap" },
        { "key": "pipe",         "label": "Pipe",         "decal": "d-tap" }
      ],
      "fields": [
        { "key": "thread_size", "label": "Thread size", "kind": "text" },
        { "key": "pitch",       "label": "Pitch/TPI",   "kind": "text" },
        { "key": "class",       "label": "Class",       "kind": "text" },
        { "key": "thru_blind",  "label": "Thru/blind",  "kind": "select", "options": ["thru", "blind"] }
      ]
    },
    {
      "key": "reamer",
      "prefix": "RM",
      "label": "Reamers",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 2,
      "substrate": { "mode": "visible", "options": ["HSS", "cobalt", "carbide"], "default": "carbide" },
      "description_template": "{dia_display} {type} reamer",
      "types": [
        { "key": "chucking",   "label": "Chucking",   "decal": "d-reamer" },
        { "key": "over_under", "label": "Over/under", "decal": "d-reamer" }
      ],
      "fields": [
        { "key": "dia",       "label": "Dia",       "kind": "dia" },
        { "key": "tolerance", "label": "Tol (+/-)", "kind": "text" },
        { "key": "flutes",    "label": "Flutes",    "kind": "int" }
      ]
    },
    {
      "key": "insert_tooling",
      "prefix": "IT",
      "label": "Insert tooling",
      "enabled": true,
      "consumable_default": false,
      "min_qty_default": 0,
      "substrate": null,
      "description_template": "{dia_display} {type}",
      "types": [
        { "key": "shell_mill",   "label": "Shell mill",   "decal": "d-it-shellmill" },
        { "key": "indexable_em", "label": "Indexable EM", "decal": "d-it-indexable" },
        { "key": "insert_drill", "label": "Insert drill", "decal": "d-it-insertdrill" }
      ],
      "fields": [
        { "key": "dia",                "label": "Dia",           "kind": "dia" },
        { "key": "insert_designation", "label": "Insert desig.", "kind": "text" },
        { "key": "pocket_count",       "label": "Pockets",       "kind": "int" },
        { "key": "shank",              "label": "Arbor/shank",   "kind": "text" }
      ]
    },
    {
      "key": "insert",
      "prefix": "IN",
      "label": "Inserts",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 4,
      "substrate": null,
      "description_template": "{code} {grade} insert",
      "types": [
        { "key": "square",         "label": "Square",         "decal": "d-in-square" },
        { "key": "round",          "label": "Round",          "decal": "d-in-round" },
        { "key": "diamond",        "label": "Diamond",        "decal": "d-in-diamond" },
        { "key": "drill_specific", "label": "Drill-specific", "decal": "d-in-drilltip" }
      ],
      "fields": [
        { "key": "code",       "label": "ISO/mfr code", "kind": "text" },
        { "key": "grade",      "label": "Grade",        "kind": "text" },
        { "key": "corner_rad", "label": "Corner rad",   "kind": "dia" }
      ]
    },
    {
      "key": "holder",
      "prefix": "HB",
      "label": "Holders",
      "enabled": true,
      "consumable_default": false,
      "min_qty_default": 0,
      "substrate": null,
      "description_template": "{interface} {type} {capacity}",
      "types": [
        { "key": "er_chuck",    "label": "ER chuck",    "decal": "d-hb-er" },
        { "key": "shrink_fit",  "label": "Shrink fit",  "decal": "d-hb-shrink" },
        { "key": "shell_arbor", "label": "Shell arbor", "decal": "d-hb-shell-arbor" },
        { "key": "drill_chuck", "label": "Drill chuck", "decal": "d-hb-drill-chuck" },
        { "key": "tap_holder",  "label": "Tap holder",  "decal": "d-hb-tap-holder" }
      ],
      "fields": [
        { "key": "interface",   "label": "Interface",      "kind": "text" },
        { "key": "capacity",    "label": "Capacity/arbor", "kind": "text" },
        { "key": "gage_length", "label": "Gage length",    "kind": "number" }
      ]
    },
    {
      "key": "hardware",
      "prefix": "MS",
      "label": "Hardware",
      "enabled": true,
      "consumable_default": true,
      "min_qty_default": 1,
      "substrate": null,
      "description_template": "{type} {size}",
      "types": [
        { "key": "collet",       "label": "Collet",       "decal": "d-ms-collet" },
        { "key": "pull_stud",    "label": "Pull stud",    "decal": "d-ms-pullstud" },
        { "key": "insert_screw", "label": "Insert screw", "decal": "d-ms-insert-screw" },
        { "key": "wrench",       "label": "Wrench",       "decal": "d-ms-wrench" },
        { "key": "misc",         "label": "Misc",         "decal": "d-ms-misc" }
      ],
      "fields": [
        { "key": "size", "label": "Size", "kind": "text" },
        { "key": "fits", "label": "Fits", "kind": "text" }
      ]
    },

    /* ---- v2 lathe families: shipped disabled, prefixes reserved (plan 2.4).
       Flip "enabled" and fill in types/fields when lathe tooling lands. ---- */
    {
      "key": "od_holder", "prefix": "TH", "label": "OD holders", "enabled": false,
      "consumable_default": false, "min_qty_default": 0, "substrate": null,
      "description_template": "{type}", "types": [], "fields": []
    },
    {
      "key": "boring_bar", "prefix": "BB", "label": "Boring bars", "enabled": false,
      "consumable_default": false, "min_qty_default": 0, "substrate": null,
      "description_template": "{type}", "types": [], "fields": []
    },
    {
      "key": "grooving", "prefix": "GR", "label": "Grooving/parting", "enabled": false,
      "consumable_default": false, "min_qty_default": 0, "substrate": null,
      "description_template": "{type}", "types": [], "fields": []
    },
    {
      "key": "threading", "prefix": "TR", "label": "Threading holders", "enabled": false,
      "consumable_default": false, "min_qty_default": 0, "substrate": null,
      "description_template": "{type}", "types": [], "fields": []
    }
  ]
};
