// Generates the dots that draw the continents on the photo globe.
//
//   node scripts/build-globe.mjs
//
// Spreads points evenly over a sphere (a Fibonacci lattice) and keeps the
// ones that fall on land, using Natural Earth's public-domain land outlines.
// Two sets: a coarse one for the whole-globe view, and a finer one (from a
// more detailed coastline) that only loads once someone zooms in.
// Each is a flat [lat, lng, lat, lng, …] list in tenths of a degree.
// Only needs re-running to change the dot density.
import fs from "node:fs";
import { feature } from "topojson-client";

const SETS = [
  { out: "src/data/globe-land.json", atlas: "land-110m.json", points: 30000 },
  { out: "src/data/globe-land-fine.json", atlas: "land-50m.json", points: 140000 },
];

// Land polygons as flat lng/lat rings with bounding boxes; a flat
// point-in-polygon test is accurate enough for dots and far faster than a
// spherical one. The catch on a flat map is the 180° line: a shape crossing
// it (Fiji, Wrangel Island, and Eurasia via Chukotka) jumps from +180 to
// -180, and those jumps read as edges spanning the whole planet. So each
// ring is "unwrapped" to make its longitudes continuous (letting them run
// past ±180), and points are tested at lng and lng ± 360.
// Antarctica is the one ring that can't close up that way, as it circles the
// pole; it's kept as is, and since the data stops at 85.6°S the polar cap
// below SOUTH_CAP is filled in separately.
const SOUTH_CAP = -85;

function unwrap(ring) {
  const out = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    let [x, y] = ring[i];
    const prev = out[i - 1][0];
    while (x - prev > 180) x -= 360;
    while (x - prev < -180) x += 360;
    out.push([x, y]);
  }
  return out;
}

function landPolygons(atlas) {
  const topology = JSON.parse(fs.readFileSync(`node_modules/world-atlas/${atlas}`, "utf8"));
  const land = feature(topology, topology.objects.land);
  const geometry = land.features?.[0]?.geometry ?? land.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((original) => {
    const outer = unwrap(original[0]);
    // A ring that doesn't come back to where it started circles a pole
    const polar = Math.abs(outer[outer.length - 1][0] - outer[0][0]) > 180;
    const rings = polar ? original : original.map(unwrap);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of rings[0]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { rings, minX, minY, maxX, maxY };
  });
}

function inRing([px, py], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function onLand([lng, lat], polygons) {
  if (lat <= SOUTH_CAP) return true;
  for (const x of [lng, lng + 360, lng - 360]) {
    const point = [x, lat];
    for (const p of polygons) {
      if (x < p.minX || x > p.maxX || lat < p.minY || lat > p.maxY) continue;
      if (inRing(point, p.rings[0]) && !p.rings.slice(1).some((hole) => inRing(point, hole))) return true;
    }
  }
  return false;
}

const golden = Math.PI * (3 - Math.sqrt(5));

for (const { out, atlas, points } of SETS) {
  const polygons = landPolygons(atlas);
  const dots = [];
  for (let i = 0; i < points; i++) {
    const y = 1 - ((i + 0.5) / points) * 2;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lng = ((((golden * i * 180) / Math.PI) % 360) + 540) % 360 - 180;
    if (onLand([lng, lat], polygons)) dots.push(Math.round(lat * 10), Math.round(lng * 10));
  }
  fs.writeFileSync(out, JSON.stringify(dots));
  console.log(`${dots.length / 2} land dots → ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}
