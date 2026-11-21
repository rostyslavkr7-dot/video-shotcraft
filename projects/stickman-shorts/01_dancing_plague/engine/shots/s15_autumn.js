import * as THREE from 'three';
import { squareSetup } from './squarebase.js';
import { Cutout, idle } from '../chars.js';
import { V, clamp, ease, handheld } from './common.js';
import { rng } from '../world.js';
export async function build({ scene, camera, lighting, post }) {
  const S = squareSetup(scene, {});
  const R = rng(13);
  // autumn trees
  const leafCols = ['#e67e22', '#d35400', '#f1c40f', '#c0392b'];
  for (const [x, z] of [[-5, -7], [6, -5], [-7, 3], [8, 5], [-2, -14]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.4, 8), new THREE.MeshStandardMaterial({ color: '#4a3324' })); tr.position.set(x, 1.7, z); tr.castShadow = true; scene.add(tr);
    for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 + R() * 0.6, 1), new THREE.MeshStandardMaterial({ color: leafCols[i % 4], flatShading: true, roughness: 1 })); b.position.set(x + (R() - .5) * 2.2, 3.6 + R() * 1.8, z + (R() - .5) * 2.2); b.castShadow = true; scene.add(b); }
  }
  // falling leaves
  const N = 260, pos = new Float32Array(N * 3), base = [];
  for (let i = 0; i < N; i++) base.push([(R() - .5) * 34, R() * 9, (R() - .5) * 34, R() * 6]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const leaves = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#e67e22', size: 0.16 })); scene.add(leaves);
  // a few ordinary townsfolk just walking
  const walkers = ['townW2', 'townM1', 'townW3'].map((n, i) => { const c = new Cutout(n, { res: 384, poseFn: (t) => { const s = Math.sin(t * 8 + i); return { ...idle(t), legL: 0.05 + 0.25 * Math.max(0, s), legR: 0.05 + 0.25 * Math.max(0, -s), armL: 0.15 - 0.15 * s, armR: 0.15 + 0.15 * s, bob: Math.abs(s) }; } }); scene.add(c.mesh); return c; });
  return (t) => {
    lighting.azimuth = 0.9; lighting.center.set(0, 0, 0); lighting.set(0.34, { fogNear: 60, fogFar: 400, hemiMul: 1.3 }); S.setNight(0);
    post.grade.uniforms.warm.value = 0.35;
    S.dust.userData.update(t);
    for (let i = 0; i < N; i++) { const b = base[i]; pos[i * 3] = b[0] + Math.sin(t * 1.3 + b[3]) * 0.8 + t * 0.2; pos[i * 3 + 1] = ((b[1] - t * 0.9 - b[3]) % 9 + 9) % 9; pos[i * 3 + 2] = b[2] + Math.cos(t + b[3]) * 0.6; }
    geo.attributes.position.needsUpdate = true;
    walkers.forEach((c, i) => c.mesh.position.set(-8 + (t - 57) * 1.1 + i * 4, 0, 2 + i * 2.5));
    const k = (t - 57.1) / 4.7;
    camera.fov = 52; camera.updateProjectionMatrix();
    camera.position.set(-2 + k * 4, 2.2 + k * 1.0, 15 - k * 2);
    camera.lookAt(2, 3.0, -8);
    handheld(camera, t, 0.01);
  };
}
