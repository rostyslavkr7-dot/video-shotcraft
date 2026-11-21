import * as THREE from 'three';
import { makeRenderer, makePost, Lighting } from './world.js';
const q = new URLSearchParams(location.search);
const W = +q.get('w') || 1080, H = +q.get('h') || 1920, FPS = 30;
const renderer = makeRenderer(W, H);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 2000);
const lighting = new Lighting(scene);
const post = makePost(renderer, scene, camera, W, H);
const mod = await import(`./shots/${q.get('shot')}.js`);
const TL = await (await fetch('/timeline.json')).json();
const entry = TL.shots.find(s => s.id === q.get('shot')) || { start: 0, end: mod.duration || 2 };
const H0 = entry.id ? TL.handle : 0;
const ctx = { THREE, scene, camera, lighting, post, renderer, W, H, FPS, entry, start: entry.start, end: entry.end };
const update = await mod.build(ctx);
const dur = entry.end - entry.start + 2 * H0;
window.shotInfo = { duration: dur, frames: Math.round(dur * FPS) };
window.renderFrame = (i) => {
  const t = entry.start - H0 + i / FPS; // global timeline seconds
  post.grade.uniforms.time.value = t;
  update(t);
  renderer.toneMappingExposure = (lighting.exposure || 1) * (ctx.exposureMul ?? 1.2);
  scene.traverse(o => { const c = o.userData && o.userData.cutout; if (c) c.update(t, camera, c.tintOverride || lighting.charTint); });
  post.comp.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};
window.ready = true;
