/* MK Concept : défilement doux, mouvements au défilement, horaires en direct. */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactile = matchMedia("(hover: none)").matches;
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;

/* ---------- Horaires, heure de Douai ---------- */
const HOURS = { 1: [14, 18], 2: [9.5, 19], 3: [9.5, 19], 4: [10, 20], 5: [9, 19], 6: [9, 18], 0: null };
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const fmtH = (h) => { const H = Math.floor(h), M = Math.round((h - H) * 60); return M ? `${H}h${String(M).padStart(2, "0")}` : `${H}h`; };
function parisNow() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), t: +get("hour") + +get("minute") / 60 };
}
function openStatus() {
  const { day, t } = parisNow(), today = HOURS[day];
  if (today && t >= today[0] && t < today[1]) return { open: true, day, line: `Ouvert jusqu'à ${fmtH(today[1])}` };
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7, h = HOURS[d];
    if (!h || (i === 0 && t >= h[0])) continue;
    const when = i === 0 ? `à ${fmtH(h[0])}` : i === 1 ? `demain à ${fmtH(h[0])}` : `${JOURS[d]} à ${fmtH(h[0])}`;
    return { open: false, day, line: `Fermé · ouvre ${when}` };
  }
  return { open: false, day, line: "Fermé" };
}
function updateStatus() {
  const s = openStatus();
  const l = $("#status-line"); l.textContent = s.line; l.classList.toggle("ouvert-l", s.open); l.classList.toggle("ferme-l", !s.open);
  $("#dialog-status").textContent = s.line; $("#dialog-dot").dataset.open = s.open;
  $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", +tr.dataset.day === s.day));
  $$("#hor li").forEach((li) => li.classList.toggle("auj", +li.dataset.j === s.day));
}
updateStatus(); setInterval(updateStatus, 60000);

/* ---------- Découpes : lettres du titre, mots des titres ---------- */
const hero = $(".hero__title");
hero.innerHTML = [...hero.textContent].map((c, i) => `<span style="--i:${i}" aria-hidden="true">${c === " " ? "&nbsp;" : c}</span>`).join("");
$$(".tt").forEach((t) => {
  t.setAttribute("aria-label", t.textContent);
  let i = 0;
  t.innerHTML = t.textContent.trim().split(/\s+/).map((w) => `<span class="m" aria-hidden="true"><span style="--i:${i++}">${w}</span></span>`).join(" ");
});
const lu = $("#lu");
lu.innerHTML = lu.textContent.split(" ").map((w) => `<span>${w}</span>`).join(" ");
const luMots = $$("span", lu);
const mots = ["Coupe femme", "Coupe homme", "Balayage", "Couleur", "Barbe", "Rasage à l'ancienne", "Coiffure de mariée", "Dégradé"];
$("#defile").innerHTML = [...mots, ...mots, ...mots, ...mots].map((m) => `<span>${m}</span>`).join("");
$$("main img").forEach((i) => { if (i.complete && i.naturalWidth) return; i.classList.add("att"); const ok = () => i.classList.remove("att"); i.addEventListener("load", ok); i.addEventListener("error", ok); });

/* ---------- Défilement doux ---------- */
let lenis = null;
function startLenis() {
  if (calme || !window.Lenis) return;
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  lenis.on("scroll", scene);
}
const vers = (cible) => {
  const el = typeof cible === "string" ? $(cible) : cible; if (!el) return;
  const y = el.getBoundingClientRect().top + scrollY - 80;
  lenis ? lenis.scrollTo(y, { duration: 1.1 }) : scrollTo({ top: y, behavior: calme ? "auto" : "smooth" });
};

/* ---------- Apparitions ---------- */
const compter = (e) => {
  const c = +e.dataset.n, dec = +e.dataset.dec || 0, t0 = performance.now(), d = 1800;
  (function f(t) { const k = borne((t - t0) / d), v = c * (1 - Math.pow(1 - k, 4)); e.textContent = v.toFixed(dec).replace(".", ","); if (k < 1) requestAnimationFrame(f); else e.textContent = c.toFixed(dec).replace(".", ","); })(t0);
};
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  if (!calme) $$("[data-n]", e.target).forEach(compter);
  io.unobserve(e.target);
}), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
$$(".rv, .tt, .score").forEach((el) => io.observe(el));

