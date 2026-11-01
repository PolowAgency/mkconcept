/* MK Concept : horaires en direct, menu, onglets, salon 3D. Aucune bibliothèque d'animation. */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
root.classList.add("js");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Horaires : calculés pour Douai, quel que soit le fuseau du visiteur */
const HOURS = { 1: [14, 18], 2: [9.5, 19], 3: [9.5, 19], 4: [10, 20], 5: [9, 19], 6: [9, 18], 0: null };
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const fmtH = (h) => { const H = Math.floor(h), M = Math.round((h - H) * 60); return M ? `${H}h${String(M).padStart(2, "0")}` : `${H}h`; };
function parisNow() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), t: +get("hour") + +get("minute") / 60 };
}
function openStatus() {
  const { day, t } = parisNow();
  const today = HOURS[day];
  if (today && t >= today[0] && t < today[1]) { const u = fmtH(today[1]); return { open: true, day, line: `Ouvert jusqu'à ${u}`, sign: ["Ouvert", `jusqu'à ${u}`] }; }
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7, h = HOURS[d];
    if (!h || (i === 0 && t >= h[0])) continue;
    const when = i === 0 ? `à ${fmtH(h[0])}` : i === 1 ? `demain à ${fmtH(h[0])}` : `${DAYS[d]} à ${fmtH(h[0])}`;
    return { open: false, day, line: `Fermé · ouvre ${when}`, sign: ["Fermé", `ouvre ${when}`] };
  }
  return { open: false, day, line: "Fermé", sign: ["Fermé", ""] };
}
function updateStatus() {
  const s = openStatus();
  $("#status-line").textContent = s.line;
  $("#status-dot").dataset.open = s.open;
  $("#dialog-status").textContent = s.line;
  $("#dialog-dot").dataset.open = s.open;
  $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", +tr.dataset.day === s.day));
}
updateStatus();
setInterval(updateStatus, 60000);

/* Menu mobile */
const nav = $("#nav"), toggle = $(".nav__toggle");
const setMenu = (open) => { nav.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", open); };
toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
$$("#nav-links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

/* Fenêtre des horaires */
const dlg = $("#hours");
const openHours = () => { setMenu(false); if (!dlg.open) dlg.showModal(); };
$$("[data-open-hours]").forEach((b) => b.addEventListener("click", openHours));
$$("[data-close-hours]").forEach((b) => b.addEventListener("click", () => dlg.close()));
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

/* Vidéo de présentation : lecture automatique (sans son) une fois la page chargée */
const vid = $("#hero-video");
if (vid) {
  if (reduced) { /* mouvement réduit : on garde l'image fixe */ }
  else {
    const start = () => { vid.preload = "auto"; vid.play().catch(() => {}); };
    if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });
  }
}

/* Contrôle segmenté : la pastille glisse sous le bouton actif */
function initSeg(el) {
  const thumb = $(".seg__thumb", el), btns = $$("button", el);
  const api = { onChange: null, select(i, { silent } = {}) {
    btns.forEach((b, k) => { b.setAttribute(b.hasAttribute("aria-selected") ? "aria-selected" : "aria-checked", k === i); b.tabIndex = k === i ? 0 : -1; });
    const b = btns[i];
    thumb.style.width = b.offsetWidth + "px";
    thumb.style.setProperty("--tx", b.offsetLeft + "px");
    thumb.style.transform = `translate3d(${b.offsetLeft}px,0,0)`;
    if (!silent && api.onChange) api.onChange(i);
  } };
  const current = () => Math.max(0, btns.findIndex((b) => b.getAttribute("aria-selected") === "true" || b.getAttribute("aria-checked") === "true"));
  btns.forEach((b, i) => {
    b.addEventListener("click", () => api.select(i));
    b.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); const n = (i + d + btns.length) % btns.length; api.select(n); btns[n].focus(); }
    });
  });
  const place = () => api.select(current(), { silent: true });
  new ResizeObserver(place).observe(el);
  document.fonts && document.fonts.ready.then(place);
  place();
  return api;
}
const carteSeg = initSeg($("#carte-seg"));

/* Onglets des tarifs */
const names = ["femme", "homme", "barbier"];
$$("[data-tab-target]").forEach((a) => a.addEventListener("click", () => showTab(a.dataset.tabTarget)));
carteSeg.onChange = (i) => {
  names.forEach((n, k) => { const p = $("#p-" + n); p.hidden = k !== i; if (k === i) { p.classList.remove("swap"); void p.offsetWidth; p.classList.add("swap"); } });
};
function showTab(name) { const i = names.indexOf(name); if (i >= 0) { carteSeg.select(i); } }

/* Texte d'ouverture : les mots s'allument au fil du défilement */
const lead = $(".statement__text");
if (lead && !reduced) {
  const words = [];
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          const s = document.createElement("span"); s.className = "w"; s.textContent = t; frag.appendChild(s); words.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrap(n);
    });
  };
  wrap(lead);
  lead.classList.add("is-read");
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = lead.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.25)));
    const on = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("on", i < on));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}

/* Entrée du héros : le titre monte lettre par lettre */
const ht = $(".hero__title");
if (ht && !reduced) {
  const txt = ht.firstChild.textContent; const extra = ht.querySelector(".sr-only"); ht.textContent = ""; if (extra) ht.appendChild(extra);
  [...txt].forEach((ch, i) => {
    const s = document.createElement("span"); s.className = "ch"; s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--i", i); s.textContent = ch === " " ? "\u00a0" : ch; ht.insertBefore(s, extra || null);
  });
  requestAnimationFrame(() => document.body.classList.add("is-loaded"));
} else document.body.classList.add("is-loaded");

/* Titres de section : un masque qui se lève */
if (!reduced) $$(".h2").forEach((n) => n.classList.add("t-rise"));

/* Défilement : la vidéo du héros glisse plus lentement que la page */
const heroMedia = $("#hero-media");
if (heroMedia && !reduced) {
  let ticking2 = false;
  addEventListener("scroll", () => { if (ticking2) return; ticking2 = true; requestAnimationFrame(() => { ticking2 = false; const y = Math.min(scrollY, innerHeight); heroMedia.style.transform = `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y / innerHeight * 0.06})`; }); }, { passive: true });
}

/* Barre mobile : visible une fois le héros passé */
const dock = $("#dock"), heroEl = $("#top");
if (dock && "IntersectionObserver" in window) new IntersectionObserver(([en]) => dock.classList.toggle("is-on", !en.isIntersecting), { threshold: 0.1 }).observe(heroEl);

/* Apparition douce */
if (!reduced && "IntersectionObserver" in window) {
  root.classList.add("reveal");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" });
  $$(".cat, .works__grid li, .team__grid li, .avis__crit li, .t-rise, .avis__note, .avis__count, .avis__btns, .team__cta, .carte__cta, .ft-cols > div, .ft-top > *, .svc").forEach((n) => {
    const sib = [...n.parentElement.children].filter((c) => c.matches(".cat, li, div"));
    n.style.setProperty("--d", Math.min(sib.indexOf(n), 6) * 90 + "ms");
    n.classList.add("rv"); io.observe(n);
  });
}

$$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
