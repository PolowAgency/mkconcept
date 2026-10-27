/* ==========================================================================
   MK Concept — le salon en miniature (Three.js r128, caméra orthographique)

   Une maison de poupée : quatre murs, dont les deux qui font face à la caméra
   s'abaissent pour laisser voir l'intérieur. Quatre angles de vue, un par
   coin du salon : le barbier, la coiffure, la couleur, l'entrée.

   La scène ne gère ni la souris ni le doigt : elle expose setTheta() et
   l'interaction (ressorts, inertie) vit dans main.js.
   ========================================================================== */

export const VIEWS = [
  { id: "barbier",  name: "Barbier",  theta: Math.PI * 0.25, anchor: [-3.6, 7.2, -5.2] },
  { id: "coiffure", name: "Coiffure", theta: Math.PI * 0.75, anchor: [-3.6, 5.6, 5.9] },
  { id: "entree",   name: "Entrée",   theta: Math.PI * 1.25, anchor: [6.2, 5.6, 4.4] },
  { id: "couleur",  name: "Couleur",  theta: Math.PI * 1.75, anchor: [5.6, 4.0, -3.6] },
];

export function createSalon(THREE, canvas, opts = {}) {
  const T = THREE;
  const W = 7;      // demi-côté de la pièce
  const H = 7.5;    // hauteur des murs
  const WT = 0.55;  // épaisseur des murs
  const ELEV = 0.56; // élévation de la caméra, en radians (≈ 32°)

  /* ---------- rendu ---------- */
  const renderer = new T.WebGLRenderer({
    canvas, antialias: true, alpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: !!opts.preserve,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure || 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x000000, 0);

  const scene = new T.Scene();
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, -200, 400);
  const size = { w: 1, h: 1 };

  /* ---------- utilitaires ---------- */
  const C = (hex) => new T.Color(hex).convertSRGBToLinear();
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const canvasTex = (w, h, draw, repeat = [1, 1]) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 4;
    return t;
  };
  const mat = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o, { color: C(color) }));
  const emissive = (color, k = 1) => new T.MeshStandardMaterial({ color: C(0x000000), emissive: C(color), emissiveIntensity: k, roughness: 1 });

  const shadowy = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
  const box = (w, h, d, material, x, y, z, parent, o = {}) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    m.position.set(x, y + h / 2, z);
    shadowy(m, o.cast !== false, o.recv !== false);
    parent.add(m);
    return m;
  };
  const cyl = (rt, rb, h, seg, material, x, y, z, parent, o = {}) => {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), material);
    m.position.set(x, y + h / 2, z);
    shadowy(m, o.cast !== false, o.recv !== false);
    parent.add(m);
    return m;
  };
  const group = (parent, x = 0, y = 0, z = 0, ry = 0) => {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    parent.add(g);
    return g;
  };

  /* ---------- matières ---------- */
  const chrome = mat(0xd8d2c6, { metalness: 0.95, roughness: 0.22 });
  const brass = mat(0xc6a15b, { metalness: 0.85, roughness: 0.32 });
  const leather = (color = 0x74401f) => mat(color, { roughness: 0.5, metalness: 0.05 });
  const green = mat(0x1f4437, { roughness: 0.5, metalness: 0.25 });
  const walnut = canvasTex(256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = "#4b3022"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${20 + r() * 30},${12 + r() * 16},${6 + r() * 10},${0.25 + r() * 0.35})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath(); const x = r() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 10 * r(), h * 0.3, x - 12 * r(), h * 0.6, x + 4 * r(), h); g.stroke();
    }
  });
  const woodMat = (tint = 0xffffff, rep = [1, 1]) => {
    const m = mat(tint, { map: walnut, roughness: 0.62 });
    m.map = walnut.clone(); m.map.needsUpdate = true; m.map.repeat.set(rep[0], rep[1]);
    return m;
  };

  const brickTex = canvasTex(512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#a8957f"; g.fillRect(0, 0, w, h);
    const rows = 10, cols = 4, bh = h / rows, bw = w / cols, gap = 6;
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh;
      const k = 128 + r() * 46;
      g.fillStyle = `rgb(${k | 0},${(k * 0.45 + r() * 14) | 0},${(k * 0.34 + r() * 10) | 0})`;
      g.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
      for (let s = 0; s < 26; s++) {
        g.fillStyle = `rgba(${r() > 0.5 ? "255,225,200" : "40,18,10"},${0.05 + r() * 0.1})`;
        g.fillRect(x + gap + r() * (bw - gap * 2), y + gap + r() * (bh - gap * 2), 2 + r() * 5, 2 + r() * 3);
      }
    }
  }, [2.4, 1.15]);

  const tileTex = canvasTex(256, 256, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#c9b199"; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n, gap = 4;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = 150 + r() * 24;
      g.fillStyle = `rgb(${k | 0},${(k * 0.58) | 0},${(k * 0.4) | 0})`;
      g.fillRect(i * s + gap / 2, j * s + gap / 2, s - gap, s - gap);
      g.fillStyle = `rgba(255,235,210,${0.04 + r() * 0.07})`;
      g.fillRect(i * s + gap / 2, j * s + gap / 2, s - gap, (s - gap) * 0.45);
    }
  }, [W * 2 / 3.6, W * 2 / 3.6]);

  const plasterTex = (hex, seed) => canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "255,240,220" : "0,0,0"},${0.012 + r() * 0.03})`;
      g.fillRect(r() * w, r() * h, 2 + r() * 8, 2 + r() * 8);
    }
  }, [3, 2]);

  /* ---------- éclairage ---------- */
  scene.add(new T.HemisphereLight(C(0xffe4c8), C(0x3a2a20), 0.85));
  const key = new T.DirectionalLight(C(0xffdcb4), 0.95);
  key.castShadow = true;
  const sm = opts.shadowSize || 2048;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 90 });
  key.shadow.bias = -0.0006;
  key.shadow.radius = 4;
  key.shadow.camera.updateProjectionMatrix();
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);

  const lamps = [];
  const pointLight = (x, y, z, color, intensity, dist) => {
    const l = new T.PointLight(C(color), intensity, dist, 2);
    l.position.set(x, y, z);
    scene.add(l);
    lamps.push({ l, base: intensity });
    return l;
  };

  /* ---------- socle et sol ---------- */
  const room = new T.Group();
  scene.add(room);

  const slabMat = mat(0x2a2019, { roughness: 0.9 });
  box(W * 2 + WT * 2, 0.9, W * 2 + WT * 2, slabMat, 0, -0.9, 0, room, { cast: false });
  const floor = new T.Mesh(new T.PlaneGeometry(W * 2, W * 2), mat(0xffffff, { map: tileTex, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // ombre portée au sol, hors du socle
  const ground = new T.Mesh(
    new T.PlaneGeometry(27, 27),
    new T.MeshBasicMaterial({
      transparent: true, depthWrite: false,
      map: canvasTex(256, 256, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
        gr.addColorStop(0, "rgba(0,0,0,0.5)"); gr.addColorStop(0.5, "rgba(0,0,0,0.2)"); gr.addColorStop(0.95, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }),
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.95;
  scene.add(ground);

  /* ---------- murs ---------- */
  const walls = {};
  function makeWall(id, px, pz, ry, nx, nz, faceMat) {
    const g = new T.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = ry;
    room.add(g);
    // repère local : +x le long du mur, +z vers l'intérieur de la pièce
    const body = new T.Mesh(new T.BoxGeometry(W * 2 + WT * 2, H, WT), faceMat);
    body.position.set(0, H / 2, -WT / 2);
    body.receiveShadow = true;
    g.add(body);
    // tranche supérieure en laiton fin
    box(W * 2 + WT * 2, 0.12, WT + 0.04, brass, 0, H, -WT / 2, g, { cast: false });
    const dec = new T.Group();
    g.add(dec);
    walls[id] = { g, dec, nx, nz };
    return dec;
  }
  const plasterDark = mat(0xffffff, { map: plasterTex("#3b322b", 21), roughness: 0.95 });
  const plasterGreen = mat(0xffffff, { map: plasterTex("#2a443a", 22), roughness: 0.95 });
  const brickMat = mat(0xffffff, { map: brickTex, roughness: 0.92 });

  const wallN = makeWall("n", 0, -W, 0, 0, -1, plasterDark);       // mur nord  (z = -W)
  const wallS = makeWall("s", 0, W, Math.PI, 0, 1, plasterGreen);  // mur sud   (z = +W)
  const wallW = makeWall("w", -W, 0, Math.PI / 2, -1, 0, brickMat);// mur ouest (x = -W)
  const wallE = makeWall("e", W, 0, -Math.PI / 2, 1, 0, plasterDark); // mur est (x = +W)

  /* lambris bois en bas des murs nord et est */
  for (const w of [wallN, wallE]) box(W * 2, 2.6, 0.18, woodMat(0xffffff, [4, 1]), 0, 0, 0.09, w, { cast: false });
  for (const w of [wallN, wallE]) box(W * 2, 0.14, 0.26, brass, 0, 2.6, 0.13, w, { cast: false });
  // plinthe sur tous les murs
  for (const w of [wallS, wallW]) box(W * 2, 0.5, 0.14, mat(0x1d1713), 0, 0, 0.07, w, { cast: false });

  /* ---------- objets de décor ---------- */
  const glassMat = (c = 0x2b2420) => new T.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.12 });
  const mirrorTex = canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#4a3d33"); gr.addColorStop(0.45, "#7a6652"); gr.addColorStop(0.5, "#a28a6c"); gr.addColorStop(0.58, "#5c4b3c"); gr.addColorStop(1, "#2c241e");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const mirrorGlass = new T.MeshStandardMaterial({ map: mirrorTex, metalness: 0.6, roughness: 0.18, emissive: C(0x2a1c10), emissiveIntensity: 0.55 });

  /* miroir rectangulaire (barbier) */
  function rectMirror(parent, x, y, w, h) {
    const g = group(parent, x, y, 0);
    box(w + 0.5, h + 0.5, 0.22, woodMat(0xffffff), 0, 0, 0.11, g, { cast: false });
    const gl = new T.Mesh(new T.PlaneGeometry(w, h), mirrorGlass);
    gl.position.set(0, h / 2 + 0.25, 0.235);
    g.add(gl);
    box(w + 0.56, 0.08, 0.26, brass, 0, h + 0.5, 0.13, g, { cast: false });
    return g;
  }

  /* miroir en arche (coiffure) */
  function archMirror(parent, x, y, w, h) {
    const r = w / 2;
    const outer = new T.Shape();
    outer.moveTo(-r - 0.28, 0); outer.lineTo(-r - 0.28, h - r); outer.absarc(0, h - r, r + 0.28, Math.PI, 0, true); outer.lineTo(r + 0.28, 0); outer.lineTo(-r - 0.28, 0);
    const hole = new T.Path();
    hole.moveTo(-r, 0.28); hole.lineTo(-r, h - r); hole.absarc(0, h - r, r, Math.PI, 0, true); hole.lineTo(r, 0.28); hole.lineTo(-r, 0.28);
    outer.holes.push(hole);
    const frame = new T.Mesh(new T.ExtrudeGeometry(outer, { depth: 0.24, bevelEnabled: false }), brass);
    frame.position.set(x, y, 0.02);
    parent.add(frame);
    const inner = new T.Shape();
    inner.moveTo(-r, 0.28); inner.lineTo(-r, h - r); inner.absarc(0, h - r, r, Math.PI, 0, true); inner.lineTo(r, 0.28); inner.lineTo(-r, 0.28);
    const gl = new T.Mesh(new T.ShapeGeometry(inner, 24), mirrorGlass);
    gl.position.set(x, y, 0.2);
    parent.add(gl);
  }

  /* étagère garnie */
  function shelf(parent, x, y, len, items, seed) {
    const r = rng(seed);
    const g = group(parent, x, y, 0);
    box(len, 0.2, 0.9, woodMat(0xffffff), 0, 0, 0.45, g);
    box(0.18, 0.5, 0.5, brass, -len / 2 + 0.5, -0.5, 0.3, g, { cast: false });
    box(0.18, 0.5, 0.5, brass, len / 2 - 0.5, -0.5, 0.3, g, { cast: false });
    const cols = [0xc88a3c, 0xe8e1d2, 0x2f5a47, 0x7a3a2a, 0xb9b2a3, 0x3a4350, 0xc6a15b];
    let px = -len / 2 + 0.55;
    while (px < len / 2 - 0.5) {
      const kind = r();
      const col = cols[(r() * cols.length) | 0];
      const hh = 0.7 + r() * 1.0;
      if (kind < 0.55) cyl(0.2 + r() * 0.12, 0.2 + r() * 0.12, hh, 14, mat(col, { roughness: 0.3, metalness: 0.1 }), px, 0.2, 0.5, g);
      else if (kind < 0.8) box(0.45, hh * 0.8, 0.4, mat(col, { roughness: 0.6 }), px, 0.2, 0.5, g);
      else cyl(0.28, 0.32, 0.5, 14, mat(0xefe7d8, { roughness: 0.7 }), px, 0.2, 0.5, g);
      px += 0.62 + r() * 0.35;
    }
    return g;
  }

  /* tableau abstrait */
  function painting(parent, x, y, w, h, seed) {
    const tex = canvasTex(128, 128, (g, cw, ch) => {
      const r = rng(seed);
      g.fillStyle = "#b8431f"; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = ["#e8a020", "#f0c23a", "#9a2c14", "#d9661e"][(r() * 4) | 0];
        g.beginPath(); g.ellipse(r() * cw, r() * ch, 16 + r() * 40, 8 + r() * 26, r() * 3, 0, 6.28); g.fill();
      }
    });
    const g = group(parent, x, y, 0);
    box(w + 0.16, h + 0.16, 0.12, mat(0x15110e), 0, 0, 0.06, g, { cast: false });
    const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: C(0x401a08), emissiveIntensity: 0.25 }));
    p.position.set(0, h / 2 + 0.08, 0.13);
    g.add(p);
  }

  /* horloge réelle */
  let clockHands = null;
  function clock(parent, x, y) {
    const g = group(parent, x, y, 0);
    const face = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = "#eee6d6"; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 6.28); c.fill();
      c.strokeStyle = "#1a1511"; c.lineWidth = 6;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 6.28, r1 = w / 2 - 14, r2 = i % 3 === 0 ? w / 2 - 36 : w / 2 - 26;
        c.beginPath(); c.moveTo(w / 2 + Math.sin(a) * r1, h / 2 - Math.cos(a) * r1); c.lineTo(w / 2 + Math.sin(a) * r2, h / 2 - Math.cos(a) * r2); c.stroke();
      }
    });
    const rim = cyl(1.15, 1.15, 0.3, 40, brass, 0, 0, 0, g); rim.rotation.x = Math.PI / 2; rim.position.set(0, 1.15, 0.15);
    const f = new T.Mesh(new T.CircleGeometry(1.0, 40), new T.MeshStandardMaterial({ map: face, roughness: 0.6 }));
    f.position.set(0, 1.15, 0.32); g.add(f);
    const hand = (len, wid, mc) => {
      const pivot = new T.Group(); pivot.position.set(0, 1.15, 0.36);
      const m = new T.Mesh(new T.BoxGeometry(wid, len, 0.04), mc); m.position.y = len / 2 - 0.1; pivot.add(m); g.add(pivot); return pivot;
    };
    clockHands = { h: hand(0.55, 0.07, mat(0x1a1511)), m: hand(0.8, 0.05, mat(0x1a1511)) };
  }

  /* enseigne « Ouvert » (texte mis à jour depuis le site) */
  let signCtx = null, signTex = null;
  function drawSign(line1, line2) {
    const g = signCtx; if (!g) return;
    const w = 256, h = 128;
    g.fillStyle = "#1f3a2f"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c6a15b"; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#efe7d6"; g.textAlign = "center";
    g.font = "italic 52px 'Instrument Serif', Georgia, serif"; g.fillText(line1, w / 2, 62);
    g.fillStyle = "#c6a15b"; g.font = "600 17px 'Outfit', Arial, sans-serif";
    g.fillText((line2 || "").toUpperCase(), w / 2, 98);
    signTex.needsUpdate = true;
  }
  function sign(parent, x, y) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128; signCtx = c.getContext("2d");
    signTex = new T.CanvasTexture(c); signTex.encoding = T.sRGBEncoding; signTex.anisotropy = 4;
    drawSign("Ouvert", "");
    const g = group(parent, x, y, 0);
    const dark = mat(0x1b1612);
    const p = new T.Mesh(new T.BoxGeometry(2.4, 1.2, 0.14), [dark, dark, dark, dark, new T.MeshStandardMaterial({ map: signTex, roughness: 0.7, emissive: C(0x1a2a22), emissiveIntensity: 0.35 }), dark]);
    p.position.set(0, 0.6, 0.07); shadowy(p, true, false); g.add(p);
    for (const sx of [-1, 1]) cyl(0.07, 0.07, 0.1, 8, brass, sx * 1.05, 1.0, 0.12, g, { cast: false }).rotation.x = Math.PI / 2;
  }

  /* enseigne de barbier qui tourne */
  let poleTex = null;
  function barberPole(parent, x, y) {
    poleTex = canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = "#efe7d6"; g.fillRect(0, 0, w, h);
      for (let i = -2; i < 8; i++) {
        g.fillStyle = i % 2 ? "#a8321f" : "#27406b";
        g.beginPath(); g.moveTo(0, i * 50); g.lineTo(w, i * 50 - 40); g.lineTo(w, i * 50 + 5); g.lineTo(0, i * 50 + 45); g.fill();
      }
    }, [1, 1]);
    const g = group(parent, x, y, 0.55);
    cyl(0.36, 0.36, 0.14, 20, brass, 0, 0, 0, g);
    const tube = cyl(0.3, 0.3, 2.6, 24, new T.MeshStandardMaterial({ map: poleTex, roughness: 0.25, metalness: 0.1 }), 0, 0.14, 0, g);
    cyl(0.36, 0.36, 0.14, 20, brass, 0, 2.74, 0, g);
    const cap = new T.Mesh(new T.SphereGeometry(0.3, 16, 12), brass); cap.position.y = 3.05; g.add(cap);
    box(0.5, 1.3, 0.25, brass, 0, 0.7, -0.35, g, { cast: false });
  }

  /* fenêtre avec rideaux */
  function windowFrame(parent, x, y, w, h) {
    const g = group(parent, x, y, 0);
    box(w + 0.7, h + 0.7, 0.3, woodMat(0xffffff), 0, 0, 0.15, g, { cast: false });
    const glass = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ color: C(0x000000), emissive: C(0xd4dde6), emissiveIntensity: 1.0, roughness: 1 }));
    glass.position.set(0, h / 2 + 0.35, 0.31); g.add(glass);
    box(0.14, h, 0.1, woodMat(0xffffff), 0, 0.35, 0.34, g, { cast: false });
    box(w, 0.14, 0.1, woodMat(0xffffff), 0, h / 2 + 0.28, 0.34, g, { cast: false });
    const cur = mat(0xb9a38a, { roughness: 1 });
    box(0.9, h + 0.9, 0.3, cur, -w / 2 - 0.55, 0, 0.45, g, { cast: false });
    box(0.9, h + 0.9, 0.3, cur, w / 2 + 0.55, 0, 0.45, g, { cast: false });
    { const rod = cyl(0.06, 0.06, w + 2.8, 8, brass, 0, 0, 0.45, g, { cast: false }); rod.rotation.z = Math.PI / 2; rod.position.set(0, h + 0.8, 0.45); }
  }

  /* porte vitrée */
  function door(parent, x, w, h) {
    const g = group(parent, x, 0, 0);
    box(w + 0.7, h + 0.45, 0.34, woodMat(0xffffff), 0, 0, 0.17, g, { cast: false });
    const glass = new T.Mesh(new T.PlaneGeometry(w - 0.3, h - 0.5), new T.MeshStandardMaterial({ color: C(0x000000), emissive: C(0xaebbc6), emissiveIntensity: 0.85, roughness: 1 }));
    glass.position.set(0, h / 2 + 0.1, 0.36); g.add(glass);
    box(0.12, h - 0.5, 0.1, woodMat(0xffffff), 0, 0.1, 0.4, g, { cast: false });
    box(w - 0.3, 0.12, 0.1, woodMat(0xffffff), 0, h * 0.5, 0.4, g, { cast: false });
    cyl(0.07, 0.07, 1.6, 10, brass, w / 2 - 0.45, h * 0.35, 0.62, g, { cast: false });
  }

  /* ---------- meubles ---------- */
  function barberChair() {
    const g = new T.Group();
    const lea = leather(0x74401f);
    cyl(1.35, 1.55, 0.26, 36, green, 0, 0, 0, g);
    cyl(0.5, 0.62, 0.4, 24, chrome, 0, 0.26, 0, g);
    cyl(0.34, 0.34, 1.0, 20, chrome, 0, 0.62, 0, g);
    cyl(0.78, 0.9, 0.34, 28, green, 0, 1.5, 0, g);
    box(2.45, 0.62, 2.45, lea, 0, 1.82, 0.12, g);
    box(2.45, 0.2, 0.3, lea, 0, 1.62, 1.4, g);
    const bk = group(g, 0, 2.3, -1.02);
    bk.rotation.x = -0.14;
    box(2.45, 3.0, 0.62, lea, 0, 0, 0, bk);
    box(1.5, 0.95, 0.5, lea, 0, 3.05, -0.02, bk);
    cyl(0.18, 0.18, 0.5, 12, chrome, 0, 2.95, 0, bk);
    for (const sx of [-1, 1]) {
      box(0.32, 0.26, 1.9, woodMat(0xffffff), sx * 1.5, 3.35, 0.15, g);
      cyl(0.075, 0.075, 1.15, 10, chrome, sx * 1.5, 2.2, 0.85, g);
      cyl(0.075, 0.075, 1.15, 10, chrome, sx * 1.5, 2.2, -0.55, g);
      box(0.22, 1.5, 1.7, green, sx * 1.34, 1.55, 0.1, g);
    }
    const foot = group(g, 0, 0.55, 2.2);
    foot.rotation.x = 0.18;
    box(2.0, 0.16, 1.15, chrome, 0, 0, 0, foot);
    box(2.0, 0.05, 1.15, mat(0x151210, { roughness: 0.8 }), 0, 0.16, 0, foot);
    cyl(0.07, 0.07, 1.0, 8, chrome, -0.7, 0.2, -0.9, g);
    cyl(0.07, 0.07, 1.0, 8, chrome, 0.7, 0.2, -0.9, g);
    return g;
  }

  function stylingChair() {
    const g = new T.Group();
    const lea = leather(0x332c27);
    cyl(1.15, 1.3, 0.2, 5, chrome, 0, 0, 0, g);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leg = box(1.6, 0.14, 0.26, chrome, Math.cos(a) * 0.8, 0.0, Math.sin(a) * 0.8, g);
      leg.rotation.y = -a;
      cyl(0.17, 0.17, 0.3, 10, mat(0x15110e), Math.cos(a) * 1.55, -0.02, Math.sin(a) * 1.55, g);
    }
    cyl(0.28, 0.28, 1.5, 18, chrome, 0, 0.2, 0, g);
    cyl(1.15, 1.15, 0.55, 32, lea, 0, 1.75, 0, g);
    const bk = group(g, 0, 2.25, -0.95);
    bk.rotation.x = -0.1;
    box(2.1, 1.9, 0.5, lea, 0, 0, 0, bk);
    box(1.4, 0.4, 0.4, brass, 0, 1.55, 0.02, bk, { cast: false });
    return g;
  }

  function trolley(seed) {
    const r = rng(seed);
    const g = new T.Group();
    for (const [x, z] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) cyl(0.06, 0.06, 3.0, 8, chrome, x, 0.3, z, g);
    for (const y of [0.75, 1.75, 2.8]) box(1.9, 0.1, 1.3, brass, 0, y, 0, g);
    const cols = [0xc88a3c, 0xe8e1d2, 0x2f5a47, 0x7a3a2a, 0xb9b2a3];
    for (let i = 0; i < 7; i++) cyl(0.13, 0.13, 0.5 + r() * 0.4, 12, mat(cols[(r() * cols.length) | 0], { roughness: 0.3 }), -0.7 + r() * 1.4, 1.85, -0.4 + r() * 0.8, g);
    box(1.1, 0.42, 0.8, mat(0xefe7d8), 0, 0.85, 0, g);
    box(1.0, 0.2, 0.7, mat(0xefe7d8), 0.1, 1.27, 0, g);
    return g;
  }

  function basinUnit() {
    const g = new T.Group();
    const porcelain = mat(0xefe9dc, { roughness: 0.18, metalness: 0.05 });
    box(2.6, 1.7, 2.0, mat(0x241d18), 0, 0, 0, g);
    box(2.8, 0.2, 2.2, porcelain, 0, 1.7, 0, g);
    box(2.0, 0.5, 1.5, porcelain, 0, 1.9, 0, g);
    box(1.6, 0.2, 1.1, mat(0x14100d), 0, 2.28, 0, g, { cast: false });
    cyl(0.09, 0.09, 1.2, 10, chrome, 0, 1.9, -0.95, g);
    const spout = cyl(0.07, 0.07, 0.8, 10, chrome, 0, 3.0, -0.65, g); spout.rotation.x = Math.PI / 2;
    return g;
  }

  function reclinerChair() {
    const g = new T.Group();
    const lea = leather(0x3a3430);
    cyl(1.1, 1.25, 0.2, 28, chrome, 0, 0, 0, g);
    cyl(0.28, 0.28, 1.2, 14, chrome, 0, 0.2, 0, g);
    box(2.1, 0.5, 2.2, lea, 0, 1.4, 0.2, g);
    const bk = group(g, 0, 1.9, -0.9); bk.rotation.x = -0.55;
    box(2.1, 2.5, 0.5, lea, 0, 0, 0, bk);
    box(1.9, 0.14, 1.1, chrome, 0, 0.55, 1.9, g);
    return g;
  }

  function bench() {
    const g = new T.Group();
    box(5.0, 0.35, 1.5, woodMat(0xffffff), 0, 1.3, 0, g);
    for (const sx of [-2.2, 2.2]) box(0.3, 1.3, 1.3, woodMat(0xffffff), sx, 0, 0, g);
    box(1.6, 0.3, 1.2, leather(0x74401f), -1.2, 1.65, 0, g);
    box(1.6, 0.3, 1.2, leather(0x2f5a47), 1.2, 1.65, 0, g);
    return g;
  }

  function plant(seed) {
    const r = rng(seed);
    const g = new T.Group();
    cyl(0.75, 0.55, 1.3, 16, mat(0x6b4a36, { roughness: 0.9 }), 0, 0, 0, g);
    cyl(0.7, 0.7, 0.1, 16, mat(0x2a1e16), 0, 1.25, 0, g);
    const leafMat = mat(0x1f3a28, { roughness: 0.8 });
    const leafMat2 = mat(0x2b4d34, { roughness: 0.8 });
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, tilt = 0.25 + r() * 0.7, len = 1.8 + r() * 1.7;
      const piv = group(g, 0, 1.3, 0, a);
      piv.rotation.z = tilt;
      const leaf = box(0.7, len, 0.1, i % 2 ? leafMat : leafMat2, 0, 0, 0, piv);
      leaf.scale.x = 0.7 + r() * 0.7;
    }
    return g;
  }

  function rug(w, d, seed) {
    const tex = canvasTex(256, 256, (g, cw, ch) => {
      const r = rng(seed);
      g.fillStyle = "#3d2a22"; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = "#c6a15b"; g.lineWidth = 6; g.strokeRect(12, 12, cw - 24, ch - 24);
      g.strokeStyle = "#8c5028"; g.lineWidth = 3; g.strokeRect(26, 26, cw - 52, ch - 52);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "198,161,91" : "140,80,40"},0.5)`; g.fillRect(40 + r() * (cw - 80), 40 + r() * (ch - 80), 6, 6); }
    });
    const m = new T.Mesh(new T.BoxGeometry(w, 0.06, d), mat(0xffffff, { map: tex, roughness: 1 }));
    m.position.y = 0.03; m.receiveShadow = true;
    return m;
  }

  function tableLamp(parent, x, y, z) {
    const g = group(parent, x, y, z);
    cyl(0.28, 0.34, 0.12, 14, brass, 0, 0, 0, g);
    cyl(0.06, 0.06, 0.9, 8, brass, 0, 0.1, 0, g);
    const shade = new T.Mesh(new T.CylinderGeometry(0.34, 0.56, 0.7, 20, 1, true), new T.MeshStandardMaterial({ color: C(0xf2dfbd), emissive: C(0xffb866), emissiveIntensity: 0.9, side: T.DoubleSide, roughness: 1 }));
    shade.position.y = 1.2; g.add(shade);
    const bulb = new T.Mesh(new T.SphereGeometry(0.2, 12, 10), emissive(0xffd9a0, 2.2)); bulb.position.y = 1.15; g.add(bulb);
    return g;
  }
  function sconce(parent, x, y) {
    const g = group(parent, x, y, 0);
    box(0.4, 0.9, 0.3, brass, 0, 0, 0.15, g, { cast: false });
    const shade = new T.Mesh(new T.CylinderGeometry(0.3, 0.42, 0.6, 16, 1, true), new T.MeshStandardMaterial({ color: C(0xf2dfbd), emissive: C(0xffb866), emissiveIntensity: 0.95, side: T.DoubleSide, roughness: 1 }));
    shade.position.set(0, 1.2, 0.6); g.add(shade);
    const bulb = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), emissive(0xffd9a0, 2.4)); bulb.position.set(0, 1.18, 0.6); g.add(bulb);
  }

  function tools(parent, x, y, z) {
    const g = group(parent, x, y, z);
    box(2.6, 0.12, 1.6, woodMat(0xffffff), 0, 0, 0, g);
    box(2.6, 0.3, 0.1, woodMat(0xffffff), 0, 0.1, -0.75, g);
    box(2.6, 0.3, 0.1, woodMat(0xffffff), 0, 0.1, 0.75, g);
    // ciseaux
    const sc = group(g, -0.6, 0.14, 0.1, 0.5);
    for (const s of [-1, 1]) {
      const blade = box(0.05, 0.03, 1.15, chrome, s * 0.03, 0.02, 0.45, sc); blade.rotation.y = s * 0.04;
      const ring = new T.Mesh(new T.TorusGeometry(0.17, 0.04, 8, 18), brass); ring.rotation.x = Math.PI / 2; ring.position.set(s * 0.2, 0.06, -0.38); sc.add(ring);
    }
    // peigne
    const comb = group(g, 0.4, 0.14, -0.2, -0.25);
    box(1.4, 0.05, 0.3, mat(0x14100d, { roughness: 0.4 }), 0, 0, 0, comb);
    for (let i = 0; i < 20; i++) box(0.025, 0.04, 0.2, mat(0x14100d), -0.65 + i * 0.07, 0.0, 0.2, comb);
    // rasoir
    const rz = group(g, 0.7, 0.14, 0.38, 0.35);
    box(0.9, 0.09, 0.12, mat(0x1f3d33, { roughness: 0.4 }), 0, 0, 0, rz);
    box(0.55, 0.03, 0.1, chrome, 0.7, 0.02, 0, rz);
    // blaireau
    const br = group(g, -0.9, 0.14, -0.35, 0.2);
    cyl(0.1, 0.12, 0.55, 12, woodMat(0xffffff), 0, 0, 0, br).rotation.z = Math.PI / 2;
    cyl(0.18, 0.12, 0.3, 12, mat(0xe8dcc4, { roughness: 1 }), 0.4, 0, 0, br).rotation.z = Math.PI / 2;
  }

  function counter(len) {
    const g = new T.Group();
    box(len, 2.6, 1.7, woodMat(0xffffff, [len / 3, 1]), 0, 0, 0, g);
    box(len + 0.2, 0.18, 1.9, mat(0x1b1613, { roughness: 0.35, metalness: 0.2 }), 0, 2.6, 0, g);
    return g;
  }

  /* ================== composition du salon ================== */
  // --- coin barbier (nord-ouest) ---
  rectMirror(wallN, -4.0, 3.0, 3.4, 2.9);
  sconce(wallN, -1.4, 3.6);
  barberPole(wallW, 5.3, 2.6);                                       // mur ouest : x local = -z monde
  shelf(wallW, 1.9, 4.2, 3.2, 0, 31);
  const chair1 = barberChair();
  chair1.position.set(-3.8, 0, -3.5);
  chair1.rotation.y = Math.atan2(0.42, -1);
  room.add(chair1);
  const side = counter(2.4); side.position.set(-6.0, 0, -2.2); side.rotation.y = Math.PI / 2; room.add(side);
  tools(room, -6.0, 2.78, -2.2);
  const trol1 = trolley(8); trol1.position.set(-0.6, 0, -5.5); room.add(trol1);

  // --- coin coiffure (sud-ouest) ---
  archMirror(wallS, 3.6, 2.1, 3.4, 5.6);                             // mur sud : x local = -x monde
  sconce(wallS, 6.4, 3.4); sconce(wallS, 0.8, 3.4);
  const cons = counter(5.2); cons.position.set(-3.6, 0, 6.05); room.add(cons);
  tableLamp(room, -5.7, 2.78, 6.1); tableLamp(room, -1.5, 2.78, 6.1);
  tools(room, -3.6, 2.78, 6.1);
  const chair2 = stylingChair(); chair2.position.set(-3.6, 0, 3.0); chair2.rotation.y = Math.atan2(0.3, 1); room.add(chair2);
  const trol2 = trolley(14); trol2.position.set(-0.8, 0, 3.7); trol2.rotation.y = -0.4; room.add(trol2);
  painting(wallW, -1.0, 3.4, 1.4, 1.9, 6);
  painting(wallW, -3.0, 3.9, 1.4, 1.9, 7);
  painting(wallW, -5.3, 3.4, 1.4, 1.9, 9);
  const plant1 = plant(2); plant1.position.set(-6.0, 0, 5.8); room.add(plant1);

  // --- coin entrée (sud-est) ---
  door(wallE, 4.6, 3.0, 5.7);                                        // mur est : x local = +z monde
  sign(wallE, 1.5, 3.4);
  windowFrame(wallS, -3.9, 2.4, 3.4, 3.8);                           // mur sud : x monde = +3.9
  const bnch = bench(); bnch.position.set(3.9, 0, 5.9); room.add(bnch);
  const plant2 = plant(4); plant2.position.set(6.1, 0, 1.8); room.add(plant2);
  const rug1 = rug(6.4, 4.6, 3); rug1.position.set(3.4, 0, 2.4); room.add(rug1);
  clock(wallN, 0.6, 4.2);

  // --- coin couleur (nord-est) ---
  shelf(wallN, 4.4, 3.8, 4.6, 0, 41);
  shelf(wallN, 4.4, 5.5, 4.6, 0, 42);
  for (const z of [-2.9, -5.3]) {
    const b = basinUnit(); b.position.set(6.0, 0, z); b.rotation.y = -Math.PI / 2; room.add(b);
    const ch = reclinerChair(); ch.position.set(3.5, 0, z); ch.rotation.y = -Math.PI / 2; room.add(ch);
  }
  rectMirror(wallE, -4.1, 3.2, 5.0, 2.4);
  sconce(wallE, -0.6, 3.8);

  /* ---------- lumières ponctuelles (zones) ---------- */
  pointLight(-3.6, 5.2, -5.2, 0xffb260, 0.9, 12);   // barbier
  pointLight(-3.6, 4.6, 5.4, 0xffb260, 0.9, 12);    // coiffure
  pointLight(4.6, 5.2, 3.4, 0xffc890, 0.7, 12);     // entrée
  pointLight(4.4, 5.2, -4.4, 0xffc890, 0.7, 12);    // couleur

  /* ================== caméra, murs, rendu ================== */
  const target = new T.Vector3(0, 3.5, 0);
  const state = { theta: VIEWS[0].theta, elev: ELEV, half: 9.2, tx: 0, ty: 3.5, tz: 0 };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function applyCamera() {
    const d = 80, c = Math.cos(state.elev);
    const aspect = size.w / size.h;
    target.set(state.tx, state.ty, state.tz);
    cam.position.set(target.x + Math.sin(state.theta) * c * d, target.y + Math.sin(state.elev) * d, target.z + Math.cos(state.theta) * c * d);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    cam.left = -state.half * aspect; cam.right = state.half * aspect; cam.top = state.half; cam.bottom = -state.half;
    cam.updateProjectionMatrix();
    // la lumière principale suit la caméra, un peu décalée, pour que chaque vue soit bien éclairée
    const la = state.theta - 0.7;
    key.position.set(Math.sin(la) * 26, 30, Math.cos(la) * 26);
    // murs : ceux qui font face à la caméra s'abaissent
    const cx = Math.sin(state.theta), cz = Math.cos(state.theta);
    for (const id in walls) {
      const w = walls[id];
      const s = smooth(0.02, 0.42, w.nx * cx + w.nz * cz);
      w.g.scale.y = 1 - 0.93 * s;
      w.dec.visible = s < 0.12;
    }
    renderer.shadowMap.needsUpdate = true;
  }

  function fitHalf() {
    const aspect = size.w / size.h;
    return Math.max(9.4, 11.7 / aspect);
  }

  function resize(w, h) {
    size.w = Math.max(1, w); size.h = Math.max(1, h);
    renderer.setSize(size.w, size.h, false);
    state.half = fitHalf();
    applyCamera();
  }

  const v3 = new T.Vector3();
  function project(x, y, z) {
    v3.set(x, y, z).project(cam);
    return { x: (v3.x * 0.5 + 0.5) * size.w, y: (-v3.y * 0.5 + 0.5) * size.h, z: v3.z };
  }

  /* animation douce : lampes, enseigne, horloge, chaise */
  function tick(timeMs) {
    const t = timeMs / 1000;
    if (poleTex) poleTex.offset.y = (t * 0.12) % 1;
    for (let i = 0; i < lamps.length; i++) lamps[i].l.intensity = lamps[i].base * (1 + Math.sin(t * 1.3 + i * 2.1) * 0.02);
    if (clockHands) {
      const d = new Date();
      const m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
      clockHands.m.rotation.z = -(m / 60) * Math.PI * 2;
      clockHands.h.rotation.z = -(h / 12) * Math.PI * 2;
    }
    if (!opts.still) chair1.rotation.y = Math.atan2(0.42, -1) + Math.sin(t * 0.5) * 0.05;
  }

  function render(timeMs = 0) {
    tick(timeMs);
    renderer.render(scene, cam);
  }

  /* ---------- API ---------- */
  applyCamera();
  return {
    renderer, scene, camera: cam, VIEWS,
    resize,
    setTheta(theta) { state.theta = theta; applyCamera(); },
    getTheta: () => state.theta,
    project,
    render,
    /* cadrage libre (rendus d'illustrations) */
    preset({ theta, elev = ELEV, half, target: tg = [0, 3.5, 0] }) {
      state.theta = theta; state.elev = elev; state.half = half || fitHalf();
      state.tx = tg[0]; state.ty = tg[1]; state.tz = tg[2];
      applyCamera();
    },
    resetCamera() { state.elev = ELEV; state.tx = 0; state.ty = 3.5; state.tz = 0; state.half = fitHalf(); applyCamera(); },
    setSign(line1, line2) { drawSign(line1, line2); },
    /* appareil lent : on allège (définition et ombres) sans toucher au décor */
    lowerQuality() {
      renderer.setPixelRatio(1);
      key.shadow.mapSize.set(768, 768);
      if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
      renderer.setSize(size.w, size.h, false);
      renderer.shadowMap.needsUpdate = true;
    },
    dispose() { renderer.dispose(); },
  };
}
