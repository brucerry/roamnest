// Run from the project root using the source URLs/hashes in public/data/geography-provenance.json.
// Place the archive, extracted ecoregions/ .shp/.dbf files and rivers-original.geojson in .cache/geography/.
// Source downloads are disposable; review generated geography and attribution before replacing snapshots.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { geoArea, geoCentroid } from 'd3-geo';
const folder = '.cache/geography/ecoregions/';
// The ESRI Polygon reader retains source rings and holes. RDP simplification
// removes vertices only; it introduces no invented geographic placements.
const shp = await readFile(folder + 'Ecoregions2017.shp'),
    dbf = await readFile(folder + 'Ecoregions2017.dbf');
const n = dbf.readUInt32LE(4),
    header = dbf.readUInt16LE(8),
    record = dbf.readUInt16LE(10),
    fields = [];
let offset = 1;
for (let p = 32; dbf[p] !== 13; p += 32) {
    const name = dbf
            .subarray(p, p + 11)
            .toString('utf8')
            .replace(/\0.*/, ''),
        length = dbf[p + 16];
    fields.push({ name, length, offset });
    offset += length;
}
const attributes = Array.from({ length: n }, (_, i) =>
    Object.fromEntries(
        fields.map((f) => [
            f.name,
            dbf
                .subarray(header + i * record + f.offset, header + i * record + f.offset + f.length)
                .toString('utf8')
                .trim(),
        ]),
    ),
);
const distance = (p, a, b) => {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        t =
            dx || dy
                ? Math.max(
                      0,
                      Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)),
                  )
                : 0;
    return (p[0] - a[0] - dx * t) ** 2 + (p[1] - a[1] - dy * t) ** 2;
};
function rdp(points, tolerance = 0.3) {
    if (points.length < 4) return points;
    const kept = new Set([0, points.length - 1]),
        stack = [[0, points.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        let max = tolerance * tolerance,
            index = -1;
        for (let i = a + 1; i < b; i++) {
            const d = distance(points[i], points[a], points[b]);
            if (d > max) {
                max = d;
                index = i;
            }
        }
        if (index >= 0) {
            kept.add(index);
            stack.push([a, index], [index, b]);
        }
    }
    return [...kept].sort((a, b) => a - b).map((i) => points[i]);
}
const signed = (ring) =>
    ring.reduce((sum, p, i) => {
        const q = ring[(i + 1) % ring.length];
        return sum + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2;
const inside = (p, ring) => {
    let yes = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i],
            b = ring[j];
        if (
            a[1] > p[1] !== b[1] > p[1] &&
            p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
        )
            yes = !yes;
    }
    return yes;
};
const features = [];
let pos = 100,
    index = 0,
    sourceRings = 0,
    sourceVertices = 0;
while (pos < shp.length) {
    const length = shp.readInt32BE(pos + 4) * 2,
        base = pos + 8,
        type = shp.readInt32LE(base),
        attrs = attributes[index++];
    pos = base + length;
    const biome = Number(attrs.BIOME_NUM);
    if (type !== 5 || ![1, 2, 3, 4, 5, 6, 12, 14].includes(biome)) continue;
    const parts = shp.readInt32LE(base + 36),
        count = shp.readInt32LE(base + 40),
        starts = Array.from({ length: parts }, (_, i) => shp.readInt32LE(base + 44 + i * 4));
    starts.push(count);
    const pointOffset = base + 44 + parts * 4,
        rings = [];
    for (let part = 0; part < parts; part++) {
        const ring = Array.from({ length: starts[part + 1] - starts[part] }, (_, i) => {
            const at = pointOffset + (starts[part] + i) * 16;
            return [shp.readDoubleLE(at), shp.readDoubleLE(at + 8)];
        });
        sourceRings++;
        sourceVertices += ring.length;
        const simple = rdp(ring).map((p) => p.map((x) => Number(x.toFixed(3))));
        if (simple.length >= 4 && Math.abs(signed(simple)) > 0.04)
            rings.push({ ring: simple, hole: signed(ring) > 0 });
    }
    const outers = rings.filter((r) => !r.hole),
        holes = rings.filter((r) => r.hole);
    for (const outer of outers) {
        let ring = outer.ring;
        if (geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI)
            ring = [...ring].reverse();
        const coords = [ring];
        for (const h of holes)
            if (inside(h.ring[0], outer.ring)) {
                const hole =
                    geoArea({ type: 'Polygon', coordinates: [h.ring] }) < 2 * Math.PI
                        ? [...h.ring].reverse()
                        : h.ring;
                coords.push(hole);
            }
        features.push({
            type: 'Feature',
            properties: { biome, ecoregionId: Number(attrs.ECO_ID), name: attrs.ECO_NAME },
            geometry: { type: 'Polygon', coordinates: coords },
        });
    }
}
for (const f of features) {
    const center = geoCentroid(f.geometry),
        rad = Math.PI / 180,
        toVector = ([lon, lat]) => [
            Math.cos(lat * rad) * Math.cos(lon * rad),
            Math.cos(lat * rad) * Math.sin(lon * rad),
            Math.sin(lat * rad),
        ],
        v = toVector(center);
    let radius = 0;
    for (const p of f.geometry.coordinates.flat()) {
        const q = toVector(p);
        radius = Math.max(
            radius,
            Math.acos(
                Math.max(
                    -1,
                    Math.min(
                        1,
                        v.reduce((sum, x, i) => sum + x * q[i], 0),
                    ),
                ),
            ),
        );
    }
    f.properties.center = [Number(center[1].toFixed(3)), Number(center[0].toFixed(3))];
    f.properties.radius = Number(Math.min(Math.PI, radius + 0.01).toFixed(4));
}
const rivers = JSON.parse(await readFile('.cache/geography/rivers-original.geojson', 'utf8'));
rivers.features = rivers.features.map((f) => ({
    type: 'Feature',
    properties: { name: f.properties.name, scaleRank: f.properties.scalerank },
    geometry: f.geometry,
}));
await writeFile(
    'public/data/vegetation.geojson',
    JSON.stringify({ type: 'FeatureCollection', features }) + '\n',
);
await writeFile('public/data/rivers.geojson', JSON.stringify(rivers) + '\n');
const hash = async (path) =>
    createHash('sha256')
        .update(await readFile(path))
        .digest('hex');
const provenance = {
    retrievedAt: '2026-10-05',
    vegetation: {
        source: 'RESOLVE Ecoregions 2017',
        authors: 'Dinerstein et al. (2017), RESOLVE',
        sourceURL: 'https://ecoregions.appspot.com/',
        downloadURL: 'https://storage.googleapis.com/teow2016/Ecoregions2017.zip',
        documentationURL:
            'https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017',
        license: 'CC-BY-4.0',
        licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
        sourceSha256: await hash('.cache/geography/Ecoregions2017.zip'),
        derivation:
            'Selected forest biome classes 1–6, Mediterranean woodlands 12, mangroves 14. Source rings simplified at 0.3 degrees, rounded to 0.001 degrees; tiny rings under 0.04 square degrees omitted; spherical winding normalized; retained holes.',
        meaning:
            'Generalized ecological biome regions, not current forest canopy, tree locations, deforestation, or a complete vegetation inventory.',
        features: features.length,
        sourceRings,
        sourceVertices,
    },
    rivers: {
        source: 'Natural Earth 1:110m rivers and lake centerlines',
        version: '5.0.0',
        sourceURL:
            'https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-rivers-lake-centerlines/',
        downloadURL:
            'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_rivers_lake_centerlines.geojson',
        license: 'Public domain',
        licenseURL: 'https://www.naturalearthdata.com/about/terms-of-use/',
        sourceSha256: await hash('.cache/geography/rivers-original.geojson'),
        derivation: 'Original source coordinates retained; unused metadata stripped.',
        meaning:
            'Generalized major river and lake centerlines; not exhaustive waterways or navigation data.',
        features: rivers.features.length,
    },
};
await writeFile(
    'public/data/geography-provenance.json',
    JSON.stringify(provenance, null, 2) + '\n',
);
let seed = 294791;
const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
};
const stars = Array.from(
    { length: 1250 },
    () =>
        `<circle cx="${(random() * 2048).toFixed(2)}" cy="${(random() * 1152).toFixed(2)}" r="${(0.35 + random() * 0.62).toFixed(2)}" opacity="${(0.18 + random() * 0.45).toFixed(2)}"/>`,
).join('');
await writeFile(
    'public/starfield.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 1152"><g fill="#d5e3f6">${stars}</g></svg>\n`,
);
console.log({ ecoregions: index, vegetation: features.length, rivers: rivers.features.length });
