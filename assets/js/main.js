/* ==========================================================================
   MK Concept — interface
   Pas de bibliothèque d'animation : un petit moteur de ressorts (physics.js),
   des Pointer Events, et le défilement natif du navigateur.
   ========================================================================== */
import { Spring, project, rubberband, clamp, VelocityTracker, reduced } from "./physics.js";
import { initHero } from "./hero.js";

const root = document.documentElement;
const motion = root.classList.contains("motion");
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const behavior = reduced ? "auto" : "smooth";

/* ==========================================================================
   Horaires : calculés pour Douai, quel que soit le fuseau du visiteur
   ========================================================================== */
const HOURS = { 1: [14, 18], 2: [9.5, 19], 3: [9.5, 19], 4: [10, 20], 5: [9, 19], 6: [9, 18], 0: null };
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const fmtH = (h) => { const H = Math.floor(h), M = Math.round((h - H) * 60); return M ? `${H}h${String(M).padStart(2, "0")}` : `${H}h`; };

function parisNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, t: +get("hour") + +get("minute") / 60 };
}

function openStatus() {
  const { day, t } = parisNow();
  const today = HOURS[day];
  if (today && t >= today[0] && t < today[1]) {
    const until = fmtH(today[1]);
    return { open: true, day, line: `Ouvert jusqu'à ${until}`, sign: ["Ouvert", `jusqu'à ${until}`] };
  }
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7, h = HOURS[d];
    if (!h || (i === 0 && t >= h[0])) continue;
    const when = i === 0 ? `à ${fmtH(h[0])}` : i === 1 ? `demain à ${fmtH(h[0])}` : `${DAYS[d]} à ${fmtH(h[0])}`;
    return { open: false, day, line: `Fermé · ouvre ${when}`, sign: ["Fermé", `ouvre ${when}`] };
  }
  return { open: false, day, line: "Fermé", sign: ["Fermé", ""] };
}

let hero = null;
function updateStatus() {
  const s = openStatus();
  for (const el of [$("#status-line"), $("#sheet-status")]) {
    if (!el) continue;
    el.textContent = s.line;
    el.dataset.open = s.open;
  }
  const dot = $("#nav-dot"); if (dot) dot.dataset.open = s.open;
  const po = $("#plaque-open"); if (po) { po.textContent = s.sign[0] + " · " + s.sign[1]; po.dataset.open = s.open; }
  $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", +tr.dataset.day === s.day));
  if (hero) hero.setSign(s.sign[0], s.sign[1]);
}

/* ==========================================================================
   Cadrans (intro et jauge de défilement)
   ========================================================================== */
const NS = "http://www.w3.org/2000/svg";
function buildDial(svg, { cx, cy, r, from, to, ticks, red, tick, minor = 0 }) {
  const pt = (a, rad) => { const t = (a * Math.PI) / 180; return [cx + rad * Math.sin(t), cy - rad * Math.cos(t)]; };
  const el = (name, attrs) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; };
  const [x1, y1] = pt(from, r), [x2, y2] = pt(to, r);
  el("path", { class: "dial-arc", d: `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}` });
  const steps = (ticks - 1) * (minor + 1);
  for (let i = 0; i <= steps; i++) {
    const major = i % (minor + 1) === 0;
    const a = from + ((to - from) * i) / steps;
    const [ax, ay] = pt(a, r - 3), [bx, by] = pt(a, r - 3 - (major ? tick : tick * 0.45));
    el("line", { class: "dial-tick" + (i / steps >= 1 - red / (ticks - 1) - 1e-6 ? " dial-tick--red" : ""), x1: ax, y1: ay, x2: bx, y2: by });
  }
  const needle = el("line", { class: "dial-needle", x1: cx, y1: cy + r * 0.12, x2: cx, y2: cy - r * 0.82 });
  el("circle", { class: "dial-hub", cx, cy, r: Math.max(1.6, r * 0.035) });
  const set = (deg) => needle.setAttribute("transform", `rotate(${deg} ${cx} ${cy})`);
  set(from);
  return { set, from, to };
}

