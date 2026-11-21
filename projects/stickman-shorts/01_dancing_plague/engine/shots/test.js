import * as THREE from 'three';
import { lane, V, dust } from '../world.js';
import { Cutout, dancePose, idle } from '../chars.js';
export const duration = 2;
export async function build({ scene, camera, lighting }) {
  const L = lane(scene, { seed: 5 });
  const tro = new Cutout('troffea', { poseFn: (t) => dancePose(t * 0.9, 1, 0) }); tro.mesh.position.set(0.4, 0, 2); scene.add(tro.mesh);
  const a = new Cutout('townM1', { poseFn: (t) => ({ ...idle(t), eyes: 'wide', mouth: 0.5 }) }); a.mesh.position.set(-2.4, 0, -1); scene.add(a.mesh);
  const b = new Cutout('townW1', { poseFn: (t) => ({ ...idle(t + 1), eyes: 'wide', armR: 2.4, mouth: 0.3 }) }); b.mesh.position.set(2.4, 0, -3); scene.add(b.mesh);
  const d = dust(300, [10, 6, 30]); scene.add(d);
  return (t) => {
    lighting.azimuth = 1.8; lighting.center.set(0, 0, -10); lighting.set(0.32);
    camera.fov = 45; camera.updateProjectionMatrix();
    camera.position.set(0.2, 1.6, 9 - t * 0.6); camera.lookAt(0.2, 4.0, -20);
    d.userData.update(t);
  };
}
