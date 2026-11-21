import * as THREE from 'three';
import { squareSetup, holds } from './squarebase.js';
import { Cutout, dancePose, idle } from '../chars.js';
import { crowd, popInAt, V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting }) {
  const S = squareSetup(scene, { withStage: true });
  const list = crowd(scene, 70, { area: [30, 20], center: [0, 6], seed: 41, tired: 0.7, avoid: (x, z) => (Math.abs(x - 2) < 7 && z > 3) || Math.hypot(x + 6, z - 6) < 2 || (Math.abs(x) < 6 && z < -3) });
  const mayor = new Cutout('mayor', { poseFn: (t) => { const give = clamp((t - 38.8) / 0.4) - clamp((t - 39.9) / 0.3); return { ...idle(t), armR: 0.15 + give * 1.3, elR: -0.3 * give, holds: t < 39.6 ? { R: holds.purse } : {}, look: 0.6, smile: 0.7 }; } });
  mayor.mesh.position.set(-1.6, 0, 6.3); scene.add(mayor.mesh);
  const pairs = [];
  for (let i = 0; i < 2; i++) {
    const s = new Cutout('strong', { poseFn: (t) => ({ ...idle(t + i), armL: i ? 0.2 : 1.35, armR: i ? 1.35 : 0.2, elL: 0.2, elR: -0.2, brows: 0.3, holds: (i === 0 && t > 39.55) ? { R: holds.purse } : {}, smile: 0.2 }) });
    const d = new Cutout(i ? 'townW3' : 'townM4', { poseFn: (t) => ({ ...dancePose(t * 0.8 + i * 0.4, 0.45, 1), lean: (i ? 1 : -1) * 0.38 }) });
    s.mesh.position.set(1.2 + i * 3.6, 0, 6); d.mesh.position.set(2.3 + i * 1.4, 0, 6.2);
    scene.add(s.mesh, d.mesh); pairs.push(s, d);
  }
  return (t) => {
    lighting.azimuth = 2.2; lighting.center.set(0, 0, 4); lighting.set(0.36); S.setNight(0); S.dust.userData.update(t);
    popInAt(list, list.map(() => 0), t);
    const k = ease((t - 38.3) / 4.6);
    camera.fov = 38; camera.updateProjectionMatrix();
    camera.position.set(-0.6 + k * 3.4, 1.6, 14.2 - k * 2.0);
    camera.lookAt(0.0 + k * 3.2, 1.3, 6);
    handheld(camera, t, 0.012);
  };
}
