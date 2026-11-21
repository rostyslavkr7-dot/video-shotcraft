// 3D world toolkit: renderer, sky, time-of-day lighting, procedural medieval town, interiors, terrain, post.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const remap = (x, a, b) => clamp((x - a) / (b - a));
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer ----------
export function makeRenderer(W, H) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setPixelRatio(1); r.setSize(W, H);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(r.domElement);
  return r;
}

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.35 }, warm: { value: 0.0 }, sat: { value: 1.15 }, contrast: { value: 1.04 }, lift: { value: new THREE.Vector3(0, 0, 0) }, flash: { value: 0 }, flashColor: { value: new THREE.Color(1, 1, 1) }, time: { value: 0 }, grain: { value: 0.02 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette,warm,sat,contrast,flash,time,grain; uniform vec3 lift,flashColor; varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time*7.)*43758.5453);}
  void main(){ vec4 c=texture2D(tDiffuse,vUv); vec3 col=c.rgb;
    float l=dot(col,vec3(.299,.587,.114)); col=mix(vec3(l),col,sat); col=(col-.5)*contrast+.5+lift;
    col.r+=warm*.05; col.b-=warm*.05;
    vec2 d=vUv-.5; d.x*=.75; col*=1.-vignette*smoothstep(.25,.85,length(d)*1.2);
    col+= (h(vUv*1000.)-.5)*grain;
    col=mix(col,flashColor,clamp(flash,0.,1.));
    gl_FragColor=vec4(col,1.); }`,
};

export function makePost(renderer, scene, camera, W, H) {
  const comp = new EffectComposer(renderer);
  comp.setPixelRatio(1); comp.setSize(W, H);
  comp.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.6, 0.85);
  comp.addPass(bloom);
  comp.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  comp.addPass(grade);
  return { comp, bloom, grade };
}

// ---------- sky ----------
export function makeSky(scene) {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0.9995 }, stars: { value: 0 }, clouds: { value: 1 }, time: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top,hor,bot,sunDir,sunCol; uniform float sunSize,stars,clouds,time; varying vec3 vP;
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5),d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
    void main(){ float y=vP.y; vec3 c= y>0. ? mix(hor,top,pow(clamp(y,0.,1.),.55)) : mix(hor,bot,clamp(-y*4.,0.,1.));
      float sd=dot(normalize(vP),normalize(sunDir));
      c+=sunCol*(smoothstep(sunSize,1.,sd)*4.+pow(max(sd,0.),64.)*.6+pow(max(sd,0.),6.)*.18);
      if(y>0.){ vec2 uv=vP.xz/(y+.12)*1.4+vec2(time*.01,0.); float cl=smoothstep(.55,.9,fbm(uv))*clouds*smoothstep(0.,.25,y);
        vec3 ccol=mix(hor*1.05+.05, vec3(1.)*(.55+.45*length(sunCol)/1.7), .6) + sunCol*pow(max(sd,0.),8.)*.5; c=mix(c,ccol,cl*.85);
        float st=step(.9975,hash(floor(vP*420.)))*stars*smoothstep(.05,.3,y); c+=vec3(st); }
      gl_FragColor=vec4(c,1.); }`,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; scene.add(m);
  return m;
}

// time-of-day keyframes: 0 dawn .25 day .5 sunset .62 dusk .75 night
const TOD = [
  { t: 0.00, top: '#5a6fa8', hor: '#f3b38a', bot: '#4a4250', sun: '#ffb070', si: 1.6, hemiS: '#9fb2e0', hemiG: '#6a5040', hi: 0.55, fog: '#d9a58e', exp: 1.0, elev: 0.08 },
  { t: 0.25, top: '#3f86d8', hor: '#bfe0f5', bot: '#6c7a6a', sun: '#fff1d8', si: 2.8, hemiS: '#bcd6ff', hemiG: '#8a8272', hi: 1.25, fog: '#c5dcef', exp: 1.2, elev: 0.75 },
  { t: 0.50, top: '#3d4f9a', hor: '#ff9a5a', bot: '#4b3a3a', sun: '#ff8a3d', si: 2.2, hemiS: '#8f90c8', hemiG: '#7a4a34', hi: 0.9, fog: '#e8946a', exp: 1.15, elev: 0.06 },
  { t: 0.62, top: '#1d2457', hor: '#b45a6e', bot: '#2a2238', sun: '#ff6a4a', si: 0.6, hemiS: '#6a6fc0', hemiG: '#3b2a48', hi: 0.8, fog: '#5c4870', exp: 1.2, elev: -0.02 },
  { t: 0.75, top: '#142060', hor: '#3a4f9a', bot: '#141a34', sun: '#a9c0ff', si: 1.1, hemiS: '#6a86e0', hemiG: '#3a3450', hi: 1.3, fog: '#26336a', exp: 1.45, elev: 0.7 },
  { t: 1.00, top: '#5a6fa8', hor: '#f3b38a', bot: '#4a4250', sun: '#ffb070', si: 1.6, hemiS: '#9fb2e0', hemiG: '#6a5040', hi: 0.55, fog: '#d9a58e', exp: 1.0, elev: 0.08 },
];
const C = (h) => new THREE.Color(h);

