import * as THREE from 'three';
import { squareSetup, holds } from './squarebase.js';
import { Cutout, idle } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const S = squareSetup(scene, { withStage: true });
  const mayor = new Cutout('mayor', { poseFn: (t) => { const up = clamp((t - 49.3) / 0.3); return { ...idle(t), armR: 0.2 + up * 2.6, elR: -0.2 * up, armL: 0.2, holds: { L: holds.scroll }, brows: t > 49.4 ? -0.6 : 0, mouth: (t > 49.5 && t < 50.4) ? 0.5 + 0.3 * Math.sin(t * 20) : 0, eyes: 'open' }; } });
  mayor.mesh.position.set(0, 1.32, -7.2); scene.add(mayor.mesh);
  const piper = new Cutout('piper', { poseFn: (t) => ({ ...idle(t), armL: 0.3, armR: 0.25, eyes: 'wide', mouth: 0.4, look: 0.7, holds: { R: holds.pipe } }) });
  piper.mesh.position.set(-3.2, 1.32, -8.3); scene.add(piper.mesh);
  const dr = new Cutout('drummer', { poseFn: (t) => ({ ...idle(t + 1), armL: 0.25, armR: 0.2, eyes: 'tired', look: -0.6 }) });
  dr.mesh.position.set(3.2, 1.32, -8.3); scene.add(dr.mesh);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 20), new THREE.MeshStandardMaterial({ color: '#c0392b' })); drum.rotation.z = Math.PI / 2; drum.position.set(2.2, 1.73, -7.5); drum.castShadow = true; scene.add(drum);
  return (t) => {
    lighting.azimuth = 2.2; lighting.center.set(0, 0, -4); lighting.set(0.2, { fogNear: 40, fogFar: 300, clouds: 1.4, sunMul: 0.5 }); S.setNight(0.2); S.dust.userData.update(t);
    post.grade.uniforms.sat.value = 0.9;
    const k = ease((t - 47.2) / 3.8);
    camera.fov = 40 - k * 8; camera.updateProjectionMatrix();
    camera.position.set(0.6, 1.9, 2.5 - k * 2.5);
    camera.lookAt(0, 2.5, -7.4);
    handheld(camera, t, 0.012);
  };
}
