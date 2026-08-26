/* ───────────────────────────────────────────────────────────────
   Круг с делениями: вращение по скроллу + «магнитное» вытягивание
   делений в верхней зоне + градиентная подсветка + смена текста.
   ─────────────────────────────────────────────────────────────── */

const CFG = {
  tickCount   : 72,     // количество делений по кругу
  radius      : 196,    // радиус окружности (в единицах viewBox 560×560)
  lenBase     : 16,     // длина обычного деления
  lenMax      : 62,     // длина деления в самой «горячей» точке (12 часов)
  widthBase   : 1.05,   // толщина обычного деления
  widthMax    : 2.6,    // толщина в верхней точке
  sigma       : 26,     // ширина зоны магнита в градусах (гауссов спад)
  rotationTotal: 320,   // на сколько градусов провернётся круг за всю сцену
  auraSpread  : 58,     // полуширина дуги подсветки, градусы
  inertia     : 0.14,   // 0..1 — «догоняние» скролла (эффект инерции/магнита)
  velBoost    : 0.55,   // насколько сильнее тянет при быстром скролле
  // Градиент нагрева деления: [вес 0..1, [r,g,b]]
  ramp: [
    [0.00, [206, 206, 212]],
    [0.42, [140, 140, 148]],
    [0.74, [ 32,  32,  38]],
    [1.00, null]  // null → берём --accent из CSS
  ]
};

const CX = 280, CY = 280;
const DEG = Math.PI / 180;

const stage   = document.getElementById('stage');
const ticksG  = document.getElementById('ticks');
const hotG    = document.getElementById('ticksHot');
const auraEl  = document.getElementById('aura');
const slides  = Array.from(document.querySelectorAll('.slide'));
const dots    = Array.from(document.querySelectorAll('.dots i'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* акцентный цвет забираем из CSS-переменной, чтобы менять тему в одном месте */
const accent = readAccent();
CFG.ramp[CFG.ramp.length - 1][1] = accent;

function readAccent(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(v);
  if (m) return [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)];
  const rgb = /rgba?\(([^)]+)\)/.exec(v);
  if (rgb) return rgb[1].split(',').slice(0,3).map(n => parseInt(n,10));
  return [255, 77, 31];
}

/* ─── создаём деления: базовый слой + слой свечения ─── */
const base = [], hot = [];
for (let i = 0; i < CFG.tickCount; i++){
  base.push(makeLine(ticksG));
  hot .push(makeLine(hotG));
}
function makeLine(parent){
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  parent.appendChild(l);
  return l;
}

/* ─── дуга мягкой подсветки сверху ─── */
(function drawAura(){
  const r = CFG.radius + 26, a = CFG.auraSpread;
  const p0 = polar(-a, r), p1 = polar(a, r);
  auraEl.setAttribute('d', `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`);
})();

/* ─── состояние анимации ─── */
let progress = 0, rot = 0, rotTarget = 0, vel = 0, ticking = false;

