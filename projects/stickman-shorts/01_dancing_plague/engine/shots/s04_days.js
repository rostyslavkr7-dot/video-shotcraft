import * as THREE from 'three';
import { laneSetup } from './lanebase.js';
import { Cutout, dancePose } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const S = laneSetup(scene); const dc = S.doorCenter;
  const pos = V(dc.x - 2.0, 0, dc.z + 0.3);
  S.hero.userData.door.rotation.y = 1.9; S.lines.visible = false;
  const tro = new Cutout('troffea', { poseFn: (t) => { const tired = clamp((t - 12.5) / 2.5); const p = dancePose((t - 7.75) * 1.15, 1 - tired * 0.35, tired); return p; } });
  tro.mesh.position.copy(pos); scene.add(tro.mesh);
  // tod track: day; "Час" 11.92 → afternoon; "День" 12.78 → night; "Шесть дней" fast cycles
  const tod = (t) => {
    if (t < 11.92) return 0.3;
    if (t < 12.78) return 0.3 + ease((t - 11.92) / 0.86) * 0.18;
    if (t < 13.62) return 0.48 + ease((t - 12.78) / 0.84) * 0.29;
    return 0.77 + ease((t - 13.62) / 1.9) * 2.53; // 2+ fast days, ends at ~.30
  };
  return (t) => {
    const d = tod(t); const f = ((d % 1) + 1) % 1;
    lighting.azimuth = 1.8; lighting.center.set(0, 0, dc.z - 5); lighting.set(d);
    const night = lighting.night; S.setNight(night);
    S.dust.userData.update(t);
    const k = (t - 9.0) / 6.8;
    const ang = -0.9 + k * 1.3, r = 7.5 - k * 1.5;
    camera.fov = 40; camera.updateProjectionMatrix();
    camera.position.set(pos.x + Math.sin(ang) * r, 2.2 + k * 0.8, pos.z + Math.cos(ang) * r);
    camera.position.x = Math.max(-2.8, Math.min(2.8, camera.position.x));
    camera.lookAt(pos.x, 1.6, pos.z);
    post.bloom.strength = 0.35 + night * 0.5;
    handheld(camera, t, 0.01);
  };
}
