/* ==========================================================================
   Mouvement physique — ressorts, inertie, élastique

   Les trois idées de « Designing Fluid Interfaces » (Apple, WWDC 2018) :
   1. un mouvement part de la valeur affichée et reprend la vitesse du doigt,
   2. il se projette vers l'endroit où le geste allait,
   3. il peut être attrapé et inversé à tout instant.

   Un ressort se règle avec deux nombres :
   - damping  : 1 = pas de rebond, < 1 = dépasse la cible puis revient,
   - response : en secondes, plus petit = plus vif (ce n'est pas une durée).
   ========================================================================== */

export const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const running = new Set();
let raf = 0;
let last = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
  last = now;
  for (const s of [...running]) s._step(dt);
  raf = running.size ? requestAnimationFrame(frame) : 0;
}

export class Spring {
  constructor(value = 0, { response = 0.4, damping = 1, precision = 0.001 } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.response = response;
    this.damping = reduced ? Math.max(damping, 1) : damping; // jamais de rebond si le mouvement est réduit
    this.precision = precision;
    this.onUpdate = null;
    this.onRest = null;
    this.active = false;
  }

  /* Va vers la cible. La valeur et la vitesse actuelles sont conservées :
     c'est ce qui rend le mouvement interruptible sans à-coup. */
  to(target, { velocity, response, damping } = {}) {
    this.target = target;
    if (velocity !== undefined) this.velocity = velocity;
    if (response !== undefined) this.response = response;
    if (damping !== undefined) this.damping = reduced ? Math.max(damping, 1) : damping;
    if (reduced) { this.set(target); return this; }
    this._start();
    return this;
  }

  /* Saute à une valeur, sans animation (suivi 1:1 du doigt). */
  set(value) {
    this.value = this.target = value;
    this.velocity = 0;
    this._stop();
    if (this.onUpdate) this.onUpdate(value);
    return this;
  }

  /* Attrape le mouvement en cours : il s'arrête où il est. */
  grab() {
    this._stop();
    this.target = this.value;
    this.velocity = 0;
    return this;
  }

  _start() {
    if (this.active) return;
    this.active = true;
    running.add(this);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  _stop() {
    this.active = false;
    running.delete(this);
  }

  _step(dt) {
    const w = (Math.PI * 2) / this.response;
    const k = w * w;                    // raideur
    const c = 2 * this.damping * w;     // amortissement
    const n = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.velocity += (-k * (this.value - this.target) - c * this.velocity) * h;
      this.value += this.velocity * h;
    }
    if (this.onUpdate) this.onUpdate(this.value);
    if (Math.abs(this.value - this.target) < this.precision && Math.abs(this.velocity) < this.precision * 10) {
      this.value = this.target;
      this.velocity = 0;
      this._stop();
      if (this.onUpdate) this.onUpdate(this.value);
      if (this.onRest) this.onRest();
    }
  }
}

/* Où le geste s'arrêterait s'il continuait avec sa vitesse (px/s ou rad/s).
   C'est la fonction de décélération exponentielle utilisée pour le défilement. */
export function project(velocity, rate = 0.998) {
  return ((velocity / 1000) * rate) / (1 - rate);
}

/* Résistance progressive au-delà d'une limite : on ralentit avant de s'arrêter. */
export function rubberband(overshoot, dimension, constant = 0.55) {
  const sign = Math.sign(overshoot);
  const o = Math.abs(overshoot);
  return (sign * (o * dimension * constant)) / (dimension + constant * o);
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/* Suivi de la vitesse d'un pointeur sur ses derniers instants. */
export class VelocityTracker {
  constructor() { this.pts = []; }
  reset() { this.pts.length = 0; }
  push(v, t = performance.now()) {
    this.pts.push([t, v]);
    while (this.pts.length > 2 && t - this.pts[0][0] > 90) this.pts.shift();
  }
  get() {
    if (this.pts.length < 2) return 0;
    const [t0, v0] = this.pts[0];
    const [t1, v1] = this.pts[this.pts.length - 1];
    const dt = (t1 - t0) / 1000;
    return dt > 0 ? (v1 - v0) / dt : 0;
  }
}