/* ==========================================================================
   Contrôle segmenté : la pastille est un ressort
   ========================================================================== */
function initSeg(el) {
  const btns = $$("button", el);
  const thumb = $(".seg__thumb", el);
  const sx = new Spring(0, { response: 0.36, damping: 0.88, precision: 0.05 });
  const sw = new Spring(0, { response: 0.36, damping: 0.88, precision: 0.05 });
  const attr = btns[0].hasAttribute("aria-selected") ? "aria-selected" : "aria-checked";
  let index = Math.max(0, btns.findIndex((b) => b.getAttribute(attr) === "true"));
  const api = { el, onChange: null, get index() { return index; }, select, btns };

  const paint = () => { thumb.style.width = sw.value + "px"; thumb.style.setProperty("--tx", sx.value + "px"); };
  sx.onUpdate = paint; sw.onUpdate = paint;
  function layout(animate) {
    const b = btns[index];
    if (!b.offsetWidth) return;
    if (animate && motion) { sx.to(b.offsetLeft); sw.to(b.offsetWidth); }
    else { sx.set(b.offsetLeft); sw.set(b.offsetWidth); }
  }
  function select(i, { silent = false, animate = true, focus = false } = {}) {
    index = i;
    btns.forEach((b, k) => { b.setAttribute(attr, k === i); b.tabIndex = k === i ? 0 : -1; });
    layout(animate);
    if (focus) btns[i].focus();
    if (!silent && api.onChange) api.onChange(i);
  }
  btns.forEach((b, i) => {
    b.addEventListener("click", () => select(i));
    b.addEventListener("keydown", (e) => {
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      select((i + dir + btns.length) % btns.length, { focus: true });
    });
  });
  btns.forEach((b, k) => { b.tabIndex = k === index ? 0 : -1; });
  new ResizeObserver(() => layout(false)).observe(el);
  if (document.fonts) document.fonts.ready.then(() => layout(false));
  layout(false);
  return api;
}

/* ==========================================================================
   Volet qu'on tire : un seul composant pour le volet du bas et le menu du haut
   - suit le doigt 1:1, avec une résistance élastique du mauvais côté
   - au lâcher : vitesse reprise, destination choisie d'après la projection
   - interruptible : on peut l'attraper pendant qu'il bouge
   ========================================================================== */
