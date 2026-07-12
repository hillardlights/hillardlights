/* ============================================================
   extract_layout.js
   ------------------------------------------------------------
   Reads xLights rgbeffects.xml and produces layout.json +
   layout-data.js:

     - Every model with position + real physical size
     - Sub-models per model
     - User-defined xLights modelGroups
     - Auto-derived logical groups (regex strip trailing numbers)
     - Category + short description per group

   Run:   node tools/extract_layout.js
   ============================================================ */

const fs   = require("fs");
const path = require("path");

const IN       = process.env.XLIGHTS_XML
    || "D:/light_shows/halloween/2026/xlights_rgbeffects.xml";
const OUT_JSON = path.join(__dirname, "..", "layout.json");
const OUT_JS   = path.join(__dirname, "..", "layout-data.js");

// ---------------------------------------------------------------
// Filters and categorisation
// ---------------------------------------------------------------
const EXCLUDE_PATTERNS = [
    /^\d+ - controller/i,
    /^32 - garage$/i,
    /^MH (Color|Dimmer|FOCUS|GOBO|PAN|STROBE|TILT)$/,
];

const CATEGORIES = [
    { test: /^MH\d+$/,                        cat: "Moving Head" },
    { test: /^dmx_flood/i,                    cat: "DMX Flood" },
    { test: /^flood-roof/i,                   cat: "Roof Flood" },
    { test: /^flood - /i,                     cat: "Flood" },
    { test: /^bat-tree/i,                     cat: "Bat (Tree)" },
    { test: /^bat - flying/i,                 cat: "Flying Bat" },
    { test: /^spider web$/i,                  cat: "Spider Web" },
    { test: /^spider/i,                       cat: "Spider" },
    { test: /^spooky tree/i,                  cat: "Spooky Tree" },
    { test: /^pumpkin arch/i,                 cat: "Pumpkin Arch" },
    { test: /^pumpkin/i,                      cat: "Singing Pumpkin" },
    { test: /^ghost/i,                        cat: "Ghost" },
    { test: /^tombstone|^rosa tomb|^triune tomb/i, cat: "Tombstone" },
    { test: /^headless/i,                     cat: "Headless Horseman" },
    { test: /^lamppost/i,                     cat: "Lamppost" },
    { test: /^catcus/i,                       cat: "Cactus" },
    { test: /^fence extension/i,              cat: "Fence Extension" },
    { test: /^fence/i,                        cat: "Fence" },
    { test: /^Gate (Left|Right)$/,            cat: "Gate Matrix" },
    { test: /^Gothic-Arch$/,                  cat: "Gothic Arch" },
    { test: /^gothic bush/i,                  cat: "Gothic Bush" },
    { test: /^steampunk/i,                    cat: "Steampunk Spinner" },
    { test: /^phillips hue/i,                 cat: "Philips Hue" },
    { test: /^window_matrix/i,                cat: "Window Matrix" },
    { test: /^garage_matrix$/i,               cat: "Garage Matrix" },
    { test: /^matrix - /i,                    cat: "Matrix Column" },
    { test: /roof/i,                          cat: "Roofline Pixels" },
    { test: /garage/i,                        cat: "Garage" },
];

