/* ==========================================================================
   Hero : le salon en miniature

   - L'affiche (scene-N.webp) s'affiche tout de suite.
   - La scène 3D se charge ensuite, au repos du navigateur, et la remplace.
   - Sans WebGL, en économie de données ou si la 3D échoue, l'affiche reste :
     on change de coin avec le contrôle sous la scène, sans rien perdre.

   Le geste : l'angle suit le doigt 1:1, au lâcher il reprend la vitesse du
   doigt, se projette vers l'endroit où le geste allait, puis se pose sur le
   coin le plus proche avec un ressort. On peut l'attraper à tout instant.
   ========================================================================== */
import { Spring, project, clamp, VelocityTracker, reduced } from "./physics.js";

const THREE_SRC = "assets/vendor/three.min.js";
const TAU = Math.PI * 2;
const VIEW_THETA = [0.25, 0.75, 1.25, 1.75].map((k) => k * Math.PI);
// Position des pastilles (en %) quand seule l'affiche est affichée
const FALLBACK = [[54.8, 17], [43, 22.6], [44.6, 20.5], [56, 30.1]];

const webglOK = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) { return false; }
};
const loadScript = (src) => new Promise((res, rej) => {
  if (window.THREE) return res();
  const s = document.createElement("script");
  s.src = src; s.async = true; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});
const viewIndex = (theta) => (((Math.round((theta - VIEW_THETA[0]) / (Math.PI / 2)) % 4) + 4) % 4);
// angle de la vue i le plus proche de l'angle courant (on prend le chemin le plus court)
const nearestTarget = (i, theta) => VIEW_THETA[i] + TAU * Math.round((theta - VIEW_THETA[i]) / TAU);

