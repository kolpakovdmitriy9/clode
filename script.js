/* ───────────────────────────────────────────────────────────────
   Круг с делениями: вращение по скроллу + «магнитное» вытягивание
   делений внутрь круга в верхней зоне + выравнивание в покое
   + акцентный цвет, привязанный к активному блоку текста.
   ─────────────────────────────────────────────────────────────── */

const CFG = {
  tickCount   : 72,     // количество делений по кругу
  radius      : 208,    // внешняя окружность (viewBox 560×560): она всегда неподвижна
  lenBase     : 16,     // длина обычного деления (растёт внутрь круга)
  lenMax      : 56,     // длина деления в самой «горячей» точке (12 часов)
  lenRest     : 22,     // длина одинокой стрелки на 12 часах в состоянии покоя
  widthBase   : 1.05,   // толщина обычного деления
  widthMax    : 2.6,    // толщина в верхней точке
  sigma       : 26,     // ширина зоны магнита в градусах (гауссов спад)
  restSigma   : 2.6,    // ширина зоны стрелки покоя — попадает ровно одно деление
  rotationTotal: 320,   // на сколько градусов провернётся круг за всю сцену
  auraSpread  : 58,     // полуширина дуги подсветки, градусы
  inertia     : 0.14,   // 0..1 — «догоняние» скролла (эффект инерции/магнита)
  velBoost    : 0.55,   // насколько сильнее тянет при быстром скролле
  idleDelay   : 420,    // мс без скролла, после которых круг начинает выравниваться
  attack      : 0.18,   // скорость появления магнита при начале движения
  release     : 0.028,  // скорость затухания магнита в покое (≈2 c до ровного круга)
  stops       : [0.00, 0.38, 0.72, 1.00],           // позиции градиента нагрева
  ramp        : []
};

const CX = 280, CY = 280, DEG = Math.PI / 180;

const stage   = document.getElementById('stage');
const ticksG  = document.getElementById('ticks');
const hotG    = document.getElementById('ticksHot');
const auraEl  = document.getElementById('aura');
const slides  = Array.from(document.querySelectorAll('.slide'));
const dots    = Array.from(document.querySelectorAll('.dots i'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root    = document.documentElement;

const N    = slides.length;
const GAP  = N > 1 ? 1 / (N - 1) : 1;   // расстояние между центрами блоков в долях прогресса
const FADE = GAP * 0.13;                // зона гашения текста
const HOLD = GAP * 0.5 - FADE;          // зона полной видимости текста
const STEP = 360 / CFG.tickCount;       // угловой шаг делений

/* ─── палитра: всё читается из CSS-переменных, тема и цвета правятся в одном месте ─── */
let accents = [], accent = [255, 74, 34];

function toRGB(v, fallback){
  v = (v || '').trim();
  let m = /^#([\da-f]{6})$/i.exec(v);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
  m = /^#([\da-f]{3})$/i.exec(v);
  if (m) return [0, 1, 2].map(i => parseInt(m[1][i] + m[1][i], 16));
  m = /rgba?\(([^)]+)\)/.exec(v);
  if (m) return m[1].split(/[,\s/]+/).slice(0, 3).map(n => Math.round(parseFloat(n)));
  return fallback;
}
let cold = [206,206,212], midCold = [140,140,148], peak = [32,32,38];

function readPalette(){
  const cs = getComputedStyle(root);
  cold    = toRGB(cs.getPropertyValue('--tick-cold'), cold);
  midCold = toRGB(cs.getPropertyValue('--tick-mid'),  midCold);
  peak    = toRGB(cs.getPropertyValue('--tick-hot'),  peak);
  const fb = [[255,74,34], [18,183,106], [46,107,245]];
  accents = slides.map((_, i) => toRGB(cs.getPropertyValue('--c' + (i + 1)), fb[i % fb.length]));
  updateRamp();
}

/* Ступень перед акцентом — сам акцент, уведённый в «тяжёлый» конец темы:
   на светлом фоне это глубокий оттенок цвета, на тёмном — светлый.
   Поэтому нагрев читается одинаково и для красного, и для зелёного, и для синего. */
function updateRamp(){
  const deep = mix(peak, accent, 0.65);
  CFG.ramp = [
    [CFG.stops[0], cold],
    [CFG.stops[1], midCold],
    [CFG.stops[2], deep],
    [CFG.stops[3], accent]
  ];
}
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t)
];
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

/* акцент меняется ровно тогда же, когда сменяется текст: держится на «плато»
   блока и переливается в следующий цвет во время кроссфейда */
function accentAt(p){
  if (accents.length < 2) return accents[0] || accent;
  const x    = clamp(p / GAP, 0, N - 1);
  const i    = Math.min(Math.floor(x), N - 2);
  const flat = HOLD / GAP;                               // доля сегмента, где цвет неподвижен
  const t    = smooth(clamp((x - i - flat) / (1 - 2 * flat), 0, 1));
  return mix(accents[i], accents[i + 1], t);
}

/* ─── деления: базовый слой + слой свечения ─── */
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

