/* ============================================================
   Hillard Lights — Layout overlay config
   ------------------------------------------------------------
   The renderer places one dot per xLights auto-group on top of
   the season PNG. Groups are read from layout-data.js.

   `aggregate` optionally collapses a bunch of auto-groups into
   one super-dot (e.g. all 30+ roofline pixel segments become a
   single "Roofline" dot). Auto-groups not matched by any rule
   render individually.

   Add/adjust rules as your xLights layout grows.
   ============================================================ */
window.HILLARD_ZONES = {

    halloween: {
        image: "images/layouts/halloween.png",
        alt:   "Halloween xLights layout",
        // Optional: fudge the layout→PNG coordinate mapping if the PNG has
        // margin around the actual props (in percent of the image). 0 = no pad.
        padX: 3,
        padY: 3,
        aggregate: [
            {
                key: "roofline",
                label: "Roofline",
                cat:   "Roofline Pixels",
                description:
                    "The full pixel outline around every eave, ridge, and peak on the house and garage. Chases, sweeps, and beat drops.",
                match: ["^entrance roof", "^garage roof", "^shelby roof"]
            },
            {
                key: "wall-floods",
                label: "Wall Floods",
                cat:   "Flood",
                description:
                    "Ground- and eave-mounted RGB floods that wash the walls, pillars, and porch with full-color light.",
                match: ["^flood - "]
            },
            {
                key: "roof-floods",
                label: "Roof Floods",
                cat:   "Roof Flood",
                description:
                    "Static color floods pointed down at the roof planes from above.",
                match: ["^flood-roof"]
            },
            {
                key: "fences",
                label: "Pixel Fences",
                cat:   "Fence",
                description:
                    "Pixel fence lines around the front and sides of the yard.",
                match: ["^fence - ", "^fence extension"]
            },
            {
                key: "dmx-floods",
                label: "DMX Wall Floods",
                cat:   "DMX Flood",
                description:
                    "DMX-controlled floods used for choreographed wall washes and color chases during songs.",
                match: ["^dmx_flood"]
            },
            {
                key: "philips-hue",
                label: "Philips Hue Accents",
                cat:   "Philips Hue",
                description:
                    "Smart RGB bulbs on the driveway and front door — ambient wash between songs.",
                match: ["^phillips hue"]
            }
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