export class Lighting {
  constructor(scene, { shadowSize = 60, mapSize = 2048 } = {}) {
    this.scene = scene;
    this.sky = makeSky(scene);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(mapSize, mapSize);
    const s = shadowSize; Object.assign(this.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 400 });
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 4;
    scene.add(this.sun); scene.add(this.sun.target);
    scene.fog = new THREE.Fog(0xffffff, 60, 420);
    this.azimuth = 0.6; this.center = new THREE.Vector3();
    this.charTint = new THREE.Color(1, 1, 1); this.night = 0;
  }
  set(tod, opts = {}) {
    tod = ((tod % 1) + 1) % 1;
    let i = 0; while (i < TOD.length - 2 && TOD[i + 1].t < tod) i++;
    const a = TOD[i], b = TOD[i + 1], k = ease((tod - a.t) / (b.t - a.t));
    const mix = (x, y) => C(x).lerp(C(y), k);
    const u = this.sky.material.uniforms;
    u.top.value = mix(a.top, b.top); u.hor.value = mix(a.hor, b.hor); u.bot.value = mix(a.bot, b.bot);
    const elev = lerp(a.elev, b.elev, k);
    const az = this.azimuth + tod * 1.2;
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(Math.max(elev, 0.03)), Math.sin(az) * Math.cos(elev)).normalize();
    // at night use moon direction (high), sky sun disc hidden
    const nightK = clamp((tod - 0.6) / 0.08) * (1 - clamp((tod - 0.92) / 0.08));
    this.night = nightK;
    u.sunDir.value.copy(dir); u.sunCol.value = mix(a.sun, b.sun).multiplyScalar(1 - nightK * 0.7);
    u.sunSize.value = lerp(0.9993, 0.9998, nightK); u.stars.value = nightK; u.clouds.value = opts.clouds ?? (1 - nightK * 0.6);
    this.sun.color = mix(a.sun, b.sun); this.sun.intensity = lerp(a.si, b.si, k) * (opts.sunMul ?? 1);
    this.sun.position.copy(this.center).addScaledVector(dir, 150); this.sun.target.position.copy(this.center);
    this.hemi.color = mix(a.hemiS, b.hemiS); this.hemi.groundColor = mix(a.hemiG, b.hemiG); this.hemi.intensity = lerp(a.hi, b.hi, k) * (opts.hemiMul ?? 1);
    this.scene.fog.color = mix(a.fog, b.fog);
    if (opts.fogNear !== undefined) { this.scene.fog.near = opts.fogNear; this.scene.fog.far = opts.fogFar; }
    // flat characters: tint toward sky light so they sit in the scene but stay flat
    const lum = (this.sun.intensity * 0.25 + this.hemi.intensity * 0.6);
    this.charTint.copy(this.hemi.color).lerp(this.sun.color, 0.5).multiplyScalar(clamp(lum, 0.35, 1.0) * 1.1);
    this.charTint.r = Math.min(1, this.charTint.r * 0.55 + 0.45 * Math.min(1, lum)); this.charTint.g = Math.min(1, this.charTint.g * 0.55 + 0.45 * Math.min(1, lum)); this.charTint.b = Math.min(1, this.charTint.b * 0.55 + 0.45 * Math.min(1, lum));
    this.exposure = lerp(a.exp, b.exp, k);
    return this;
  }
}

