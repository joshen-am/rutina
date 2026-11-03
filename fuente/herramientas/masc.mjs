// Vuelve más masculino al Xbot: hombros y pecho más anchos, brazos y cuello más gruesos, cadera y glúteos más estrechos.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize } from '@gltf-transform/functions';
import * as T from 'three';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const R = doc.getRoot();
for (const a of R.listAnimations()) if (a.getName() !== 'idle') a.dispose();
const skin = R.listSkins()[0];
const joints = skin.listJoints();
const key = (n) => n.getName().replace(/^mixamorig:?/, '');
const W = {}; // posiciones mundo en reposo
for (const j of joints) { const m = j.getWorldMatrix(); W[key(j)] = new T.Vector3(m[12], m[13], m[14]); }
const fwdZ = Math.sign(W.LeftEye.z - W.Head.z) || 1;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const armX = Math.abs(W.LeftArm.x), armY = W.LeftArm.y, armZ = W.LeftArm.z;
const L = { hips: W.Hips.y, sp: W.Spine.y, sp1: W.Spine1.y, sp2: W.Spine2.y, neck: W.Neck.y, head: W.Head.y, upLeg: W.LeftUpLeg.y, knee: W.LeftLeg.y };
console.log(L, armX, armY, fwdZ);
function D(p) {
  let { x, y, z } = p; const s = Math.sign(x) || 1, ax = Math.abs(x);
  // 1. tronco superior y hombros
  const b = ss(L.sp1, L.sp2 + 0.04, y) * (1 - ss(L.neck + 0.03, L.head + 0.02, y));
  const k = 1 + 0.17 * b;
  let nx = ax < armX ? ax * k : ax + armX * (k - 1);
  // 2. pecho con más volumen (adelante)
  const torso = 1 - ss(armX * 0.7, armX, ax);
  const fl = ss(L.sp1 - 0.1, L.sp1 + 0.02, y) * (1 - ss(L.neck - 0.03, L.neck + 0.03, y));
  if ((z - W.Spine2.z) * fwdZ > 0) z = W.Spine2.z + (z - W.Spine2.z) * (1 - 0.3 * fl * torso);
  // 3. brazos más gruesos
  const a = ss(armX * 0.85, armX * 1.1, ax) * ss(L.sp2, armY - 0.02, y);
  let ny = y;
  if (a > 0) { const f = 1 + 0.2 * a + 0.06 * ss(armX * 1.6, armX * 2.6, ax); ny = armY + (y - armY) * f; z = armZ + (z - armZ) * f; }
  // 4. cuello más grueso
  const n = ss(L.sp2 + 0.08, L.neck, y) * (1 - ss(L.neck + 0.06, L.head + 0.03, y)) * (1 - ss(0.05, 0.09, ax));
  if (n > 0) { nx *= 1 + 0.22 * n; z = W.Neck.z + (z - W.Neck.z) * (1 + 0.18 * n); }
  // 4b. cintura más recta (menos curva de reloj de arena)
  const wst = ss(L.hips, L.sp, y) * (1 - ss(L.sp1, L.sp2, y));
  nx *= 1 + 0.07 * wst;
  // 5. cadera más estrecha
  const h = ss(L.knee, L.upLeg, y) * (1 - ss(L.sp, L.sp1, y));
  nx *= 1 - 0.15 * h;
  // 6. glúteos más planos
  const g = ss(L.knee + 0.15, L.upLeg, y) * (1 - ss(L.hips, L.sp, y));
  if ((z - W.Hips.z) * fwdZ < 0) z = W.Hips.z + (z - W.Hips.z) * (1 - 0.26 * g);
  // 7. cabeza un poco más chica
  const hd = ss(L.neck + 0.02, L.head - 0.01, y);
  if (hd > 0) {
    const cy = L.head + 0.07, f = 1 - 0.09 * hd;
    nx *= f; ny = cy + (ny - cy) * f; z = W.Head.z + (z - W.Head.z) * f;
  }
  return new T.Vector3(s * nx, ny, z);
}
// vértices de todas las mallas con piel
for (const node of R.listNodes()) {
  if (!node.getMesh() || !node.getSkin()) continue;
  for (const prim of node.getMesh().listPrimitives()) {
    const P = prim.getAttribute('POSITION'); const v = [0, 0, 0];
    for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); const q = D(new T.Vector3(...v)); P.setElement(i, [q.x, q.y, q.z]); }
  }
}
// huesos: nuevas posiciones, traslación local y matrices inversas de enlace
const NW = {};
for (const j of joints) NW[key(j)] = D(W[key(j)]);
const ibm = skin.getInverseBindMatrices();
joints.forEach((j, i) => {
  const parent = j.getParentNode();
  const pw = new T.Matrix4();
  if (parent) {
    const pk = key(parent);
    const m = new T.Matrix4().fromArray(parent.getWorldMatrix());
    if (NW[pk]) m.setPosition(NW[pk]);
    pw.copy(m);
  }
  const local = NW[key(j)].clone().applyMatrix4(pw.clone().invert());
  j.setTranslation([local.x, local.y, local.z]);
  const wm = new T.Matrix4().fromArray(j.getWorldMatrix());
  ibm.setElement(i, wm.clone().invert().toArray());
});
// la animación solo rota (y mueve la cadera)
for (const a of R.listAnimations()) for (const c of a.listChannels()) {
  const tp = c.getTargetPath(), nm = key(c.getTargetNode());
  if (tp === 'scale' || (tp === 'translation' && nm !== 'Hips')) { c.getSampler().dispose(); c.dispose(); }
}
for (const t of R.listTextures()) t.dispose();
await doc.transform(prune(), dedup(), quantize({ quantizePosition: 14, quantizeNormal: 10 }));
await io.write(process.argv[3], doc);
console.log('ok');
