import * as THREE from 'three';
import { councilRoom } from './interiors.js';
import { Cutout, idle } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const R = councilRoom(scene, lighting);
  const talk = (t, a, b) => (t > a && t < b) ? 0.3 + 0.35 * Math.abs(Math.sin(t * 17)) : 0;
  const head = new Cutout('doctor', { poseFn: (t) => ({ ...idle(t), armL: 0.5, elL: 1.2, armR: 0.5, elR: 1.2, mouth: talk(t, 27.4, 29.9), brows: t > 28.3 ? 0.4 : 0, eyes: t > 28.3 ? 'wide' : 'open', smile: 0.2 }) });
  const d2 = new Cutout('doctor2', { poseFn: (t) => ({ ...idle(t + 1), armR: 0.6, elR: 1.0, look: 0.8, mouth: talk(t, 26.2, 27.2), smile: 0.1 }) });
  const d3 = new Cutout('doctor2', { poseFn: (t) => ({ ...idle(t + 2), armL: 0.9, elL: 1.4, look: -0.8, eyes: t > 28.4 ? 'wide' : 'open', smile: 0.3 }) });
  head.mesh.position.set(0, 0.3, -2.2); d2.mesh.position.set(-1.9, 0.25, -2.3); d3.mesh.position.set(1.9, 0.25, -2.3); d3.flip = true;
  scene.add(head.mesh, d2.mesh, d3.mesh);
  return (t) => {
    R.dust.userData.update(t);
    R.candles.forEach(([f, l], i) => { const k = 0.85 + 0.15 * Math.sin(t * 21 + i) * Math.sin(t * 13 + i * 2); l.intensity = 1.6 * k; f.scale.y = 1.8 * k; });
    const red = ease((t - 28.3) / 0.6);
    R.liquid.material.emissiveIntensity = 0.2 + red * 0.9; R.glow.intensity = red * 4;
    post.bloom.strength = 0.4 + red * 0.5; post.bloom.threshold = 0.8;
    const k = ease((t - 25.8) / 2.6), k2 = ease((t - 28.2) / 1.6);
    camera.fov = 54 - k * 8 - k2 * 12; camera.updateProjectionMatrix();
    const p = V(1.0 - k * 0.8, 1.9 - k * 0.2, 6.0 - k * 2.2).lerp(V(2.6, 1.75, 1.2), k2);
    camera.position.copy(p);
    camera.lookAt(V(0, 1.55, -2.2).lerp(V(1.75, 1.45, -1.4), k2));
    handheld(camera, t, 0.01);
  };
}