function createDrawer({ root: el, panel, dir, grip, size, onOpen, onClosed, inertTargets = [] }) {
  // dir = +1 : se ferme en descendant (volet) ; -1 : se ferme en montant (menu)
  const pos = new Spring(0, { response: 0.42, damping: 1, precision: 0.2 });
  let open = false, lastFocus = null, drag = null, suppressClick = false;
  const vt = new VelocityTracker();
  const hidden = () => dir * size();

  function paint(v) {
    panel.style.setProperty("--y", v + "px");
    const s = size();
    el.style.setProperty("--scrim", clamp(1 - Math.abs(v) / s, 0, 1).toFixed(3));
  }
  pos.onUpdate = paint;

  function setOpenState(on) {
    open = on;
    el.setAttribute("aria-hidden", String(!on));
    inertTargets.forEach((t) => { if (t) on ? t.setAttribute("inert", "") : t.removeAttribute("inert"); });
  }

  function doOpen() {
    if (open) return;
    lastFocus = document.activeElement;
    panel.classList.toggle("is-scrollable", panel.scrollHeight > panel.clientHeight + 1);
    el.classList.add("is-open");
    document.body.classList.add("is-locked");
    setOpenState(true);
    pos.set(hidden());
    pos.to(0, { response: 0.45, damping: 1 });
    requestAnimationFrame(() => (panel.querySelector("[data-autofocus]") || panel).focus({ preventScroll: true }));
    if (onOpen) onOpen();
  }

  function doClose(velocity = 0) {
    if (!open) return;
    setOpenState(false);
    el.classList.add("is-moving");
    el.classList.remove("is-open");
    pos.onRest = () => {
      pos.onRest = null;
      el.classList.remove("is-moving");
      document.body.classList.remove("is-locked");
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
      if (onClosed) onClosed();
    };
    pos.to(hidden(), { velocity, response: 0.42, damping: 1 });
  }

  const canDrag = (target) => {
    if (panel.scrollHeight > panel.clientHeight + 1) return !!(grip && target.closest(grip));
    return true;
  };

  panel.addEventListener("pointerdown", (e) => {
    if (!open || (e.pointerType === "mouse" && e.button !== 0) || !canDrag(e.target)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, started: false, p0: pos.value };
    vt.reset(); vt.push(e.clientY, e.timeStamp);
    pos.grab();                                  // on attrape le volet là où il est
    suppressClick = false;
  });
  panel.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.started) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      if (Math.abs(dx) > Math.abs(dy)) { drag = null; return; }
      drag.started = true; drag.y = e.clientY; drag.p0 = pos.value;
      panel.setPointerCapture(e.pointerId);
    }
    vt.push(e.clientY, e.timeStamp);
    const raw = drag.p0 + (e.clientY - drag.y);
    // du côté de la fermeture : 1:1 ; de l'autre : on résiste
    const towardClose = dir * raw;
    pos.set(towardClose >= 0 ? raw : rubberband(raw, size(), 0.45));
    suppressClick = true;
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const started = drag.started;
    drag = null;
    if (!started) return;
    const v = vt.get();
    const projected = pos.value + project(v);
    const closeIt = dir * projected > size() * 0.5 || dir * v > 1100;
    if (closeIt) doClose(v);
    else pos.to(0, { velocity: v, response: 0.4, damping: Math.abs(v) > 400 ? 0.82 : 1 });
  };
  panel.addEventListener("pointerup", end);
  panel.addEventListener("pointercancel", end);
  panel.addEventListener("click", (e) => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; } }, true);

  el.addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.key === "Escape") { e.stopPropagation(); doClose(); return; }
    if (e.key !== "Tab") return;
    const f = $$('a[href], button:not([disabled]), [tabindex="0"]', panel).filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
  const scrim = $(".sheet__scrim", el);
  if (scrim) scrim.addEventListener("click", () => doClose());

  pos.set(hidden());
  window.addEventListener("resize", () => { if (!open) pos.set(hidden()); });
  return { open: doOpen, close: doClose, get isOpen() { return open; } };
}

/* ==========================================================================
   Intro : le compte-tours monte (ressort sous-amorti), puis le rideau se lève
   ========================================================================== */
function runIntro(done) {
  const intro = $(".intro");
  let seen = false;
  try { seen = sessionStorage.getItem("mk-intro") === "1"; } catch (e) { /* stockage indisponible */ }
  if (!intro || !motion || seen) { if (intro) intro.remove(); done(); return; }
  try { sessionStorage.setItem("mk-intro", "1"); } catch (e) { /* rien */ }

  const dial = buildDial($(".intro__dial svg"), { cx: 100, cy: 100, r: 96, from: -125, to: 125, ticks: 9, red: 2, tick: 9, minor: 1 });
  const needle = new Spring(dial.from, { response: 0.5, damping: 0.5, precision: 0.05 });
  needle.onUpdate = (v) => dial.set(v);
  const curtain = new Spring(0, { response: 0.55, damping: 1, precision: 0.3 });
  curtain.onUpdate = (v) => { intro.style.transform = `translate3d(0, ${v}px, 0)`; };
  const mono = $(".intro__mono .monogram");
  mono.style.transition = "clip-path 0.8s cubic-bezier(0.16, 1, 0.3, 1)";

  requestAnimationFrame(() => {
    needle.to(dial.to - 6);
    mono.style.clipPath = "inset(0% 0 0 0)";
  });
  setTimeout(() => {
    curtain.onRest = () => { intro.remove(); };
    curtain.to(-window.innerHeight - 20);
    done();
  }, 950);
}

