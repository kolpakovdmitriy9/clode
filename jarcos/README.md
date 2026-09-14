# JARCOS — design-study clone

A front-end recreation of the homepage of [jarcos.work](https://jarcos.work/), João Ferreira's
design-practice site, built as a design-cloning practice exercise (structure, copy, colors,
type scale, and interaction patterns studied from a saved snapshot of the live page).

**Not affiliated with JARCOS / João Ferreira.** Text content, project names, awards, and client
lists are reproduced from the original public site for study purposes; real photography/video
from the original could not be fetched (this session has no general internet access), so all
imagery here is placeholder gradient art in the same aspect ratios/positions as the original.

## Stack

Plain HTML + CSS + JS, no build step, no dependencies — open `index.html` directly or serve the
folder with any static file server (e.g. `npx serve jarcos`, or GitHub Pages).

## Structure

- `index.html` — markup for all 5 sections (sticky pill nav, hero, about/capabilities/clients/
  collaborations, work gallery, bio/recognition/quick-links, closing wordmark).
- `styles.css` — layout, type scale, color tokens (`#000` / `#fff` / `rgb(128,128,128)`), the
  sticky-hero scroll choreography, hover/reveal animations.
- `script.js` — live Guarulhos (São Paulo) clock, letter-by-letter headline reveal,
  IntersectionObserver scroll reveals, sliding nav-pill indicator, custom cursor, and the
  DVD-screensaver-style bouncing floater image.
- `PROMPT.md` — a from-scratch build prompt describing the page in the same level of detail as
  a design spec, written from studying the original (source of truth for this implementation).

## Known gaps vs. the original

- Real project photography/video (Zellerfeld, Landsight, Opus, O Globo, DEF, Avenue, and the
  hero's rotating image set) are placeholder gradients — drop real files into an `images/`
  folder and swap the CSS `background`/`<img>` sources to use them.
- The original is a Framer/React app with route-based subpages (`/work`, `/grid`, `/contact`,
  `/bio`, `/agents`); this clone is a single static page — those nav links currently point to
  in-page anchors as placeholders.
- Scroll smoothing here uses native `scroll-behavior: smooth`, not a Lenis-equivalent inertial
  scroller.