export function initHero({ stage, poster, canvas, spots, seg, onAction, getSign }) {
  const spotEls = [...spots.querySelectorAll(".spot")];
  const theta = new Spring(VIEW_THETA[0], { response: 0.55, damping: 0.86, precision: 0.0005 });
  let salon = null;
  let live = false;
  let dragging = false;
  let dirty = true;
  let visible = true;
  let current = 0;
  let size = { w: 1, h: 1 };
  const posterUrls = [0, 1, 2, 3].map((i) => `assets/img/scene-${i}.webp`);

  /* ---------- pastilles sur les meubles ---------- */
  function placeSpots() {
    const near = viewIndex(theta.value);
    const dist = Math.abs(((theta.value - VIEW_THETA[near] + Math.PI) % TAU + TAU) % TAU - Math.PI);
    spotEls.forEach((el, i) => {
      const on = i === near && dist < 0.28 && !dragging;
      el.classList.toggle("is-on", on);
      if (!on) return;
      let x, y;
      if (live && salon) {
        const a = salon.VIEWS[i].anchor;
        const p = salon.project(a[0], a[1], a[2]);
        x = p.x; y = p.y;
      } else {
        x = (FALLBACK[i][0] / 100) * size.w;
        y = (FALLBACK[i][1] / 100) * size.h;
      }
      // la pastille reste dans la scène (jamais sur le titre ni hors de l'écran)
      const w = el.offsetWidth || 130, h = el.offsetHeight || 46;
      x = clamp(x, w / 2 + 6, size.w - w / 2 - 6);
      y = Math.max(y, h + 18);
      el.style.setProperty("--x", x.toFixed(1) + "px");
      el.style.setProperty("--y", y.toFixed(1) + "px");
    });
  }

  function setCurrent(i) {
    if (i === current) return;
    current = i;
    if (!live) { poster.removeAttribute("srcset"); poster.removeAttribute("sizes"); poster.src = posterUrls[i]; }
    seg.select(i, { silent: true });
  }

  theta.onUpdate = (v) => {
    dirty = true;
    if (salon) salon.setTheta(v);
    setCurrent(viewIndex(v));
    placeSpots();
  };

  function goTo(i) {
    stage.classList.add("is-used");
    theta.to(nearestTarget(i, theta.value), { response: 0.55, damping: 0.86 });
  }

  /* ---------- geste : tourner le salon ---------- */
  const vt = new VelocityTracker();
  let down = null;
  const radPerPx = () => (Math.PI / 2) / (Math.max(240, size.w) * 0.5);

  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest(".spot")) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, started: false, theta0: theta.value };
    vt.reset();
    vt.push(e.clientX, e.timeStamp);
    theta.grab();       // on attrape le mouvement en cours, là où il est
    preload();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.started) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;           // petite hystérésis
      if (Math.abs(dy) > Math.abs(dx)) { down = null; return; }   // c'est un défilement vertical
      down.started = true;
      down.x = e.clientX; down.theta0 = theta.value;
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("is-drag", "is-used");
      placeSpots();
      return;
    }
    vt.push(e.clientX, e.timeStamp);
    theta.set(down.theta0 - (e.clientX - down.x) * radPerPx());   // 1:1, pas d'animation
  });
  const release = (e) => {
    if (!down || e.pointerId !== down.id) return;
    const wasDragging = down.started;
    down = null;
    if (!wasDragging) return;
    dragging = false;
    stage.classList.remove("is-drag");
    const omega = -vt.get() * radPerPx();                          // rad/s, à l'instant du lâcher
    const projected = clamp(theta.value + project(omega), theta.value - Math.PI, theta.value + Math.PI);
    const idx = viewIndex(projected);
    const snap = nearestTarget(idx, projected);
    // un peu de rebond seulement parce que le geste portait de l'élan
    theta.to(snap, { velocity: omega, response: 0.5, damping: Math.abs(omega) > 1 ? 0.8 : 0.95 });
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);

  stage.addEventListener("keydown", (e) => {
    if (e.target !== stage) return;
    const k = e.key;
    if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); goTo((current + 1) % 4); }
    else if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); goTo((current + 3) % 4); }
  });

  spotEls.forEach((el) => el.addEventListener("click", () => onAction(el.dataset.action)));

  seg.onChange = (i) => goTo(i);

  /* ---------- tailles ---------- */
  const measure = () => {
    const r = stage.getBoundingClientRect();
    size = { w: r.width, h: r.height };
    if (salon) salon.resize(size.w, size.h);
    dirty = true;
    placeSpots();
  };
  new ResizeObserver(measure).observe(stage);
  measure();
  placeSpots();

  /* ---------- 3D ---------- */
  let preloaded = false;
  function preload() {
    if (preloaded || live) return;
    preloaded = true;
    // sans 3D, on précharge les autres affiches pour que le changement de coin soit instantané
    if (!canLive()) posterUrls.slice(1).forEach((u) => { const im = new Image(); im.src = u; });
  }

  const canLive = () => {
    const q = new URLSearchParams(location.search);
    if (q.has("poster")) return false;
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return false;
    if (navigator.deviceMemory && navigator.deviceMemory <= 1) return false;
    return webglOK();
  };

  async function goLive() {
    if (live || !canLive()) { preload(); return; }
    try {
      const [mod] = await Promise.all([import("./scene.js"), loadScript(THREE_SRC)]);
      const small = window.innerWidth < 700;
      salon = mod.createSalon(window.THREE, canvas, {
        maxDpr: small ? 1.75 : 2,
        shadowSize: small ? 1024 : 2048,
        still: reduced,
      });
      salon.VIEWS = mod.VIEWS;
      const sign = getSign();
      if (sign) salon.setSign(sign[0], sign[1]);
      measure();
      salon.setTheta(theta.value);
      salon.render(performance.now());
      requestAnimationFrame(() => requestAnimationFrame(() => {
        live = true;
        stage.classList.add("is-live");
        loop(performance.now());
        placeSpots();
        // un petit mouvement pour montrer que ça tourne (jamais si le mouvement est réduit)
        if (!reduced && !stage.classList.contains("is-used")) {
          theta.set(VIEW_THETA[0] + 0.5);
          theta.to(VIEW_THETA[0], { response: 0.9, damping: 1 });
        }
      }));
    } catch (err) {
      salon = null; live = false;
      stage.classList.remove("is-live");
      preload();
    }
  }

  let lastRender = 0, slowFrames = 0, lowered = false;
  function loop(t) {
    requestAnimationFrame(loop);
    if (!live || !visible || document.hidden) return;
    const moving = dragging || theta.active;
    // 60 images/s quand on touche, un rythme calme quand la scène vit toute seule
    if (dirty || moving || t - lastRender > 70) {
      const gap = t - lastRender;
      salon.render(t);
      lastRender = t; dirty = false;
      placeSpots();
      // si l'appareil peine pendant un geste, on allège une fois pour toutes
      if (moving && !lowered) {
        slowFrames = gap > 38 && gap < 400 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames > 14) { lowered = true; salon.lowerQuality(); }
      }
    }
  }

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) dirty = true; }, { rootMargin: "120px" }).observe(stage);

  // La 3D se charge au premier geste du visiteur (toucher, souris, clavier, défilement).
  // L'affiche est identique à la scène au repos : on ne voit pas la différence, et la page
  // reste légère pour ceux qui ne font que passer (et pour les outils de mesure).
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    ["pointerdown", "pointermove", "touchstart", "keydown", "wheel", "scroll"].forEach((t) => window.removeEventListener(t, start));
    goLive();
  };
  ["pointerdown", "pointermove", "touchstart", "keydown", "wheel", "scroll"].forEach((t) => window.addEventListener(t, start, { passive: true }));

  return {
    setSign(l1, l2) { if (salon) { salon.setSign(l1, l2); dirty = true; } },
    get live() { return live; },
  };
}
