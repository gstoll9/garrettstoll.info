// Builds the /brain page's 3D model (public/brainImages/brain.glb) from BodyParts3D.
//
// Source: BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan
//   https://lifesciencedb.jp/bp3d/  (STL mirror: github.com/Kevin-Mattheus-Moerman/BodyParts3D)
//
// Usage: node scripts/build-brain-model.mjs
//
// Each brain structure is a separate STL keyed by its FMA (Foundational Model of Anatomy) id.
// The STLs (~70 MB, ~1.7M triangles) are cached under scripts/.cache/bodyparts3d/, then each one
// is welded, simplified with meshoptimizer and written as its own mesh node named by FMA id, so
// src/app/brain/data/regions.ts can attach names/descriptions/groups to it. BodyParts3D is in mm
// with +Z superior, -Y anterior and +X the body's left; the output is re-centered, scaled to
// decimeters (a brain spans ~1.7 units) and rotated to three.js's Y-up with +Z anterior. No normals
// are stored (gltf-transform's normals() unwelds into flat shading); the page computes smooth ones.

import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const COMMIT = 'f0eeb6e843380cfe6b83797cf8c3e1af74de5e61';
const SRC = `https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/${COMMIT}/assets/BodyParts3D_data/stl`;
const CACHE_DIR = path.resolve('scripts/.cache/bodyparts3d');
const OUT = path.resolve('public/brainImages/brain.glb');

// Fraction of triangles kept per mesh. The cortex gyri are the bulk of the triangle count.
const RATIO = 0.15;
const MAX_ERROR = 0.002;

// Every brain primitive in BodyParts3D's "brain" composite (FMA50801), plus a few structures it
// files elsewhere (orbital gyri, corpus callosum, fornix, optic pathway, pituitary).
const PARTS = [
  'FMA72653', 'FMA72654', 'FMA72655', 'FMA72656', 'FMA72661', 'FMA72662', 'BP51',
  'FMA72665', 'FMA72666', 'FMA72667', 'FMA72668', 'FMA72669', 'FMA72670', 'BP49', 'BP50',
  'FMA72800', 'FMA72801', 'FMA72804', 'FMA72805', 'FMA72685', 'FMA72686', 'FMA72687', 'FMA72688',
  'FMA72689', 'FMA72690',
  'FMA72975', 'FMA72976',
  'FMA72977', 'FMA72978', 'FMA72701', 'FMA72702',
  'FMA72717', 'FMA72718', 'FMA72705', 'FMA72706', 'FMA72713', 'FMA72714', 'FMA72832', 'FMA72833',
  'FMA72924', 'FMA72925', 'FMA61970', 'FMA74877',
  'FMA86464', 'FMA61844',
  'FMA72826', 'FMA72827', 'FMA72828', 'FMA72829', 'FMA72830', 'FMA72831',
  'FMA258714', 'FMA258716', 'FMA62008nsn', 'FMA62327', 'FMA62032', 'FMA62033', 'FMA13889',
  'FMA73303', 'FMA73304', 'FMA73309', 'FMA73310',
  'FMA62045', 'FMA62382', 'FMA67936', 'FMA50875', 'FMA50878',
  'FMA78449', 'FMA78450', 'FMA78454', 'FMA78467', 'FMA78469',
  'FMA61993nsn', 'FMA62394', 'FMA73422', 'FMA73423', 'FMA73434', 'FMA73435',
  'FMA73461', 'FMA73462', 'FMA73463', 'FMA73464',
  'FMA67943', 'FMA62004',
  'FMA67944',
];

async function fetchStl(id) {
  const file = path.join(CACHE_DIR, `${id}.stl`);
  if (!fs.existsSync(file)) {
    const res = await fetch(`${SRC}/${id}.stl`);
    if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(file);
}

// Binary STL -> flat, unindexed Float32Array of triangle vertex positions (weld() indexes it).
function parseStl(buf) {
  const count = buf.readUInt32LE(80);
  if (84 + count * 50 !== buf.length) throw new Error('not a binary STL');
  const out = new Float32Array(count * 9);
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < 9; j++) out[i * 9 + j] = buf.readFloatLE(84 + i * 50 + 12 + j * 4);
  }
  return out;
}

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const raw = [];
for (const id of PARTS) raw.push([id, parseStl(await fetchStl(id))]);

// Center on the bounding box of the whole brain.
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const [, pos] of raw) {
  for (let i = 0; i < pos.length; i++) {
    min[i % 3] = Math.min(min[i % 3], pos[i]);
    max[i % 3] = Math.max(max[i % 3], pos[i]);
  }
}
const center = min.map((m, k) => (m + max[k]) / 2);
const SCALE = 0.01; // mm -> dm

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('brain');
let inTris = 0;
for (const [id, pos] of raw) {
  inTris += pos.length / 9;
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i] - center[0], y = pos[i + 1] - center[1], z = pos[i + 2] - center[2];
    // (x, y, z) BodyParts3D -> three.js (left, up, anterior): a pure rotation, so winding is kept.
    out[i] = x * SCALE;
    out[i + 1] = z * SCALE;
    out[i + 2] = -y * SCALE;
  }
  // Index shared vertices (STL repeats them per triangle; simplify() needs an indexed mesh).
  const seen = new Map();
  const verts = [];
  const indices = new Uint32Array(out.length / 3);
  for (let v = 0; v < indices.length; v++) {
    const key = `${out[v * 3]},${out[v * 3 + 1]},${out[v * 3 + 2]}`;
    let idx = seen.get(key);
    if (idx === undefined) {
      idx = verts.length / 3;
      seen.set(key, idx);
      verts.push(out[v * 3], out[v * 3 + 1], out[v * 3 + 2]);
    }
    indices[v] = idx;
  }
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(verts)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer));
  const mesh = doc.createMesh(id).addPrimitive(prim);
  scene.addChild(doc.createNode(id).setMesh(mesh));
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: MAX_ERROR }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

let outTris = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) outTris += (prim.getIndices() ?? prim.getAttribute('POSITION')).getCount() / 3;
}

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(OUT, doc);
console.log(`${PARTS.length} parts, ${inTris} -> ${outTris} triangles, ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB -> ${OUT}`);
console.log('extent (dm):', max.map((m, k) => ((m - min[k]) * SCALE).toFixed(2)).join(' x '));