/* ==========================================================================
   Compteurs kilométriques des numéros de section
   ========================================================================== */
function initOdometers(io) {
  $$(".odo[data-odo]").forEach((odo) => {
    const digits = odo.dataset.odo.split("");
    odo.textContent = "";
    const sr = document.createElement("span");
    sr.className = "sr-only"; sr.textContent = odo.dataset.odo;
    odo.appendChild(sr);
    digits.forEach((d, i) => {
      const col = document.createElement("span");
      col.className = "odo__col"; col.setAttribute("aria-hidden", "true");
      col.style.setProperty("--i", i);
      col.style.setProperty("--ty", `${-(10 + +d) * 1.6}em`);
      for (let k = 0; k < 20; k++) { const s = document.createElement("span"); s.textContent = k % 10; col.appendChild(s); }
      odo.appendChild(col);
    });
    // sans mouvement : on affiche directement le bon chiffre
    if (!motion) $$(".odo__col", odo).forEach((c) => { c.style.transform = `translateY(${c.style.getPropertyValue("--ty")})`; });
    io.observe(odo);
  });
}

/* ==========================================================================
   Apparitions au défilement
   ========================================================================== */
function initReveals() {
  $$('[data-reveal="lines"]').forEach((h) => $$(".line > span", h).forEach((s, i) => s.style.setProperty("--i", i)));
  $$(".hero__title .line > span").forEach((s, i) => s.style.setProperty("--i", i));
  $$(".hero__bottom > *").forEach((s, i) => s.style.setProperty("--i", i));
  if (!motion || !("IntersectionObserver" in window)) { $$("[data-reveal], .odo").forEach((n) => n.classList.add("is-in")); initOdometers({ observe() {} }); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });
  $$("[data-reveal]").forEach((n) => io.observe(n));
  initOdometers(io);
}

/* ==========================================================================
   Tarifs : onglets
   ========================================================================== */