const CAT_DESCRIPTIONS = {
    "Moving Head":        "DMX moving heads on the truss — pan, tilt, gobo, and color wheel choreographed to each song.",
    "DMX Flood":          "DMX RGB flood lights aimed at the walls and roofline for full-color washes.",
    "Roof Flood":         "Static color floods highlighting the roof planes from above.",
    "Flood":              "Ground floods lighting pillars, walls, and yard props.",
    "Roofline Pixels":    "RGB pixel strings running the eaves and peaks — used for chases, sweeps, and beat drops.",
    "Ghost":              "Animated ghost silhouettes with independently controllable eyes and mouth.",
    "Flying Bat":         "Static flying bats staged around the roof and truss.",
    "Bat (Tree)":         "Bats scattered in the front-yard spooky tree.",
    "Spider":             "Motorized descending spiders that drop from above during scary drops.",
    "Spider Web":         "Pixel spider web centerpiece — pulses and radiates from the middle.",
    "Tombstone":          "Yard tombstones with animated faces — eyes, mouths, and RIP text.",
    "Singing Pumpkin":    "Custom-carved singing pumpkins — mouths sync to the lead vocal.",
    "Pumpkin Arch":       "Pixel-lit arch bordered by lit pumpkin heads.",
    "Gate Matrix":        "Twin gate matrices flanking the walkway — full RGB pixel grids with vines.",
    "Gothic Arch":        "The big gothic arch at the entrance — pixel columns and vines that sweep up and over.",
    "Gothic Bush":        "Pixel-wrapped hedges framing the gothic arch.",
    "Fence":              "Pixel fence lines along the yard perimeter.",
    "Fence Extension":    "Extension segments of the pixel fence for the extended run.",
    "Garage":             "Roof and wall pixel outlines around the garage.",
    "Garage Matrix":      "Pixel matrix mounted on the garage face for animations and text.",
    "Window Matrix":      "Window pixel matrices — song lyrics and animations show up on the windows.",
    "Matrix Column":      "Vertical pixel columns used as effect anchors.",
    "Headless Horseman":  "Animated headless horseman — legs, arms, and body run their own effects.",
    "Lamppost":           "Pixel-wrapped lampposts flanking the driveway.",
    "Cactus":             "Custom carved cacti (yes, cacti — this is Arizona) — spooky twist on the desert theme.",
    "Spooky Tree":        "The 16-ft spooky tree — pixel branches, animated eyes, and full color wash.",
    "Steampunk Spinner":  "DMX steampunk spinners that rotate in sync with drops.",
    "Philips Hue":        "Philips Hue smart bulbs on the driveway and porch — full RGB for ambient wash.",
    "Other":              "Custom prop in the show."
};

function categorize(name) {
    for (const r of CATEGORIES) if (r.test.test(name)) return r.cat;
    return "Other";
}

function excluded(name) {
    return EXCLUDE_PATTERNS.some(p => p.test(name));
}

// ---------------------------------------------------------------
// Regex-based grouping (strip trailing numbers)
// ---------------------------------------------------------------
function groupKey(name) {
    let k = name.replace(/[\s\-_]*\d+$/, "").trim();
    k = k.replace(/[\s\-_]+$/, "").trim();
    return k || name;
}

const LABEL_OVERRIDES = {
    "MH":                            "Moving Heads",
    "bat-tree":                      "Tree Bats",
    "bat - flying - large":          "Roof Flying Bats",
    "bat - flying - truss - left":   "Truss Bats (Left)",
    "bat - flying - truss - right":  "Truss Bats (Right)",
    "tombstone-rip":                 "RIP Tombstones",
    "tombstone-skull":               "Skull Tombstone",
    "rosa tomb":                     "Rosa Tombs",
    "triune tomb":                   "Triune Tombs",
    "spider":                        "Spiders",
    "spider web":                    "Spider Web",
    "spooky tree":                   "Spooky Tree",
    "headless horsman":              "Headless Horseman",
    "catcus":                        "Cacti",
    "lamppost":                      "Lampposts",
    "pumpkin arch":                  "Pumpkin Arch",
    "pumpkin - backup":              "Backup Singing Pumpkin",
    "pumpkin - girl":                "Girl Singing Pumpkin",
    "pumpkin - grumpy":              "Grumpy Singing Pumpkin",
    "pumpkin - lead":                "Lead Singing Pumpkin",
    "Gothic-Arch":                   "Gothic Arch",
    "Gate Left":                     "Left Gate Matrix",
    "Gate Right":                    "Right Gate Matrix",
    "garage_matrix":                 "Garage Matrix",
};

function labelFor(key) {
    if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
    return key.replace(/[_-]+/g, " ")
              .replace(/\s+/g, " ")
              .replace(/\b\w/g, c => c.toUpperCase())
              .trim();
}