function polar(angleDeg, r){
  const a = (angleDeg - 90) * DEG;         // 0° = 12 часов
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = t => t * t * (3 - 2 * t);

/* прогресс сцены: 0 — сцена только прилипла, 1 — вот-вот отлипнет */
function sceneProgress(){
  const r = stage.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  if (total <= 0) return 0;
  return clamp(-r.top / total, 0, 1);
}

/* цвет деления по «нагреву» w (0..1) */
function heat(w){
  const R = CFG.ramp;
  for (let i = 1; i < R.length; i++){
    if (w <= R[i][0] || i === R.length - 1){
      const [p0, c0] = R[i - 1], [p1, c1] = R[i];
      const t = p1 === p0 ? 1 : clamp((w - p0) / (p1 - p0), 0, 1);
      return `rgb(${Math.round(c0[0] + (c1[0]-c0[0])*t)},${Math.round(c0[1] + (c1[1]-c0[1])*t)},${Math.round(c0[2] + (c1[2]-c0[2])*t)})`;
    }
  }
}

/* ─── отрисовка делений ─── */
function renderTicks(){
  const step  = 360 / CFG.tickCount;
  const speed = Math.min(Math.abs(vel) / 6, 1);            // 0..1 — как быстро крутим
  const sigma = CFG.sigma * (1 + speed * 0.45);            // на скорости зона шире
  const pull  = 1 + speed * CFG.velBoost;                  // и тянет сильнее

  for (let i = 0; i < CFG.tickCount; i++){
    // угол деления с учётом поворота, приведённый к -180..180 (0 = верх)
    let a = (i * step + rot) % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;

    const w    = Math.exp(-((a / sigma) ** 2));            // «магнитный» вес
    const len  = CFG.lenBase + (CFG.lenMax - CFG.lenBase) * w * pull;
    const wid  = CFG.widthBase + (CFG.widthMax - CFG.widthBase) * w;
    const col  = heat(w);

    const inner = polar(a, CFG.radius - w * 6);            // чуть тянется и внутрь
    const outer = polar(a, CFG.radius + len);

    const l = base[i];
    l.setAttribute('x1', inner.x.toFixed(2));
    l.setAttribute('y1', inner.y.toFixed(2));
    l.setAttribute('x2', outer.x.toFixed(2));
    l.setAttribute('y2', outer.y.toFixed(2));
    l.setAttribute('stroke', col);
    l.setAttribute('stroke-width', wid.toFixed(2));

    // слой свечения — только для самых «горячих»
    const g = hot[i];
    const glow = Math.max(0, (w - 0.55) / 0.45);
    if (glow > 0.01){
      g.setAttribute('x1', inner.x.toFixed(2));
      g.setAttribute('y1', inner.y.toFixed(2));
      g.setAttribute('x2', outer.x.toFixed(2));
      g.setAttribute('y2', outer.y.toFixed(2));
      g.setAttribute('stroke', `rgb(${accent[0]},${accent[1]},${accent[2]})`);
      g.setAttribute('stroke-width', (wid * 0.9).toFixed(2));
      g.setAttribute('opacity', (glow * 0.55).toFixed(3));
    } else if (g.getAttribute('opacity') !== '0'){
      g.setAttribute('opacity', '0');
    }
  }
}

/* ─── смена текстовых блоков ───
   Окно блока: HOLD — зона полной видимости, FADE — зона исчезновения.
   HOLD + FADE = половина расстояния между блоками, поэтому уходящий текст
   успевает погаснуть до появления следующего: никакой «каши» из двух слоёв. */
const N    = slides.length;
const GAP  = N > 1 ? 1 / (N - 1) : 1;
const FADE = GAP * 0.13;
const HOLD = GAP * 0.5 - FADE;

function renderSlides(p){
  let active = 0, best = -1;
  for (let i = 0; i < N; i++){
    const center = N === 1 ? 0.5 : i * GAP;
    const d = p - center;
    const t = clamp(1 - (Math.abs(d) - HOLD) / FADE, 0, 1);
    const o = smooth(t);

    const el = slides[i];
    el.style.opacity   = o.toFixed(3);
    el.style.transform = `translate3d(0, ${(-Math.sign(d) * (1 - o) * 34).toFixed(1)}px, 0) scale(${(0.94 + 0.06 * o).toFixed(3)})`;
    el.style.visibility    = o < 0.005 ? 'hidden' : 'visible';
    el.style.pointerEvents = o > 0.6 ? 'auto' : 'none';

    if (t > best){ best = t; active = i; }
  }
  dots.forEach((d, i) => d.classList.toggle('is-on', i === active));
}

/* ─── главный цикл ─── */
function loop(){
  const prev = rot;
  rot += (rotTarget - rot) * (reduced ? 1 : CFG.inertia);
  vel += ((rot - prev) - vel) * 0.25;

  renderTicks();
  renderSlides(progress);

  // продолжаем крутить, пока круг «догоняет» скролл
  if (Math.abs(rotTarget - rot) > 0.01 || Math.abs(vel) > 0.01){
    requestAnimationFrame(loop);
  } else {
    rot = rotTarget; vel = 0; ticking = false;
    renderTicks();
  }
}
function kick(){
  progress  = sceneProgress();
  rotTarget = progress * CFG.rotationTotal;
  if (!ticking){ ticking = true; requestAnimationFrame(loop); }
}

addEventListener('scroll', kick, { passive:true });
addEventListener('resize', kick);
kick();
rot = rotTarget;                  // без «докрутки» при загрузке посреди сцены
renderTicks();
renderSlides(progress);
