import * as THREE from 'three';
import { town, V, dust, setNightWindows, torch, flickerTorch, stage, rng } from '../world.js';
export function squareSetup(scene, { withStage = false, torches = false, seed = 3 } = {}) {
  const T = town(scene, { seed });
  const out = { T, setNight: (k) => setNightWindows(T.houses, k) };
  if (withStage) { const st = stage(1); st.position.set(0, 0, -8); scene.add(st); out.stage = st; }
  if (torches) {
    out.torches = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const tr = torch(60); tr.position.set(Math.cos(a) * 13.5, 0, Math.sin(a) * 13.5); scene.add(tr); out.torches.push(tr); }
    out.flicker = (t, on) => out.torches.forEach((tr, i) => { tr.visible = on > 0.01; flickerTorch(t, tr, i * 3.1); tr.userData.light.intensity *= on; });
  }
  const d = dust(400, [34, 8, 34], '#fff4d6', 0.06); scene.add(d); out.dust = d;
  return out;
}
// tool drawings for musicians and props held in hands
export const holds = {
  drum: (ctx, x, y, u) => { ctx.save(); ctx.translate(x - 8 * u, y + 2 * u); ctx.beginPath(); ctx.ellipse(0, 0, 9 * u, 3 * u, 0, 0, 7); ctx.rect(-9 * u, 0, 18 * u, 10 * u); ctx.fillStyle = '#c0392b'; ctx.fill(); ctx.lineWidth = u; ctx.strokeStyle = '#1d1714'; ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 9 * u, 3 * u, 0, 0, 7); ctx.fillStyle = '#f2e3c4'; ctx.fill(); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(-9 * u + i * 4.5 * u, 1 * u); ctx.lineTo(-9 * u + (i + 0.5) * 4.5 * u, 10 * u); } ctx.strokeStyle = '#f1c40f'; ctx.stroke(); ctx.restore(); },
  stick: (ctx, x, y, u) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6 * u, y - 7 * u); ctx.lineWidth = 1.4 * u; ctx.strokeStyle = '#1d1714'; ctx.stroke(); ctx.beginPath(); ctx.arc(x - 6 * u, y - 7 * u, 1.6 * u, 0, 7); ctx.fillStyle = '#f2e3c4'; ctx.fill(); ctx.stroke(); },
  pipe: (ctx, x, y, u) => { ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.ellipse(-4 * u, 4 * u, 7 * u, 5 * u, 0.4, 0, 7); ctx.fillStyle = '#7d3c98'; ctx.fill(); ctx.lineWidth = u; ctx.strokeStyle = '#1d1714'; ctx.stroke(); for (const [dx, h] of [[-8, 14], [-4, 18], [0, 12]]) { ctx.beginPath(); ctx.rect(dx * u, -h * u, 1.6 * u, h * u); ctx.fillStyle = '#c8a26a'; ctx.fill(); ctx.stroke(); } ctx.restore(); },
  purse: (ctx, x, y, u) => { ctx.beginPath(); ctx.ellipse(x, y + 4 * u, 4.5 * u, 5 * u, 0, 0, 7); ctx.fillStyle = '#8a5a2b'; ctx.fill(); ctx.lineWidth = u; ctx.strokeStyle = '#1d1714'; ctx.stroke(); ctx.beginPath(); ctx.arc(x, y + 4 * u, 1.8 * u, 0, 7); ctx.fillStyle = '#f1c40f'; ctx.fill(); ctx.stroke(); },
  scroll: (ctx, x, y, u) => { ctx.beginPath(); ctx.rect(x - 2 * u, y - 12 * u, 9 * u, 13 * u); ctx.fillStyle = '#f3e6c4'; ctx.fill(); ctx.lineWidth = u; ctx.strokeStyle = '#1d1714'; ctx.stroke(); ctx.beginPath(); ctx.arc(x + 2.5 * u, y - 2 * u, 1.6 * u, 0, 7); ctx.fillStyle = '#c0392b'; ctx.fill(); },
};