// ---------------------------------------------------------------
// Description overrides per specific auto-group key
// ---------------------------------------------------------------
const GROUP_DESCRIPTIONS = {
    "MH":                     "Eight DMX moving heads on the front truss. Pan, tilt, gobo, and color wheel are all choreographed per song.",
    "spooky tree":            "The 16-foot yard tree wrapped in RGB pixels, with animated eyes and 16 tree-bat perches.",
    "spider web":             "Radial pixel spider web mounted center-yard — pulses out from the middle on drops.",
    "Gothic-Arch":            "The main entrance arch — twin pixel columns wrapped in vine strands with a wide top arch.",
    "Gate Left":              "Left gate matrix — pixel-grid gate flanking the walkway. Displays vertical sweeps and full patterns.",
    "Gate Right":             "Right gate matrix — pixel-grid gate flanking the walkway. Displays vertical sweeps and full patterns.",
    "garage_matrix":          "Garage-face pixel matrix — displays song titles, lyrics, and full-color animations.",
    "pumpkin - lead":         "The lead singing pumpkin — mouth syncs to the lead vocal every song.",
    "pumpkin - girl":         "Girl singing pumpkin — backup vocals and harmonies.",
    "pumpkin - grumpy":       "Grumpy singing pumpkin — the low-voice character.",
    "pumpkin - backup":       "Backup singing pumpkin — chorus harmonies.",
    "pumpkin arch":           "Walkway arch lit with pixel pumpkins on both sides.",
    "headless horsman":       "The headless horseman prop — arms, legs, and body are individually addressable.",
    "bat-tree":               "16 static bats perched throughout the spooky tree — twinkle and flap during ambient effects.",
    "bat - flying - large":   "12 flying bats mounted around the roof and truss with independently animated wings.",
    "bat - flying - truss - left":  "Two large flying bats on the left truss.",
    "bat - flying - truss - right": "Two large flying bats on the right truss.",
    "tombstone-rip":          "Four RIP tombstones — animated eyes, mouths, and RIP text lettering.",
    "tombstone-skull":        "A single tombstone with a full pixel skull face on top.",
    "rosa tomb":              "Rosa tomb variants — bat body + eyes + flying wing sub-models each animate independently.",
    "triune tomb":            "Triune tomb prop — a triple-face design with per-face effects.",
    "catcus":                 "Three custom pixel cacti — the Arizona touch.",
    "lamppost":               "Two pixel-wrapped lampposts flanking the driveway.",
    "steampunk spinner":      "Steampunk spinners — motorized DMX props that rotate and color-shift on beat.",
    "spider":                 "Six descending motorized spiders — drop from height on scary drops.",
};

function descriptionFor(groupKey, cat, count) {
    if (GROUP_DESCRIPTIONS[groupKey]) return GROUP_DESCRIPTIONS[groupKey];
    const catDesc = CAT_DESCRIPTIONS[cat];
    if (catDesc) return count > 1 ? `${catDesc} (${count} in this group.)` : catDesc;
    return "Custom prop in the show.";
}

// ---------------------------------------------------------------
// Parse the XML
// ---------------------------------------------------------------
const xml = fs.readFileSync(IN, "utf8");

function parseAttrs(str) {
    const out = {};
    const re = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = re.exec(str)) !== null) out[m[1]] = m[2];
    return out;
}

// Grab every <model ...>...</model> block
const modelBlockRe = /<model\s+([\s\S]*?)>([\s\S]*?)<\/model>/g;
const models = [];
let mb;
while ((mb = modelBlockRe.exec(xml)) !== null) {
    const attrs = parseAttrs(mb[1]);
    const body  = mb[2] || "";
    const name  = attrs.name;
    if (!name || excluded(name)) continue;

    const num  = k => (attrs[k] !== undefined && attrs[k] !== "") ? parseFloat(attrs[k]) : 0;

    // Sub-model names within this block
    const subs = [];
    let sm;
    const subRe = /<subModel\s+name="([^"]+)"/g;
    while ((sm = subRe.exec(body)) !== null) subs.push(sm[1]);

    const cw = num("CustomWidth");
    const ch = num("CustomHeight");
    const sx = num("ScaleX") || 1;
    const sy = num("ScaleY") || 1;

    // Physical dimensions in xLights world units, when applicable
    const worldW = (cw && sx) ? cw * sx : 0;
    const worldH = (ch && sy) ? ch * sy : 0;

    models.push({
        name,
        group:     groupKey(name),
        cat:       categorize(name),
        displayAs: attrs.DisplayAs || "",
        x:  num("WorldPosX"),
        y:  num("WorldPosY"),
        z:  num("WorldPosZ"),
        x2: num("X2"),
        y2: num("Y2"),
        rot: num("RotateZ"),
        w:  worldW,
        h:  worldH,
        pixels: num("PixelCount") || num("NodesPerString") || 0,
        strings: num("NumStrings") || 1,
        beamLen: num("DmxBeamLength"),
        channel: attrs.StartChannel || "",
        desc:    attrs.Description  || "",
        subs
    });
}

