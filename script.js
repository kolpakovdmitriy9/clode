/* ───────────────────────────────────────────────────────────────
   Лента строк как настоящий 3D-барабан: каждая строка — грань
   цилиндра (rotateX + translateZ на общей перспективе), а не плоский
   текст с имитацией через blur/scale. Барабан крутится вокруг
   горизонтальной оси синхронно со скроллом секции: строка напротив
   зрителя (угол ≈0) стоит вровень с экраном и читается чётко,
   соседние уходят по дуге назад — сжимаются перспективой, размываются
   и гаснут. Часть слов заменена вставками-картинками, которые
   уезжают по дуге вместе со своей строкой.
   ─────────────────────────────────────────────────────────────── */

const CFG = {
  angleStep    : 18,   // угловой шаг между соседними строками на барабане, град
  edgeAngle    : 86,   // за этим углом строка уже на обратной стороне барабана — не рисуем
  visibleLimit : 80,   // угол, после которого строка полностью гаснет
  hold         : 0.12, // доля visibleLimit, где строка остаётся полностью яркой (плато) — узкое, чтобы кривизна барабана была видна пошире
  entryPad     : 96,   // запас угла для входа/выхода первой и последней строки, град
  perspectivePx: 720,  // должно совпадать со значением perspective в CSS (.reel)
  ease         : 0.14, // «догоняние» скролла инерцией по углу барабана
  maxBlur      : 2.6,  // максимальное размытие у грани видимости, px — меньше, чтобы кривизна не тонула в блюре
  minOpacity   : 0.02,
};

const stage  = document.getElementById('stage');
const reel   = document.getElementById('reel');
const listEl = document.getElementById('lines');
const lines  = Array.from(listEl.querySelectorAll('.line'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const N = lines.length;

const clamp  = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = t => t * t * (3 - 2 * t);
const DEG = Math.PI / 180;

let radius = 0;                 // радиус барабана, px — считается из реальной высоты строки
let totalSweep = 0;              // на сколько градусов проворачивается барабан за всю сцену
let progress = 0, rot = 0, rotTarget = 0;
let ticking = false;

/* радиус подобран так, чтобы шаг между строками у фронта барабана (угол 0)
   совпадал с их реальной высотой — иначе соседние строки будут наезжать
   друг на друга или, наоборот, слишком расходиться */
function measure(){
  const h = Math.max(...lines.map(el => el.offsetHeight));
  radius = h / (CFG.angleStep * DEG);
  listEl.style.transform = `translate(-50%, -50%) translateZ(${(-radius).toFixed(1)}px)`;
  totalSweep = (N - 1) * CFG.angleStep + 2 * CFG.entryPad;
}

/* прогресс сцены: 0 — сцена только прилипла, 1 — вот-вот отлипнет */
function sceneProgress(){
  const r = stage.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  if (total <= 0) return 0;
  return clamp(-r.top / total, 0, 1);
}

function renderDrum(){
  for (let i = 0; i < N; i++){
    const angle = i * CFG.angleStep + CFG.entryPad - rot;   // текущий угол строки на барабане, град
    const el = lines[i];

    if (Math.abs(angle) > CFG.edgeAngle){
      el.style.opacity = 0;
      continue;
    }

    const n = clamp(Math.abs(angle) / CFG.visibleLimit, 0, 1);
    const t = clamp((n - CFG.hold) / (1 - CFG.hold), 0, 1);
    const o = Math.max(smooth(1 - t), CFG.minOpacity);

    el.style.transform = `translate(-50%, -50%) rotateX(${(-angle).toFixed(2)}deg) translateZ(${radius.toFixed(1)}px)`;
    el.style.opacity   = o.toFixed(3);
    el.style.filter    = `blur(${(t * CFG.maxBlur).toFixed(2)}px)`;
  }
}

function loop(){
  rotTarget = progress * totalSweep;
  rot += (rotTarget - rot) * (reduced ? 1 : CFG.ease);
  renderDrum();

  if (!reduced && Math.abs(rotTarget - rot) > 0.02){
    requestAnimationFrame(loop);
  } else {
    rot = rotTarget;
    renderDrum();
    ticking = false;
  }
}
function wake(){
  if (!ticking){ ticking = true; requestAnimationFrame(loop); }
}
function kick(){
  progress = sceneProgress();
  wake();
}

addEventListener('scroll', kick, { passive:true });
addEventListener('resize', () => { measure(); kick(); });

measure();
progress = sceneProgress();
rot = rotTarget = progress * totalSweep;
renderDrum();
