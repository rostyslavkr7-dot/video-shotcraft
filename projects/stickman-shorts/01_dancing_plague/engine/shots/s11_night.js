import * as THREE from 'three';
import { squareSetup, holds } from './squarebase.js';
import { Cutout, idle } from '../chars.js';
import { crowd, popInAt, V, clamp, ease, handheld } from './common.js';
import { rng } from '../world.js';
export async function build({ scene, camera, lighting, post }) {
  const S = squareSetup(scene, { withStage: true, torches: true });
  const list = crowd(scene, 320, { area: [31, 30], center: [0, 3], seed: 51, tired: 0.6, avoid: (x, z) => Math.hypot(x + 6, z - 6) < 2 || (Math.abs(x) < 6 && z < -3) || Math.abs(Math.hypot(x, z) - 13.5) < 0.6 });
  const R = rng(9); const on = list.map((c, i) => i < 140 ? 0 : 44.8 + ((i - 140) / 180) * 1.6 + R() * 0.1);
  const play = (t) => Math.sin(t * 14);
  const piper = new Cutout('piper', { poseFn: (t) => ({ ...idle(t), armL: 1.2, elL: 1.4, armR: 0.9, elR: 1.3, eyes: 'closed', bob: Math.abs(play(t)), holds: { R: holds.pipe } }) });
  const drummer = new Cutout('drummer', { poseFn: (t) => ({ ...idle(t), armL: 0.6 + 0.5 * Math.max(0, play(t)), armR: 0.6 + 0.5 * Math.max(0, -play(t)), elL: 1.2, elR: 1.2, eyes: 'tired', bob: Math.abs(play(t)), holds: { L: holds.drum, R: holds.stick } }) });
  [[piper, -2], [drummer, 1.5]].forEach(([c, x]) => { c.mesh.position.set(x, 1.32, -8); scene.add(c.mesh); });
  return (t) => {
    const n = ease((t - 43.3) / 1.1);
    lighting.azimuth = 2.2; lighting.center.set(0, 0, 0); lighting.set(0.34 + n * 0.43, { fogNear: 60, fogFar: 380 }); S.setNight(n);
    S.flicker(t, n); S.dust.userData.update(t);
    S.T.cathedral.userData.rose.material.emissiveIntensity = n * 1.6;
    post.bloom.strength = 0.35 + n * 0.6;
    popInAt(list, on, t);
    const k = ease((t - 44.6) / 2.8);
    camera.fov = 44; camera.updateProjectionMatrix();
    const a = -0.4 + (t - 42) * 0.04;
    camera.position.set(Math.sin(a) * (12 - k * 4), 3.2 + k * 26, 3 + Math.cos(a) * (12 - k * 4));
    camera.lookAt(0, 1.5 - k, -2);
    handheld(camera, t, 0.01);
  };
}
