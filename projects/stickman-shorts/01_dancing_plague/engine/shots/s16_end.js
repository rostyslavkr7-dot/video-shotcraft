import * as THREE from 'three';
import { laneSetup } from './lanebase.js';
import { Cutout, idle } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const S = laneSetup(scene); const dc = S.doorCenter;
  const pos = V(dc.x - 1.6, 0, dc.z + 0.3);
  S.hero.userData.door.rotation.y = 1.9;
  const tro = new Cutout('troffea', { poseFn: (t) => {
    const tap = t > 63.7 ? Math.max(0, Math.sin((t - 63.7) * 14)) : 0;
    const smirk = t > 64.3;
    return { ...idle(t), look: t > 62.6 ? 0.0 : -0.5, eyes: t > 64.3 ? 'happy' : 'open', smile: smirk ? 1.0 : 0.2, legR: 0.05 + tap * 0.35, armR: 0.15 + tap * 0.15 };
  } });
  tro.mesh.position.copy(pos); scene.add(tro.mesh);
  return (t) => {
    lighting.azimuth = 1.8; lighting.center.set(0, 0, dc.z - 5); lighting.set(0.54); S.setNight(0.6);
    S.dust.userData.update(t);
    post.bloom.strength = 0.5;
    const k = ease((t - 61.0) / 3.0), k2 = ease((t - 63.6) / 1.2);
    camera.fov = 34 - k2 * 6; camera.updateProjectionMatrix();
    camera.position.set(pos.x - 1.2 - k * 1.5, 1.4 + k * 2.2 - k2 * 1.4, pos.z + 3.2 + k * 6 - k2 * 5.2);
    camera.lookAt(pos.x, 1.0 + (1 - k2) * 0.4 - k2 * 0.6, pos.z);
    handheld(camera, t, 0.01);
  };
}
