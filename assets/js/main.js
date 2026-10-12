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
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const motion = hasGsap && !reduced;

  if (!motion) root.classList.remove("motion");
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

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
    el("path", { class: "dial-arc", d: `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}` });
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
    const needle = el("line", { class: "dial-needle", x1: cx, y1: cy + r * 0.12, x2: cx, y2: cy - r * 0.82 });
    el("circle", { class: "dial-hub", cx, cy, r: Math.max(1.6, r * 0.035) });
    if (hasGsap) gsap.set(needle, { rotation: from, svgOrigin: `${cx} ${cy}` });
    return { needle, from, to };
  }

  const introSvg = $(".intro__dial svg");
  const introDial = introSvg && buildDial(introSvg, { cx: 100, cy: 100, r: 96, from: -125, to: 125, ticks: 9, red: 2, tick: 9, minor: 1 });
  const gaugeSvg = $(".gauge svg");
  const gaugeDial = gaugeSvg && buildDial(gaugeSvg, { cx: 50, cy: 50, r: 46, from: -90, to: 90, ticks: 7, red: 1, tick: 7 });

  /* ------------------------------------------------------------------------
     Défilement doux
     ------------------------------------------------------------------------ */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToEl = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.4, offset: -10 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  /* ------------------------------------------------------------------------
     Menu plein écran
     ------------------------------------------------------------------------ */
  const menu = $("#menu");
  const toggle = $(".menu-toggle");
  const toggleLabel = $(".menu-toggle__label");
  const nav = $(".nav");
  let lastFocus = null;
  const isMenuOpen = () => menu.classList.contains("is-open");

  function openMenu() {
    lastFocus = document.activeElement;
    toggle.setAttribute("aria-expanded", "true");
    toggleLabel.textContent = "Fermer";
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
    nav.classList.remove("is-hidden", "is-solid");
    lenis && lenis.stop();
    menu.classList.add("is-open");
    if (motion) {
      gsap.timeline()
        .fromTo(menu, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "expo.inOut" })
        .fromTo(".menu__word", { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 }, 0.35)
        .fromTo([".menu__link .num", ".menu__foot"], { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.03 }, 0.5);
    }
    $(".menu__link", menu).focus({ preventScroll: true });
  }

  function closeMenu(after) {
    toggle.setAttribute("aria-expanded", "false");
    toggleLabel.textContent = "Menu";
    const done = () => {
      menu.classList.remove("is-open");
      menu.setAttribute("inert", "");
      menu.setAttribute("aria-hidden", "true");
      hasGsap && gsap.set(menu, { clearProps: "clipPath" });
      lenis && lenis.start();
      updateNav();
      if (typeof after === "function") after();
      else if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    if (motion) gsap.to(menu, { clipPath: "inset(0 0 100% 0)", duration: 0.7, ease: "expo.inOut", onComplete: done });
    else done();
  }

  menu.setAttribute("inert", "");
  menu.setAttribute("aria-hidden", "true");
  toggle.setAttribute("role", "button");
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    isMenuOpen() ? closeMenu() : openMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMenuOpen()) closeMenu();
  });

  // Ancres internes (via Lenis), en fermant le menu au passage
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2 || id === "#menu") return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const go = () => {
        scrollToEl(target);
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      };
      isMenuOpen() ? closeMenu(go) : go();
    });
  });

  /* ------------------------------------------------------------------------
     Navigation : fond plein après le hero, s'efface en descendant
     ------------------------------------------------------------------------ */
  let lastY = window.scrollY;
  function updateNav() {
    const y = window.scrollY;
    if (isMenuOpen()) return;
    nav.classList.toggle("is-solid", y > window.innerHeight * 0.8);
    nav.classList.toggle("is-hidden", y > window.innerHeight * 0.8 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("is-hidden");
    lastY = y;
  }
  window.addEventListener("scroll", updateNav, { passive: true });
  nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));

  /* Barre de réservation mobile : apparaît une fois le hero passé */
  const sticky = $(".sticky-cta");
  const hero = $(".hero");
  if (sticky && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      sticky.classList.toggle("is-visible", !entry.isIntersecting);
    }, { threshold: 0.15 }).observe(hero);
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
  const setGauge = (p) => {
    if (!gaugeDial || !gaugeReady) return;
    gsap.set(gaugeDial.needle, { rotation: gaugeDial.from + (gaugeDial.to - gaugeDial.from) * p });
    gaugeValue.textContent = String(Math.round(p * 100)).padStart(3, "0");
  };
  if (hasGsap && gaugeDial) {
    gaugeST = ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => setGauge(self.progress) });
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
      .fromTo(gaugeDial.needle, { rotation: gaugeDial.to },
        { rotation: gaugeDial.from + (gaugeDial.to - gaugeDial.from) * p, duration: 1.2, ease: "power3.out" }, 0);
  }

  /* ------------------------------------------------------------------------
     Hero
     ------------------------------------------------------------------------ */
  function heroIn() {
    if (!motion) return;
    gsap.timeline()
      .fromTo(".hero__media .ph", { scale: 1.12 }, { scale: 1, duration: 2.6, ease: "expo.out" }, 0)
      .to(".hero__kicker", { opacity: 1, duration: 0.8 }, 0.1)
      .fromTo(".hero__title .line > span", { y: 0, yPercent: 105 },
        { yPercent: 0, duration: 1.4, ease: "expo.out", stagger: 0.12 }, 0.15)
      .to([".hero__sub", ".hero__ctas"], { opacity: 1, duration: 1, ease: "power2.out", stagger: 0.12 }, 0.75);
  }

  /* ------------------------------------------------------------------------
     Révélations au scroll — volontairement variées
     ------------------------------------------------------------------------ */
  function scrollEffects() {
    if (!motion) return;

    // Hero : la photo glisse plus lentement que la page
    gsap.to(".hero__media .ph", {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });

    // Titres : masque ligne par ligne
    $$("[data-lines]").forEach((title) => {
      gsap.fromTo($$(".line > span", title), { y: 0, yPercent: 105 }, {
        yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.1,
        scrollTrigger: { trigger: title, start: "top 85%", once: true },
      });
    });

    // Compteurs kilométriques : les chiffres roulent jusqu'au numéro de section
    $$(".odo[data-odo]").forEach((odo) => {
      const digits = odo.dataset.odo.split("");
      odo.textContent = "";
      const sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = odo.dataset.odo;
      odo.appendChild(sr);
      const cols = digits.map((d) => {
        const col = document.createElement("span");
        col.className = "odo__col";
        col.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 20; i++) {
          const s = document.createElement("span");
          s.textContent = i % 10;
          col.appendChild(s);
        }
        odo.appendChild(col);
        return { col, d: +d };
      });
      ScrollTrigger.create({
        trigger: odo, start: "top 90%", once: true,
        onEnter: () => cols.forEach(({ col, d }, i) => {
          gsap.fromTo(col, { yPercent: 0 }, { yPercent: -((10 + d) / 20) * 100, duration: 1.6 + i * 0.25, ease: "power3.inOut" });
        }),
      });
    });

    // Images : rideau qui remonte (arches) …
    $$(".reveal-clip").forEach((el) => {
      gsap.to(el, {
        clipPath: "inset(0% 0 0 0)", duration: 1.6, ease: "expo.inOut",
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
      gsap.fromTo($(".ph", el), { scale: 1.2 }, {
        scale: 1, duration: 2, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
    });
    // … léger dézoom lié au scroll (détails) …
    $$(".reveal-zoom").forEach((el) => {
      gsap.fromTo($(".ph", el), { scale: 1.25 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom 60%", scrub: true },
      });
    });
    // … et parallaxe douce sur la moto de Karine
    $$("[data-parallax]").forEach((el) => {
      gsap.fromTo(el, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    // Elle & lui : les panneaux s'ouvrent comme deux volets
    gsap.from(".panel", {
      clipPath: "inset(12% 8% 12% 8% round 6px)", duration: 1.5, ease: "expo.out", stagger: 0.12,
      scrollTrigger: { trigger: ".duo__panels", start: "top 80%", once: true },
    });

    // Avis : chaque citation se pose, sans fondu systématique
    $$(".avis__item").forEach((item) => {
      gsap.from(item, {
        x: item.matches(":nth-child(2)") ? 40 : -40, opacity: 0, duration: 1.4, ease: "expo.out",
        scrollTrigger: { trigger: item, start: "top 85%", once: true },
      });
    });
  }

  /* ------------------------------------------------------------------------
     La carte : onglets accessibles + photo qui suit le curseur
     ------------------------------------------------------------------------ */
  const tabs = $$(".tab");
  const panels = $$(".tabpanel");
  function selectTab(name, focus = false) {
    tabs.forEach((t) => {
      const on = t.id === `tab-${name}`;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
    if (motion) {
      const visible = panels.find((p) => !p.hidden);
      gsap.fromTo($$(".service", visible), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.04 });
    }
    hasGsap && ScrollTrigger.refresh();
  }
  if (tabs.length) {
    panels.forEach((p) => { p.hidden = p.dataset.panel !== "femme"; });
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => selectTab(t.id.replace("tab-", "")));
      t.addEventListener("keydown", (e) => {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = tabs[(i + dir + tabs.length) % tabs.length];
        selectTab(next.id.replace("tab-", ""), true);
      });
    });
    $$("[data-tab-target]").forEach((a) => a.addEventListener("click", () => selectTab(a.dataset.tabTarget)));
  }

  const hoverPhoto = $(".hover-photo");
  if (hoverPhoto && finePointer && hasGsap) {
    const ph = $(".ph", hoverPhoto);
    const xTo = gsap.quickTo(hoverPhoto, "x", { duration: reduced ? 0 : 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(hoverPhoto, "y", { duration: reduced ? 0 : 0.6, ease: "power3.out" });
    const services = $$(".service");
    services.forEach((row) => {
      row.addEventListener("pointerenter", (e) => {
        ph.dataset.ph = `Photo à venir · ${row.dataset.hover}`;
        gsap.set(hoverPhoto, { x: e.clientX, y: e.clientY });
        gsap.to(hoverPhoto, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" });
      });
      row.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
      row.addEventListener("pointerleave", () => gsap.to(hoverPhoto, { opacity: 0, scale: 0.85, duration: 0.4 }));
    });
  }

  /* ------------------------------------------------------------------------
     Réalisations : défilement horizontal piloté par le scroll (desktop),
     balayage natif au doigt (mobile), filtres et lightbox.
     ------------------------------------------------------------------------ */
  const track = $(".works__track");
  const works = $$(".work[data-cat]");
  let worksST = null;

  if (motion && track) {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: ".works__pin",
          start: "center center",
          end: () => "+=" + dist(),
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      worksST = tween.scrollTrigger;
      return () => { worksST = null; };
    });
  } else if (track) {
    root.classList.add("works-native");
  }

  $$(".filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      $$(".filter").forEach((b) => b.setAttribute("aria-pressed", b === btn));
      works.forEach((w) => { w.hidden = f !== "all" && w.dataset.cat !== f; });
      if (worksST) {
        ScrollTrigger.refresh();
        // On ramène le début de la galerie à l'écran
        if (window.scrollY > worksST.start) scrollToEl($(".works"));
      } else {
        track.scrollTo({ left: 0, behavior: reduced ? "auto" : "smooth" });
      }
      if (motion) {
        gsap.fromTo(works.filter((w) => !w.hidden), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.05 });
      }
    });
  });

  const lightbox = $(".lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    const stage = $(".lightbox__stage", lightbox);
    const caption = $(".lightbox__caption", lightbox);
    let list = [];
    let index = 0;
    let opener = null;
    const show = (i) => {
      index = (i + list.length) % list.length;
      const fig = list[index];
      stage.replaceChildren($(".ph, picture, img", fig).cloneNode(true));
      caption.textContent = $("figcaption", fig).textContent.trim().replace(/\s+/, " · ");
      if (motion) gsap.fromTo(stage.firstElementChild, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" });
    };
    works.forEach((fig) => {
      $(".work__btn", fig).addEventListener("click", () => {
        list = works.filter((w) => !w.hidden);
        opener = document.activeElement;
        lenis && lenis.stop();
        lightbox.showModal();
        show(list.indexOf(fig));
      });
    });
    $(".lightbox__close", lightbox).addEventListener("click", () => lightbox.close());
    $(".lightbox__prev", lightbox).addEventListener("click", () => show(index - 1));
    $(".lightbox__next", lightbox).addEventListener("click", () => show(index + 1));
    lightbox.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });
    lightbox.addEventListener("close", () => {
      lenis && lenis.start();
      opener && opener.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------------
     Contact : la ligne du jour s'allume
     ------------------------------------------------------------------------ */
  const today = $(`.hours tr[data-day="${new Date().getDay()}"]`);
  today && today.classList.add("is-today");

  $$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));

  /* ------------------------------------------------------------------------
     Intro : le monogramme se révèle pendant que l'aiguille monte, puis rideau.
     Jouée une fois par session, 1,5 s au total.
     ------------------------------------------------------------------------ */
  const intro = $(".intro");
  let seen = false;
  try { seen = sessionStorage.getItem("mk-intro") === "1"; } catch (e) { /* stockage indisponible */ }

  function start() {
    scrollEffects();
    updateNav();
    if (!intro || !motion || seen || !introDial) {
      intro && intro.remove();
      heroIn();
      showGauge();
      return;
    }
    try { sessionStorage.setItem("mk-intro", "1"); } catch (e) { /* rien */ }
    lenis && lenis.stop();
    window.scrollTo(0, 0);

    gsap.timeline({ onComplete: () => { intro.remove(); lenis && lenis.start(); } })
      .to(introDial.needle, { rotation: introDial.to - 4, duration: 0.85, ease: "power2.in" }, 0)
      .to(".intro__mono .monogram", { clipPath: "inset(0% 0 0 0)", duration: 0.8, ease: "expo.out" }, 0.05)
      .to(introDial.needle, { rotation: introDial.to - 12, duration: 0.12, ease: "power1.out" }, 0.85) // rebond au rupteur
      .to(intro, { yPercent: -100, duration: 0.6, ease: "expo.inOut" }, 0.9)
      .add(heroIn, 1.0)
      .add(showGauge, 1.2);
  }

  start();
  window.addEventListener("load", () => hasGsap && ScrollTrigger.refresh());
})();
