/* =============================================
   RIPPLE — main.js
   Three.js 3D Particle Network + Animations
   ============================================= */

(function () {
  'use strict';

  /* ──────────────────────────────────────────
     HERO PARTICLE NETWORK (Three.js)
     ────────────────────────────────────────── */

  const heroCanvas = document.getElementById('hero-canvas');
  const heroRenderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true });
  heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  heroRenderer.setClearColor(0x000000, 0);

  const heroScene = new THREE.Scene();
  const heroCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  heroCamera.position.set(0, 0, 80);

  // Particle system
  const PARTICLE_COUNT = 1200;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors    = new Float32Array(PARTICLE_COUNT * 3);
  const sizes     = new Float32Array(PARTICLE_COUNT);

  const col1 = new THREE.Color('#00d4ff');
  const col2 = new THREE.Color('#00ff9d');
  const col3 = new THREE.Color('#a78bfa');

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 50 + Math.random() * 40;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const t = Math.random();
    const c = t < 0.4 ? col1 : t < 0.7 ? col2 : col3;
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = Math.random() * 2.5 + 0.5;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.PointsMaterial({
    size: 1.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  heroScene.add(particles);

  // Connecting lines between nearby particles (sparse)
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
  });

  const linePositions = [];
  const MAX_DIST = 22;
  const MAX_LINES = 700;
  let lineCount = 0;
  for (let i = 0; i < PARTICLE_COUNT && lineCount < MAX_LINES; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT && lineCount < MAX_LINES; j++) {
      const dx = positions[i*3]   - positions[j*3];
      const dy = positions[i*3+1] - positions[j*3+1];
      const dz = positions[i*3+2] - positions[j*3+2];
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < MAX_DIST) {
        linePositions.push(
          positions[i*3], positions[i*3+1], positions[i*3+2],
          positions[j*3], positions[j*3+1], positions[j*3+2]
        );
        lineCount++;
      }
    }
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  heroScene.add(lines);

  // Central glowing sphere
  const coreGeo = new THREE.SphereGeometry(4, 32, 32);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 2.0,
    metalness: 0.8,
    roughness: 0.2,
  });
  const coreSphere = new THREE.Mesh(coreGeo, coreMat);
  heroScene.add(coreSphere);

  // Orbit rings
  function makeRing(radius, color, rotX, rotZ) {
    const geo = new THREE.TorusGeometry(radius, 0.15, 4, 64);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = rotX;
    ring.rotation.z = rotZ;
    return ring;
  }

  const rings = [
    makeRing(14, 0x00d4ff, Math.PI / 3,  0.4),
    makeRing(20, 0x00ff9d, 0.8,  Math.PI / 5),
    makeRing(28, 0xa78bfa, Math.PI / 6,  -0.6),
  ];
  rings.forEach(r => heroScene.add(r));

  // Ambient + point lights
  const ambientLight = new THREE.AmbientLight(0x002244, 2);
  heroScene.add(ambientLight);
  const pointLight = new THREE.PointLight(0x00d4ff, 3, 120);
  heroScene.add(pointLight);

  function resizeHero() {
    heroCamera.aspect = window.innerWidth / window.innerHeight;
    heroCamera.updateProjectionMatrix();
    heroRenderer.setSize(window.innerWidth, window.innerHeight);
  }
  resizeHero();
  window.addEventListener('resize', resizeHero);

  // Mouse parallax
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  let heroT = 0;
  function animateHero() {
    requestAnimationFrame(animateHero);
    heroT += 0.004;

    particles.rotation.y =  heroT * 0.08 + mouseX * 0.05;
    particles.rotation.x = -heroT * 0.04 + mouseY * 0.03;
    lines.rotation.y = particles.rotation.y;
    lines.rotation.x = particles.rotation.x;

    rings[0].rotation.y = heroT * 0.5;
    rings[1].rotation.z = heroT * 0.3;
    rings[2].rotation.x = heroT * 0.2;

    coreSphere.scale.setScalar(1 + 0.06 * Math.sin(heroT * 3));
    coreMat.emissiveIntensity = 1.5 + 0.8 * Math.sin(heroT * 2);

    heroCamera.position.x += (mouseX * 4 - heroCamera.position.x) * 0.04;
    heroCamera.position.y += (-mouseY * 3 - heroCamera.position.y) * 0.04;
    heroCamera.lookAt(0, 0, 0);

    heroRenderer.render(heroScene, heroCamera);
  }
  animateHero();

  /* ──────────────────────────────────────────
     ARCHITECTURE 3D (Stacked Layers)
     ────────────────────────────────────────── */

  const archCanvas  = document.getElementById('arch-canvas');
  const archRenderer = new THREE.WebGLRenderer({ canvas: archCanvas, antialias: true, alpha: true });
  archRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  archRenderer.setClearColor(0x000000, 0);

  const archScene  = new THREE.Scene();
  const archCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  archCamera.position.set(0, 22, 60);
  archCamera.lookAt(0, 0, 0);

  archScene.add(new THREE.AmbientLight(0x112233, 3));

  const archColors = [0x00d4ff, 0x00ff9d, 0xff7b1c, 0xa78bfa, 0xffd700];
  const archNames  = ['Graph Engine', 'Simulation', 'Optimization', 'Prediction', 'AI Agents'];
  const LAYER_COUNT = 5;
  const archLayers  = [];

  for (let i = 0; i < LAYER_COUNT; i++) {
    const y = (i - 2) * 7;

    // Platform
    const platGeo = new THREE.BoxGeometry(40 - i * 2, 1.5, 20 - i * 0.5);
    const platMat = new THREE.MeshStandardMaterial({
      color: archColors[i],
      emissive: archColors[i],
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.set(0, y, 0);
    archScene.add(plat);

    // Wireframe overlay
    const wireGeo = new THREE.EdgesGeometry(platGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: archColors[i], transparent: true, opacity: 0.6 });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    wire.position.copy(plat.position);
    archScene.add(wire);

    // Node dots on top
    for (let j = 0; j < 6; j++) {
      const nodeGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const nodeMat = new THREE.MeshBasicMaterial({ color: archColors[i] });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(-15 + j * 6, y + 1.5, 0);
      archScene.add(node);
    }

    // Point light per layer
    const pl = new THREE.PointLight(archColors[i], 1.5, 30);
    pl.position.set(0, y + 4, 5);
    archScene.add(pl);

    archLayers.push({ plat, wire, pl, y, color: archColors[i] });
  }

  // Vertical connectors
  for (let i = 0; i < LAYER_COUNT - 1; i++) {
    const from = archLayers[i].y + 0.75;
    const to   = archLayers[i + 1].y - 0.75;
    const h    = to - from;
    const connGeo = new THREE.CylinderGeometry(0.15, 0.15, h, 8);
    const connMat = new THREE.MeshBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.5 });
    const conn = new THREE.Mesh(connGeo, connMat);
    conn.position.set(0, from + h / 2, 0);
    archScene.add(conn);
  }

  function resizeArch() {
    const container = document.getElementById('arch-scene');
    const w = container.clientWidth;
    const h = container.clientHeight;
    archCamera.aspect = w / h;
    archCamera.updateProjectionMatrix();
    archRenderer.setSize(w, h);
  }
  resizeArch();
  window.addEventListener('resize', resizeArch);

  let archT = 0;
  function animateArch() {
    requestAnimationFrame(animateArch);
    archT += 0.005;

    archCamera.position.x = Math.sin(archT * 0.4) * 15;
    archCamera.position.z = 55 + Math.cos(archT * 0.2) * 8;
    archCamera.position.y = 22 + Math.sin(archT * 0.3) * 4;
    archCamera.lookAt(0, 0, 0);

    archLayers.forEach((l, i) => {
      const pulse = Math.sin(archT * 2 + i * 1.2);
      l.plat.material.emissiveIntensity = 0.2 + 0.2 * pulse;
      l.pl.intensity = 1.2 + 0.6 * pulse;
      l.plat.position.y = l.y + Math.sin(archT + i * 0.8) * 0.3;
      l.wire.position.y = l.plat.position.y;
    });

    archRenderer.render(archScene, archCamera);
  }
  animateArch();

  /* ──────────────────────────────────────────
     FLOW CANVAS (animated packets)
     ────────────────────────────────────────── */

  const flowCanvas = document.getElementById('flow-canvas');
  const flowCtx    = flowCanvas.getContext('2d');
  const packets    = Array.from({ length: 8 }, (_, i) => ({
    x: (i / 8) * flowCanvas.offsetWidth,
    speed: 1.5 + Math.random() * 2,
    size: 3 + Math.random() * 3,
    color: ['#00d4ff', '#00ff9d', '#ff7b1c', '#a78bfa'][i % 4],
  }));

  function resizeFlow() {
    flowCanvas.width  = flowCanvas.offsetWidth;
    flowCanvas.height = flowCanvas.offsetHeight || 120;
    packets.forEach((p, i) => { p.x = (i / 8) * flowCanvas.width; });
  }
  resizeFlow();
  window.addEventListener('resize', resizeFlow);

  function animateFlow() {
    requestAnimationFrame(animateFlow);
    const w = flowCanvas.width, h = flowCanvas.height;
    flowCtx.clearRect(0, 0, w, h);

    // Draw track line
    flowCtx.strokeStyle = 'rgba(0,212,255,0.08)';
    flowCtx.lineWidth = 1;
    flowCtx.beginPath();
    flowCtx.moveTo(0, h / 2);
    flowCtx.lineTo(w, h / 2);
    flowCtx.stroke();

    // Packets
    packets.forEach(p => {
      p.x = (p.x + p.speed) % w;
      const grd = flowCtx.createRadialGradient(p.x, h / 2, 0, p.x, h / 2, p.size * 5);
      grd.addColorStop(0, p.color);
      grd.addColorStop(1, 'transparent');
      flowCtx.beginPath();
      flowCtx.arc(p.x, h / 2, p.size * 5, 0, Math.PI * 2);
      flowCtx.fillStyle = grd;
      flowCtx.globalAlpha = 0.25;
      flowCtx.fill();
      flowCtx.globalAlpha = 1;

      flowCtx.beginPath();
      flowCtx.arc(p.x, h / 2, p.size, 0, Math.PI * 2);
      flowCtx.fillStyle = p.color;
      flowCtx.fill();
    });
  }
  animateFlow();

  /* ──────────────────────────────────────────
     STAT COUNTER ANIMATION
     ────────────────────────────────────────── */

  function animateCounter(el, target) {
    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      el.textContent = Math.floor(ease * target);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }

  const heroObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.stat-num').forEach(el => {
          animateCounter(el, parseInt(el.dataset.target));
        });
        heroObs.disconnect();
      }
    });
  }, { threshold: 0.4 });
  heroObs.observe(document.querySelector('.hero-stats'));

  /* ──────────────────────────────────────────
     INTERSECTION OBSERVER — Card Progress Bars
     ────────────────────────────────────────── */

  const cardObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.layer-card').forEach(c => cardObs.observe(c));

  /* ──────────────────────────────────────────
     INTERSECTION OBSERVER — Flow Steps
     ────────────────────────────────────────── */

  const flowObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const steps = document.querySelectorAll('.flow-step');
        steps.forEach((s, i) => {
          setTimeout(() => s.classList.add('visible'), i * 150);
        });
        flowObs.disconnect();
      }
    });
  }, { threshold: 0.2 });

  const flowSection = document.getElementById('flow');
  if (flowSection) flowObs.observe(flowSection);

  /* ──────────────────────────────────────────
     NAV SCROLL EFFECT
     ────────────────────────────────────────── */

  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 50
      ? 'rgba(3,5,13,0.95)'
      : 'rgba(3,5,13,0.7)';
  });

  /* ──────────────────────────────────────────
     SMOOTH HERO SCROLL
     ────────────────────────────────────────── */

  document.querySelector('.hero-scroll').addEventListener('click', () => {
    document.getElementById('architecture').scrollIntoView({ behavior: 'smooth' });
  });

  /* ──────────────────────────────────────────
     ARCH LABEL HOVER HIGHLIGHT
     ────────────────────────────────────────── */

  document.querySelectorAll('.arch-label').forEach(label => {
    const idx = parseInt(label.dataset.layer) - 1;
    label.addEventListener('mouseenter', () => {
      archLayers.forEach((l, i) => {
        l.plat.material.opacity = i === idx ? 1.0 : 0.4;
        l.plat.material.emissiveIntensity = i === idx ? 0.8 : 0.1;
      });
    });
    label.addEventListener('mouseleave', () => {
      archLayers.forEach(l => {
        l.plat.material.opacity = 0.85;
        l.plat.material.emissiveIntensity = 0.3;
      });
    });
  });

})();