/* ─── дуга мягкой подсветки: тоже внутри окружности ─── */
(function drawAura(){
  const r = CFG.radius - 26, a = CFG.auraSpread;
  const p0 = polar(-a, r), p1 = polar(a, r);
  auraEl.setAttribute('d', `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`);
})();

/* ─── состояние анимации ─── */
let progress = 0, rot = 0, rotTarget = 0, vel = 0;
let energy = 0, lastInput = -Infinity, ticking = false;

function polar(angleDeg, r){
  const a = (angleDeg - 90) * DEG;          // 0° = 12 часов
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
      return rgb(mix(c0, c1, t));
    }
  }
}

/* ─── отрисовка делений ─── */
function renderTicks(){
  const speed = Math.min(Math.abs(vel) / 6, 1);            // 0..1 — как быстро крутим
  const sigma = CFG.sigma * (1 + speed * 0.45);            // на скорости зона шире
  const pull  = 1 + speed * CFG.velBoost;                  // и тянет сильнее
  const calm  = 1 - energy;                                // 1 — круг полностью в покое

  for (let i = 0; i < CFG.tickCount; i++){
    // угол деления с учётом поворота, приведённый к -180..180 (0 = верх)
    let a = (i * STEP + rot) % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;

    // магнит работает только пока круг движется, в покое остаётся одна стрелка на 12 часах
    const mag  = Math.exp(-((a / sigma) ** 2)) * pull * energy;
    const rest = Math.exp(-((a / CFG.restSigma) ** 2)) * calm;
    const w    = clamp(Math.max(mag, rest), 0, 1);

    const len = CFG.lenBase + (CFG.lenMax - CFG.lenBase) * clamp(mag, 0, 1.3) + CFG.lenRest * rest;
    const wid = CFG.widthBase + (CFG.widthMax - CFG.widthBase) * w;

    // деления растут внутрь: внешний конец всегда на окружности
    const outer = polar(a, CFG.radius);
    const inner = polar(a, CFG.radius - len);

    const l = base[i];
    l.setAttribute('x1', outer.x.toFixed(2));
    l.setAttribute('y1', outer.y.toFixed(2));
    l.setAttribute('x2', inner.x.toFixed(2));
    l.setAttribute('y2', inner.y.toFixed(2));
    l.setAttribute('stroke', heat(w));
    l.setAttribute('stroke-width', wid.toFixed(2));

    // слой свечения — только для самых «горячих»
    const g = hot[i];
    const glow = Math.max(0, (w - 0.55) / 0.45);
    if (glow > 0.01){
      g.setAttribute('x1', outer.x.toFixed(2));
      g.setAttribute('y1', outer.y.toFixed(2));
      g.setAttribute('x2', inner.x.toFixed(2));
      g.setAttribute('y2', inner.y.toFixed(2));
      g.setAttribute('stroke', rgb(accent));
      g.setAttribute('stroke-width', (wid * 0.9).toFixed(2));
      g.setAttribute('opacity', (glow * 0.55).toFixed(3));
    } else if (g.getAttribute('opacity') !== '0'){
      g.setAttribute('opacity', '0');
    }
  }

  auraEl.setAttribute('opacity', (0.42 * energy).toFixed(3));
}

/* ─── смена текстовых блоков ───
   HOLD + FADE = половина расстояния между блоками, поэтому уходящий текст
   успевает погаснуть до появления следующего: никакой «каши» из двух слоёв. */
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
  const idle = performance.now() - lastInput > CFG.idleDelay;

  // в покое круг доводится до ближайшего деления, чтобы стрелка встала ровно на 12 часов
  const raw = progress * CFG.rotationTotal;
  rotTarget = idle ? Math.round(raw / STEP) * STEP : raw;

  const prev = rot;
  rot += (rotTarget - rot) * (reduced ? 1 : CFG.inertia);
  vel += ((rot - prev) - vel) * 0.25;

  const want = idle ? 0 : 1;
  energy += (want - energy) * (want > energy ? CFG.attack : CFG.release);

  accent = accentAt(progress);
  updateRamp();
  root.style.setProperty('--accent', rgb(accent));

  renderTicks();
  renderSlides(progress);

  // крутимся, пока круг догоняет скролл и пока не улеглась «магнитная» энергия
  if (!idle || Math.abs(rotTarget - rot) > 0.01 || Math.abs(vel) > 0.01 || energy > 0.002){
    requestAnimationFrame(loop);
  } else {
    rot = rotTarget; vel = 0; energy = 0;
    renderTicks();
    ticking = false;
  }
}
function kick(){
  progress  = sceneProgress();
  lastInput = performance.now();
  if (!ticking){ ticking = true; requestAnimationFrame(loop); }
}
function repaint(){ readPalette(); renderTicks(); }

addEventListener('scroll', kick, { passive:true });
addEventListener('resize', kick);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);
new MutationObserver(repaint).observe(root, { attributes:true, attributeFilter:['data-theme'] });

progress = sceneProgress();
readPalette();
accent = accentAt(progress);
updateRamp();
root.style.setProperty('--accent', rgb(accent));
rot = rotTarget = Math.round(progress * CFG.rotationTotal / STEP) * STEP;
renderTicks();
renderSlides(progress);
