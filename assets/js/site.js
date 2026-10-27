/* MK Concept : horaires en direct, menu, onglets, salon 3D. Aucune bibliothèque d'animation. */
import { initHero } from "./hero.js";

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
let hero = null;
function updateStatus() {
  const s = openStatus();
  $("#status-line").textContent = s.line;
  $("#status-dot").dataset.open = s.open;
  $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", +tr.dataset.day === s.day));
  if (hero) hero.setSign(s.sign[0], s.sign[1]);
}
updateStatus();
setInterval(updateStatus, 60000);

/* Menu mobile */
const nav = $("#nav"), toggle = $(".nav__toggle");
const setMenu = (open) => { nav.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", open); };
toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
$$("#nav-links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

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
const segs = $$("[data-seg]").map(initSeg);
const viewsSeg = segs[0], carteSeg = segs[1];

/* Onglets des tarifs */
const names = ["femme", "homme", "barbier"];
carteSeg.onChange = (i) => {
  names.forEach((n, k) => { $("#p-" + n).hidden = k !== i; });
};
function showTab(name) { const i = names.indexOf(name); if (i >= 0) { carteSeg.select(i); } }

/* Salon 3D (se charge au premier geste) */
const go = (id) => $(id).scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
hero = initHero({
  stage: $("#stage"), poster: $("#stage-poster"), canvas: $("#stage-canvas"), spots: $("#stage-spots"), seg: viewsSeg,
  getSign: () => openStatus().sign,
  onAction: (a) => { if (a.startsWith("tab:")) { showTab(a.slice(4)); go("#prestations"); } else go("#contact"); },
});
updateStatus();

/* Défilement à la souris sur la bande de réalisations */
const track = $("#works-track");
if (track) {
  let down = null;
  track.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") down = { x: e.clientX, s: track.scrollLeft, m: false }; });
  addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 4) { down.m = true; track.style.scrollSnapType = "none"; } if (down.m) track.scrollLeft = down.s - dx; });
  addEventListener("pointerup", () => { if (down) track.style.scrollSnapType = ""; down = null; });
  track.addEventListener("dragstart", (e) => e.preventDefault());
}

/* Apparition douce */
if (!reduced && "IntersectionObserver" in window) {
  root.classList.add("reveal");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$("[data-reveal]").forEach((n) => io.observe(n));
}
$$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
