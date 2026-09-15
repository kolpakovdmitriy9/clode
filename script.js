/* ───────────────────────────────────────────────────────────────
   Лента строк: непрерывный вертикальный бег текста, синхронизированный
   со скроллом секции. Строки, проходящие через центр экрана, — яркие
   и резкие; у верхнего и нижнего края — гаснут и слегка расплываются.
   Часть слов заменена вставками-картинками, которые гаснут вместе
   со своей строкой.
   ─────────────────────────────────────────────────────────────── */

const CFG = {
  ease      : 0.16,   // «догоняние» скролла — чем меньше, тем тягучее движение ленты
  focus     : 0.46,   // половина зоны, за пределами которой строка гаснет, в долях высоты экрана
  hold      : 0.38,   // доля focus, где строка остаётся полностью яркой (плато без затухания)
  maxBlur   : 3.2,    // максимальное размытие у края экрана, px
  scaleEdge : 0.92,   // масштаб строки у края
  scaleFocus: 1,      // масштаб строки в фокусе
  minOpacity: 0.03,   // строка никогда не гаснет до полного нуля — так честнее по контрасту
};

const stage  = document.getElementById('stage');
const reel   = document.getElementById('reel');
const listEl = document.getElementById('lines');
const lines  = Array.from(listEl.querySelectorAll('.line'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp  = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = t => t * t * (3 - 2 * t);

let viewH = 0, trackH = 0;
let progress = 0, y = 0, yTarget = 0;
let ticking = false;

function measure(){
  viewH = reel.clientHeight;
  trackH = listEl.scrollHeight + viewH;
}

/* прогресс сцены: 0 — сцена только прилипла, 1 — вот-вот отлипнет */
function sceneProgress(){
  const r = stage.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  if (total <= 0) return 0;
  return clamp(-r.top / total, 0, 1);
}

function renderLines(){
  const centerY = viewH / 2;
  const focusPx = viewH * CFG.focus;

  for (const el of lines){
    const lineCenter = y + el.offsetTop + el.offsetHeight / 2;
    const n = clamp(Math.abs(lineCenter - centerY) / focusPx, 0, 1);
    const t = clamp((n - CFG.hold) / (1 - CFG.hold), 0, 1);   // 0 на плато, 1 у самого края
    const o = Math.max(smooth(1 - t), CFG.minOpacity);

    el.style.opacity   = o.toFixed(3);
    el.style.filter    = `blur(${(t * CFG.maxBlur).toFixed(2)}px)`;
    el.style.transform = `scale(${(CFG.scaleEdge + (CFG.scaleFocus - CFG.scaleEdge) * o).toFixed(3)})`;
  }
}

function loop(){
  yTarget = viewH - progress * trackH;
  y += (yTarget - y) * (reduced ? 1 : CFG.ease);

  listEl.style.transform = `translate(-50%, ${y.toFixed(1)}px)`;
  renderLines();

  if (!reduced && Math.abs(yTarget - y) > 0.05){
    requestAnimationFrame(loop);
  } else {
    y = yTarget;
    listEl.style.transform = `translate(-50%, ${y.toFixed(1)}px)`;
    renderLines();
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
y = yTarget = viewH - progress * trackH;
listEl.style.transform = `translate(-50%, ${y.toFixed(1)}px)`;
renderLines();
