/* ============================================================
   Hillard Lights — Layout overlay config
   ------------------------------------------------------------
   The renderer places one dot per xLights auto-group on top of
   the season image. Groups are read from layout-data.js.

   Alignment knobs (all optional):
     padLeft / padRight / padTop / padBottom
                Percentages of the image the world-coord bounding
                box is inset from each edge. Use asymmetric values
                when the image crop isn't centered. `padX` / `padY`
                are symmetric shorthand.

     aggregate  Collapse a bunch of auto-groups into one super-dot
                (e.g. all 30+ roofline pixel segments become a
                single "Roofline" dot). Each entry:
                  { key, label, cat, description, match: [regex],
                    px?, py? }
                px / py override the computed centroid, in image %.

     positions  Manual (px, py) override for individual auto-groups
                that aren't aggregated. Keyed by the group key from
                layout-data.js. Same units — image %, 0-100.

     hide       Array of group keys to skip entirely.

   Auto-groups not matched, not overridden, and not hidden render
   at their computed centroid.
   ============================================================ */
window.HILLARD_ZONES = {

    halloween: {
        image: "images/layouts/halloween.jpg",
        alt:   "Halloween xLights layout",

        // Calibrated for halloween.jpg (3135x1280). The rendered preview
        // crops in slightly on the left/right and has a bit of headroom
        // top/bottom; per-edge padding lets the auto-mapping approximate
        // where each prop actually lives in the image.
        padLeft:   13,
        padRight:   5,
        padTop:     3,
        padBottom:  5,

        // xLights layout units per foot. Anchored on the headless horseman
        // (275.475 units ≈ 8 ft), cross-checked against gothic arch,
        // spooky tree, spider web, and singing pumpkin. Used to auto-format
        // prop sizes (w × h) in the detail panel.
        scaleUnitsPerFoot: 34.44,

        // Whitelist mode — only these group keys render. Everything else
        // is skipped so we can spotlight one or two props at a time and
        // grow the display as we author custom notes for each.
        showOnly: [
            "headless horsman",
            "pumpkin arch",
            "singing-pumpkins",
            "tombstone-skull",
            "tombstone-rip",
            "rosa tomb",
            "triune tomb",
            "spider web",
            "spider",
            "catcus",
            "Gothic-Arch",
            "gothic-gate",
            "lamppost",
            "ghosts",
            "bat-tree",
            "bat - flying - large",
            "truss-bats",
            "MH",
            "matrix-truss",
            "fences",
            "dmx-floods"
        ],

        // Per-key panel overrides. All fields optional:
        //   hideName: suppress the panel title AND category chip
        //   note:     custom line shown in place of the auto description
        //   pixels:   override the auto pixel count
        //   size:     override the auto-derived "W' × H'" size string
        //   subs:     replace the raw xLights submodel list with a curated
        //             breakdown, e.g. [{ label: "Rider", pixels: 174 }, …]
        overrides: {
            "headless horsman": {
                subs: [
                    { label: "Rider", pixels: 174 },
                    { label: "Horse", pixels: 241 }
                ]
            },
            "pumpkin arch": {
                // xLights reports 0 pixels because Arches models are
                // string-based; the real count is one puck per carved face.
                pixels: 19,
                size: "7.5' tall",
                note: "Home Depot arch with the faces carved out. Diffused with photographer lighting sheets and lit by a puck light per face — every pumpkin can go its own color."
            },
            "rosa tomb": {
                // Auto-generated description mis-attributes bat sub-models;
                // override with something accurate.
                note: "Four ornate rosa tombs — rosette detailing with per-tomb pixel animation."
            },
            "spider web": {
                // Web is actually on the right side of the yard, not
                // "center-yard" as the auto description claims.
                note: "Radial pixel web on the right side of the yard. Concentric rings alternate even/odd for ripple, chase, and pulse effects on beat drops."
            },
            "bat-tree": {
                // Auto description said "twinkle and flap"; these are
                // static perched bats (unlike the flying bats on the roof).
                note: "16 static bats perched throughout the spooky tree — pixel-lit for twinkle and per-bat color washes. Unlike the roof flying bats, these don't move."
            },
            "bat - flying - large": {
                // Auto label is "Roof Flying Bats"; auto description
                // mentions truss which is actually the separate truss-bats
                // group.
                label: "Large Flying Bats",
                note: "12 large flying bats mounted around the roof with independently animated wings."
            },
            "MH": {
                note: "Eight 380-watt DMX beam fixtures on the front truss. Pan, tilt, gobo, and color wheel are choreographed per song."
            },
            "dmx-floods": {
                // xLights counts each flood as 1 "pixel"; hide that to avoid
                // a misleading "15 pixels" stat next to Props: 15.
                pixels: 0,
                note: "15 DMX-controlled 30-watt RGB flood lights — 9 upper along the eaves and 6 lower on the walls. Each is independently color-choreographed for wall washes and chases."
            }
        },

        aggregate: [
            {
                key: "singing-pumpkins",
                label: "Singing Pumpkins",
                cat:   "Singing Pumpkin",
                description:
                    "Four pumpkin heads with animated mouths that split the vocal parts each song — lead takes the melody, girl and backup handle harmonies, and grumpy sings low.",
                match: ["^pumpkin - (lead|girl|backup|grumpy)$"],
                px: 44, py: 50
            },
            {
                key: "gothic-gate",
                label: "Gothic Gate",
                cat:   "Gate Matrix",
                description:
                    "Twin pixel-matrix gates flanking the gothic arch — vertical sweeps and full-gate patterns synced to the beat.",
                match: ["^Gate (Left|Right)$"],
                px: 67, py: 63
            },
            {
                key: "ghosts",
                label: "Ghosts",
                cat:   "Ghost",
                description:
                    "24 animated ghost silhouettes flanking the upstairs windows — eyes and mouths animate independently per ghost.",
                match: ["^ghost - (loft|paige) - (upper|lower)$"],
                px: 62, py: 22
            },
            {
                key: "truss-bats",
                label: "Truss Flying Bats",
                cat:   "Flying Bat",
                description:
                    "Four large flying bats mounted on the front truss — two on each side, with independently animated wings.",
                match: ["^bat - flying - truss - (left|right)$"],
                px: 49, py: 60
            },
            {
                key: "matrix-truss",
                label: "Matrix Truss",
                cat:   "Matrix Column",
                description:
                    "Rectangular stage-truss frame with 1-inch spacing pixels on a grid. Runs text scrolls, VU meters, and pattern effects across all four sides.",
                match: ["^matrix - column"],
                px: 38, py: 55
            },
            {
                key: "roofline",
                label: "Roofline",
                cat:   "Roofline Pixels",
                description:
                    "The full pixel outline around every eave, ridge, and peak on the house and garage. Chases, sweeps, and beat drops.",
                match: ["^entrance roof", "^garage roof", "^shelby roof"],
                px: 48, py: 18
            },
            {
                key: "wall-floods",
                label: "Wall Floods",
                cat:   "Flood",
                description:
                    "Ground- and eave-mounted RGB floods that wash the walls, pillars, and porch with full-color light.",
                match: ["^flood - "],
                px: 48, py: 50
            },
            {
                key: "roof-floods",
                label: "Roof Floods",
                cat:   "Roof Flood",
                description:
                    "Static color floods pointed down at the roof planes from above.",
                match: ["^flood-roof"],
                px: 48, py: 12
            },
            {
                key: "fences",
                label: "Pixel Fences",
                cat:   "Fence",
                description:
                    "Pixel fence lines around the front and sides of the yard, plus the standard extension segments.",
                // Excludes "fence extension (full)" — the single large
                // full-length extension gets its own dot.
                match: ["^fence - ", "^fence extension$"],
                px: 48, py: 86
            },
            {
                key: "dmx-floods",
                label: "DMX Wall Floods",
                cat:   "DMX Flood",
                description:
                    "DMX-controlled floods used for choreographed wall washes and color chases during songs.",
                match: ["^dmx_flood"],
                px: 48, py: 42
            },
            {
                key: "philips-hue",
                label: "Philips Hue Accents",
                cat:   "Philips Hue",
                description:
                    "Smart RGB bulbs on the driveway and front door — ambient wash between songs.",
                match: ["^phillips hue"],
                px: 34, py: 80
            }
        ],

        // Hand-placed overrides for the individual (non-aggregated) groups.
        // Coordinates are percentages of the image (halloween.jpg, 3135x1280),
        // read visually. Groups without an entry here fall back to the
        // auto-computed centroid from world coords.
        positions: {
            "headless horsman":               { px: 47, py:  6 },
            "MH":                             { px: 36, py: 17 },
            "steampunk spinner":              { px: 32, py: 45 },
            "spooky tree":                    { px: 24, py: 40 },

            "pumpkin - lead":                 { px: 43, py: 43 },
            "pumpkin - girl":                 { px: 47, py: 43 },
            "pumpkin - backup":               { px: 51, py: 43 },
            "pumpkin - grumpy":               { px: 55, py: 43 },
            "pumpkin arch":                   { px: 58, py: 65 },

            "Gothic-Arch":                    { px: 65, py: 52 },
            "lamppost":                       { px: 60, py: 53 },
            "gothic bush inside left":        { px: 61, py: 65 },
            "gothic bush inside right":       { px: 69, py: 65 },
            "gothic bush outside left":       { px: 57, py: 66 },
            "gothic bush outside right":      { px: 73, py: 66 },

            "Gate Left":                      { px: 43, py: 55 },
            "Gate Right":                     { px: 57, py: 55 },

            "spider web":                     { px: 75, py: 65 },
            "spider":                         { px: 72, py: 78 },
            "catcus":                         { px: 85, py: 82 },

            "bat - flying - large":           { px: 40, py: 38 },
            "bat - flying - truss - left":    { px: 42, py: 20 },
            "bat - flying - truss - right":   { px: 55, py: 20 },
            "bat-tree":                       { px: 77, py: 25 },

            "ghost - loft - upper":           { px: 68, py: 12 },
            "ghost - loft - lower":           { px: 66, py: 25 },
            "ghost - paige - upper":          { px: 34, py: 12 },
            "ghost - paige - lower":          { px: 32, py: 25 },

            "window_matrix_paige_left":       { px: 30, py: 20 },
            "window_matrix_paige_right":      { px: 38, py: 20 },
            "window_matrix_loft_left":        { px: 45, py: 20 },
            "window_matrix_loft_right":       { px: 51, py: 20 },
            "window_matrix_shelby":           { px: 65, py: 20 },
            "garage_matrix":                  { px: 30, py: 42 },

            "matrix - column - left":         { px: 41, py: 33 },
            "matrix - column - right":        { px: 55, py: 33 },
            "matrix - column top":            { px: 48, py: 26 },
            "matrix - column - bottom":       { px: 48, py: 40 },

            "tombstone-skull":                { px: 17, py: 66 },
            "tombstone-rip":                  { px: 10, py: 72 },
            "rosa tomb":                      { px: 43, py: 71 },
            "triune tomb":                    { px: 52, py: 71 }
        },

        // Utility props that clutter the map — hide entirely.
        hide: [
            "radio sign",
            "garage double wall corner - lower - left",
            "garage single wall corner - lower - left",
            "garage single wall corner - lower - right",
            "garage single wall corner - lower - right - entrance",
            "garage on roof - lower middle - left"
        ]
    },

    christmas: {
        image: "images/layouts/christmas.png",
        alt:   "Christmas xLights layout",
        padX: 3,
        padY: 3,
        aggregate: [
            {
                key: "roofline",
                label: "Roofline",
                cat:   "Roofline Pixels",
                description:
                    "Same pixel outline around every eave and peak as Halloween — used for chases and beat sweeps.",
                match: ["^entrance roof", "^garage roof", "^shelby roof"]
            },
            {
                key: "eave-snowflakes",
                label: "Eave Snowflakes",
                cat:   "Snowflake",
                description:
                    "The row of pixel snowflakes tucked under the eaves — twinkle in intros, chase in choruses.",
                match: ["^snowflake-loft", "^snowflake-paige", "^snowflake-center"]
            },
            {
                key: "wall-floods",
                label: "Wall Floods",
                cat:   "Flood",
                description:
                    "Floods washing the walls, pillars, and porch with holiday colors.",
                match: ["^flood - "]
            },
            {
                key: "roof-floods",
                label: "Roof Floods",
                cat:   "Roof Flood",
                description:
                    "Static color floods pointed down at the roof planes.",
                match: ["^flood-roof"]
            },
            {
                key: "dmx-floods",
                label: "DMX Wall Floods",
                cat:   "DMX Flood",
                description:
                    "DMX-controlled floods for choreographed wall washes.",
                match: ["^dmx_flood"]
            },
            {
                key: "philips-hue",
                label: "Philips Hue Accents",
                cat:   "Philips Hue",
                description:
                    "Smart RGB bulbs on the driveway — ambient warm-white and holiday reds/greens.",
                match: ["^phillips hue"]
            }
        ]
    }
};
