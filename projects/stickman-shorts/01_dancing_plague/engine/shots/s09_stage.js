import * as THREE from 'three';
import { squareSetup, holds } from './squarebase.js';
import { Cutout, dancePose, idle } from '../chars.js';
import { crowd, popInAt, V, clamp, ease, easeOut, handheld } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const S = squareSetup(scene, { withStage: true });
  const list = crowd(scene, 90, { area: [30, 22], center: [0, 6], seed: 31, tired: 0.6, avoid: (x, z) => Math.hypot(x + 6, z - 6) < 2 || (Math.abs(x) < 6 && z < -3) });
  const play = (t) => Math.sin(t * 14);
  const piper = new Cutout('piper', { poseFn: (t) => ({ ...idle(t), armL: 1.2, elL: 1.4, armR: 0.9, elR: 1.3, eyes: 'closed', bob: Math.abs(play(t)) * 1.2, holds: { R: holds.pipe } }) });
  const drummer = new Cutout('drummer', { poseFn: (t) => ({ ...idle(t), armL: 0.6 + 0.5 * Math.max(0, play(t)), armR: 0.6 + 0.5 * Math.max(0, -play(t)), elL: 1.2, elR: 1.2, eyes: 'happy', bob: Math.abs(play(t)), holds: { L: holds.drum, R: holds.stick } }) });
  const lute = new Cutout('townM3', { poseFn: (t) => ({ ...idle(t), armL: 0.9, elL: 1.1, armR: 0.5 + 0.3 * Math.abs(play(t * 0.7)), elR: 1.2, eyes: 'happy', smile: 1, holds: { L: holds.pipe } }) });
  [[piper, -2.6], [drummer, 0], [lute, 2.6]].forEach(([c, x]) => { c.mesh.position.set(x, 1.32, -8); scene.add(c.mesh); });
  return (t) => {
    lighting.azimuth = 2.2; lighting.center.set(0, 0, -2); lighting.set(0.33); S.setNight(0); S.dust.userData.update(t);
    popInAt(list, list.map(() => 0), t);
    S.stage.userData.setProgress(clamp((t - 35.3) / 1.7));
    const m = [37.2, 37.45, 37.7];
    [piper, drummer, lute].forEach((c, i) => { const a = clamp((t - m[i]) / 0.25); c._s = a <= 0 ? 0.0001 : easeOut(a) * (1 + 0.3 * Math.sin(a * Math.PI)); c.mesh.visible = a > 0; });
    const k = ease((t - 32.7) / 6.4);
    camera.fov = 40; camera.updateProjectionMatrix();
    camera.position.set(7 - k * 6, 6 - k * 3.6, 9 - k * 2);
    camera.lookAt(0, 2.0 - k * 0.2, -8);
    handheld(camera, t, 0.01);
  };
}
