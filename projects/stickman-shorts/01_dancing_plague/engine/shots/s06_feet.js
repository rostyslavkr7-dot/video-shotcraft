import * as THREE from 'three';
import { squareSetup } from './squarebase.js';
import { Cutout, dancePose } from '../chars.js';
import { crowd, V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting }) {
  const S = squareSetup(scene, {});
  const list = crowd(scene, 70, { area: [26, 18], center: [0, -2], seed: 21, tired: 0.8, res: 384 });
  list.forEach(c => c.mesh.visible = true);
  // close row of tired dancers
  const row = [];
  ['townW2', 'townM3', 'townW1', 'townM4'].forEach((n, i) => { const c = new Cutout(n, { res: 512, poseFn: (t) => dancePose(t * 1.05 + i * 0.3, 0.7, 1) }); c.mesh.position.set(-3 + i * 2.2, 0, 7 - (i % 2) * 0.8); scene.add(c.mesh); row.push(c); });
  // the one who falls and gets up
  const fall = (t) => clamp((t - 23.15) / 0.35) - clamp((t - 24.7) / 0.7);
  const fallen = new Cutout('townM2', { res: 512, poseFn: (t) => { const f = fall(t); return f > 0.05 ? { armL: 1.6, armR: 1.4, legL: 0.3, legR: 0.1, eyes: 'closed', mouth: 0.4, sweat: true } : { ...dancePose(t * 1.0, 0.6, 1) }; } });
  fallen.mesh.position.set(-0.9, 0, 9.4); scene.add(fallen.mesh); fallen.billboard = false;
  return (t) => {
    lighting.azimuth = 2.2; lighting.center.set(0, 0, 4); lighting.set(0.36); S.setNight(0); S.dust.userData.update(t);
    const f = fall(t);
    fallen.mesh.rotation.set(0, 0, -Math.PI / 2 * ease(f) * 0.96);
    const k = (t - 20.3) / 6.3;
    camera.fov = 42; camera.updateProjectionMatrix();
    camera.position.set(-4 + k * 6.5, 0.32, 12.6);
    camera.lookAt(-3.6 + k * 6.3, 1.1, 6.5);
    handheld(camera, t, 0.012);
  };
}
