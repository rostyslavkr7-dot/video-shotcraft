import * as THREE from 'three';
import { squareSetup } from './squarebase.js';
import { Cutout, dancePose } from '../chars.js';
import { crowd, popInAt, V, clamp, ease, handheld } from './common.js';
import { rng } from '../world.js';
export async function build({ scene, camera, lighting, post }) {
  const S = squareSetup(scene, {});
  const tro = new Cutout('troffea', { poseFn: (t) => dancePose(t * 1.15, 0.85, 0.7) }); tro.mesh.position.set(0, 0, 3); scene.add(tro.mesh);
  const list = crowd(scene, 240, { area: [30, 30], center: [0, 2], seed: 11, avoid: (x, z) => Math.hypot(x + 6, z - 6) < 2 || Math.hypot(x, z - 3) < 1.4, tired: 0.3 });
  const R = rng(5);
  const on = list.map((c, i) => i < 30 ? 16.1 + (i / 30) * 1.9 + R() * 0.1 : 18.7 + ((i - 30) / 210) * 1.6 + R() * 0.1);
  return (t) => {
    lighting.azimuth = 2.2; lighting.center.set(0, 0, 0); lighting.set(0.3, { fogNear: 80, fogFar: 500 }); S.setNight(0); S.dust.userData.update(t);
    popInAt(list, on, t);
    const k = ease((t - 18.5) / 2.4);
    camera.fov = 40 + k * 12; camera.updateProjectionMatrix();
    const a = 0.3 + (t - 15) * 0.05;
    camera.position.set(Math.sin(a) * (8 + k * 3), 2.0 + k * 13, 3 + Math.cos(a) * (8 + k * 3));
    camera.lookAt(0, 1.4 - k * 1.2, 3 - k * 3);
    handheld(camera, t, 0.01);
  };
}