/* ---------- Scènes liées au défilement ---------- */
const part = (el) => { const r = el.getBoundingClientRect(); return borne(-r.top / (r.height - innerHeight)); };
const entree = (el) => { const r = el.getBoundingClientRect(); return borne((innerHeight - r.top) / (innerHeight + r.height)); };
const nav = $("#nav"), jauge = $("#jauge"), dock = $("#dock");
const ouvre = $("#ouvre"), oi = $(".img", ouvre), ol = $(".leg", ouvre);
const noms = $("#noms"), n1 = $("#n1"), n2 = $("#n2"), n3 = $("#n3");
const rail = $("#realisations"), piste = $("#piste");
const heroEl = $(".hero"); const parallax = $$("[data-p]");
function scene() {
  const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
  nav.classList.toggle("ombre", y > 10);
  jauge.style.transform = `scaleX(${borne(y / h)})`;
  dock.classList.toggle("is-on", y > heroEl.offsetHeight * 0.7);
  if (calme) return;
  parallax.forEach((e) => { const r = e.parentElement.getBoundingClientRect(); const c = r.top + r.height / 2 - innerHeight / 2; e.style.translate = `0 ${(c * +e.dataset.p).toFixed(1)}px`; });
  /* la façade s'ouvre */
  const p = part(ouvre), m = innerWidth < 820, k = p * p * (3 - 2 * p);
  const fin = m ? 0 : Math.max(0, (innerWidth - 600) / 2 / innerWidth * 100); /* la photo est verticale : on la garde nette, sans l'étirer */
  oi.style.clipPath = `inset(${mix(m ? 12 : 10, 0, k)}% ${mix(m ? 12 : 30, fin, k)}% ${mix(m ? 6 : 4, 0, k)}% ${mix(m ? 12 : 30, fin, k)}% round ${mix(400, 24, k)}px ${mix(400, 24, k)}px ${mix(24, 24, k)}px ${mix(24, 24, k)}px)`;
  oi.firstElementChild.style.transform = `scale(${mix(1.25, 1, k)})`;
  ol.style.opacity = borne((p - 0.55) * 3); ol.style.transform = `translateY(${mix(24, 0, borne((p - 0.55) * 3))}px)`;
  /* les prénoms se rejoignent */
  const r = noms.getBoundingClientRect(), q = borne(1 - (r.top + r.height / 2 - innerHeight * 0.35) / (innerHeight * 0.9)), d = (1 - borne(q * 1.15)) * 30;
  n1.style.transform = `translateX(${-d}vw)`; n2.style.transform = `translateX(${d}vw)`; n3.style.transform = `translateX(${-d}vw)`;
  /* texte lu mot à mot */
  const rl = lu.getBoundingClientRect(), ql = borne((innerHeight * 0.86 - rl.top) / (innerHeight * 0.5 + rl.height));
  luMots.forEach((w, i) => (w.style.opacity = i / luMots.length < ql ? 1 : 0.5));
  /* le rail défile à l'horizontale */
  if (innerWidth > 760) { const pr = part(rail), mx = piste.scrollWidth - innerWidth + 40; piste.style.transform = `translate3d(${-pr * mx}px,0,0)`; }
  else piste.style.transform = "";
}
if (!lenis) { let t = false; addEventListener("scroll", () => { if (!t) { t = true; requestAnimationFrame(() => { scene(); t = false; }); } }, { passive: true }); }
addEventListener("resize", scene);

