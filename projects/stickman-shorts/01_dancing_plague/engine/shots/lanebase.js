import * as THREE from 'three';
import { lane, V, dust, setNightWindows } from '../world.js';
// shared lane setup: returns hero house door (world), Troffea spot
export function laneSetup(scene) {
  const L = lane(scene, { seed: 5 });
  let hero = null, best = 1e9;
  for (const h of L.houses) if (h.position.x > 0 && h.position.x < 10 && Math.abs(h.position.z + 4) < best) { best = Math.abs(h.position.z + 4); hero = h; }
  hero.updateMatrixWorld(true);
  const doorWorld = new THREE.Vector3(); hero.userData.door.getWorldPosition(doorWorld);
  // door pivot is at hinge; the doorway centre is 0.6 along local +x of the house
  const doorCenter = new THREE.Vector3(0.6, -1.15, 0).applyQuaternion(hero.quaternion).add(doorWorld);
  // laundry lines and hanging signs across the lane for life
  const cols = ['#e9e2d0', '#c0392b', '#2e86c1', '#f1c40f', '#7d9a5a', '#d98aa8'];
  const lines = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const z = -12 - k * 11, y = 7.5 + (k % 2) * 1.5;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 7, 4), new THREE.MeshStandardMaterial({ color: '#3a2a1a' })); rope.rotation.z = Math.PI / 2; rope.position.set(0, y, z); lines.add(rope);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ color: cols[(i + k) % cols.length], side: THREE.DoubleSide, roughness: 1 })); c.position.set(-2.6 + i * 1.0, y - 0.5, z); c.castShadow = true; lines.add(c); }
  }
  scene.add(lines);
  const d = dust(260, [8, 7, 40], '#fff4d6', 0.05); d.position.z = -10; scene.add(d);
  return { L, hero, doorCenter, lines, dust: d, setNight: (k) => setNightWindows(L.houses, k) };
}
