import * as THREE from 'three';
import { chapelInterior } from './interiors.js';
import { Cutout, idle } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const C = chapelInterior(scene, lighting);
  const pray = (i) => (t) => ({ ...idle(t + i), armL: 0.55, elL: 1.6, armR: 0.55, elR: 1.6, eyes: 'closed', smile: 0.2, bob: Math.sin(t * 2 + i) * 0.3 });
  const names = ['troffea', 'townM2', 'townW1', 'townM3', 'townW3', 'townM4'];
  names.forEach((n, i) => { const c = new Cutout(n, { poseFn: pray(i) }); c.mesh.position.set((i % 2 ? 1 : -1) * (1.4 + (i % 3) * 0.6), -0.25, -10.2 + Math.floor(i / 2) * 2.2); scene.add(c.mesh); });
  return (t) => {
    C.dust.userData.update(t);
    C.fl.forEach(([f, l], i) => { const k = 0.85 + 0.15 * Math.sin(t * 21 + i) * Math.sin(t * 13 + i * 2); l.intensity = 1.5 * k; f.scale.y = 1.8 * k; });
    C.shoes.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.12;
    post.bloom.strength = 0.35;
    const k = ease((t - 55.9) / 1.9);
    camera.fov = 30 + k * 16; camera.updateProjectionMatrix();
    camera.position.copy(V(0.5, 1.75, -11.2).lerp(V(0.4, 3.0, -2.0), k));
    camera.lookAt(V(0.0, 1.35, -12.9).lerp(V(0, 1.5, -11), k));
    handheld(camera, t, 0.006);
  };
}