const TAB_ORDER = ["femme", "homme", "barbier"];
let carteSeg = null;
function initCarte() {
  const el = $("#carte-seg");
  if (!el) return;
  const panels = $$(".tabpanel");
  carteSeg = initSeg(el);
  const show = (i, animate = true) => {
    const name = TAB_ORDER[i];
    panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
    if (animate && motion) {
      const vis = panels.find((p) => !p.hidden);
      $$(".service", vis).forEach((row, k) => row.animate(
        [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
        { duration: 520, delay: k * 35, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }
      ));
    }
  };
  carteSeg.onChange = (i) => show(i);
  show(0, false);
  $$("[data-tab-target]").forEach((a) => a.addEventListener("click", () => selectTab(a.dataset.tabTarget)));
}
function selectTab(name) {
  const i = TAB_ORDER.indexOf(name);
  if (i >= 0 && carteSeg && carteSeg.index !== i) carteSeg.select(i);
}

/* ==========================================================================
   Réalisations : un carrousel qu'on lance
   ========================================================================== */
function initReel(lightbox) {
  const reel = $("#reel");
  if (!reel) return;
  const track = $("#reel-track"), bar = $("#reel-bar"), prev = $("#reel-prev"), next = $("#reel-next");
  reel.classList.add("is-js");
  const x = new Spring(0, { response: 0.5, damping: 1, precision: 0.05 });
  let L = 0, view = 0;
  const cards = () => $$(".shot:not([hidden])", track);

  function measure() {
    view = reel.clientWidth;
    L = Math.max(0, track.scrollWidth - view);
    if (x.value < -L) x.set(-L);
    render(x.value);
  }
  function render(v) {
    track.style.transform = `translate3d(${v}px, 0, 0)`;
    bar.style.transform = `scaleX(${L ? 0.18 + 0.82 * clamp(-v / L, 0, 1) : 1})`;
    prev.disabled = v > -2;
    next.disabled = v < -L + 2;
  }
  x.onUpdate = render;
  const snaps = () => {
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    return cards().map((c) => clamp(-(c.offsetLeft - pad), -L, 0));
  };
  const nearest = (pos) => snaps().reduce((a, b) => (Math.abs(b - pos) < Math.abs(a - pos) ? b : a), 0);
  const step = (dir) => {
    const s = snaps(); if (!s.length) return;
    const i = s.indexOf(nearest(x.value));
    x.to(s[clamp(i + dir, 0, s.length - 1)], { response: 0.5, damping: 0.9 });
  };
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));

  // geste
  const vt = new VelocityTracker();
  let d = null, dragged = false;
  reel.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    d = { id: e.pointerId, x: e.clientX, y: e.clientY, started: false, x0: x.value };
    vt.reset(); vt.push(e.clientX, e.timeStamp);
    x.grab();
    dragged = false;
  });
  reel.addEventListener("pointermove", (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.started) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { d = null; return; }
      d.started = true; d.x = e.clientX; d.x0 = x.value;
      reel.setPointerCapture(e.pointerId);
      reel.classList.add("is-drag");
    }
    vt.push(e.clientX, e.timeStamp);
    const raw = d.x0 + (e.clientX - d.x);
    const over = raw > 0 ? raw : raw < -L ? raw + L : 0;
    x.set(clamp(raw, -L, 0) + rubberband(over, view));      // 1:1, puis résistance aux bords
    dragged = true;
  });
  const end = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const started = d.started; d = null;
    reel.classList.remove("is-drag");
    if (!started) return;
    const v = vt.get();
    if (x.value > 0 || x.value < -L) { x.to(x.value > 0 ? 0 : -L, { velocity: v, response: 0.45, damping: 1 }); return; }
    const target = nearest(clamp(x.value + project(v), -L, 0));
    x.to(target, { velocity: v, response: 0.5, damping: Math.abs(v) > 500 ? 0.84 : 1 });
  };
  reel.addEventListener("pointerup", end);
  reel.addEventListener("pointercancel", end);
  reel.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);

  // trackpad horizontal
  let wheelT = 0;
  reel.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    x.grab(); x.set(clamp(x.value - e.deltaX, -L, 0));
    clearTimeout(wheelT);
    wheelT = setTimeout(() => x.to(nearest(x.value), { response: 0.45, damping: 1 }), 130);
  }, { passive: false });

  reel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });

  // ouverture de la visionneuse
  $$(".shot__btn", track).forEach((btn) => btn.addEventListener("click", () => {
    const list = cards().filter((c) => c.querySelector(".shot__btn"));
    lightbox.open(list, list.indexOf(btn.closest(".shot")));
  }));

  // filtres
  const filter = initSeg($("#filter-seg"));
  filter.onChange = (i) => {
    const f = filter.btns[i].dataset.filter;
    $$(".shot[data-cat]", track).forEach((c) => { c.hidden = f !== "all" && c.dataset.cat !== f; });
    measure();
    x.to(0, { response: 0.5, damping: 1 });
    if (motion) cards().forEach((c, k) => c.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: k * 45, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }));
  };

  new ResizeObserver(measure).observe(reel);
  window.addEventListener("load", measure);
  measure();
}

/* ==========================================================================
   Visionneuse : on glisse pour changer de photo, on tire vers le bas pour fermer.
   La photo part de sa vignette et y revient (même chemin à l'aller et au retour).
   ========================================================================== */
