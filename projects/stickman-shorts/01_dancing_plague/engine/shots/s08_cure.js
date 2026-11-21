import * as THREE from 'three';
import { councilRoom } from './interiors.js';
import { Cutout, idle } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const R = councilRoom(scene, lighting);
  R.liquid.material.emissiveIntensity = 1.1; R.glow.intensity = 4;
  const talk = (t, a, b) => (t > a && t < b) ? 0.3 + 0.4 * Math.abs(Math.sin(t * 16)) : 0;
  const head = new Cutout('doctor', { poseFn: (t) => { const up = ease((t - 30.9) / 0.3); return { ...idle(t), armL: 0.5, elL: 1.2, armR: 0.5 + up * 2.3, elR: up * 0.3, mouth: talk(t, 30.15, 30.8) + talk(t, 31.05, 32.7), brows: t > 31.6 ? -0.5 : 0.3, eyes: t > 31.7 ? 'happy' : 'open', smile: t > 31.6 ? 1.2 : 0.4, look: t < 30.8 ? 0.4 : 0 }; } });
  head.mesh.position.set(0, 0.3, -2.2); scene.add(head.mesh);
  return (t) => {
    R.dust.userData.update(t);
    R.candles.forEach(([f, l], i) => { const k = 0.85 + 0.15 * Math.sin(t * 21 + i) * Math.sin(t * 13 + i * 2); l.intensity = 1.6 * k; f.scale.y = 1.8 * k; });
    post.bloom.strength = 0.6;
    const k = ease((t - 29.8) / 3.6), zin = ease((t - 31.6) / 0.35) * 0.6;
    camera.fov = 30 - k * 4 - zin * 6; camera.updateProjectionMatrix();
    camera.position.set(-0.5 + k * 0.4, 1.55, 2.6 - k * 0.5);
    camera.lookAt(0, 2.0, -2.2);
    handheld(camera, t, 0.008);
  };
}
