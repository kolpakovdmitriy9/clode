/*
 * Куча карточек по референсу — бесконечный вариант.
 *
 * Покадровый разбор (30 fps):
 *  - новая карточка появляется сразу поверх кучи, без проявления: в первом
 *    кадре она крупнее (≈1.06–1.07), повёрнута на ≈2° сильнее по часовой
 *    и приподнята на ≈4px (в кадре высотой 474px), затем за ≈130 мс
 *    ease-out «шлёпается» на место;
 *  - карточки лежат россыпью вокруг центра: сдвиг до ±0.2 высоты кадра по
 *    горизонтали и ±0.08 по вертикали, поворот ±3–8°, соседние обычно
 *    наклонены в разные стороны;
 *  - интервал между карточками 2–8 кадров (≈70–260 мс), неровный;
 *  - нижние карточки пропадают мгновенно.
 * Здесь колода зациклена: новая карточка ложится сверху, а нижние заранее
 * незаметно уменьшаются и уходят под кучу, после чего удаляются.
 */
(() => {
  const pile = document.getElementById('pile');
  const stage = document.getElementById('stage');

  // w, h — в долях масштабной единицы S (высота кадра референса)
  const DESIGNS = [
    { cls: 'lamp', w: 0.41, h: 0.47,
      html: '<div class="head"><span>Studio Nº 7</span><span>1954</span></div>' +
            '<i class="bulb"></i><i class="legs"></i><div class="title">Paper Lamp 3B</div>' },
    { cls: 'sit', w: 0.43, h: 0.45 },
    { cls: 'night', w: 0.36, h: 0.49,
      html: '<i class="doodle"></i><div class="w">LATE<br>SET</div>' },
    { cls: 'mono', w: 0.34, h: 0.22, html: '<b>Mono</b><small>a new grotesk typeface</small>' },
    { cls: 'red', w: 0.42, h: 0.40 },
    { cls: 'note', w: 0.30, h: 0.40,
      html: 'Warm rye, soft butter, a pinch of flaky salt. Toasted until the edges crackle and served by the window.' },
    { cls: 'glow', w: 0.36, h: 0.46,
      html: '<div class="t">Signal<br>Form<br>Oct 14–15</div><div class="f">Open studio days<br>Hall B · North wing</div>' },
    { cls: 'bowl', w: 0.40, h: 0.38 },
    { cls: 'side', w: 0.42, h: 0.42, html: '<b>SIDE<br>B</b>' },
    { cls: 'cushion', w: 0.38, h: 0.44, html: '<div class="tag">MIX<br>04</div>' },
    { cls: 'crumb', w: 0.30, h: 0.45 },
    { cls: 'hills', w: 0.40, h: 0.30 },
  ];

  const MAX_CARDS = 12;          // сколько карточек лежит в куче одновременно
  // Уход вниз: начиная с SINK_FROM-й карточки сверху карточка понемногу
  // уменьшается и сползает к центру кучи, прячась под верхними. Самая
  // нижняя к моменту удаления уже полностью закрыта — исчезновение не видно.
  const SINK_FROM = 6;
  const SINK_SCALE = 0.55;       // масштаб у самой нижней карточки
  // Глубина карточки догоняет свою ступень пружиной с критическим
  // затуханием: скорость не сбрасывается, когда сверху ложится следующая
  // карточка, поэтому куча оседает непрерывно, без рывков.
  const SINK_OMEGA = 5;          // 1/с — жёсткость пружины (≈0.8 с до ступени)
  const SPREAD_X = 0.2;          // разброс центра по горизонтали, доли S
  const SPREAD_Y = 0.08;         // …и по вертикали
  const MIN_STEP = 0.11;         // новая карточка не ложится ровно на предыдущую
  const ROT_MIN = 2, ROT_MAX = 7;

  // «Шлепок»: стартовое состояние относительно итогового
  const DROP_SCALE = 1.07;
  const DROP_ROT = 2;            // градусы, по часовой
  const DROP_LIFT = 4 / 474;     // подъём, доли S
  const DROP_MS = 140;
  const DROP_EASE = 'cubic-bezier(0.22, 0.8, 0.3, 1)';

  // Неровный ритм, как в референсе: интервалы в кадрах 30 fps
  const RHYTHM_FRAMES = [5, 3, 6, 4, 7, 3, 5, 8, 4, 6, 3, 5];
  const POINTER_MIN_MS = 70;     // при движении курсора — не чаще

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let S = 0;
  let seq = 0;
  let last = { x: 0, y: 0, r: 0 };
  let lastDrop = 0;
  let timer = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  function measure() {
    S = Math.min(window.innerHeight, window.innerWidth * 1.15);
    document.documentElement.style.setProperty('--S', S + 'px');
  }

  function placement() {
    let x, y, tries = 0;
    do {
      x = rand(-SPREAD_X, SPREAD_X);
      y = rand(-SPREAD_Y, SPREAD_Y);
    } while (Math.hypot(x - last.x, (y - last.y) * 1.5) < MIN_STEP && ++tries < 24);
    // чаще наклон в сторону, противоположную предыдущей карточке
    const flip = Math.random() < 0.75 ? -Math.sign(last.r || 1) : Math.sign(last.r || 1);
    const r = flip * rand(ROT_MIN, ROT_MAX);
    last = { x, y, r };
    return last;
  }

  function transformOf(c, lift, rot, scale) {
    return `translate3d(${(c.x * S).toFixed(1)}px, ${((c.y - lift) * S).toFixed(1)}px, 0) ` +
           `rotate(${(c.r + rot).toFixed(2)}deg) scale(${scale})`;
  }

  function size(el) {
    const d = el._design;
    const w = d.w * S, h = d.h * S;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = -w / 2 + 'px';
    el.style.top = -h / 2 + 'px';
    applyDepth(el);
  }

  // Рисует карточку по её плавной глубине _dv (0 — верхняя)
  function applyDepth(el) {
    const k = el._dv || 0;
    const t = Math.min(Math.max((k - SINK_FROM) / (MAX_CARDS - SINK_FROM), 0), 1);
    const e = t * t * (3 - 2 * t); // smoothstep: начало ухода незаметно
    const p = el._pos;
    const sunk = { x: p.x * (1 - e), y: p.y * (1 - e), r: p.r * (1 - 0.5 * e) };
    el.style.transform = transformOf(sunk, 0, 0, (1 - (1 - SINK_SCALE) * e).toFixed(4));
    const o = Math.min(Math.max(MAX_CARDS - k, 0), 1);
    el.style.opacity = o < 1 ? o.toFixed(3) : '';
  }

  // Шаг пружины для всех карточек, которые ещё не дошли до своей ступени
  let lastFrame = 0;
  function frame(now) {
    const dt = Math.min((now - (lastFrame || now)) / 1000, 0.05);
    lastFrame = now;
    const w = SINK_OMEGA;
    for (const el of [...pile.children]) {
      const target = el._depth || 0;
      let x = el._dv || 0, v = el._vv || 0;
      if (Math.abs(target - x) < 1e-3 && Math.abs(v) < 1e-3) continue;
      // полунеявный Эйлер для x'' = w²(target − x) − 2w·x'
      v += (w * w * (target - x) - 2 * w * v) * dt;
      x += v * dt;
      el._dv = x; el._vv = v;
      if (x >= MAX_CARDS) { el.remove(); continue; } // уже полностью под кучей
      applyDepth(el);
    }
    requestAnimationFrame(frame);
  }

  function drop() {
    const d = DESIGNS[seq % DESIGNS.length];
    seq++;
    const el = document.createElement('div');
    el.className = 'card';
    const art = document.createElement('div');
    art.className = 'art ' + d.cls;
    if (d.html) art.innerHTML = d.html;
    el.appendChild(art);
    el._design = d;
    el._pos = placement();
    size(el);
    pile.appendChild(el);

    if (!reduceMotion && el.animate) {
      el.animate(
        [{ transform: transformOf(el._pos, DROP_LIFT, DROP_ROT, DROP_SCALE) },
         { transform: transformOf(el._pos, 0, 0, 1) }],
        { duration: DROP_MS, easing: DROP_EASE }
      );
    }

    // все, кто ниже, опускаются на ступень — дальше их ведёт пружина в frame()
    const cards = pile.children;
    for (let i = cards.length - 2, k = 1; i >= 0; i--, k++) {
      cards[i]._depth = Math.min(k, MAX_CARDS + 1);
    }
    lastDrop = performance.now();
  }

  let beat = 0;
  function schedule() {
    const frames = RHYTHM_FRAMES[beat++ % RHYTHM_FRAMES.length];
    const ms = reduceMotion ? 700 : frames * (1000 / 30);
    timer = setTimeout(() => { drop(); schedule(); }, ms);
  }

  // Движение курсора подкидывает карточки чаще — как на записи
  stage.addEventListener('pointermove', () => {
    if (reduceMotion) return;
    if (performance.now() - lastDrop >= POINTER_MIN_MS) drop();
  });

  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) schedule();
  });

  window.addEventListener('resize', () => {
    measure();
    for (const el of pile.children) size(el);
  });

  measure();
  drop();
  schedule();
  requestAnimationFrame(frame);
})();
