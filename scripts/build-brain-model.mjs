// Builds the /brain page's 3D model (public/brainImages/brain.glb) from the CerebrA atlas.
//
// Source: CerebrA (Manera et al. 2020, Scientific Data 7:237), CC0 1.0 — Mindboggle-101 labels on
// the symmetric MNI-ICBM2009c template, 51 regions per hemisphere. See scripts/brain/cerebra_meshes.py.
//
// Usage: python scripts/brain/cerebra_meshes.py   (atlas -> per-label meshes in scripts/.cache/cerebra/meshes)
//        node scripts/build-brain-model.mjs        (meshes -> GLB)
//
// Each label becomes its own mesh node named by its key (e.g. "L-precentral"), so
// src/app/brain/data/regions.ts can attach names/descriptions/groups to it. Meshes are simplified
// with meshoptimizer (white matter, seen only in cut views, more aggressively). Input is MNI mm
// (RAS: +x right, +y anterior, +z superior); the output is re-centered, scaled to decimeters (a
// brain spans ~1.7 units) and rotated to three.js's Y-up with +X the body's left and +Z anterior.
// No normals are stored (gltf-transform's normals() unwelds into flat shading); the page computes
// smooth ones.

import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const MESH_DIR = path.resolve('scripts/.cache/cerebra/meshes');
const OUT = path.resolve('public/brainImages/brain.glb');
const SCALE = 0.01; // mm -> dm

// Fraction of triangles kept per mesh, and the max simplification error (relative to mesh size).
const RATIO = 0.3;
const WHITE_MATTER_RATIO = 0.08;
const MAX_ERROR = 0.004;

if (!fs.existsSync(path.join(MESH_DIR, 'manifest.json'))) {
  throw new Error('Run `python scripts/brain/cerebra_meshes.py` first.');
}
const manifest = JSON.parse(fs.readFileSync(path.join(MESH_DIR, 'manifest.json'), 'utf8'));

function readMesh(key) {
  const buf = fs.readFileSync(path.join(MESH_DIR, `${key}.bin`));
  const nv = buf.readUInt32LE(0);
  const nf = buf.readUInt32LE(4);
  const ab = buf.buffer.slice(buf.byteOffset + 8, buf.byteOffset + buf.length);
  return { pos: new Float32Array(ab, 0, nv * 3), idx: new Uint32Array(ab, nv * 12, nf * 3) };
}

// Drop vertices no triangle uses after simplification.
function compact(pos, idx) {
  const remap = new Int32Array(pos.length / 3).fill(-1);
  const outPos = [];
  const outIdx = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i];
    if (remap[v] < 0) {
      remap[v] = outPos.length / 3;
      outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    }
    outIdx[i] = remap[v];
  }
  return { pos: new Float32Array(outPos), idx: outIdx };
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const meshes = manifest.map(({ key }) => [key, readMesh(key)]);

// Center on the bounding box of the whole brain.
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const [, { pos }] of meshes) {
  for (let i = 0; i < pos.length; i++) {
    min[i % 3] = Math.min(min[i % 3], pos[i]);
    max[i % 3] = Math.max(max[i % 3], pos[i]);
  }
}
const center = min.map((m, k) => (m + max[k]) / 2);

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('brain');
let inTris = 0;
let outTris = 0;
for (const [key, { pos, idx }] of meshes) {
  inTris += idx.length / 3;
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i] - center[0], y = pos[i + 1] - center[1], z = pos[i + 2] - center[2];
    // MNI (right, anterior, superior) -> three.js (left, up, anterior): a pure rotation, so winding is kept.
    out[i] = -x * SCALE;
    out[i + 1] = z * SCALE;
    out[i + 2] = y * SCALE;
  }
  const ratio = key.endsWith('white-matter') ? WHITE_MATTER_RATIO : RATIO;
  const target = Math.max(3, Math.floor((idx.length * ratio) / 3) * 3);
  const [simplified] = MeshoptSimplifier.simplify(idx, out, 3, target, MAX_ERROR);
  const m = compact(out, simplified);
  outTris += m.idx.length / 3;
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(m.pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(m.idx).setBuffer(buffer));
  scene.addChild(doc.createNode(key).setMesh(doc.createMesh(key).addPrimitive(prim)));
}

await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(OUT, doc);
console.log(`${meshes.length} meshes, ${inTris} -> ${outTris} triangles, ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB -> ${OUT}`);
console.log('extent (dm):', max.map((m, k) => ((m - min[k]) * SCALE).toFixed(2)).join(' x '));