console.log(`Parsed ${models.length} models (after filtering).`);

// ---------------------------------------------------------------
// Parse <modelGroup> blocks
// ---------------------------------------------------------------
const groupBlockRe = /<modelGroup\s+([\s\S]*?)>([\s\S]*?)<\/modelGroup>/g;
const xlightsGroups = [];
let gb;
while ((gb = groupBlockRe.exec(xml)) !== null) {
    const attrs = parseAttrs(gb[1]);
    if (!attrs.name) continue;
    const memberStr = attrs.models || "";
    // members can reference sub-models via "modelname/SubModelName"
    const raw = memberStr.split(",").map(s => s.trim()).filter(Boolean);
    const parents = new Set();
    for (const r of raw) parents.add(r.split("/")[0]);
    xlightsGroups.push({
        name:      attrs.name,
        parents:   [...parents],
        rawCount:  raw.length
    });
}
console.log(`Parsed ${xlightsGroups.length} xLights model groups.`);

// ---------------------------------------------------------------
// Compute bounds (trimmed to eliminate off-screen helpers)
// ---------------------------------------------------------------
function trimmedRange(vals, pct = 0.02) {
    const s = [...vals].sort((a, b) => a - b);
    const drop = Math.floor(s.length * pct);
    return [s[drop], s[s.length - 1 - drop]];
}
const [minX, maxX] = trimmedRange(models.map(m => m.x));
const [minY, maxY] = trimmedRange(models.map(m => m.y));

// ---------------------------------------------------------------
// Auto-groups (my regex grouping), enriched with descriptions
// and xLights modelGroup memberships.
// ---------------------------------------------------------------
const gMap = {};
for (const m of models) {
    const g = gMap[m.group] = gMap[m.group] || {
        key:     m.group,
        label:   labelFor(m.group),
        cat:     m.cat,
        count:   0,
        members: [],
        cx: 0, cy: 0,
        modelGroups: new Set()
    };
    g.count++;
    g.members.push(m.name);
    g.cx += m.x;
    g.cy += m.y;
    // Find every xLights modelGroup containing this model as a parent
    for (const xg of xlightsGroups) {
        if (xg.parents.includes(m.name)) g.modelGroups.add(xg.name);
    }
}

const groups = Object.values(gMap).map(g => ({
    key:         g.key,
    label:       g.label,
    cat:         g.cat,
    count:       g.count,
    description: descriptionFor(g.key, g.cat, g.count),
    members:     g.members,
    cx:          g.cx / g.count,
    cy:          g.cy / g.count,
    modelGroups: [...g.modelGroups].sort()
})).sort((a, b) => b.count - a.count);

// ---------------------------------------------------------------
// Category summary
// ---------------------------------------------------------------
const catCounts = {};
for (const m of models) catCounts[m.cat] = (catCounts[m.cat] || 0) + 1;

const out = {
    generatedAt: new Date().toISOString(),
    source: IN,
    count: models.length,
    groupCount: groups.length,
    xlightsGroupCount: xlightsGroups.length,
    subModelCount: models.reduce((n, m) => n + m.subs.length, 0),
    bounds: { minX, maxX, minY, maxY },
    categories: catCounts,
    groups,
    models
};

fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
fs.writeFileSync(OUT_JS,
    "// Auto-generated from xlights_rgbeffects.xml by tools/extract_layout.js — do not edit by hand.\n" +
    "window.HILLARD_LAYOUT = " + JSON.stringify(out) + ";\n"
);

console.log(`Wrote ${models.length} models in ${groups.length} groups`);
console.log(`  → ${OUT_JSON}`);
console.log(`  → ${OUT_JS}`);
console.log(`Sub-models total:      ${out.subModelCount}`);
console.log(`xLights modelGroups:   ${out.xlightsGroupCount}`);
console.log(`Bounds:`, out.bounds);
console.log(`Top groups:`, groups.slice(0, 6).map(g => `${g.label} (${g.count})`));
