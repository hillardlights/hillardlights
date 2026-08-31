// Render the site's computed dot positions on top of a layout image so we
// can visually calibrate zones-data.js. Mirrors the mapping logic in
// scripts.js:renderLayout (aggregate rules, position overrides, padding).
//
// Usage:
//   node tools/preview_dots.js [season]
//
// Outputs tools/_preview-<season>.png beside the input image.

const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

const season = (process.argv[2] || "halloween").toLowerCase();
const repo   = path.join(__dirname, "..");

// --- Load zones config -----------------------------------------------------
const win = {};
const zonesSrc = fs.readFileSync(path.join(repo, "zones-data.js"), "utf8");
new Function("window", zonesSrc)(win);
const cfg = win.HILLARD_ZONES && win.HILLARD_ZONES[season];
if (!cfg) { console.error("no zones for", season); process.exit(1); }

const layout = JSON.parse(fs.readFileSync(path.join(repo, "layout.json"), "utf8"));
const data = layout[season];
if (!data) { console.error("no layout for", season); process.exit(1); }

// --- Compute dots (same logic as scripts.js:computeDots) -------------------
function pixelsOfModel(m) {
    return (m && ((m.pixels && m.pixels.length) || m.pixelCount)) || 0;
}
function pixelsOfGroup(g) {
    let t = 0;
    for (const name of g.members) {
        const m = data.models.find(mm => mm.name === name);
        t += pixelsOfModel(m);
    }
    return t;
}

const remaining = new Set(data.groups.map(g => g.key));
const dots = [];
for (const agg of (cfg.aggregate || [])) {
    const patterns = agg.match.map(s => new RegExp(s));
    const matched = data.groups.filter(g => remaining.has(g.key) && patterns.some(re => re.test(g.key)));
    if (!matched.length) continue;
    for (const g of matched) remaining.delete(g.key);
    let sumX = 0, sumY = 0, w = 0, count = 0;
    for (const g of matched) { sumX += g.cx * g.count; sumY += g.cy * g.count; w += g.count; count += g.count; }
    dots.push({
        key: "agg-" + agg.key, label: agg.label, cat: agg.cat || matched[0].cat,
        cx: sumX / w, cy: sumY / w, px: agg.px, py: agg.py, count, aggregated: true
    });
}
const positions = cfg.positions || {};
const hidden = new Set(cfg.hide || []);
for (const g of data.groups) {
    if (!remaining.has(g.key) || hidden.has(g.key)) continue;
    const pos = positions[g.key];
    dots.push({
        key: g.key, label: g.label, cat: g.cat,
        cx: g.cx, cy: g.cy, px: pos && pos.px, py: pos && pos.py,
        count: g.count, aggregated: false
    });
}

// --- Coordinate mapping (same as scripts.js:renderSeason) ------------------
const b = data.bounds;
const spanX = b.maxX - b.minX;
const spanY = b.maxY - b.minY;
const padLeft   = cfg.padLeft   != null ? cfg.padLeft   : (cfg.padX || 0);
const padRight  = cfg.padRight  != null ? cfg.padRight  : (cfg.padX || 0);
const padTop    = cfg.padTop    != null ? cfg.padTop    : (cfg.padY || 0);
const padBottom = cfg.padBottom != null ? cfg.padBottom : (cfg.padY || 0);
const usableX = 100 - padLeft - padRight;
const usableY = 100 - padTop  - padBottom;

for (const d of dots) {
    d.pctX = (d.px != null) ? d.px : padLeft + ((d.cx - b.minX) / spanX) * usableX;
    d.pctY = (d.py != null) ? d.py : padTop  + ((b.maxY - d.cy) / spanY) * usableY;
}

// --- Load image (need width/height + pixels) ------------------------------
const imgPath = path.join(repo, cfg.image);
console.log("image:", imgPath);
if (!fs.existsSync(imgPath)) { console.error("missing:", imgPath); process.exit(1); }

// We'll shell out to PowerShell for the actual rendering — Node has no
// built-in graphics.
const { execFileSync } = require("child_process");
const dotsJson = path.join(__dirname, "_dots.json");
fs.writeFileSync(dotsJson, JSON.stringify(dots.map(d => ({
    key: d.key, label: d.label, cat: d.cat, count: d.count,
    aggregated: d.aggregated, pctX: d.pctX, pctY: d.pctY
})), null, 2));

const outPng = path.join(__dirname, `_preview-${season}.png`);
const ps = path.join(__dirname, "render_dots.ps1");
execFileSync("powershell.exe", ["-ExecutionPolicy", "Bypass", "-File", ps,
    "-Image", imgPath, "-DotsPath", dotsJson, "-Out", outPng
], { stdio: "inherit" });

console.log(`Rendered ${dots.length} dots -> ${outPng}`);