/* ---------- Boutons magnétiques ---------- */
if (!tactile && !calme) $$(".btn.b1").forEach((b) => {
  b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.14}px, ${(e.clientY - r.top - r.height / 2) * 0.22}px)`; });
  b.addEventListener("pointerleave", () => { b.style.transform = ""; });
});

/* ---------- Menu ---------- */
const burger = $("#burger");
const fermer = () => { document.body.classList.remove("ouvert"); burger.setAttribute("aria-expanded", "false"); lenis && lenis.start(); };
burger.addEventListener("click", () => { const o = document.body.classList.toggle("ouvert"); burger.setAttribute("aria-expanded", o); if (lenis) o ? lenis.stop() : lenis.start(); });
$$("#menu a").forEach((a) => a.addEventListener("click", (e) => { fermer(); const h = a.getAttribute("href"); if (h && h.startsWith("#")) { e.preventDefault(); vers(h); } }));
addEventListener("keydown", (e) => { if (e.key === "Escape") fermer(); });
$$('a[href="#top"], a[data-tab]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); vers(a.getAttribute("href")); }));

/* lien actif dans le menu */
const liens = $$("#menu a[href^='#']");
const ids = liens.map((a) => $(a.getAttribute("href")));
new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const i = ids.indexOf(e.target); liens.forEach((a, k) => a.classList.toggle("on", k === i)); } }), { rootMargin: "-45% 0px -50% 0px" }).observe && ids.forEach((s, i) => s && new IntersectionObserver(([e]) => { if (e.isIntersecting) liens.forEach((a, k) => a.classList.toggle("on", k === i)); }, { rootMargin: "-45% 0px -50% 0px" }).observe(s));

/* ---------- Fenêtre des horaires ---------- */
const dlg = $("#hours");
const ouvrirH = () => { fermer(); if (!dlg.open) dlg.showModal(); };
$$("[data-open-hours]").forEach((b) => b.addEventListener("click", ouvrirH));
$$("[data-close-hours]").forEach((b) => b.addEventListener("click", () => dlg.close()));
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

/* ---------- Tarifs : onglets ---------- */
const onglets = $$("#carte-seg [role=tab]"), ind = $("#ind");
const placer = () => { const b = onglets.find((t) => t.getAttribute("aria-selected") === "true"); if (b && b.offsetWidth) { ind.style.left = b.offsetLeft + "px"; ind.style.width = b.offsetWidth + "px"; } };
function choisir(nom) {
  onglets.forEach((t) => {
    const on = t.id === "tab-" + nom;
    t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
    const p = $("#" + t.getAttribute("aria-controls")); p.hidden = !on;
    if (on) { p.classList.remove("swap"); void p.offsetWidth; p.classList.add("swap"); }
  });
  placer();
}
onglets.forEach((t, i) => {
  t.addEventListener("click", () => choisir(t.id.slice(4)));
  t.addEventListener("keydown", (e) => { const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (d) { e.preventDefault(); const n = onglets[(i + d + onglets.length) % onglets.length]; choisir(n.id.slice(4)); n.focus(); } });
});
$$("a[data-tab]").forEach((a) => a.addEventListener("click", () => choisir(a.dataset.tab)));
addEventListener("resize", placer);
document.fonts && document.fonts.ready.then(placer);
placer();

/* ---------- Vidéo du héros ---------- */
const vid = $("#hero-video");
if (vid && !calme) {
  const go = () => { vid.preload = "auto"; vid.play().then(() => vid.parentElement.classList.add("lit")).catch(() => {}); };
  /* on attend un premier geste (ou quelques secondes) pour ne pas charger la vidéo avant la page */
  let lancee = false; const une = () => { if (lancee) return; lancee = true; ["pointerdown", "keydown", "scroll", "touchstart"].forEach((e) => removeEventListener(e, une)); go(); };
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((e) => addEventListener(e, une, { passive: true }));
  addEventListener("load", () => setTimeout(une, 4000), { once: true });
}

$$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));

/* ---------- Lancement : intro, puis rideau qui se lève ---------- */
const intro = $("#intro");
function lancer() {
  root.classList.add("pret"); intro && intro.classList.add("fin"); startLenis(); scene();
  setTimeout(() => intro && intro.remove(), 1200);
}
if (calme) { root.classList.add("pret"); intro && intro.remove(); scene(); }
else setTimeout(lancer, 1500);
scene();
