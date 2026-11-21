import * as THREE from 'three';
import { woodTex, stoneTex, plasterTex, worldUV, rng, dust } from '../world.js';
const shaft = (w, h, color = '#ffe2a8', op = 0.12) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); return m; };
export function councilRoom(scene, lighting) {
  const g = new THREE.Group(); scene.add(g);
  lighting.sky.visible = false; scene.fog = null;
  const floor = new THREE.Mesh(worldUV(new THREE.BoxGeometry(14, 0.2, 12), 3), new THREE.MeshStandardMaterial({ map: woodTex('floor', '#7a4a2a'), roughness: .7 })); floor.position.y = -0.1; floor.receiveShadow = true; g.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ map: stoneTex('cw', '#b89b7c'), roughness: 1 });
  const panelM = new THREE.MeshStandardMaterial({ map: woodTex('panel', '#5a3520'), roughness: .8 });
  const back = new THREE.Mesh(worldUV(new THREE.BoxGeometry(14, 6, 0.4), 2), wallM); back.position.set(0, 3, -5); back.receiveShadow = true; g.add(back);
  for (const x of [-7, 7]) { const s = new THREE.Mesh(worldUV(new THREE.BoxGeometry(0.4, 6, 12), 2), wallM); s.position.set(x, 3, 1); s.receiveShadow = true; g.add(s); }
  const wains = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 0.1), panelM); wains.position.set(0, 0.8, -4.75); g.add(wains);
  // ceiling beams
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 0.35), panelM); b.position.set(0, 5.6, -4.5 + i * 2); b.castShadow = true; g.add(b); }
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 12), panelM); ceil.position.set(0, 6, 1); g.add(ceil);
  // two tall windows on left wall with emissive glass + light shafts
  const shafts = [];
  for (const z of [-2.5, 1.5]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6) })); win.position.set(-6.78, 3.4, z); win.rotation.y = Math.PI / 2; g.add(win);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.12), panelM); fr.position.set(-6.75, 3.4, z); g.add(fr);
    const fr2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 1.7), panelM); fr2.position.set(-6.75, 3.4, z); g.add(fr2);
    const sh = shaft(2.0, 9); sh.position.set(-3.5, 2.6, z + 0.6); sh.rotation.set(0, Math.PI / 2, -0.95); g.add(sh); shafts.push(sh);
    const sh2 = shaft(1.4, 9, '#ffe2a8', 0.08); sh2.position.set(-3.4, 2.5, z + 0.3); sh2.rotation.set(0.15, Math.PI / 2 + 0.4, -0.95); g.add(sh2);
  }
  const sun = new THREE.DirectionalLight('#ffe0b0', 3.2); sun.position.set(-14, 9, 2); sun.target.position.set(0, 0, -1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); sun.shadow.bias = -0.0005; g.add(sun, sun.target);
  const amb = new THREE.HemisphereLight('#ffd9a8', '#3a2418', 0.9); g.add(amb);
  // long table with candles
  const table = new THREE.Mesh(worldUV(new THREE.BoxGeometry(7, 0.18, 2.2), 2), new THREE.MeshStandardMaterial({ map: woodTex('table', '#6b3f22'), roughness: .5 })); table.position.set(0, 1.0, -1.6); table.castShadow = table.receiveShadow = true; g.add(table);
  const front = new THREE.Mesh(new THREE.BoxGeometry(7, 0.9, 0.1), panelM); front.position.set(0, 0.5, -0.55); front.castShadow = true; g.add(front);
  const candles = [];
  for (const x of [-2.9, -1.3, 0.6, 3.2]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), new THREE.MeshStandardMaterial({ color: '#f3ead2' })); c.position.set(x, 1.27, -1.5); g.add(c);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.8) })); f.scale.y = 1.8; f.position.set(x, 1.5, -1.5); g.add(f);
    const l = new THREE.PointLight('#ffab55', 1.6, 5, 1.5); l.position.set(x, 1.7, -1.4); g.add(l); candles.push([f, l]);
  }
  // books, scrolls, skull? keep it friendly: books + inkwell
  const R = rng(4);
  for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16 + R() * 0.1, 0.7 + R() * 0.3, 0.5), new THREE.MeshStandardMaterial({ color: ['#7a2f2f', '#2f4f7a', '#3f6f4a', '#8a6a2a'][i % 4] })); b.position.set(-4 + i * 0.3, 3.1 + (i > 12 ? -1.3 : 0) - (i > 12 ? 0 : 0), -4.55); if (i > 12) b.position.x -= 3.9; g.add(b); }
  for (const y of [2.7, 1.4]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.6), panelM); sh.position.set(-2.1, y, -4.5); g.add(sh); }
  // flask of glowing red "hot blood"
  const flask = new THREE.Group();
  const glassM = new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), glassM); bulb.position.y = 0.22; flask.add(bulb);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 12), glassM); neck.position.y = 0.55; flask.add(neck);
  const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), new THREE.MeshStandardMaterial({ color: '#6a0508', emissive: new THREE.Color('#e00a0a'), emissiveIntensity: 0.3 })); liquid.position.y = 0.2; flask.add(liquid);
  const glow = new THREE.PointLight('#ff2a1a', 0, 4, 1.4); glow.position.y = 0.3; flask.add(glow);
  flask.position.set(1.9, 1.09, -1.2); g.add(flask);
  const d = dust(220, [10, 5, 8], '#ffe7b8', 0.03); d.position.set(-2, 0, -1); g.add(d);
  return { g, flask, liquid, glow, candles, dust: d, shafts };
}
export function chapelInterior(scene, lighting) {
  const g = new THREE.Group(); scene.add(g);
  lighting.sky.visible = false; scene.fog = new THREE.Fog('#2a2030', 8, 40);
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex('ch', '#a9a39a'), roughness: 1 });
  const floor = new THREE.Mesh(worldUV(new THREE.BoxGeometry(10, 0.2, 22), 2), stoneM); floor.position.set(0, -0.1, -6); floor.receiveShadow = true; g.add(floor);
  for (const x of [-4.5, 4.5]) { const w = new THREE.Mesh(worldUV(new THREE.BoxGeometry(0.6, 9, 22), 2), stoneM); w.position.set(x, 4.5, -6); w.receiveShadow = true; g.add(w); }
  const back = new THREE.Mesh(worldUV(new THREE.BoxGeometry(10, 12, 0.6), 2), stoneM); back.position.set(0, 6, -16.5); g.add(back);
  // vault
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 22, 24, 1, true, 0, Math.PI), stoneM); vault.rotation.set(Math.PI / 2, 0, Math.PI / 2); vault.position.set(0, 9, -6); vault.material.side = THREE.DoubleSide; g.add(vault);
  // stained window above altar
  const winC = document.createElement('canvas'); winC.width = 256; winC.height = 512; const x = winC.getContext('2d');
  const cols = ['#e74c3c', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22'];
  for (let i = 0; i < 80; i++) { x.fillStyle = cols[i % 6]; x.fillRect((i % 8) * 32, Math.floor(i / 8) * 52, 32, 52); } x.strokeStyle = '#111'; x.lineWidth = 6; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 512); x.stroke(); } for (let i = 0; i <= 10; i++) { x.beginPath(); x.moveTo(0, i * 52); x.lineTo(256, i * 52); x.stroke(); }
  const wt = new THREE.CanvasTexture(winC); wt.colorSpace = THREE.SRGBColorSpace;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.4), new THREE.MeshBasicMaterial({ map: wt, color: new THREE.Color(2.4, 2.4, 2.4) })); win.position.set(0, 7, -16.15); g.add(win);
  const sh = shaft(3.0, 16, '#ffd9a0', 0.12); sh.position.set(0, 4, -11); sh.rotation.set(-1.0, 0, 0); g.add(sh);
  const sun = new THREE.SpotLight('#ffd9a8', 25, 40, 0.5, 0.6, 1.2); sun.position.set(0, 10, -17); sun.target.position.set(0, 0, -6); sun.castShadow = true; g.add(sun, sun.target);
  const amb = new THREE.HemisphereLight('#8f9ad0', '#2a2030', 0.6); g.add(amb);
  // altar + cloth + candles
  const altar = new THREE.Mesh(worldUV(new THREE.BoxGeometry(3, 1.1, 1.2), 1.5), stoneM); altar.position.set(0, 0.55, -13); altar.castShadow = true; g.add(altar);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.05, 1.3), new THREE.MeshStandardMaterial({ color: '#9a8f7c', roughness: 1 })); cloth.position.set(0, 1.12, -13); g.add(cloth);
  const runner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.02), new THREE.MeshStandardMaterial({ color: '#8e1b1b' })); runner.position.set(0, 0.7, -12.39); g.add(runner);
  const fl = [];
  for (const cx of [-1.2, -0.7, 0.7, 1.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#f3ead2' })); c.position.set(cx, 1.4, -13.2); g.add(c); const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.8) })); f.scale.y = 1.8; f.position.set(cx, 1.72, -13.2); g.add(f); const l = new THREE.PointLight('#ffab55', 1.5, 6, 1.5); l.position.set(cx, 1.9, -13); g.add(l); fl.push([f, l]); }
  // small red shoes on a cushion
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: '#5a2a5a', roughness: 1 })); cushion.position.set(0, 1.18, -12.8); g.add(cushion);
  const red = new THREE.MeshStandardMaterial({ color: '#d4141c', roughness: 0.35, metalness: 0.05 });
  const shoes = new THREE.Group();
  for (const sz of [-0.09, 0.09]) {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.16, 6, 14), red); body.rotation.z = Math.PI / 2; body.scale.set(0.8, 1, 1); body.position.set(0, 0.05, sz); shoes.add(body);
    const toe = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 12), red); toe.rotation.z = -Math.PI / 2 + 0.35; toe.position.set(0.15, 0.07, sz); shoes.add(toe);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), new THREE.MeshStandardMaterial({ color: '#3a0508' })); hole.rotation.x = -Math.PI / 2; hole.position.set(-0.04, 0.102, sz); shoes.add(hole);
    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), new THREE.MeshStandardMaterial({ color: '#f1c40f', metalness: .7, roughness: .3 })); buckle.position.set(0.07, 0.1, sz); buckle.rotation.y = Math.PI / 2; shoes.add(buckle);
  }
  shoes.position.set(0, 1.22, -12.8); g.add(shoes);
  // pews
  const wood = new THREE.MeshStandardMaterial({ map: woodTex('pew', '#6b4426'), roughness: .8 });
  for (let r = 0; r < 4; r++) for (const sx of [-2.2, 2.2]) { const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.35), wood); seat.position.set(sx, 0.45, -9.5 + r * 2.2); seat.castShadow = seat.receiveShadow = true; g.add(seat); }
  const d = dust(260, [6, 8, 14], '#ffe7b8', 0.03); d.position.set(0, 0, -8); g.add(d);
  return { g, shoes, fl, dust: d };
}