function initLightbox() {
  const lb = $("#lb");
  const slide = $(".lb__slide", lb), img = $(".lb__img", lb), cap = $("#lb-caption"), stageEl = $(".lb__stage", lb);
  const sx = new Spring(0, { response: 0.42, damping: 0.9, precision: 0.1 });
  const sy = new Spring(0, { response: 0.42, damping: 0.9, precision: 0.1 });
  const ss = new Spring(1, { response: 0.42, damping: 0.9, precision: 0.001 });
  const sc = new Spring(0, { response: 0.4, damping: 1, precision: 0.002 });
  let items = [], idx = 0, open = false, opener = null;

  const paint = () => {
    slide.style.setProperty("--x", sx.value + "px");
    slide.style.setProperty("--y", sy.value + "px");
    slide.style.setProperty("--s", ss.value);
    lb.style.setProperty("--scrim", clamp(sc.value, 0, 1));
  };
  [sx, sy, ss, sc].forEach((s) => { s.onUpdate = paint; });

  function load(i) {
    idx = i;
    const fig = items[i], src = fig.querySelector("img");
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    cap.textContent = fig.querySelector("figcaption").textContent.trim().replace(/\s+/, " · ");
    $(".lb__prev", lb).hidden = i === 0;
    $(".lb__next", lb).hidden = i === items.length - 1;
  }

  // décalage et échelle qui ramènent la photo sur sa vignette
  function thumbTransform() {
    const th = items[idx].querySelector("img");
    const r = th.getBoundingClientRect(), f = img.getBoundingClientRect();
    if (!f.width || !r.width) return null;
    const s = r.width / (f.width / ss.value);
    return { x: r.left + r.width / 2 - (f.left + f.width / 2 - sx.value), y: r.top + r.height / 2 - (f.top + f.height / 2 - sy.value), s };
  }

  async function openAt(list, i) {
    items = list; opener = document.activeElement;
    load(i);
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    [sx, sy, ss, sc].forEach((s) => s.grab());
    ss.set(1); sx.set(0); sy.set(0); sc.set(0);
    try { await img.decode(); } catch (e) { /* image déjà en cache ou non décodable */ }
    open = true;
    const t = motion ? thumbTransform() : null;
    if (t) { sx.set(t.x); sy.set(t.y); ss.set(t.s); }
    sc.to(1);
    sx.to(0, { response: 0.5, damping: 0.92 }); sy.to(0, { response: 0.5, damping: 0.92 }); ss.to(1, { response: 0.5, damping: 0.92 });
    stageEl.focus({ preventScroll: true });
  }

  function close(velocity = 0) {
    if (!open) return;
    open = false;
    lb.classList.add("is-moving");
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    const t = thumbTransform();
    sc.onRest = () => {
      sc.onRest = null;
      lb.classList.remove("is-moving");
      document.body.classList.remove("is-locked");
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
    sc.to(0, { response: 0.4, damping: 1 });
    if (t && motion) {
      sx.to(t.x, { response: 0.45, damping: 1 }); sy.to(t.y, { velocity, response: 0.45, damping: 1 }); ss.to(t.s, { response: 0.45, damping: 1 });
    } else { sy.to(0); }
  }

  function go(dir) {
    const n = idx + dir;
    if (n < 0 || n >= items.length) return;
    const W = stageEl.clientWidth;
    const out = -dir * W;
    sx.onRest = () => {
      sx.onRest = null;
      load(n);
      sx.set(dir * W);
      sx.to(0, { response: 0.45, damping: 0.95 });
    };
    sx.to(out, { response: 0.3, damping: 1 });
  }

  // gestes
  const vtX = new VelocityTracker(), vtY = new VelocityTracker();
  let g = null;
  stageEl.addEventListener("pointerdown", (e) => {
    if (!open || (e.pointerType === "mouse" && e.button !== 0)) return;
    g = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, x0: sx.value, y0: sy.value };
    vtX.reset(); vtY.reset(); vtX.push(e.clientX, e.timeStamp); vtY.push(e.clientY, e.timeStamp);
    sx.grab(); sy.grab(); ss.grab();
  });
  stageEl.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      g.x = e.clientX; g.y = e.clientY; g.x0 = sx.value; g.y0 = sy.value;
      stageEl.setPointerCapture(e.pointerId);
      return;
    }
    vtX.push(e.clientX, e.timeStamp); vtY.push(e.clientY, e.timeStamp);
    if (g.axis === "x") {
      const raw = g.x0 + (e.clientX - g.x);
      const blocked = (raw > 0 && idx === 0) || (raw < 0 && idx === items.length - 1);
      sx.set(blocked ? rubberband(raw, stageEl.clientWidth) : raw);
    } else {
      const raw = g.y0 + (e.clientY - g.y);
      const H = stageEl.clientHeight;
      sy.set(raw > 0 ? raw : rubberband(raw, H));
      const p = clamp(raw / (H * 0.6), 0, 1);
      ss.set(1 - p * 0.25);
      sc.set(1 - p * 0.75);
    }
  });
  const gEnd = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const cur = g; g = null;
    if (!cur.axis) { // simple tap : on ferme
      if (e.target === stageEl || e.target.closest(".lb__slide") === null) close();
      return;
    }
    if (cur.axis === "x") {
      const W = stageEl.clientWidth, v = vtX.get();
      const projected = sx.value + project(v);
      if (projected < -W * 0.3 && idx < items.length - 1) go(1);
      else if (projected > W * 0.3 && idx > 0) go(-1);
      else sx.to(0, { velocity: v, response: 0.4, damping: Math.abs(v) > 400 ? 0.82 : 1 });
    } else {
      const H = stageEl.clientHeight, v = vtY.get();
      const projected = sy.value + project(v);
      if (projected > H * 0.3 || v > 1100) close(v);
      else { sy.to(0, { velocity: v, response: 0.4, damping: 0.85 }); ss.to(1); sc.to(1); }
    }
  };
  stageEl.addEventListener("pointerup", gEnd);
  stageEl.addEventListener("pointercancel", gEnd);

  $(".lb__scrim", lb).addEventListener("click", () => close());
  $("[data-close-lb]", lb).addEventListener("click", () => close());
  $(".lb__prev", lb).addEventListener("click", () => go(-1));
  $(".lb__next", lb).addEventListener("click", () => go(1));
  lb.addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "Tab") {
      const f = $$("button:not([hidden])", lb).concat([stageEl]);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  return { open: openAt, close };
}

