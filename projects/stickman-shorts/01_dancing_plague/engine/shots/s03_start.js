import * as THREE from 'three';
import { laneSetup } from './lanebase.js';
import { Cutout, idle, dancePose } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting }) {
  const S = laneSetup(scene); const dc = S.doorCenter;
  const pos = V(dc.x - 2.0, 0, dc.z + 0.3);
  S.hero.userData.door.rotation.y = 1.9;
  const tro = new Cutout('troffea', { poseFn: (t) => {
    const e = ease((t - 7.75) / 0.8);
    if (e <= 0) return { ...idle(t), look: -0.3, eyes: t > 7.4 ? 'wide' : 'open', armL: 0.15, armR: 0.15 + Math.max(0, Math.sin((t - 7.2) * 6)) * 0.3, legR: 0.05 };
    const p = dancePose((t - 7.75) * 1.15, e, 0); return { ...p, eyes: e > 0.6 ? 'happy' : 'wide', smile: 0.9 };
  } });
  tro.mesh.position.copy(pos); scene.add(tro.mesh);
  // shocked neighbours
  const n1 = new Cutout('townM1', { poseFn: (t) => ({ ...idle(t), eyes: t > 8.0 ? 'wide' : 'open', mouth: t > 8.1 ? 0.7 : 0, look: 0.6, armL: t > 8.2 ? 0.9 : 0.15 }) }); n1.mesh.position.set(pos.x - 2.6, 0, pos.z - 3.2); scene.add(n1.mesh);
  const n2 = new Cutout('townW1', { poseFn: (t) => ({ ...idle(t + 2), eyes: t > 8.3 ? 'wide' : 'open', mouth: t > 8.4 ? 0.5 : 0, look: 0.9, armR: t > 8.4 ? 2.6 : 0.2, elR: 0.6 }) }); n2.mesh.position.set(pos.x - 1.0, 0, pos.z - 6.5); scene.add(n2.mesh);
  return (t) => {
    lighting.azimuth = 1.8; lighting.center.set(0, 0, dc.z - 5); lighting.set(0.3); S.setNight(0); S.dust.userData.update(t);
    const k = ease((t - 6.8) / 3.0);
    camera.fov = 36 - k * 4; camera.updateProjectionMatrix();
    camera.position.set(pos.x - 0.5 - k * 0.2, 1.0, pos.z + 5.0 - k * 1.6);
    camera.lookAt(pos.x - 0.6, 1.15, pos.z - 3);
    handheld(camera, t, 0.02);
  };
}
