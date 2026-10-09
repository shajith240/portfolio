#!/usr/bin/env node
/* Bakes the Location widget's map of Rajahmundry from OpenStreetMap
   data into compact, pre-projected SVG path data
   (lib/mapData/rajahmundry.ts). Run once, by hand, when the map should
   change — never at build or request time:

     node scripts/bake-map.mjs                 # fetch from Overpass
     node scripts/bake-map.mjs --input raw.json  # re-bake a saved response

   Why baked SVG and not map tiles: every tile provider either needs an
   API key (CARTO, Stadia, MapTiler, Thunderforest) or forbids storing
   its tiles (the OSM tile server), and a live map would add a runtime
   dependency for a city that never moves. Baked vector data is keyless,
   costs nothing per visit, and lets the widget style every road and
   shoreline itself.

   Licence: OpenStreetMap data, © OpenStreetMap contributors, ODbL
   (https://www.openstreetmap.org/copyright). The rendered map is a
   Produced Work: the widget must show the attribution. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib/mapData/rajahmundry.ts");

// Map frame: a square centred on OSM's own place node for the city.
const CENTER = { lat: 17.0050454, lon: 81.7804732 }; // node "Rajamahendravaram"
const HALF_METERS = 3200; // 6.4 km across
const SIZE = 1000; // viewBox is 0..SIZE in both axes
const BBOX = "16.95,81.73,17.04,81.84"; // fetch area, a little larger than the frame

const QUERY = `[out:json][timeout:180];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"](${BBOX});
  way["waterway"~"^(river|canal)$"](${BBOX});
  way["natural"="water"](${BBOX});
  relation["natural"="water"](${BBOX});
  way["leisure"~"^(park|garden)$"](${BBOX});
  way["railway"="rail"](${BBOX});
);
out geom;`;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchOverpass() {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "shajith240-portfolio-map-bake/1.0 (one-off; shajith240@gmail.com)",
        },
        body: "data=" + encodeURIComponent(QUERY),
      });
      if (res.ok) return await res.json();
      console.warn(`[map] ${url} → ${res.status}`);
    } catch (err) {
      console.warn(`[map] ${url} failed: ${err.message}`);
    }
  }
  throw new Error("All Overpass endpoints failed — retry later, or pass --input <saved response>.");
}

/* ── Projection ─────────────────────────────────────────────────── */
// Local equirectangular around the centre — at a 6 km frame it is
// indistinguishable from Web Mercator, and keeps true proportions.
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LON = 111_320 * Math.cos((CENTER.lat * Math.PI) / 180);
const UNITS_PER_M = SIZE / (HALF_METERS * 2);

const project = ({ lat, lon }) => [
  SIZE / 2 + (lon - CENTER.lon) * M_PER_DEG_LON * UNITS_PER_M,
  SIZE / 2 - (lat - CENTER.lat) * M_PER_DEG_LAT * UNITS_PER_M,
];

/* ── Geometry helpers ───────────────────────────────────────────── */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sqTol = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy || 1;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      const ex = ax + t * dx - px;
      const ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > sqTol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const MARGIN = SIZE * 0.08;
const touchesFrame = (pts) =>
  pts.some(([x, y]) => x > -MARGIN && x < SIZE + MARGIN && y > -MARGIN && y < SIZE + MARGIN);

const fmt = (n) => (Math.round(n * 10) / 10).toString();
function toPath(lines, closed) {
  return lines
    .map((pts) => "M" + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L") + (closed ? "Z" : ""))
    .join("");
}

// Join open member ways of a multipolygon into closed rings by matching
// endpoints (reversing members as needed).
function stitchRings(ways) {
  const pending = ways.map((w) => w.slice());
  const rings = [];
  const same = (p, q) => Math.abs(p.lat - q.lat) < 1e-9 && Math.abs(p.lon - q.lon) < 1e-9;
  while (pending.length) {
    let ring = pending.shift();
    let grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < pending.length; i++) {
        const w = pending[i];
        const end = ring[ring.length - 1];
        if (same(end, w[0])) ring = ring.concat(w.slice(1));
        else if (same(end, w[w.length - 1])) ring = ring.concat(w.slice().reverse().slice(1));
        else if (same(ring[0], w[w.length - 1])) ring = w.concat(ring.slice(1));
        else if (same(ring[0], w[0])) ring = w.slice().reverse().concat(ring.slice(1));
        else continue;
        pending.splice(i, 1);
        grew = true;
        break;
      }
    }
    rings.push(ring);
  }
  return rings;
}

/* ── Bake ───────────────────────────────────────────────────────── */
const inputIdx = process.argv.indexOf("--input");
const data = inputIdx > 0 ? JSON.parse(readFileSync(process.argv[inputIdx + 1], "utf8")) : await fetchOverpass();

const layers = { water: [], park: [], river: [], rail: [], minor: [], tertiary: [], secondary: [], primary: [] };
const ROAD_CLASS = {
  residential: "minor",
  unclassified: "minor",
  tertiary: "tertiary",
  secondary: "secondary",
  primary: "primary",
  trunk: "primary",
  motorway: "primary",
};
const TOLERANCE = { water: 0.9, park: 1.2, river: 0.9, rail: 0.9, minor: 1.4, tertiary: 1, secondary: 0.9, primary: 0.8 };

const push = (layer, coords) => {
  const pts = simplify(coords.map(project), TOLERANCE[layer]);
  if (pts.length >= 2 && touchesFrame(pts)) layers[layer].push(pts);
};

for (const el of data.elements) {
  const t = el.tags || {};
  if (el.type === "relation" && t.natural === "water") {
    const members = el.members.filter((m) => m.type === "way" && m.geometry?.length);
    for (const ring of stitchRings(members.map((m) => m.geometry))) push("water", ring);
  } else if (el.type === "way" && el.geometry) {
    if (t.natural === "water") push("water", el.geometry);
    else if (t.leisure) push("park", el.geometry);
    else if (t.waterway) push("river", el.geometry);
    else if (t.railway) push("rail", el.geometry);
    else if (ROAD_CLASS[t.highway]) push(ROAD_CLASS[t.highway], el.geometry);
  }
}

const centre = project(CENTER).map((n) => Math.round(n * 10) / 10);
const out = `/* GENERATED by scripts/bake-map.mjs — do not edit by hand.
   Map data © OpenStreetMap contributors, available under the Open
   Database License (https://www.openstreetmap.org/copyright).
   Frame: ${HALF_METERS * 2 / 1000} km square centred on Rajamahendravaram
   (${CENTER.lat}, ${CENTER.lon}); viewBox 0 0 ${SIZE} ${SIZE}. */

export const RAJAHMUNDRY_MAP = {
  size: ${SIZE},
  metersPerUnit: ${(1 / UNITS_PER_M).toFixed(3)},
  center: [${centre[0]}, ${centre[1]}] as const,
  water: ${JSON.stringify(toPath(layers.water, true))},
  parks: ${JSON.stringify(toPath(layers.park, true))},
  rivers: ${JSON.stringify(toPath(layers.river, false))},
  rail: ${JSON.stringify(toPath(layers.rail, false))},
  roads: {
    minor: ${JSON.stringify(toPath(layers.minor, false))},
    tertiary: ${JSON.stringify(toPath(layers.tertiary, false))},
    secondary: ${JSON.stringify(toPath(layers.secondary, false))},
    primary: ${JSON.stringify(toPath(layers.primary, false))},
  },
};
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
const counts = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length]));
console.log(`[map] wrote ${OUT} (${(out.length / 1024).toFixed(1)} KB)`, counts);