/* ==========================================================================
   Jauge de défilement (ordinateur) : l'aiguille suit la lecture
   ========================================================================== */
function initGauge() {
  const gauge = $(".gauge");
  if (!gauge || window.innerWidth < 960) return;
  const dial = buildDial($("svg", gauge), { cx: 50, cy: 50, r: 46, from: -90, to: 90, ticks: 7, red: 1, tick: 7 });
  const val = $(".gauge__value", gauge);
  const needle = new Spring(dial.from, { response: 0.3, damping: 0.9, precision: 0.05 });
  needle.onUpdate = (v) => dial.set(v);
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    needle.to(dial.from + (dial.to - dial.from) * p);
    val.textContent = String(Math.round(p * 100)).padStart(3, "0");
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
  return { show() { gauge.classList.add("is-on"); } };
}

/* ==========================================================================
   Navigation, ancres, barre mobile
   ========================================================================== */
function initNav(menu) {
  const nav = $("#nav");
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-solid", y > 24);
    const down = y > lastY + 2, up = y < lastY - 2;
    if (!menu.isOpen) {
      if (down && y > window.innerHeight * 0.7) nav.classList.add("is-hidden");
      else if (up || y < 80) nav.classList.remove("is-hidden");
    }
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));

  // L'enseigne est suspendue : elle se balance quand on défile ou qu'on la touche (ressort, pivot en haut)
  const sign = $("#sign");
  if (sign && !reduced) {
    const sway = new Spring(0, { response: 0.9, damping: 0.18, precision: 0.01 });
    sway.onUpdate = (v) => sign.style.setProperty("--rot", v.toFixed(2) + "deg");
    let sy = window.scrollY, last = 0;
    window.addEventListener("scroll", () => {
      const now = performance.now(), dy = window.scrollY - sy; sy = window.scrollY;
      if (now - last < 60 || Math.abs(dy) < 6) return;
      last = now;
      sway.to(0, { velocity: clamp(-dy * 0.9, -40, 40) });
    }, { passive: true });
    sign.addEventListener("pointerenter", () => sway.to(0, { velocity: 26 }));
    sway.to(0, { velocity: 22 });
  }

  const dock = $("#dock"), heroEl = $(".hero");
  if (dock && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => dock.classList.toggle("is-on", !en.isIntersecting), { threshold: 0.05 }).observe(heroEl);
  }
}

