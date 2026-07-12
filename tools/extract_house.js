/* ============================================================
   extract_house.js
   ------------------------------------------------------------
   Reads the SketchUp OBJ export of the physical house and emits
   house-data.js — a compact set of depth-sorted 2D polygons for
   the front view, ready to inline as an SVG backdrop.

   OBJ conventions (SketchUp export, this file):
     +X = right    (width)
     +Y = up       (height, ground at Y≈0)
     +Z = toward viewer (depth)
     Units = inches

   Front view = (X, Y).  Depth sort by average face Z.

   Run:  node tools/extract_house.js
   ============================================================ */

const fs   = require("fs");
const path = require("path");

const IN  = process.env.HOUSE_OBJ
    || "D:/light_shows/halloween/2023/3D/home-model.obj";
const OUT = path.join(__dirname, "..", "house-data.js");

const raw = fs.readFileSync(IN, "utf8");
const lines = raw.split(/\r?\n/);

const verts = [];       // 1-indexed to match OBJ
verts.push(null);

const faces = [];

for (const line of lines) {
    if (!line || line[0] === "#") continue;
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];

    if (cmd === "v") {
        verts.push([+parts[1], +parts[2], +parts[3]]);
    } else if (cmd === "f") {
        // "f 1/1/1 2/2/1 3/3/1 4/4/1" — take vertex index (before first '/')
        const idx = parts.slice(1).map(t => parseInt(t.split("/")[0], 10));
        if (idx.length >= 3 && idx.every(Number.isFinite)) faces.push(idx);
    }
}

console.log(`Parsed ${verts.length - 1} vertices, ${faces.length} faces.`);

// -----------------------------------------------------------
// Compute bounding box, avg Z per face, project to XY
// -----------------------------------------------------------
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (let i = 1; i < verts.length; i++) {
    const [x, y] = verts[i];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
}

const houseW = maxX - minX;
const houseH = maxY - minY;
console.log(`House bounds (in): X ${minX.toFixed(1)}..${maxX.toFixed(1)} (${houseW.toFixed(1)}"), Y ${minY.toFixed(1)}..${maxY.toFixed(1)} (${houseH.toFixed(1)}")`);

// Build face records with depth
const projected = faces.map(idx => {
    let sumZ = 0;
    const pts = idx.map(i => {
        const v = verts[i];
        sumZ += v[2];
        return [v[0], v[1]];
    });
    return { pts, avgZ: sumZ / idx.length };
});

// Sort back-to-front (lower Z first for +Z toward viewer)
projected.sort((a, b) => a.avgZ - b.avgZ);

// -----------------------------------------------------------
// Emit as an array of "M x y L x y L x y Z" path strings
// -----------------------------------------------------------
const paths = projected.map(f => {
    const [p0, ...rest] = f.pts;
    let d = `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}`;
    for (const p of rest) d += ` L${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    return d + " Z";
});

const out = {
    generatedAt: new Date().toISOString(),
    source: IN,
    units: "inches",
    faceCount: paths.length,
    bounds: { minX, maxX, minY, maxY, width: houseW, height: houseH },
    paths
};

fs.writeFileSync(OUT,
    "// Auto-generated from home-model.obj by tools/extract_house.js — do not edit by hand.\n" +
    "window.HILLARD_HOUSE = " + JSON.stringify(out) + ";\n"
);

console.log(`Wrote ${paths.length} face paths to ${OUT}`);