// box-projected UVs in metres / tile, so textures keep real-world scale on any mesh
export function worldUV(geo, tile = 4) {
  geo = geo.index ? geo.toNonIndexed() : geo; geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let a, b; if (ax >= ay && ax >= az) { a = p.getZ(i); b = p.getY(i); } else if (ay >= az) { a = p.getX(i); b = p.getZ(i); } else { a = p.getX(i); b = p.getY(i); }
    uv[i * 2] = a / tile; uv[i * 2 + 1] = b / tile; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}
const W2 = (geo, tile) => worldUV(geo, tile);

// ---------- procedural textures ----------
const texCache = new Map();
function canvasTex(key, w, h, draw, repeat = [1, 1], srgb = true) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t); return t;
}

export function cobbleTex() {
  return canvasTex('cobble', 1024, 1024, (g, w, h) => {
    const R = rng(7); g.fillStyle = '#5e4c3c'; g.fillRect(0, 0, w, h);
    const rows = 22, cw = w / 18;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 19; c++) {
      const x = c * cw + (r % 2) * cw / 2 + (R() - .5) * 6, y = r * h / rows + (R() - .5) * 4;
      const v = 150 + R() * 55, hue = R();
      g.fillStyle = `rgb(${v + 28},${v + 4 - 8 * hue},${v - 30})`;
      g.beginPath(); g.ellipse(x + cw / 2, y + h / rows / 2, cw * 0.46, h / rows * 0.42, (R() - .5) * 0.2, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.ellipse(x + cw / 2 - 4, y + h / rows / 2 - 4, cw * 0.28, h / rows * 0.2, 0, 0, 7); g.fill();
    }
  }, [6, 6]);
}
export function plasterTex(key, base, beam, opts = {}) {
  return canvasTex('plaster' + key, 512, 512, (g, w, h) => {
    const R = rng(key.length * 31 + base.charCodeAt(2));
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${R() * 0.05})`; g.beginPath(); g.arc(R() * w, R() * h, R() * 18, 0, 7); g.fill(); }
    g.fillStyle = beam; const bw = 14;
    // half-timber frame per floor (texture = 1 floor, 4m wide)
    g.fillRect(0, 0, w, bw); g.fillRect(0, h - bw, w, bw);
    for (let x = 0; x <= w; x += w / 4) g.fillRect(x - bw / 2, 0, bw, h);
    g.lineWidth = bw * 0.9; g.strokeStyle = beam;
    if (opts.cross === true) { g.beginPath(); g.moveTo(0, h); g.lineTo(w / 4, 0); g.moveTo(w / 2, 0); g.lineTo(w * 3 / 4, h); g.stroke(); }
    // windows
    const win = (x, y) => { g.fillStyle = beam; g.fillRect(x - 6, y - 6, 92, 122); g.fillStyle = '#2b3445'; g.fillRect(x, y, 80, 110); g.strokeStyle = '#d8cfb8'; g.lineWidth = 5; g.strokeRect(x, y, 80, 110); g.beginPath(); g.moveTo(x + 40, y); g.lineTo(x + 40, y + 110); g.moveTo(x, y + 55); g.lineTo(x + 80, y + 55); g.stroke(); g.fillStyle = 'rgba(160,200,255,0.25)'; g.fillRect(x + 4, y + 4, 34, 48); };
    const sh = ['#3f6f4a', '#8e3b2e', '#2f4f7a', '#6a4a2a'][key.charCodeAt(0) % 4];
    for (const x of [w / 4 + 24, w * 3 / 4 - 104]) { g.fillStyle = sh; g.fillRect(x - 46, 144, 38, 122); g.fillRect(x + 88, 144, 38, 122); g.strokeStyle = beam; g.lineWidth = 3; g.strokeRect(x - 46, 144, 38, 122); g.strokeRect(x + 88, 144, 38, 122);
      g.fillStyle = '#6a4326'; g.fillRect(x - 10, 266, 100, 18); for (let i = 0; i < 7; i++) { g.fillStyle = ['#e74c3c', '#f39c12', '#e84393', '#ffffff'][i % 4]; g.beginPath(); g.arc(x - 4 + i * 15, 262, 7, 0, 7); g.fill(); } g.fillStyle = '#3d7a34'; g.fillRect(x - 8, 262, 96, 5); }
  });
}
export function windowGlowTex() {
  return canvasTex('winglow', 512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const win = (x, y) => { g.fillStyle = '#ffb04a'; g.fillRect(x, y, 80, 110); };
    win(w / 4 + 24, 150); win(w * 3 / 4 - 104, 150);
  });
}
export function roofTex() {
  return canvasTex('roof', 512, 512, (g, w, h) => {
    const R = rng(3); g.fillStyle = '#8c3b26'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 24) for (let x = -20; x < w; x += 30) {
      const v = 0.75 + R() * 0.4; g.fillStyle = `rgb(${150 * v},${66 * v},${44 * v})`;
      g.beginPath(); g.roundRect(x + ((y / 24) % 2) * 15, y, 28, 26, [0, 0, 12, 12]); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + ((y / 24) % 2) * 15, y + 22, 28, 3);
    }
  }, [3, 3]);
}
export function stoneTex(key = 'stone', base = '#b98a7a') {
  return canvasTex(key, 512, 512, (g, w, h) => {
    const R = rng(11); const c = new THREE.Color(base); g.fillStyle = `rgb(${c.r * 270},${c.g * 270},${c.b * 270})`; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 64) {
      const v = 0.93 + R() * 0.1; g.fillStyle = `rgb(${c.r * 255 * v},${c.g * 255 * v},${c.b * 255 * v})`;
      g.fillRect(x + ((y / 32) % 2) * 32 + 2, y + 2, 60, 28);
    }
  }, [2, 2]);
}
export function woodTex(key = 'wood', base = '#8a5a32') {
  return canvasTex(key, 512, 512, (g, w, h) => {
    const R = rng(5); g.fillStyle = base; g.fillRect(0, 0, w, h);
    const c = new THREE.Color(base);
    for (let x = 0; x < w; x += 64) {
      const v = 0.85 + R() * 0.3; g.fillStyle = `rgb(${c.r * 255 * v},${c.g * 255 * v},${c.b * 255 * v})`; g.fillRect(x + 1, 0, 62, h);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); const xx = x + 8 + R() * 48; g.moveTo(xx, 0); g.bezierCurveTo(xx + 8, h / 3, xx - 8, h * 2 / 3, xx + 4, h); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, 0, 2, h);
    }
  }, [1, 1]);
}
export function grassTex() {
  return canvasTex('grass', 512, 512, (g, w, h) => {
    const R = rng(9); g.fillStyle = '#5f8a3a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const v = 0.7 + R() * 0.5; g.fillStyle = `rgba(${80 * v},${140 * v},${50 * v},0.6)`; g.fillRect(R() * w, R() * h, 2, 6); }
  }, [40, 40]);
}

// ---------- town ----------
const PLASTER = [['a', '#efe2c4', '#5a3a24'], ['b', '#f1d6b8', '#4a2f20'], ['c', '#e6eef2', '#3e2a1e'], ['d', '#f3e7b0', '#5b3a22'], ['e', '#e8c9c0', '#4d3020'], ['f', '#dfe6cf', '#4a3424']];

export function house(w, d, floors, variant, opts = {}) {
  const g = new THREE.Group();
  const [k, base, beam] = PLASTER[variant % PLASTER.length];
  const fh = 3.2, H = floors * fh;
  const wall = plasterTex(k, base, beam).clone(); wall.needsUpdate = true; wall.repeat.set(w / 4, floors);
  const glow = windowGlowTex().clone(); glow.needsUpdate = true; glow.repeat.set(w / 4, floors);
  const mat = new THREE.MeshStandardMaterial({ map: wall, roughness: 0.95, emissiveMap: glow, emissive: new THREE.Color(0xffa040), emissiveIntensity: 0 });
  // ground floor stone
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex('hs', '#a89a88'), roughness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), mat); body.position.y = H / 2 + 0.6; body.castShadow = body.receiveShadow = true; g.add(body);
  const plinth = new THREE.Mesh(W2(new THREE.BoxGeometry(w + 0.1, 0.8, d + 0.1), 2), stone); plinth.position.y = 0.4; plinth.receiveShadow = plinth.castShadow = true; g.add(plinth);
  // gable roof (ridge along x)
  const rh = opts.roofH ?? d * 0.9;
  const shape = new THREE.Shape(); shape.moveTo(-d / 2 - 0.4, 0); shape.lineTo(0, rh); shape.lineTo(d / 2 + 0.4, 0); shape.lineTo(-d / 2 - 0.4, 0);
  const rg = new THREE.ExtrudeGeometry(shape, { depth: w + 0.6, bevelEnabled: false }); rg.translate(0, 0, -(w + 0.6) / 2); rg.rotateY(Math.PI / 2);
  const rt = roofTex().clone(); rt.needsUpdate = true; rt.repeat.set(0.25, 0.25);
  const roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rt, roughness: 0.85 })); roof.position.y = H + 0.6; roof.castShadow = roof.receiveShadow = true; g.add(roof);
  // door
  if (opts.door !== false) {
    const dx = opts.doorX ?? 0;
    const hole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.1), new THREE.MeshBasicMaterial({ color: '#120c08' })); hole.position.set(dx, 1.2, d / 2 + 0.01); g.add(hole);
    const pivot = new THREE.Group(); pivot.position.set(dx - 0.6, 1.15, d / 2 + 0.09); g.add(pivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), new THREE.MeshStandardMaterial({ map: woodTex('door', '#6b3f22'), roughness: 0.8 }));
    door.position.set(0.6, 0, 0); door.castShadow = true; pivot.add(door); g.userData.door = pivot;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.3), stone); frame.position.set(dx, 2.42, d / 2 + 0.1); g.add(frame);
  }
  // chimney
  if (variant % 2 === 0) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), stone); ch.position.set(w * 0.25, H + 0.6 + rh * 0.6, -d * 0.15); ch.castShadow = true; g.add(ch); }
  g.userData.mat = mat; g.userData.H = H;
  return g;
}

export function cathedral() {
  const g = new THREE.Group();
  const st = stoneTex('cat', '#cfb9b2'); st.repeat.set(1, 1);
  const pink = new THREE.MeshStandardMaterial({ map: st, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#4a2f33', roughness: 1 });
  const glass = new THREE.MeshStandardMaterial({ color: '#2a2450', emissive: '#ff9a4a', emissiveIntensity: 0, roughness: .3 });
  const add = (geo, m, x, y, z, tile = 3) => { const mesh = new THREE.Mesh(W2(geo, tile), m); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  add(new THREE.BoxGeometry(20, 24, 60), pink, 0, 12, -34);
  const roofM = new THREE.MeshStandardMaterial({ color: '#58606e', roughness: .7 });
  const rs = new THREE.Shape(); rs.moveTo(-11, 0); rs.lineTo(0, 11); rs.lineTo(11, 0); rs.lineTo(-11, 0);
  const rg = new THREE.ExtrudeGeometry(rs, { depth: 60, bevelEnabled: false }); const roof = new THREE.Mesh(rg, roofM); roof.position.set(0, 24, -64); g.add(roof);
  // facade with buttresses
  add(new THREE.BoxGeometry(32, 46, 7), pink, 0, 23, 0);
  for (const x of [-15, -5.5, 5.5, 15]) { add(new THREE.BoxGeometry(2.2, 50, 9), pink, x, 25, 0.8); const p = add(new THREE.ConeGeometry(1.3, 8, 4), pink, x, 54, 0.8); p.rotation.y = Math.PI / 4; }
  // gallery of tall lancets
  for (let i = 0; i < 9; i++) { const x = -12 + i * 3; add(new THREE.BoxGeometry(1.4, 7, 0.4), dark, x, 36, 3.6); const ar = add(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 12, 1, false, 0, Math.PI), dark, x, 39.5, 3.6); ar.rotation.set(Math.PI / 2, 0, Math.PI / 2); }
  // portals (pointed)
  for (const x of [-10.5, 0, 10.5]) { const w = x === 0 ? 6 : 4.2, h = x === 0 ? 11 : 8.5;
    add(new THREE.BoxGeometry(w, h, 1), dark, x, h / 2, 3.2);
    const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.quadraticCurveTo(-w / 2, w * 0.7, 0, w * 0.95); tri.quadraticCurveTo(w / 2, w * 0.7, w / 2, 0); tri.lineTo(-w / 2, 0);
    const tg = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1, bevelEnabled: false }), dark); tg.position.set(x, h, 2.7); g.add(tg);
    const fr = new THREE.Shape(); fr.moveTo(-w / 2 - 1, 0); fr.lineTo(0, w * 1.5 + 1); fr.lineTo(w / 2 + 1, 0); fr.lineTo(-w / 2 - 1, 0);
    const fg = new THREE.Mesh(W2(new THREE.ExtrudeGeometry(fr, { depth: 0.6, bevelEnabled: false }), 3), pink); fg.position.set(x, h + 0.2, 3.6); g.add(fg); }
  // rose window
  const rose = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), glass); rose.position.set(0, 26, 3.65); g.add(rose); g.userData.rose = rose;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.45, 8, 48), pink); ring.position.set(0, 26, 3.7); g.add(ring);
  for (let i = 0; i < 12; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.25, 10.4, 0.3), pink); sp.position.set(0, 26, 3.8); sp.rotation.z = i * Math.PI / 12; g.add(sp); }
  // single north tower + octagon + spire (Strasbourg style)
  add(new THREE.BoxGeometry(11, 22, 9), pink, -10.5, 57, 0);
  for (let i = 0; i < 4; i++) { const tr = add(new THREE.CylinderGeometry(0.9, 0.9, 30, 8), pink, -10.5 + (i % 2 ? 3.4 : -3.4), 82, i < 2 ? 3.4 : -3.4); }
  add(new THREE.CylinderGeometry(3.8, 4.4, 30, 8), pink, -10.5, 82, 0);
  add(new THREE.ConeGeometry(4.6, 38, 8), pink, -10.5, 116, 0);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(new THREE.ConeGeometry(0.7, 5, 6), pink, -10.5 + Math.cos(a) * 4.4, 99.5, Math.sin(a) * 4.4); }
  add(new THREE.BoxGeometry(11, 2, 9), pink, 10.5, 47, 0);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// medieval town around a square at origin; square is 28x28; cathedral north
export function town(scene, { seed = 1, radius = 120 } = {}) {
  const R = rng(seed);
  const root = new THREE.Group(); scene.add(root);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 0.95, color: '#ffdcb4' }));
  ground.material.map.repeat.set(70, 70);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const houses = [];
  const place = (x, z, rotY, w, d, floors, v) => { const h = house(w, d, floors, v); h.position.set(x, 0, z); h.rotation.y = rotY; root.add(h); houses.push(h); return h; };
  // ring of houses around square (square half-size 16), facing inward
  const S = 16;
  for (const side of [0, 1, 2, 3]) {
    let s = -S - 4;
    while (s < S + 4) {
      const w = 5 + Math.floor(R() * 3), d = 9, fl = 2 + Math.floor(R() * 2);
      const pos = s + w / 2;
      if (side === 0 && Math.abs(pos) < 9) { s += w + 0.2; continue; } // gap north for cathedral view
      if (side === 1 && Math.abs(pos - 2) < 3) { s += w + 0.2; continue; } // street east
      const v = Math.floor(R() * 6);
      if (side === 0) place(pos, -S - d / 2, 0, w, d, fl, v);
      if (side === 2) place(pos, S + d / 2, Math.PI, w, d, fl, v);
      if (side === 1) place(S + d / 2, pos, -Math.PI / 2, w, d, fl, v);
      if (side === 3) place(-S - d / 2, pos, Math.PI / 2, w, d, fl, v);
      s += w + 0.15;
    }
  }
  // outer blocks
  for (let i = 0; i < 260; i++) {
    const a = R() * Math.PI * 2, r = 32 + R() * radius;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 28 && z < -20 && z > -130) continue; // cathedral area
    if (z > 16 && z < 26 && Math.abs(x) < 26) continue;
    place(x, z, Math.round(a / (Math.PI / 2)) * Math.PI / 2 + (R() - .5) * 0.1, 5 + R() * 4, 8 + R() * 3, 2 + Math.floor(R() * 3), Math.floor(R() * 6));
  }
  // the east street (Troffea's lane): x 24..80, z = 2, houses both sides
  const cat = cathedral(); cat.position.set(0, 0, -56); root.add(cat);
  // well in the square
  const st = new THREE.MeshStandardMaterial({ map: stoneTex('well', '#9a8f84'), roughness: 1 });
  const well = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1, 20, 1, true), st); well.position.set(-6, 0.5, 6); well.castShadow = true; well.material.side = THREE.DoubleSide; root.add(well);
  return { root, houses, cathedral: cat, ground };
}

export function setNightWindows(houses, k, R = rng(99)) {
  for (const h of houses) { if (h.userData.mat) h.userData.mat.emissiveIntensity = k * (h.userData.lit ??= (R() < 0.7 ? 1.4 : 0)); }
}

// ---------- props ----------
export function torch(intensity = 30) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), new THREE.MeshStandardMaterial({ color: '#3a2a1a' })); pole.position.y = 1.2; g.add(pole);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.8, 0.5) })); flame.position.y = 2.55; flame.scale.y = 1.7; g.add(flame);
  const light = new THREE.PointLight(0xff9a40, intensity, 16, 1.6); light.position.y = 2.7; g.add(light);
  g.userData = { flame, light, base: intensity };
  return g;
}
export function flickerTorch(t, tr, seed = 0) { const f = 0.85 + 0.15 * Math.sin(t * 23 + seed) * Math.sin(t * 17.3 + seed * 2); tr.userData.light.intensity = tr.userData.base * f; tr.userData.flame.scale.set(1, 1.7 * f, 1); }

export function stage(progress = 1) {
  // wooden platform that assembles plank by plank (progress 0..1)
  const g = new THREE.Group(); const wood = new THREE.MeshStandardMaterial({ map: woodTex('stage', '#9a6a3a'), roughness: .85 });
  const planks = []; const W = 10, D = 6, n = 14;
  for (let i = 0; i < 4; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), wood); leg.position.set((i % 2 ? 1 : -1) * (W / 2 - 0.3), 0.6, (i < 2 ? 1 : -1) * (D / 2 - 0.3)); g.add(leg); }
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D / n * 0.96), wood); p.position.set(0, 1.26, -D / 2 + (i + 0.5) * D / n); g.add(p); planks.push(p); }
  // bunting
  const cols = ['#c0392b', '#f1c40f', '#2e86c1', '#27ae60'];
  for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 3), new THREE.MeshStandardMaterial({ color: cols[i % 4] })); f.rotation.z = Math.PI; f.position.set(-W / 2 + i * W / 11, 4.2 - Math.sin(i / 11 * Math.PI) * 0.6, -D / 2); g.add(f); }
  for (const x of [-W / 2, W / 2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.4), wood); p.position.set(x, 2.2, -D / 2); g.add(p); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  g.userData.planks = planks;
  g.userData.setProgress = (k) => planks.forEach((p, i) => { const a = clamp(k * n - i); p.visible = a > 0; p.position.y = 1.26 + (1 - easeOut(a)) * 6; p.rotation.z = (1 - easeOut(a)) * 0.6 * (i % 2 ? 1 : -1); });
  g.userData.setProgress(progress);
  return g;
}

// ---------- terrain / mountains ----------
export function terrain({ size = 800, seg = 200, height = 90, seed = 4, flatR = 0, road = null } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; const R = rng(seed); const off = [R() * 100, R() * 100];
  const n2 = (x, z) => Math.sin(x * 0.013 + off[0]) * Math.cos(z * 0.011 + off[1]) * 0.6 + Math.sin(x * 0.031 + z * 0.027) * 0.25 + Math.sin(x * 0.07 - z * 0.06) * 0.08;
  const colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let h = (n2(x, z) * 0.5 + 0.5) * height * clamp(Math.hypot(x, z) / 160);
    if (road) h = road.adjust(x, z, h);
    p.setY(i, h);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), s = nrm.getY(i); const c = new THREE.Color(); if (s < 0.8) c.set('#8a7a68'); else c.set(y > height * 0.75 ? '#e9eef2' : '#5d8a3f').lerp(new THREE.Color('#7da34a'), (Math.sin(i * 1.7) * .5 + .5) * 0.4); colors.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
  m.receiveShadow = true; m.castShadow = true;
  m.userData.heightAt = (x, z) => { const ray = new THREE.Raycaster(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObject(m); return hit.length ? hit[0].point.y : 0; };
  return m;
}
export function pines(count, area, heightAt, seed = 2, avoid = null) {
  const R = rng(seed);
  const cone = new THREE.ConeGeometry(1.6, 5, 7); cone.translate(0, 4.2, 0);
  const cone2 = new THREE.ConeGeometry(1.2, 3.6, 7); cone2.translate(0, 6.4, 0);
  const trunk = new THREE.CylinderGeometry(0.2, 0.25, 2, 6); trunk.translate(0, 1, 0);
  const geo = mergeGeometries([cone, cone2]);
  const leaf = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#2f5a34', roughness: 1, flatShading: true }), count);
  const tr = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: '#4a3324' }), count);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    let x, z; do { x = (R() - .5) * area; z = (R() - .5) * area; } while (avoid && avoid(x, z));
    const s = 0.7 + R() * 0.8; m4.compose(V(x, heightAt(x, z) - 0.2, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), R() * 6), V(s, s * (0.9 + R() * .4), s));
    leaf.setMatrixAt(i, m4); tr.setMatrixAt(i, m4);
  }
  leaf.castShadow = tr.castShadow = true; leaf.receiveShadow = true;
  const g = new THREE.Group(); g.add(leaf, tr); return g;
}

// ---------- particles ----------
export function dust(count = 300, box = [30, 8, 30], color = '#fff2d0', size = 0.06, seed = 3) {
  const R = rng(seed); const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { pos[i * 3] = (R() - .5) * box[0]; pos[i * 3 + 1] = R() * box[1]; pos[i * 3 + 2] = (R() - .5) * box[2]; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.6, depthWrite: false }));
  pts.userData.base = pos.slice(); pts.userData.box = box;
  pts.userData.update = (t, vel = [0.05, 0.12, 0.02]) => { const b = pts.userData.base, a = geo.attributes.position.array; for (let i = 0; i < count; i++) { a[i * 3] = b[i * 3] + Math.sin(t * 0.7 + i) * 0.3 + vel[0] * t; a[i * 3 + 1] = (b[i * 3 + 1] + vel[1] * t * (0.5 + (i % 7) / 7)) % box[1]; a[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.5 + i) * 0.3 + vel[2] * t; } geo.attributes.position.needsUpdate = true; };
  return pts;
}

// camera helper: position along catmull-rom path, looking at target path
export function camPath(points, targets) {
  const p = new THREE.CatmullRomCurve3(points.map(a => V(...a)), false, 'centripetal');
  const t = new THREE.CatmullRomCurve3(targets.map(a => V(...a)), false, 'centripetal');
  return (k, cam) => { cam.position.copy(p.getPoint(clamp(k))); cam.lookAt(t.getPoint(clamp(k))); };
}

// narrow lane: houses on both sides along -z, cathedral spire at the end
export function lane(scene, { seed = 5, length = 70, width = 7 } = {}) {
  const R = rng(seed); const root = new THREE.Group(); scene.add(root);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 0.95, color: '#ffdcb4' }));
  ground.material.map.repeat.set(70, 70); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const houses = [];
  for (const side of [-1, 1]) {
    let z = 12;
    while (z > -length) {
      const w = 4.5 + R() * 2.5, fl = 2 + Math.floor(R() * 2), d = 8;
      const h = house(w, d, fl, Math.floor(R() * 6), { doorX: (R() - .5) * 1.5 });
      h.position.set(side * (width / 2 + d / 2), 0, z - w / 2); h.rotation.y = -side * Math.PI / 2;
      root.add(h); houses.push(h); z -= w + 0.1;
    }
  }
  const cat = cathedral(); cat.position.set(6, 0, -length - 70); cat.rotation.y = 0.15; root.add(cat);
  // far town filler
  for (let i = 0; i < 60; i++) { const h = house(5 + R() * 3, 8, 2 + Math.floor(R() * 3), Math.floor(R() * 6), { door: false }); h.position.set((R() - .5) * 140, 0, -length - 10 - R() * 50); if (Math.abs(h.position.x - 6) < 22 && h.position.z < -length - 40) continue; root.add(h); houses.push(h); }
  return { root, houses, cathedral: cat };
}