/* ==========================================================================
   Démarrage
   ========================================================================== */
function start() {
  initReveals();
  initCarte();
  updateStatus();
  setInterval(updateStatus, 60 * 1000);
  $$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));

  const sheetRoot = $("#sheet");
  const sheet = createDrawer({
    root: sheetRoot, panel: $(".sheet__panel", sheetRoot), dir: 1, grip: ".sheet__grip",
    size: () => $(".sheet__panel", sheetRoot).offsetHeight + 40,
    inertTargets: [$("#contenu"), $("#nav")],
  });
  $$("[data-open-sheet]").forEach((b) => b.addEventListener("click", () => sheet.open()));
  $$("[data-close-sheet]").forEach((b) => b.addEventListener("click", () => sheet.close()));

  const menuRoot = $("#menu"), toggle = $(".menu-toggle"), toggleLabel = $(".menu-toggle__label");
  const menu = createDrawer({
    root: menuRoot, panel: $(".menu__panel", menuRoot), dir: -1, grip: null,
    size: () => window.innerHeight + 20,
    inertTargets: [$("#contenu")],
    onOpen: () => { toggle.setAttribute("aria-expanded", "true"); toggleLabel.textContent = "Fermer"; $("#nav").classList.remove("is-hidden"); },
    onClosed: () => { toggle.setAttribute("aria-expanded", "false"); toggleLabel.textContent = "Menu"; },
  });
  menuRoot.setAttribute("aria-hidden", "true");
  toggle.setAttribute("role", "button");
  toggle.addEventListener("click", (e) => { e.preventDefault(); if (menu.isOpen) { menu.close(); toggle.setAttribute("aria-expanded", "false"); toggleLabel.textContent = "Menu"; } else menu.open(); });
  $(".menu__link", menuRoot).setAttribute("data-autofocus", "");

  const lightbox = initLightbox();
  initReel(lightbox);
  initNav(menu);

  // ancres : défilement natif fluide, le volet se range d'abord
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2 || id === "#menu") return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    const go = () => { target.scrollIntoView({ behavior, block: "start" }); history.replaceState(null, "", id); target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); };
    if (menu.isOpen) { menu.close(); setTimeout(go, 260); } else go();
  }));

  // hero
  const views = initSeg($("#views .seg"));
  hero = initHero({
    stage: $("#stage"), poster: $("#stage-poster"), canvas: $("#stage-canvas"), spots: $("#stage-spots"),
    seg: views,
    getSign: () => openStatus().sign,
    onAction: (a) => {
      if (a === "sheet") sheet.open();
      else if (a.startsWith("tab:")) { selectTab(a.slice(4)); $("#prestations").scrollIntoView({ behavior, block: "start" }); }
    },
  });

  // l'enseigne en 3D est dessinée avec les polices du site : on la redessine quand elles sont prêtes
  if (document.fonts) document.fonts.ready.then(updateStatus);

  const gauge = initGauge();
  runIntro(() => { $(".hero").classList.add("is-in"); if (gauge) gauge.show(); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
