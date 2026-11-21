import * as THREE from 'three';
import { rng, clamp, ease, easeOut, V } from '../world.js';
import { Cutout, dancePose, DESIGNS } from '../chars.js';

export const CROWD = ['townW1', 'townW2', 'townW3', 'townM1', 'townM2', 'townM3', 'townM4'];

// dance cycle builders with stable cache keys
export function danceCycle(energy = 1, tired = 0) { const f = (ph) => dancePose(ph, energy, tired); f.key = `dance:${energy}:${tired}`; return f; }

// crowd of dancing cutouts; appear(t) lets each one pop in at its own time
export function crowd(scene, n, { area = [24, 24], center = [0, 0], seed = 1, res = 256, tired = 0, avoid = null, minDist = 1.1 } = {}) {
  const R = rng(seed); const list = []; const pts = [];
  let guard = 0;
  while (list.length < n && guard++ < n * 50) {
    const x = center[0] + (R() - .5) * area[0], z = center[1] + (R() - .5) * area[1];
    if (avoid && avoid(x, z)) continue;
    if (pts.some(p => Math.hypot(p[0] - x, p[1] - z) < minDist)) continue;
    pts.push([x, z]);
    const name = CROWD[Math.floor(R() * CROWD.length)];
    const c = new Cutout(name, { res, cycle: danceCycle(1, R() < tired ? 1 : 0), cycleFrames: 10 });
    c.mesh.position.set(x, 0, z); c.phase = R(); c.speed = 0.8 + R() * 0.5; c.flip = R() < 0.5;
    c.order = R(); scene.add(c.mesh); list.push(c);
  }
  // sort by distance from center so pop-in grows outward
  list.sort((a, b) => Math.hypot(a.mesh.position.x - center[0], a.mesh.position.z - center[1]) - Math.hypot(b.mesh.position.x - center[0], b.mesh.position.z - center[1]));
  return list;
}
// visible count k (0..n) with pop-in bounce over 0.25s
export function popIn(list, count, t, t0Map) {
  list.forEach((c, i) => {
    const on = i < count;
    if (on && c._on === undefined) c._on = t;
    if (!on) c._on = undefined;
    const a = on ? clamp((t - c._on) / 0.25) : 0;
    const s = a <= 0 ? 0.0001 : (a < 1 ? easeOut(a) * (1 + 0.25 * Math.sin(a * Math.PI)) : 1);
    c.mesh.visible = a > 0; c.mesh.scale.setScalar(s); c.mesh.scale.x = (c.flip ? -1 : 1) * s;
  });
}
// deterministic popIn for random frame access: on-time stored per member
export function popInAt(list, onTimes, t) {
  list.forEach((c, i) => {
    const a = clamp((t - onTimes[i]) / 0.25);
    const s = a <= 0 ? 0.0001 : (a < 1 ? easeOut(a) * (1 + 0.3 * Math.sin(a * Math.PI)) : 1);
    c.mesh.visible = a > 0; c.mesh.scale.y = s; c.mesh.scale.z = s; c._s = s;
  });
}
// subtle handheld drift
export function handheld(cam, t, amp = 0.02) { cam.position.x += Math.sin(t * 1.3) * amp; cam.position.y += Math.sin(t * 1.7 + 1) * amp * 0.7; cam.rotation.z += Math.sin(t * 0.9) * amp * 0.15; }
export const lookFrom = (cam, p, target, fov) => { cam.position.copy(p); cam.lookAt(target); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } };
export { V, clamp, ease, easeOut };
