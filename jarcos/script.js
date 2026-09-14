(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;

  /* ---------------- live clock (Sao Paulo / Guarulhos) ---------------- */
  const clockEl = document.getElementById("clock");
  function tickClock() {
    if (!clockEl) return;
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    });
    clockEl.textContent = fmt.format(new Date());
  }
  tickClock();
  setInterval(tickClock, 15000);

  /* ---------------- letter-by-letter reveal ---------------- */
  function splitLetters(el) {
    const text = el.dataset.text || el.textContent;
    el.textContent = "";
    const words = text.split(" ");
    words.forEach((word, wi) => {
      const wrap = document.createElement("span");
      wrap.style.whiteSpace = "nowrap";
      [...word].forEach((ch, ci) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = ch;
        span.style.transitionDelay = reduceMotion ? "0ms" : (wi * 4 + ci) * 14 + "ms";
        wrap.appendChild(span);
      });
      el.appendChild(wrap);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }
  const letterEls = document.querySelectorAll(".reveal-letters");
  letterEls.forEach(splitLetters);

  /* ---------------- reveal-on-scroll (IntersectionObserver) ---------------- */
  const revealTargets = document.querySelectorAll(".reveal-block, .reveal-letters, .hero__nav");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------------- sticky pill nav — sliding indicator ---------------- */
  const pillNav = document.getElementById("pillNav");
  const pillIndicator = document.getElementById("pillIndicator");
  if (pillNav && pillIndicator) {
    const links = pillNav.querySelectorAll(".pill-nav__link");
    const moveIndicator = (link) => {
      const navRect = pillNav.getBoundingClientRect();
      const rect = link.getBoundingClientRect();
      pillIndicator.style.left = rect.left - navRect.left + "px";
      pillIndicator.style.width = rect.width + "px";
      pillIndicator.style.height = rect.height + "px";
      pillIndicator.style.top = rect.top - navRect.top + "px";
      pillIndicator.style.opacity = "1";
    };
    links.forEach((link) => {
      link.addEventListener("mouseenter", () => moveIndicator(link));
    });
    pillNav.addEventListener("mouseleave", () => {
      pillIndicator.style.opacity = "0";
    });
  }

  /* ---------------- custom cursor ---------------- */
  const cursor = document.getElementById("cursor");
  if (cursor && !isTouch) {
    let mx = window.innerWidth / 2,
      my = window.innerHeight / 2,
      cx = mx,
      cy = my;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.classList.remove("hidden");
    });
    document.addEventListener("mouseleave", () => cursor.classList.add("hidden"));

    function raf() {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%,-50%)`;
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    document.querySelectorAll("[data-cursor='press']").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("press"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("press"));
    });
    document.querySelectorAll("[data-cursor='pointer']").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("press"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("press"));
    });
  } else if (cursor) {
    cursor.style.display = "none";
    document.body.classList.remove("cursor-none");
  }

  /* ---------------- DVD-bounce floating image ---------------- */
  const arena = document.getElementById("heroArena");
  const floater = document.getElementById("floater");
  const floaterArt = floater ? floater.querySelector(".floater__art") : null;
  const artVariants = ["floater__art--1", "floater__art--2", "floater__art--3"];

  if (arena && floater && !reduceMotion) {
    let w = floater.offsetWidth,
      h = floater.offsetHeight,
      areaW = arena.clientWidth,
      areaH = arena.clientHeight;
    let x = areaW * 0.12,
      y = areaH * 0.28;
    let vx = areaW * 0.00028,
      vy = areaH * 0.00022;
    let variantIndex = 0;
    let angle = -4;

    function resize() {
      w = floater.offsetWidth;
      h = floater.offsetHeight;
      areaW = arena.clientWidth;
      areaH = arena.clientHeight;
    }
    window.addEventListener("resize", resize);

    function swapArt() {
      variantIndex = (variantIndex + 1) % artVariants.length;
      floaterArt.className = "floater__art " + artVariants[variantIndex];
    }

    let last = performance.now();
    function step(now) {
      const dt = Math.min(now - last, 48);
      last = now;

      x += vx * dt;
      y += vy * dt;

      let bounced = false;
      if (x <= 0) {
        x = 0;
        vx *= -1;
        bounced = true;
      } else if (x + w >= areaW) {
        x = areaW - w;
        vx *= -1;
        bounced = true;
      }
      if (y <= 0) {
        y = 0;
        vy *= -1;
        bounced = true;
      } else if (y + h >= areaH * 0.86) {
        y = areaH * 0.86 - h;
        vy *= -1;
        bounced = true;
      }
      if (bounced) {
        swapArt();
        angle = angle >= 0 ? -4 - Math.random() * 3 : 4 + Math.random() * 3;
      }

      floater.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  } else if (floater && reduceMotion) {
    floater.style.left = "8%";
    floater.style.top = "26%";
  }

  /* ---------------- easter egg: click wordmark to scroll to top ---------------- */
  document.querySelectorAll(".wordmark").forEach((wm) => {
    wm.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });
})();
