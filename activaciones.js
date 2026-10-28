// XII Activaciones — animaciones básicas por estadio (A-Frame + MindAR)
// El target mide 1 de ancho: x,y en el plano de la imagen, z sale hacia el espectador.
(function () {
  const T = AFRAME.THREE;
  const TAU = Math.PI * 2;
  let SPR = null;

  function sprite() {
    if (SPR) return SPR;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.8)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    SPR = new T.CanvasTexture(c); return SPR;
  }

  // Nube de puntos aditiva: el brillo de cada punto se controla con su color (negro = invisible)
  function pts(root, n, size) {
    const g = new T.BufferGeometry();
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    g.setAttribute('position', new T.BufferAttribute(p, 3));
    g.setAttribute('color', new T.BufferAttribute(c, 3));
    const m = new T.PointsMaterial({ size, map: sprite(), transparent: true, depthWrite: false,
      blending: T.AdditiveBlending, vertexColors: true, sizeAttenuation: true });
    const o = new T.Points(g, m); o.frustumCulled = false; root.add(o);
    return { n, p, c, g, o,
      set(i, x, y, z) { p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; },
      col(i, col, k) { c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; },
      done() { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; } };
  }

  function lines(root, nSeg) {
    const g = new T.BufferGeometry();
    const p = new Float32Array(nSeg * 6), c = new Float32Array(nSeg * 6);
    g.setAttribute('position', new T.BufferAttribute(p, 3));
    g.setAttribute('color', new T.BufferAttribute(c, 3));
    const m = new T.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const o = new T.LineSegments(g, m); o.frustumCulled = false; root.add(o);
    return { p, c, g, o, done() { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; } };
  }

  const C = (h) => new T.Color(h);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const disc = (r) => { const a = rnd(0, TAU), q = r * Math.sqrt(Math.random()); return [q * Math.cos(a), q * Math.sin(a)]; };
  const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);

  // Pirámide invertida (Lux Cordis) en alambre luminoso + puntos en las aristas
  function piramide(root, color, s) {
    const g = new T.Group(); root.add(g);
    const h = s * 1.1, b = [[-s, -s], [s, -s], [s, s], [-s, s]];
    const v = []; const apex = [0, 0, -h / 2]; const top = b.map(([x, y]) => [x, y, h / 2]);
    for (let i = 0; i < 4; i++) { v.push(top[i], top[(i + 1) % 4], top[i], apex); }
    const L = lines(g, v.length / 2);
    v.forEach((q, i) => { L.p.set(q, i * 3); L.c.set([color.r, color.g, color.b], i * 3); }); L.done();
    const E = pts(g, 160, 0.035);
    for (let i = 0; i < 160; i++) {
      const k = i % 8, u = (i >> 3) / 20, a = v[k * 2 - (k * 2) % 2], bb = v[k * 2 + 1];
      E.set(i, a[0] + (bb[0] - a[0]) * u, a[1] + (bb[1] - a[1]) * u, a[2] + (bb[2] - a[2]) * u); E.col(i, color, 0.7);
    }
    E.done(); return g;
  }

  const TIPOS = [
    // I · Esencia luminosa — red de nodos rojos que germina, florece y se disuelve
    (root) => {
      const col = C('#ff2a2a'), N = 70, nodes = [];
      for (let i = 0; i < N; i++) { const [x, y] = disc(0.44); nodes.push({ x, y, z: rnd(0.01, 0.12), ph: Math.random() }); }
      const pairs = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j]; if (Math.hypot(a.x - b.x, a.y - b.y) < 0.14) pairs.push([i, j]);
      }
      const P = pts(root, N, 0.05), L = lines(root, pairs.length);
      return (t) => {
        const k = nodes.map((n) => { const l = (t * 0.25 + n.ph) % 1; return Math.sin(Math.PI * l) ** 2; });
        nodes.forEach((n, i) => { P.set(i, n.x, n.y, n.z + 0.02 * Math.sin(t + i)); P.col(i, col, k[i]); });
        pairs.forEach(([i, j], s) => {
          const a = nodes[i], b = nodes[j], kk = Math.min(k[i], k[j]) * 0.8;
          L.p.set([a.x, a.y, a.z + 0.02 * Math.sin(t + i), b.x, b.y, b.z + 0.02 * Math.sin(t + j)], s * 6);
          L.c.set([col.r * kk, col.g * kk, col.b * kk, col.r * kk, col.g * kk, col.b * kk], s * 6);
        });
        P.done(); L.done();
      };
    },
    // II · Vestigio de Dios — aurora boreal sobre un mar quieto
    (root) => {
      const NX = 90, NH = 14, CUR = 3, P = pts(root, NX * NH * CUR, 0.03), sea = pts(root, 400, 0.015);
      const verde = C('#2bffb0'), azul = C('#3a5bff'), cian = C('#5fd8ff');
      const seaP = Array.from({ length: 400 }, () => disc(0.46));
      return (t) => {
        let i = 0;
        for (let c = 0; c < CUR; c++) for (let a = 0; a < NX; a++) for (let h = 0; h < NH; h++) {
          const x = -0.45 + 0.9 * a / (NX - 1), u = h / (NH - 1);
          const y = -0.1 + c * 0.12 + 0.06 * Math.sin(3 * x + t * 0.7 + c * 2) + 0.03 * Math.sin(9 * x - t * 1.1);
          const k = (0.5 + 0.5 * Math.sin(5 * x - t * 1.2 + c)) * (1 - u) * ease(t * 0.4 - c * 0.3);
          P.set(i, x, y, 0.03 + u * 0.4); P.col(i, verde.clone().lerp(azul, u), k * 0.55); i++;
        }
        seaP.forEach(([x, y], j) => { sea.set(j, x, y, 0.005); sea.col(j, cian, 0.25 + 0.25 * Math.sin(t * 2 + j)); });
        P.done(); sea.done();
      };
    },
    // III · Naturaleza divina — rayo vertical que atraviesa el agua, anillos y partículas líquidas
    (root) => {
      const col = C('#4fc3ff'), blanco = C('#e8f8ff');
      const RAY = 300, BUB = 220, RING = 4 * 120;
      const R = pts(root, RAY, 0.025), B = pts(root, BUB, 0.02), A = pts(root, RING, 0.02);
      const ray = Array.from({ length: RAY }, () => ({ a: rnd(0, TAU), r: rnd(0, 0.045), z: rnd(0, 0.7), v: rnd(0.15, 0.35) }));
      const bub = Array.from({ length: BUB }, () => { const [x, y] = disc(0.42); return { x, y, z: rnd(0, 0.3), v: rnd(0.02, 0.06) }; });
      return (t, dt) => {
        ray.forEach((p, i) => { p.z -= p.v * dt; if (p.z < 0) p.z = 0.7; R.set(i, p.r * Math.cos(p.a + t), p.r * Math.sin(p.a + t), p.z); R.col(i, blanco, 0.4 + 0.6 * (1 - p.z / 0.7)); });
        bub.forEach((p, i) => { p.z += p.v * dt; if (p.z > 0.3) p.z = 0; B.set(i, p.x, p.y, p.z); B.col(i, col, Math.sin(Math.PI * p.z / 0.3) * 0.7); });
        for (let k = 0; k < 4; k++) {
          const f = (t * 0.18 + k / 4) % 1, r = f * 0.47;
          for (let j = 0; j < 120; j++) { const a = TAU * j / 120; A.set(k * 120 + j, r * Math.cos(a), r * Math.sin(a), 0.004); A.col(k * 120 + j, col, 1 - f); }
        }
        R.done(); B.done(); A.done();
      };
    },
    // IV · Alimento espiritual — esfera de luz que florece como trigo
    (root) => {
      const S = 420, ST = 26, G = 14, esf = pts(root, S, 0.022), trigo = pts(root, ST * G, 0.022);
      const blanco = C('#f4f7ff'), oro = C('#d8e48a');
      const sp = Array.from({ length: S }, (_, i) => { const y = 1 - 2 * (i + 0.5) / S, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [r * Math.cos(a), y, r * Math.sin(a)]; });
      return (t) => {
        const zc = 0.22 + 0.025 * Math.sin(t * 0.9), rot = t * 0.3, R = 0.11 * ease(t * 0.5);
        sp.forEach(([x, y, z], i) => {
          const xr = x * Math.cos(rot) - z * Math.sin(rot), zr = x * Math.sin(rot) + z * Math.cos(rot);
          esf.set(i, xr * R, y * R, zc + zr * R); esf.col(i, blanco, 0.5 + 0.4 * zr);
        });
        const grow = 0.5 + 0.5 * Math.sin(t * 0.5 - Math.PI / 2);
        for (let s = 0; s < ST; s++) {
          const a = TAU * s / ST + 0.05 * Math.sin(t + s);
          for (let g = 0; g < G; g++) {
            const u = g / (G - 1), r = 0.14 + u * 0.3 * grow, side = g % 2 ? 0.018 : -0.018;
            trigo.set(s * G + g, r * Math.cos(a) - side * Math.sin(a), r * Math.sin(a) + side * Math.cos(a), 0.01 + 0.08 * u * grow);
            trigo.col(s * G + g, oro, (1 - u * 0.6) * grow);
          }
        }
        esf.done(); trigo.done();
      };
    },
    // V · Señales del cielo — fuego que asciende y triángulo de luz
    (root) => {
      const N = 700, F = pts(root, N, 0.04);
      const amar = C('#ffd27a'), nar = C('#ff6a1a'), rojo = C('#c3121a');
      const fl = Array.from({ length: N }, () => { const [x, y] = disc(0.28); return { x, y, l: Math.random(), v: rnd(0.25, 0.5), ph: rnd(0, TAU) }; });
      const tri = piramide(root, C('#ff3a1a'), 0.13); tri.position.z = 0.32; tri.rotation.x = 0;
      return (t, dt) => {
        fl.forEach((p, i) => {
          p.l += p.v * dt; if (p.l > 1) { p.l = 0; [p.x, p.y] = disc(0.28); }
          const s = 1 - p.l * 0.8, z = p.l * 0.55;
          const c = p.l < 0.4 ? amar.clone().lerp(nar, p.l / 0.4) : nar.clone().lerp(rojo, (p.l - 0.4) / 0.6);
          F.set(i, p.x * s + 0.03 * Math.sin(t * 3 + p.ph), p.y * s, z); F.col(i, c, (1 - p.l) * 0.6);
        });
        tri.rotation.z = t * 0.4; tri.scale.setScalar(ease(t * 0.4));
        F.done();
      };
    },
    // VI · Caminante de la niebla — bruma que se expande y borra referencias
    (root) => {
      const N = 520, F = pts(root, N, 0.16), D = pts(root, 120, 0.02);
      const azul = C('#7c95c8'), blanco = C('#dfe8ff');
      const fog = Array.from({ length: N }, () => { const [x, y] = disc(0.2); return { x, y, z: rnd(0, 0.25), vx: rnd(-1, 1), vy: rnd(-1, 1), ph: rnd(0, TAU) }; });
      const dots = Array.from({ length: 120 }, () => [...disc(0.45), rnd(0.02, 0.3)]);
      return (t) => {
        const spread = 0.2 + 0.28 * ease(t * 0.15);
        fog.forEach((p, i) => {
          const x = p.x * spread / 0.2 + 0.05 * Math.sin(t * 0.3 + p.ph) + p.vx * 0.02 * Math.sin(t * 0.2);
          const y = p.y * spread / 0.2 + 0.05 * Math.cos(t * 0.25 + p.ph);
          F.set(i, x, y, p.z); F.col(i, azul, 0.07 + 0.05 * Math.sin(t * 0.5 + p.ph));
        });
        dots.forEach(([x, y, z], i) => { D.set(i, x, y, z); D.col(i, blanco, 0.5 * Math.max(0, Math.sin(t * 0.7 + i))); });
        F.done(); D.done();
      };
    },
    // VII · Sostén del sufrimiento — campo microscópico: células que laten y un núcleo de luz
    (root) => {
      const NC = 34, SEG = 28, CEL = pts(root, NC * SEG, 0.016), BUR = pts(root, 360, 0.022), oro = C('#ffc94a'), ambar = C('#ff9d2a');
      const cells = Array.from({ length: NC }, () => { const [x, y] = disc(0.42); return { x, y, z: rnd(0.01, 0.1), r: rnd(0.02, 0.055), ph: rnd(0, TAU), vx: rnd(-0.01, 0.01), vy: rnd(-0.01, 0.01) }; });
      const burst = Array.from({ length: 360 }, () => ({ a: rnd(0, TAU), b: rnd(-0.6, 0.6), l: Math.random(), v: rnd(0.15, 0.4) }));
      return (t, dt) => {
        cells.forEach((c, k) => {
          const r = c.r * (1 + 0.15 * Math.sin(t * 1.5 + c.ph)), cx = c.x + c.vx * Math.sin(t * 0.3), cy = c.y + c.vy * Math.cos(t * 0.3);
          for (let j = 0; j < SEG; j++) { const a = TAU * j / SEG; CEL.set(k * SEG + j, cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.85, c.z); CEL.col(k * SEG + j, oro, 0.35); }
        });
        burst.forEach((p, i) => {
          p.l += p.v * dt; if (p.l > 1) p.l = 0; const r = p.l * 0.25;
          BUR.set(i, r * Math.cos(p.a), r * Math.sin(p.a), 0.12 + r * p.b * 0.4); BUR.col(i, ambar, (1 - p.l) * 0.9);
        });
        CEL.done(); BUR.done();
      };
    },
    // VIII · Frontera infinita — la imagen se desprende en bruma y se pierde
    (root) => {
      const G = 34, N = G * G, P = pts(root, N, 0.02), gris = C('#d6dde8');
      const base = [];
      for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) {
        const x = -0.45 + 0.9 * a / (G - 1), y = -0.45 + 0.9 * b / (G - 1);
        base.push({ x, y, ok: x * x + y * y < 0.2, dx: rnd(-1, 1), dy: rnd(-1, 1), d: rnd(0, 0.25) });
      }
      return (t) => {
        const cyc = (t % 14) / 14;
        base.forEach((p, i) => {
          if (!p.ok) { P.set(i, 0, 0, -9); P.col(i, gris, 0); return; }
          const f = ease((cyc * 1.6 - (p.y + 0.45) / 0.9 * 0.8 - p.d) * 2);
          P.set(i, p.x + p.dx * 0.15 * f, p.y + p.dy * 0.1 * f + 0.2 * f, 0.005 + 0.45 * f);
          P.col(i, gris, (1 - f) * 0.8);
        });
        P.done();
      };
    },
    // IX · No yo, sino Dios — la pirámide roja se eleva y las voces suben hacia ella
    (root) => {
      const pir = piramide(root, C('#ff2626'), 0.12), N = 300, V = pts(root, N, 0.022), rojo = C('#ff5a5a');
      const vs = Array.from({ length: N }, () => ({ a: rnd(0, TAU), l: Math.random(), v: rnd(0.08, 0.18) }));
      return (t, dt) => {
        const up = ease(t * 0.3); pir.position.z = 0.05 + 0.3 * up; pir.rotation.z = t * 0.35; pir.scale.setScalar(0.4 + 0.6 * up);
        vs.forEach((p, i) => {
          p.l += p.v * dt; if (p.l > 1) p.l = 0;
          const r = 0.45 * (1 - p.l), a = p.a + p.l * 3;
          V.set(i, r * Math.cos(a), r * Math.sin(a), p.l * (0.05 + 0.3 * up)); V.col(i, rojo, Math.sin(Math.PI * p.l) * 0.8);
        });
        V.done();
      };
    },
    // X · Co-eternidad — brasas cálidas en espiral y anillos que envuelven
    (root) => {
      const N = 520, E = pts(root, N, 0.03), RG = pts(root, 3 * 140, 0.015), oro = C('#ffb347'), crema = C('#ffe2a8');
      const em = Array.from({ length: N }, () => ({ a: rnd(0, TAU), l: Math.random(), v: rnd(0.05, 0.12), r0: rnd(0.02, 0.2) }));
      return (t, dt) => {
        em.forEach((p, i) => {
          p.l += p.v * dt; if (p.l > 1) p.l = 0;
          const a = p.a + p.l * 8, r = p.r0 + p.l * 0.15;
          E.set(i, r * Math.cos(a), r * Math.sin(a), p.l * 0.55); E.col(i, oro, Math.sin(Math.PI * p.l) * 0.7);
        });
        for (let k = 0; k < 3; k++) for (let j = 0; j < 140; j++) {
          const r = 0.22 + k * 0.08, a = TAU * j / 140 + t * (0.1 + k * 0.05) * (k % 2 ? -1 : 1);
          RG.set(k * 140 + j, r * Math.cos(a), r * Math.sin(a), 0.006); RG.col(k * 140 + j, crema, 0.35 * (0.6 + 0.4 * Math.sin(a * 3 + t)));
        }
        E.done(); RG.done();
      };
    },
    // XI · Sonreír en la tormenta — un río de almas que no se detiene
    (root) => {
      const N = 900, P = pts(root, N, 0.025), azul = C('#3fa9ff'), calido = C('#ffa040');
      const path = (u) => [-0.42 + 0.84 * u, -0.38 + 0.76 * u + 0.12 * Math.sin(u * 5), 0.03 + 0.08 * Math.sin(u * Math.PI)];
      const ps = Array.from({ length: N }, () => ({ u: Math.random(), w: rnd(-1, 1), h: rnd(-1, 1), v: rnd(0.05, 0.1), warm: Math.random() < 0.18 }));
      return (t, dt) => {
        ps.forEach((p, i) => {
          p.u += p.v * dt; if (p.u > 1) p.u = 0;
          const [x, y, z] = path(p.u), [x2, y2] = path(Math.min(1, p.u + 0.01));
          const nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1, w = 0.06 * p.w * (1 + 0.3 * Math.sin(t + p.u * 9));
          P.set(i, x + nx / nl * w, y + ny / nl * w, z + 0.03 * p.h);
          P.col(i, p.warm ? calido : azul, (p.warm ? 0.9 : 0.55) * Math.sin(Math.PI * p.u));
        });
        P.done();
      };
    },
    // XII · Océano interior — océano de reflejos rojos bajo la pirámide de luz
    (root) => {
      const G = 46, W = pts(root, G * G, 0.018), rojo = C('#ff3344'), rosa = C('#ffb0b8');
      const pir = piramide(root, C('#ff2a3a'), 0.1); pir.position.z = 0.3;
      return (t) => {
        let i = 0;
        for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) {
          const x = -0.46 + 0.92 * a / (G - 1), y = -0.46 + 0.92 * b / (G - 1), r = Math.hypot(x, y);
          if (r > 0.47) { W.set(i, 0, 0, -9); W.col(i, rojo, 0); i++; continue; }
          const z = 0.02 + 0.025 * Math.sin(r * 22 - t * 1.6) + 0.012 * Math.sin(x * 15 + t);
          W.set(i, x, y, z); W.col(i, rojo.clone().lerp(rosa, Math.max(0, z - 0.03) * 20), 0.25 + z * 6); i++;
        }
        pir.rotation.z = t * 0.3; pir.position.z = 0.3 + 0.02 * Math.sin(t);
        W.done();
      };
    },
  ];

  AFRAME.registerComponent('activacion', {
    schema: { tipo: { type: 'int', default: 1 } },
    init() {
      this.root = new T.Group(); this.el.setObject3D('activacion', this.root);
      this.anim = TIPOS[(this.data.tipo - 1) % 12](this.root);
      this.t = 0;
      // MindAR escala el mundo: el tamaño de los puntos se corrige con la escala real del trigger
      this.mats = []; this.root.traverse((o) => { if (o.isPoints) this.mats.push([o.material, o.material.size]); });
      this.ws = new T.Vector3();
      // reinicia la animación cada vez que se encuentra el trigger
      if (this.el.parentEl) this.el.parentEl.addEventListener('targetFound', () => { this.t = 0; });
    },
    tick(_, dtms) {
      // solo se calcula cuando su trigger está a la vista
      const p = this.el.parentEl && this.el.parentEl.object3D;
      if (p && !p.visible) return;
      const dt = Math.min(0.05, (dtms || 16) / 1000); this.t += dt;
      this.root.getWorldScale(this.ws);
      for (const [m, base] of this.mats) m.size = base * this.ws.x;
      this.anim(this.t, dt);
    },
  });
})();
