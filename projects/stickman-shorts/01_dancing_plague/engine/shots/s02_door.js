import * as THREE from 'three';
import { laneSetup } from './lanebase.js';
import { Cutout, idle } from '../chars.js';
import { V, clamp, ease, easeOut, handheld } from './common.js';
export async function build({ scene, camera, lighting }) {
  const S = laneSetup(scene); const dc = S.doorCenter;
  const out = V(dc.x - 2.0, 0, dc.z + 0.3);
  const tro = new Cutout('troffea', { poseFn: (t) => { const w = clamp((t - 5.6) / 1.4); const st = Math.sin(t * 9) * (w > 0 && w < 1 ? 1 : 0);
    return { ...idle(t), legL: 0.05 + 0.25 * Math.max(0, st), legR: 0.05 + 0.25 * Math.max(0, -st), armL: 0.15 + 0.2 * st, armR: 0.15 - 0.2 * st, bob: Math.abs(st) * 1.2, eyes: t > 6.7 ? 'open' : 'open', look: t > 6.6 ? -0.6 : 0.4, smile: 0.5 }; } });
  scene.add(tro.mesh);
  const nb = new Cutout('townW2', { poseFn: (t) => ({ ...idle(t + 3), armR: 0.6, look: 0.8 }) }); nb.mesh.position.set(-2.0, 0, dc.z - 9); scene.add(nb.mesh);
  const nb2 = new Cutout('townM3', { poseFn: (t) => ({ ...idle(t + 1), armL: 0.3, look: -0.5 }) }); nb2.mesh.position.set(-1.0, 0, dc.z - 14); scene.add(nb2.mesh);
  return (t) => {
    lighting.azimuth = 1.8; lighting.center.set(0, 0, dc.z - 5); lighting.set(0.3); S.setNight(0); S.dust.userData.update(t);
    const open = ease((t - 4.6) / 0.9);
    S.hero.userData.door.rotation.y = 1.9 * open;
    const w = ease((t - 5.6) / 1.4);
    tro.mesh.position.lerpVectors(V(dc.x + 0.15, 0, dc.z), out, w);
    tro.mesh.visible = t > 5.0;
    const k = ease((t - 3.6) / 4.0);
    camera.fov = 38; camera.updateProjectionMatrix();
    camera.position.set(dc.x - 5.0 + k * 1.0, 1.45, dc.z + 6.0 - k * 2.0);
    camera.lookAt(dc.x - 0.8, 1.6, dc.z - 1.0);
    handheld(camera, t, 0.015);
  };
}
