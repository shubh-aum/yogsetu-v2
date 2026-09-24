/* ============================================================
   YogSetu — about-hero3d.js  (ES module, lazy-loaded by about-fx.js)
   The hero's WebGL scene: a "setu" (bridge) — a stone arch whose blocks
   assemble on load, an orbiting sun, two tilted rings with satellites and
   drifting dust. The arch is sized and positioned from the hero photo's DOM
   box so the photo sits inside the arch opening at every screen size.
   Returns { setActive(bool), destroy() } or null when WebGL is unavailable.
   ============================================================ */
import * as THREE from '../vendor/three.module.min.js';

const SAFFRON = 0xe4794c;
const BONE = 0xf1e9dd;
const N = 15;            // blocks in the arch
const R = 1.5;           // arch radius (centre line)
const T = 0.4;           // radial thickness of a block
const D = 0.72;          // depth of a block

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
const easeOutBack = (k) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

function rand(seed) { // deterministic so the assembly looks the same every load
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,190,140,1)');
  grad.addColorStop(0.25, 'rgba(228,121,76,.55)');
  grad.addColorStop(1, 'rgba(228,121,76,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function initHero3D(canvas, stage, opts) {
  const still = !!(opts && opts.still);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const parent = canvas.parentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 10);

  scene.add(new THREE.AmbientLight(0xfff0e0, 0.42));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(3, 4.5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe4794c, 1.6);
  rim.position.set(-5, -1, -3);
  scene.add(rim);
  const warm = new THREE.PointLight(SAFFRON, 22, 14, 1.7);
  warm.position.set(0, 0.2, 1.6);
  scene.add(warm);

  const rig = new THREE.Group();
  scene.add(rig);

  // ---- the arch ----
  const arch = new THREE.Group();
  rig.add(arch);
  const tangential = ((Math.PI * R) / N) * 0.9;
  const boxGeo = new THREE.BoxGeometry(tangential, T, D);
  const keystoneGeo = new THREE.BoxGeometry(tangential * 1.22, T * 1.18, D * 1.08);
  const mats = {
    bone: new THREE.MeshPhysicalMaterial({ color: 0xe6dccd, roughness: 0.5, metalness: 0.05, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    dark: new THREE.MeshPhysicalMaterial({ color: 0x2b2724, roughness: 0.5, metalness: 0.15, clearcoat: 0.4 }),
    saffron: new THREE.MeshPhysicalMaterial({ color: SAFFRON, roughness: 0.38, metalness: 0.1, emissive: 0x7a2c10, emissiveIntensity: 0.55, clearcoat: 0.6 }),
  };
  const blocks = [];
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * (i + 0.5)) / N;
    const isKey = i === (N - 1) / 2;
    const mat = isKey ? mats.saffron : i % 5 === 2 ? mats.dark : mats.bone;
    const mesh = new THREE.Mesh(isKey ? keystoneGeo : boxGeo, mat);
    const rest = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    const restRotZ = a - Math.PI / 2;
    const from = new THREE.Vector3(
      rest.x + (rand(i + 1) - 0.5) * 9,
      rest.y + 2 + rand(i + 20) * 5,
      (rand(i + 40) - 0.2) * 6
    );
    const spin = new THREE.Vector3((rand(i + 60) - 0.5) * 5, (rand(i + 80) - 0.5) * 5, (rand(i + 100) - 0.5) * 3);
    mesh.position.copy(from);
    blocks.push({ mesh, rest, from, spin, restRotZ, delay: 0.2 + i * 0.06 });
    arch.add(mesh);
  }

  // ---- the sun: a saffron orb with a soft additive glow, orbiting the arch ----
  const sunPivot = new THREE.Group();
  sunPivot.rotation.set(1.05, 0.25, 0.1);
  rig.add(sunPivot);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffb27f }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(1.5);
  sun.add(glow);
  sunPivot.add(sun);
  const SUN_R = 2.35;

  // ---- rings + satellites ----
  function ring(radius, color, opacity, rot) {
    const g = new THREE.Group();
    g.rotation.set(rot[0], rot[1], rot[2]);
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.009, 6, 180),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    );
    g.add(m);
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), new THREE.MeshBasicMaterial({ color }));
    g.add(sat);
    rig.add(g);
    return { g, sat, radius };
  }
  const ringA = ring(2.85, BONE, 0.34, [1.3, 0.35, 0]);
  const ringB = ring(3.25, SAFFRON, 0.5, [1.5, -0.5, 0.6]);

  // ---- dust ----
  const COUNT = 170;
  const pos = new Float32Array(COUNT * 3);
  const speed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (rand(i * 3 + 1) - 0.5) * 9;
    pos[i * 3 + 1] = (rand(i * 3 + 2) - 0.5) * 6.5;
    pos[i * 3 + 2] = (rand(i * 3 + 3) - 0.5) * 5;
    speed[i] = 0.25 + rand(i + 500) * 0.75;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffcfae, size: 0.034, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  rig.add(dust);

  // ---- layout: fit the arch around the hero photo ----
  function place() {
    const pr = parent.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    if (!pr.width || !sr.width) return;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    const cx = sr.left - pr.left + sr.width / 2;
    const cy = sr.top - pr.top + sr.width / 2; // centre of the photo's semicircular top
    rig.position.set(((cx / pr.width) * 2 - 1) * halfW, -((cy / pr.height) * 2 - 1) * halfH, 0);
    const worldW = (sr.width / pr.width) * 2 * halfW;
    rig.scale.setScalar(worldW / (2 * (R - T / 2)) / 0.93);
  }
  function resize() {
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    place();
    if (still || !running) draw(reveal);
  }

  // ---- animation ----
  let running = false;
  let raf = 0;
  let last = 0;
  let clock = 0;
  let reveal = still ? 99 : 0;   // seconds since the scene was first shown
  let px = 0, py = 0, tx = 0, ty = 0;

  function onPointer(e) {
    if (e.pointerType === 'touch') return;
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });

  function draw(t) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const k = clamp((t - b.delay) / 1.5, 0, 1);
      const e = easeOutBack(k);
      const settled = easeOutCubic(k);
      b.mesh.position.set(
        b.from.x + (b.rest.x - b.from.x) * e,
        b.from.y + (b.rest.y - b.from.y) * e + (k >= 1 ? Math.sin(clock * 0.9 + i * 0.55) * 0.02 : 0),
        b.from.z + (b.rest.z - b.from.z) * e
      );
      b.mesh.rotation.set(b.spin.x * (1 - settled), b.spin.y * (1 - settled), b.restRotZ + b.spin.z * (1 - settled));
      b.mesh.scale.setScalar(0.55 + 0.45 * clamp(e, 0, 1.15));
    }
    const ang = clock * 0.5;
    sun.position.set(Math.cos(ang) * SUN_R, Math.sin(ang) * SUN_R, 0);
    sun.scale.setScalar(clamp((t - 1.4) / 0.8, 0, 1));
    ringA.sat.position.set(Math.cos(-clock * 0.35) * ringA.radius, Math.sin(-clock * 0.35) * ringA.radius, 0);
    ringB.sat.position.set(Math.cos(clock * 0.28 + 2) * ringB.radius, Math.sin(clock * 0.28 + 2) * ringB.radius, 0);
    ringA.g.rotation.z = clock * 0.06;
    ringB.g.rotation.z = 0.6 - clock * 0.05;
    warm.intensity = 20 + Math.sin(clock * 1.3) * 3;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    rig.rotation.y = px * 0.32 + Math.sin(clock * 0.25) * 0.06;
    rig.rotation.x = -py * 0.16 + Math.cos(clock * 0.2) * 0.03;
    renderer.render(scene, camera);
  }

  function frame(now) {
    if (!running) { raf = 0; return; }
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    clock += dt;
    reveal += dt;
    const p = dustGeo.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      let y = p.getY(i) + dt * 0.05 * speed[i];
      if (y > 3.3) y = -3.3;
      p.setY(i, y);
    }
    p.needsUpdate = true;
    draw(reveal);
    raf = requestAnimationFrame(frame);
  }

  function setActive(on) {
    if (still) { if (on) resize(); return; }
    if (on && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    else if (!on) { running = false; }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(parent);
  ro.observe(stage);
  resize();
  if (still) draw(99);

  return {
    setActive,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      renderer.dispose();
    },
  };
}
