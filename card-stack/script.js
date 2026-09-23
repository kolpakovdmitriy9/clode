/*
 * Стопка карточек по референсу.
 *
 * Модель: у всей колоды один «плейхед» p (в единицах карточек). Глубина
 * карточки i — d = p - i. d < 0 — карточка ещё не вышла (скрыта); d = 0 —
 * она только что легла сверху; дальше по мере роста d она уходит назад:
 *   0 … 3.5  — почти стоит на месте под новой карточкой (чуть сжимается),
 *   3.5 … 6  — резко взлетает вверх, уменьшается до ~0.4 и поворачивается,
 *   6 … 8.8  — разгоняясь, уходит за верхний край экрана, слегка тускнея.
 * Новая карточка появляется мгновенно, когда p пересекает её индекс, а хвост
 * из старых карточек едет непрерывно — так и выглядит референс.
 */
(() => {
  const deck = document.getElementById('deck');
  const stage = document.getElementById('stage');

  // w, h — в долях базовой высоты H; rot/dx — «характер» карточки в хвосте
  const CARDS = [
    { cls: 'head',   w: 0.80, h: 0.62, rot: -14, dx: -0.10 },
    { cls: 'poster poster-light', w: 0.74, h: 0.86, rot: 12, dx: 0.12,
      html: '<span class="t1">Slow</span><span class="t2">down.</span>' },
    { cls: 'sea',    w: 0.78, h: 0.72, rot: 22, dx: 0.20 },
    { cls: 'tower',  w: 0.66, h: 0.84, rot: 1,  dx: 0.00 },
    { cls: 'bloom',  w: 0.72, h: 0.84, rot: -12, dx: -0.12 },
    { cls: 'profile', w: 0.80, h: 0.80, rot: 16, dx: 0.10 },
    { cls: 'ferry',  w: 0.80, h: 0.68, rot: -8, dx: -0.06 },
    { cls: 'tulip',  w: 0.86, h: 0.90, rot: 14, dx: 0.10 },
    { cls: 'poster', w: 0.74, h: 1.00, rot: -12, dx: -0.10,
      html: '<span class="t1">Hold<br><span class="indent">the light</span></span>' +
            '<i class="mark"></i>' +
            '<span class="t2">and<br><span class="indent">let go.</span></span>' },
    { cls: 'court',  w: 0.82, h: 0.62, rot: 10, dx: 0.08 },
    { cls: 'label',  w: 0.60, h: 0.46, rot: -16, dx: -0.12, html: 'SS27' },
    { cls: 'car',    w: 0.80, h: 0.82, rot: 12, dx: 0.10 },
    { cls: 'blob',   w: 0.90, h: 0.64, rot: 18, dx: 0.14 },
    { cls: 'seats',  w: 0.76, h: 1.10, rot: -15, dx: -0.05 },
  ];

  const REST_P = 8;   // состояние покоя: сверху постер, хвост — «башня» + «море»

  // Траектория по глубине d (снята покадрово с видео, 30 fps)
  //        d     y/H     scale  k(rot,dx)  opacity  brightness
  const PATH = [
    [0,     0,     1.00,  0.00,  1,    1   ],
    [1,    -0.02,  0.96,  0.00,  1,    1   ],
    [2,    -0.04,  0.92,  0.03,  1,    1   ],
    [3.5,  -0.08,  0.86,  0.10,  1,    1   ],
    [4.3,  -0.30,  0.62,  0.45,  1,    1   ],
    [5,    -0.67,  0.43,  0.72,  1,    1   ],
    [6,    -0.93,  0.38,  1.00,  1,    0.97],
    [7,    -1.21,  0.33,  1.12,  1,    0.80],
    [8,    -1.62,  0.29,  1.26,  0.7,  0.60],
    [8.8,  -2.08,  0.26,  1.36,  0,    0.45],
  ];
  const D_MAX = PATH[PATH.length - 1][0];

  // Плейхед после клика: момент (с) появления каждой карточки. Сначала
  // медленно (~0.3 с на карточку), затем разгон до ~0.07–0.15 с, после
  // последней — хвост не тормозит, а разгоняется и улетает за край (~1.5 с).
  const TIMELINE = [
    [0.00, 0], [0.27, 1], [0.60, 2], [0.87, 3], [1.03, 4], [1.13, 5],
    [1.24, 6], [1.42, 7], [1.53, 8], [1.67, 9], [1.83, 10], [1.97, 11],
    [2.07, 12], [2.20, 13], [2.80, 16.5], [3.30, 19.5], [3.70, 22.2],
  ];
  const LAST = CARDS.length - 1;
  // Когда последняя карточка набирает глубину LAUNCH_D (пик рывка вверх),
  // плейхед перестаёт идти по таймлайну: карточка летит с постоянным
  // ускорением (в долях H/с²), пока не скроется за верхним краем.
  const LAUNCH_D = 4.6;
  const LAUNCH_ACCEL = 4;

  const FADE_OUT = 330;   // стопка гаснет после клика, мс
  const GAP_AFTER = 250;  // пауза: вместе с догоранием хвоста ≈ 0.4 с пустой сцены
  const FADE_IN = 170;    // возврат стопки покоя

  /* ---------- монотонная кубическая интерполяция (Fritsch–Carlson) ---------- */
  function monotone(xs, ys) {
    const n = xs.length;
    const dx = [], m = [], t = new Array(n);
    for (let i = 0; i < n - 1; i++) {
      dx[i] = xs[i + 1] - xs[i];
      m[i] = (ys[i + 1] - ys[i]) / dx[i];
    }
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) t[i] = 0;
      else {
        const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
      }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const h = dx[i], s = (x - xs[i]) / h, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * t[i] +
             (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * t[i + 1];
    };
  }

  const col = (k) => PATH.map((r) => r[k]);
  const pathY = monotone(col(0), col(1));
  const pathS = monotone(col(0), col(2));
  const pathK = monotone(col(0), col(3));
  const pathO = monotone(col(0), col(4));
  const pathB = monotone(col(0), col(5));
  // |dy/dd| траектории — во сколько раз смещение по глубине двигает карточку по экрану
  const slopeY = (d) => (pathY(d) - pathY(d + 0.01)) / 0.01;
  const playhead = monotone(TIMELINE.map((r) => r[0]), TIMELINE.map((r) => r[1]));

  /* ---------- сборка DOM ---------- */
  let H = 0;
  const els = CARDS.map((c, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.zIndex = String(i + 1);
    const art = document.createElement('div');
    art.className = 'art ' + c.cls;
    if (c.html) art.innerHTML = c.html;
    el.appendChild(art);
    deck.appendChild(el);
    return el;
  });

  function layout() {
    H = Math.min(window.innerHeight * 0.47, window.innerWidth * 0.9);
    document.documentElement.style.setProperty('--H', H + 'px');
    CARDS.forEach((c, i) => {
      const w = c.w * H, h = c.h * H;
      els[i].style.width = w + 'px';
      els[i].style.height = h + 'px';
      els[i].style.left = -w / 2 + 'px';
      els[i].style.top = -h / 2 + 'px';
    });
  }

  /* ---------- отрисовка кадра по плейхеду ---------- */
  function render(p) {
    const W = H * 0.74;
    for (let i = 0; i < CARDS.length; i++) {
      const el = els[i];
      const d = p - i;
      if (d < 0 || d >= D_MAX) {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
        continue;
      }
      const c = CARDS[i];
      const k = pathK(d);
      const x = c.dx * W * k;
      const y = pathY(d) * H;
      const s = pathS(d);
      const r = c.rot * k;
      const o = pathO(d);
      const b = pathB(d);
      el.style.visibility = 'visible';
      el.style.transform =
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      el.style.opacity = o.toFixed(3);
      el.style.filter = b < 0.999 ? `brightness(${b.toFixed(3)})` : '';
    }
  }

  /* ---------- сценарий клика ---------- */
  let running = false;

  function setDeck(mode) {
    // mode: 'hide' — плавно погасить, 'show-instant', 'hide-instant', 'fade-in'
    deck.classList.remove('is-instant', 'is-fadein');
    if (mode === 'show-instant' || mode === 'hide-instant') {
      deck.classList.add('is-instant');
      deck.classList.toggle('is-hidden', mode === 'hide-instant');
      void deck.offsetWidth;
      deck.classList.remove('is-instant');
    } else if (mode === 'fade-in') {
      deck.classList.add('is-fadein');
      deck.classList.remove('is-hidden');
    } else {
      deck.classList.add('is-hidden');
    }
  }

  function run() {
    if (running) return;
    running = true;
    setDeck('hide');

    setTimeout(() => {
      render(playhead(0));
      setDeck('show-instant');
      const t0 = performance.now();
      let lastT = 0, p = 0, launched = false, v = 0;
      const tick = (now) => {
        const t = Math.max(0, (now - t0) / 1000);
        const dt = Math.min(t - lastT, 0.05);
        lastT = t;
        if (!launched) {
          p = playhead(t);
          if (p - LAST >= LAUNCH_D) {
            // стартовая экранная скорость = та, с которой карточка уже летит
            launched = true;
            v = slopeY(p - LAST) * (playhead(t + 0.01) - playhead(t)) / 0.01;
          }
        } else {
          // свободный вылет: экранная скорость только растёт, без провала
          v += LAUNCH_ACCEL * dt;
          p += (v / Math.max(slopeY(p - LAST), 0.2)) * dt;
        }
        render(p);
        if (p - LAST < D_MAX) requestAnimationFrame(tick);
        else finish();
      };
      requestAnimationFrame(tick);
    }, FADE_OUT);
  }

  function finish() {
    render(1e3); // всё скрыто
    setTimeout(() => {
      setDeck('hide-instant');
      render(REST_P);
      requestAnimationFrame(() => {
        setDeck('fade-in');
        setTimeout(() => { running = false; }, FADE_IN);
      });
    }, GAP_AFTER);
  }

  stage.addEventListener('click', run);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); run(); }
  });
  window.addEventListener('resize', () => { layout(); if (!running) render(REST_P); });

  layout();
  render(REST_P);

  // Для отладки/записи: ?p=8.5 — застывший кадр, ?auto — сразу проиграть
  const q = new URLSearchParams(location.search);
  if (q.has('p')) render(parseFloat(q.get('p')));
  if (q.has('auto')) setTimeout(run, 600);
  window.__deck = { render, run, playhead };
})();
