import * as THREE from 'three';
import { terrain, pines, stoneTex, roofTex, worldUV, woodTex, camPath, ease, dust, clamp } from '../world.js';
import { Cutout, dancePose, idle } from '../chars.js';
import { V } from './common.js';
export async function build({ scene, camera, lighting, post }) {
  const roadX = (z) => 6 * Math.sin(z / 22);
  const roadY = (z) => clamp((40 - z) / 140) * 34;
  const road = { adjust: (x, z, h) => { const d = Math.abs(x - roadX(z)); const ry = roadY(z); if (z > 60) return h; if (d < 2.6) return ry; if (d < 12) { const k = (d - 2.6) / 9.4; return ry + (h * 0.6 + ry * 0.4 - ry) * k * k + k * 2; } return Math.max(h, ry + 2); } };
  const T = terrain({ size: 700, seg: 220, height: 110, seed: 6, road });
  scene.add(T);
  // dirt road ribbon
  const pts = []; for (let z = 60; z > -100; z -= 2) pts.push(V(roadX(z), roadY(z) + 0.06, z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const rg = new THREE.TubeGeometry(curve, 160, 2.4, 6, false); rg.scale(1, 0.02, 1);
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#a88a62' }));
  const roadMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 2.2, 8, false), new THREE.MeshStandardMaterial({ color: '#b39468', roughness: 1 }));
  roadMesh.scale.y = 1; roadMesh.receiveShadow = true;
  // flatten the tube into a ribbon by squashing in local normal is complex; use a strip instead
  const strip = new THREE.BufferGeometry(); const sv = []; const N = 160;
  for (let i = 0; i <= N; i++) { const p = curve.getPoint(i / N), tg = curve.getTangent(i / N); const side = V(-tg.z, 0, tg.x).normalize().multiplyScalar(2.3); sv.push(p.x + side.x, p.y, p.z + side.z, p.x - side.x, p.y, p.z - side.z); }
  const idx = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  strip.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3)); strip.setIndex(idx); strip.computeVertexNormals();
  const sm = new THREE.Mesh(strip, new THREE.MeshStandardMaterial({ color: '#b8996a', roughness: 1, side: THREE.DoubleSide })); sm.receiveShadow = true; scene.add(sm);
  scene.add(pines(700, 520, (x, z) => T.userData.heightAt(x, z), 3, (x, z) => Math.abs(x - roadX(z)) < 6 && z < 62 || Math.hypot(x - roadX(-92), z + 92) < 14));
  // chapel on the crest
  const cz = -96, cx = roadX(cz), cy = roadY(-100);
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex('chap', '#d8d0c2'), roughness: 1 });
  const chapel = new THREE.Group();
  const nave = new THREE.Mesh(worldUV(new THREE.BoxGeometry(6, 5, 10), 2), stoneM); nave.position.y = 2.5; chapel.add(nave);
  const rs = new THREE.Shape(); rs.moveTo(-3.6, 0); rs.lineTo(0, 3.4); rs.lineTo(3.6, 0); rs.lineTo(-3.6, 0);
  const rt = roofTex().clone(); rt.needsUpdate = true; rt.repeat.set(0.3, 0.3);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(rs, { depth: 10.6, bevelEnabled: false }), new THREE.MeshStandardMaterial({ map: rt })); roof.position.set(0, 5, -5.3); chapel.add(roof);
  const tower = new THREE.Mesh(worldUV(new THREE.BoxGeometry(2.6, 9, 2.6), 2), stoneM); tower.position.set(0, 4.5, 5.6); chapel.add(tower);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4, 4), new THREE.MeshStandardMaterial({ map: rt })); sp.rotation.y = Math.PI / 4; sp.position.set(0, 11, 5.6); chapel.add(sp);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshStandardMaterial({ color: '#2a1a10' })); door.position.set(0, 1.2, 6.92); chapel.add(door);
  const lamp = new THREE.PointLight('#ffb060', 30, 14, 1.5); lamp.position.set(0, 2.6, 8); chapel.add(lamp);
  chapel.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  chapel.position.set(cx, cy, cz); chapel.rotation.y = 0.2; scene.add(chapel);
  // carts with dancers, pulled by walkers
  const carts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ map: woodTex('cart', '#8a5a32'), roughness: .9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 3.2), wood); body.position.y = 1.0; g.add(body);
    for (const [wx, wz] of [[-1.15, -1], [1.15, -1], [-1.15, 1], [1.15, 1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 14), new THREE.MeshStandardMaterial({ color: '#4a3020' })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.55, wz); g.add(w); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const riders = ['townW2', 'townM2', 'townW3'].map((n, j) => { const c = new Cutout(n, { res: 384, poseFn: (t) => ({ ...dancePose(t * 0.7 + j * 0.3 + i, 0.35, 1), eyes: 'tired' }) }); c.mesh.position.set(-0.6 + j * 0.6, 0.55, -0.6 + j * 0.5); g.add(c.mesh); return c; });
    const puller = new Cutout(i === 0 ? 'strong' : 'townM1', { res: 384, poseFn: (t) => { const s = Math.sin(t * 7 + i); return { ...idle(t), armL: 0.6, armR: 0.6, elL: -0.8, elR: -0.8, legL: 0.05 + 0.3 * Math.max(0, s), legR: 0.05 + 0.3 * Math.max(0, -s), lean: 0.12 }; } });
    scene.add(puller.mesh); scene.add(g); carts.push({ g, puller, off: i * 7 });
  }
  const d = dust(400, [80, 30, 80], '#fff1d0', 0.12); scene.add(d);
  const path = camPath([[roadX(30) + 14, roadY(30) + 9, 44], [roadX(0) + 10, roadY(0) + 14, 10], [roadX(-40) + 8, roadY(-40) + 18, -36]], [[roadX(14), roadY(14) + 1, 14], [roadX(-30), roadY(-30) + 3, -30], [cx, cy + 6, cz]]);
  return (t) => {
    lighting.azimuth = 1.2; lighting.center.set(0, 20, -30); lighting.set(0.2, { fogNear: 80, fogFar: 450, sunMul: 1.3, hemiMul: 1.5 });
    lighting.sun.shadow.camera.left = -90; lighting.sun.shadow.camera.right = 90; lighting.sun.shadow.camera.top = 90; lighting.sun.shadow.camera.bottom = -90; lighting.sun.shadow.camera.updateProjectionMatrix();
    post.bloom.strength = 0.5; d.position.set(roadX(0), roadY(0), 0); d.userData.update(t);
    carts.forEach(({ g, puller, off }) => {
      const z = 26 - (t - 50) * 2.2 - off; const z2 = z - 0.3;
      const p = V(roadX(z), roadY(z), z), q = V(roadX(z - 1), roadY(z - 1), z - 1);
      g.position.copy(p); g.lookAt(q.x, p.y, q.z);
      const pz = z - 3.0; puller.mesh.position.set(roadX(pz), roadY(pz), pz);
    });
    const c0 = carts[1].g.position, k = ease((t - 52.2) / 1.9);
    camera.fov = 46; camera.updateProjectionMatrix();
    camera.position.set(c0.x + 9 - k * 3, c0.y + 5 + k * 9, c0.z + 11 + k * 2);
    const tgt = V(c0.x, c0.y + 1.2, c0.z - 2).lerp(V(cx, cy + 5, cz), k);
    camera.lookAt(tgt);
  };
}
