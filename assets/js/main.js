/* ==========================================================================
   MK Concept — comportements
   GSAP + ScrollTrigger + Lenis. Tout se désactive proprement si
   prefers-reduced-motion est actif ou si les librairies manquent.
   ========================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const motion = hasGsap && !reduced;

  if (!motion) root.classList.remove("motion");
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ------------------------------------------------------------------------
     Cadran : arc, graduations, zone rouge (en or), aiguille.
     Les angles partent du haut (0°) dans le sens horaire.
     ------------------------------------------------------------------------ */
  const NS = "http://www.w3.org/2000/svg";
  function buildDial(svg, { cx, cy, r, from, to, ticks, red, tick, minor = 0 }) {
    const pt = (a, rad) => {
      const t = (a * Math.PI) / 180;
      return [cx + rad * Math.sin(t), cy - rad * Math.cos(t)];
    };
    const el = (name, attrs) => {
      const n = document.createElementNS(NS, name);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      svg.appendChild(n);
      return n;
    };
    const [x1, y1] = pt(from, r);
    const [x2, y2] = pt(to, r);
    el("path", {
      class: "dial-arc",
      d: `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`,
    });
    const steps = (ticks - 1) * (minor + 1);
    for (let i = 0; i <= steps; i++) {
      const major = i % (minor + 1) === 0;
      const a = from + ((to - from) * i) / steps;
      const len = major ? tick : tick * 0.45;
      const [ax, ay] = pt(a, r - 3);
      const [bx, by] = pt(a, r - 3 - len);
      el("line", {
        class: "dial-tick" + (i / steps >= 1 - red / (ticks - 1) - 1e-6 ? " dial-tick--red" : ""),
        x1: ax, y1: ay, x2: bx, y2: by,
      });
    }
    const needle = el("line", {
      class: "dial-needle",
      x1: cx, y1: cy + r * 0.12, x2: cx, y2: cy - r * 0.82,
    });
    el("circle", { class: "dial-hub", cx, cy, r: Math.max(1.6, r * 0.035) });
    if (hasGsap) gsap.set(needle, { rotation: from, svgOrigin: `${cx} ${cy}` });
    return { needle, from, to };
  }

  const introSvg = $(".intro__dial svg");
  const introDial = introSvg && buildDial(introSvg, {
    cx: 100, cy: 100, r: 96, from: -125, to: 125, ticks: 9, red: 2, tick: 9, minor: 1,
  });
  const gaugeSvg = $(".gauge svg");
  const gaugeDial = gaugeSvg && buildDial(gaugeSvg, {
    cx: 50, cy: 50, r: 46, from: -90, to: 90, ticks: 7, red: 1, tick: 7,
  });

  /* ------------------------------------------------------------------------
     Défilement doux
     ------------------------------------------------------------------------ */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Ancres internes via Lenis (et fermeture du menu au passage)
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2 || id === "#menu") return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const go = () => {
        if (lenis) lenis.scrollTo(target, { duration: 1.4 });
        else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      };
      if (menu.classList.contains("is-open")) closeMenu(go);
      else go();
    });
  });

  /* ------------------------------------------------------------------------
     Menu plein écran
     ------------------------------------------------------------------------ */
  const menu = $("#menu");
  const toggle = $(".menu-toggle");
  const toggleLabel = $(".menu-toggle__label");
  let lastFocus = null;

  function openMenu() {
    lastFocus = document.activeElement;
    toggle.setAttribute("aria-expanded", "true");
    toggleLabel.textContent = "Fermer";
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
    lenis && lenis.stop();
    if (motion) {
      gsap.killTweensOf([menu, ".menu__word", ".menu__link .num", ".menu__foot"]);
      menu.style.visibility = "visible";
      gsap.timeline()
        .fromTo(menu, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "expo.inOut" })
        .fromTo(".menu__word", { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 }, 0.35)
        .fromTo([".menu__link .num", ".menu__foot"], { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.03 }, 0.5);
    }
    menu.classList.add("is-open");
    $(".menu__link", menu).focus({ preventScroll: true });
  }

  function closeMenu(after) {
    toggle.setAttribute("aria-expanded", "false");
    toggleLabel.textContent = "Menu";
    const done = () => {
      menu.classList.remove("is-open");
      menu.setAttribute("inert", "");
      menu.setAttribute("aria-hidden", "true");
      menu.style.visibility = "";
      lenis && lenis.start();
      if (typeof after === "function") after();
      else if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    if (motion) {
      gsap.to(menu, { clipPath: "inset(0 0 100% 0)", duration: 0.7, ease: "expo.inOut", onComplete: done });
    } else done();
  }

  if (menu && toggle) {
    menu.setAttribute("inert", "");
    menu.setAttribute("aria-hidden", "true");
    toggle.setAttribute("role", "button");
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggle.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) closeMenu();
    });
  }

  /* ------------------------------------------------------------------------
     Curseur
     ------------------------------------------------------------------------ */
  if (finePointer && hasGsap) {
    const cursor = $(".cursor");
    root.classList.add("has-cursor");
    const xTo = gsap.quickTo(cursor, "x", { duration: reduced ? 0 : 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(cursor, "y", { duration: reduced ? 0 : 0.35, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener("pointerover", (e) => {
      cursor.classList.toggle("is-active", !!e.target.closest("a, button, [data-cursor]"));
    });
    document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("pointerenter", () => cursor.classList.remove("is-hidden"));
  }

  /* ------------------------------------------------------------------------
     Jauge de scroll : l'aiguille monte avec la lecture de la page
     ------------------------------------------------------------------------ */
  const gauge = $(".gauge");
  const gaugeValue = $(".gauge__value");
  let gaugeReady = false;
  let gaugeST = null;
  function setGauge(p) {
    if (!gaugeDial || !gaugeReady) return;
    gsap.set(gaugeDial.needle, { rotation: gaugeDial.from + (gaugeDial.to - gaugeDial.from) * p });
    gaugeValue.textContent = String(Math.round(p * 100)).padStart(3, "0");
  }
  if (hasGsap && window.ScrollTrigger && gaugeDial) {
    gaugeST = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => setGauge(self.progress),
    });
  }
  function showGauge() {
    if (!gauge || !hasGsap) return;
    const p = gaugeST ? gaugeST.progress : 0;
    if (!motion) {
      gaugeReady = true;
      gsap.set(gauge, { opacity: 1 });
      setGauge(p);
      return;
    }
    // Le moteur retombe au ralenti : l'aiguille redescend de la zone rouge
    gsap.timeline({ onComplete: () => { gaugeReady = true; setGauge(gaugeST ? gaugeST.progress : 0); } })
      .to(gauge, { opacity: 1, duration: 0.6 })
      .fromTo(gaugeDial.needle,
        { rotation: gaugeDial.to },
        { rotation: gaugeDial.from + (gaugeDial.to - gaugeDial.from) * p, duration: 1.2, ease: "power3.out" }, 0);
  }

  /* Navigation : s'efface en descendant, revient dès qu'on remonte */
  const nav = $(".nav");
  if (hasGsap && window.ScrollTrigger && nav) {
    ScrollTrigger.create({
      start: () => window.innerHeight * 0.6,
      end: "max",
      onUpdate: (self) => {
        if (menu.classList.contains("is-open")) return;
        nav.classList.toggle("is-hidden", self.direction === 1);
      },
      onLeaveBack: () => nav.classList.remove("is-hidden"),
    });
  }
  nav && nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));

  /* ------------------------------------------------------------------------
     Hero : révélation par masque, ligne par ligne
     ------------------------------------------------------------------------ */
  function heroIn(delay = 0) {
    if (!motion) return;
    const tl = gsap.timeline({ delay });
    tl.fromTo(".hero__media .ph", { scale: 1.14 }, { scale: 1, duration: 2.4, ease: "expo.out" }, 0)
      .fromTo(".hero__title .line > span",
        { y: 0, yPercent: 105 },
        { yPercent: 0, duration: 1.5, ease: "expo.out" }, 0.05)
      .fromTo(".hero__rule", { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: "expo.inOut" }, 0.35)
      .to(".hero__foot > *", { opacity: 1, duration: 1, ease: "power2.out", stagger: 0.1 }, 0.85);
    return tl;
  }

  function heroScroll() {
    if (!motion || !window.ScrollTrigger) return;
    gsap.to(".hero__media .ph", {
      yPercent: 14,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__grid", {
      yPercent: -10,
      opacity: 0.2,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "center center", end: "bottom top", scrub: true },
    });
  }

  /* ------------------------------------------------------------------------
     Intro : le monogramme se révèle pendant que l'aiguille monte, puis rideau.
     Jouée une fois par session, 1,5 s au total.
     ------------------------------------------------------------------------ */
  const intro = $(".intro");
  let seen = false;
  try { seen = sessionStorage.getItem("mk-intro") === "1"; } catch (e) { /* stockage indisponible */ }

  function start() {
    heroScroll();
    if (!intro || !motion || seen) {
      intro && intro.remove();
      heroIn(0.1);
      showGauge();
      return;
    }
    try { sessionStorage.setItem("mk-intro", "1"); } catch (e) { /* rien */ }
    lenis && lenis.stop();
    window.scrollTo(0, 0);

    gsap.timeline({
      onComplete: () => { intro.remove(); lenis && lenis.start(); },
    })
      .to(introDial.needle, { rotation: introDial.to - 4, duration: 0.85, ease: "power2.in" }, 0)
      .to(".intro__mono .monogram", { clipPath: "inset(0% 0 0 0)", duration: 0.8, ease: "expo.out" }, 0.05)
      .to(".intro__label", { opacity: 1, duration: 0.4 }, 0.2)
      // petit rebond au rupteur
      .to(introDial.needle, { rotation: introDial.to - 12, duration: 0.12, ease: "power1.out" }, 0.85)
      .to(intro, { yPercent: -100, duration: 0.6, ease: "expo.inOut" }, 0.9)
      .add(() => { heroIn(0); }, 1.0)
      .add(showGauge, 1.2);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // Recalcule les déclencheurs une fois les polices et images chargées
  window.addEventListener("load", () => window.ScrollTrigger && ScrollTrigger.refresh());

  /* Année du footer */
  $$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
})();
