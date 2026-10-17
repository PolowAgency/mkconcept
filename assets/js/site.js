/* MK Concept : horaires en direct, menu mobile, onglets des tarifs. Aucune bibliothèque. */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

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
  if (today && t >= today[0] && t < today[1]) return { open: true, day, line: `Ouvert jusqu'à ${fmtH(today[1])}` };
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7, h = HOURS[d];
    if (!h || (i === 0 && t >= h[0])) continue;
    const when = i === 0 ? `à ${fmtH(h[0])}` : i === 1 ? `demain à ${fmtH(h[0])}` : `${DAYS[d]} à ${fmtH(h[0])}`;
    return { open: false, day, line: `Fermé · ouvre ${when}` };
  }
  return { open: false, day, line: "Fermé" };
}

function updateStatus() {
  const s = openStatus();
  $("#status-line").textContent = s.line;
  $("#status-dot").dataset.open = s.open;
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

/* Onglets des tarifs */
const tabs = $$("#carte-seg [role=tab]");
function selectTab(name, focus) {
  tabs.forEach((t) => {
    const on = t.id === "tab-" + name;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    $("#" + t.getAttribute("aria-controls")).hidden = !on;
    if (on && focus) t.focus();
  });
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t.id.slice(4)));
  t.addEventListener("keydown", (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length].id.slice(4), true); }
  });
});
$$("[data-tab-target]").forEach((a) => a.addEventListener("click", () => selectTab(a.dataset.tabTarget)));

/* Apparition douce au défilement */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  document.documentElement.classList.add("reveal");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".hero__media, .tile, .band__in li, .works figure, .karine__in, .avis__note").forEach((n) => { n.classList.add("rv"); io.observe(n); });
}

$$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
