Build a static HTML + CSS + JS one-page site "JARCOS" - the personal design-practice site of João Ferreira, a Brazilian multidisciplinary designer. No framework required (or React/Vite if preferred) - vanilla is fine. Match every detail exactly.

---

## GLOBAL

- **Fonts:** "Inter Display" (self-hosted on the real site; substitute Google Fonts "Inter" if Inter Display isn't available), weights 600 (semibold, used almost everywhere) and 700 (bold). Root font-size scales by breakpoint: 87.5% on mobile/tablet (<=1199.98px), 75% on desktop (1200-1919.98px), 100% on >=1920px.
- **Colors — only three, no accents:** black `#000`, white `#fff`, gray `rgb(128,128,128)`. Page background is black; the hero section is a white card pinned on top of it.
- **Type preset used almost everywhere:** `letter-spacing: -0.01em; line-height: 1.3em;` weight 600. Buttons/links use `letter-spacing: -0.02em`.
- **Smooth scroll:** Lenis-style smooth scrolling on the whole page (`html { scroll-behavior additionally dampened via JS }` or a small custom smooth-scroll lerp - not required to be pixel-exact, but the page should feel eased, not default-jumpy).
- **Custom cursor:** hide the native cursor (`cursor: none` on body/*), replace it with a small white circular bubble that follows the pointer (`transform: translate(-50%,-50%)`, slight lag via `requestAnimationFrame` lerp) containing a small right-pointing arrow. Over specific interactive elements (the giant wordmark, the floating image) the bubble morphs into a white rounded-rect pill reading **"Go on, press it"**.
- **Reveal animation system:** every text block fades in from `opacity:0; translateY(8px)` to `opacity:1; translateY(0)`, `420ms cubic-bezier(0.38,0.1,0,0.99)`, staggered a few ms per element (IntersectionObserver-driven for anything below the fold). The hero's two headline lines additionally reveal **letter by letter** (each character its own inline-block span, staggered ~12-18ms).

---

## SECTION: STICKY PILL NAV (fixed, always on top)

Fixed, `top:16px`, centered horizontally, `z-index` above everything. White pill (`background:#fff; border-radius:8px; padding:5px; display:flex; gap:8px`) containing 3 links: **Work**, **Grid**, **Inquiries**. A separate white rounded-rect (`border-radius:4px`) sits absolutely positioned behind the currently-hovered link and slides (`transition:300ms ease-in-out`) between links via JS (measure `getBoundingClientRect` of the hovered link relative to the pill). Link text is black, weight 600, no negative tracking; over the black sections further down the pill's own white background keeps it legible with no extra tricks needed.

---

## SECTION 1: HERO (`s1`, full viewport, white, `position: sticky; top:0; height:100vh`)

**Top row content (a wrapper with `mix-blend-mode: difference` isn't required, just plain black/gray text is fine):**

- Small bullet/dot, then a two-line headline built from `<h1>`:
  - Line 1 (black): "JARCOS is the design practice by João Ferreira"
  - continues in gray, same line or wrapped: "a brazilian multidisciplinary designer"
  - Line 2 (gray): "working across brand and digital"
- To the right, a stacked plain-text nav (visible only in the hero, separate from the floating pill): **Work** / **Grid** / **Inquiries**, each fading in with `transition-delay` increasing ~2ms per item.
- Far right, right-aligned, stacked: city name **"Guarulhos"** (black, bold) above a **live clock** showing current time in the `America/Sao_Paulo` timezone, `HH:MM` format, gray, updates every second/minute.

**Floating "polaroid" image:** one photographed-poster-style card (rounded corners, soft shadow, slight rotation) positioned absolutely inside a bounded arena within the hero. It **moves continuously like an old DVD-screensaver logo** - constant-velocity diagonal drift, bouncing (reflecting its velocity) off the arena's edges - and every so often (e.g. on a bounce, or every few seconds) cross-fades to a different image from a small rotating set. Use CSS gradient/shape placeholders (no real photos available) styled as abstract poster art (big overlapping gradient circles on a solid background), since the original uses real project photography here.

**Giant wordmark:** the word **"JARCOS"** set in one line, sized to fill the full content width edge-to-edge (huge, `clamp()`-based or `vw`-based font-size, weight 700-900, tight negative letter-spacing, `line-height` ~0.8). Sits pinned to the bottom of the hero viewport. This is also the element the custom cursor's "Go on, press it" state is tied to (clicking it can do something playful, e.g. scroll back to top).

---

## SECTION: SPACER

An empty ~50vh block directly after the hero (normal flow, not sticky) - this is what gives the black panel below room to "wind up" before it starts visually covering the pinned white hero as the user keeps scrolling.

---

## SECTION 2: ABOUT / CAPABILITIES / CLIENTS / COLLABORATIONS (`s2`, black background, `backdrop-filter: blur(10px)`, scrolls up and covers the pinned hero)

A repeating **row pattern**: a 12-column grid, label/heading in the left ~4 columns, content in the right ~8 columns (often split into two sub-columns of gray text lines). Rows below the first have a 1px hairline top border at ~12% white opacity.

1. **Intro row** - left: small label **"2012 — 26"**. Right: a large (2x body size) white heading paragraph: *"A design practice shaping brands and digital experiences. Driven by meaning, storytelling, and strategy. Working project by project, partnering with clients and studios worldwide, and expanding through trusted collaborators when needed."* Below it, a black pill CTA button **"Pop up a message"** with a right-arrow icon: on hover a white blurred fill wipes in from the left across the whole pill and the arrow slides/swaps position, text/icon stay legible via `mix-blend-mode: difference`.
2. **Capabilities row** - left heading "Capabilities". Right, two gray columns: (A) Creative Direction, Art Direction, Digital Design, Branding, Identity Systems; (B) Motion Design, Brand Strategy, User Experience, Visual Storytelling.
3. **Selected Clients row** - left heading "Selected Clients". Right, two gray columns: (A) Nubank, Google, Nestlé, O Globo, Avenue, Zellerfeld, Stone; (B) Itaú, Localiza, iFood, Compsych, Nescafé, Ausenco.
4. **Collaborations row** - left heading "Collaborations". Right, two columns of linked studio names (external links, `target="_blank"`): (A) Koto, Futurebrand, Metalab, Serious.Business, Konpo; (B) Plau, iN, Môre, Asia.

---

## SECTION 3: WORK GALLERY (`s3`, black background, 2-column grid, gap ~32px)

Six project cards, each a media block (aspect-ratio per project below) with a subtle hover interaction: `clip-path: inset(0%)` at rest, `inset(0.7%)` on hover (a tiny "zoom crop"), `transition: 600ms cubic-bezier(.25,.1,.25,1)`. Below each media block, a small text row: project title (white, semibold) + discipline tag (gray).

1. **Zellerfeld** - Identity System, Website Design - aspect-ratio 1920/1280
2. **Landsight** - Visual Identity, Website Design - aspect-ratio 1440/960
3. **Opus** - Art Direction, Website Design - aspect-ratio 1920/1280
4. **O Globo** - Identity System - aspect-ratio 2116/1440
5. **DEF** - Art Direction, Website Design - aspect-ratio 1920/1280
6. **Avenue** - Art Direction, Visual Identity - aspect-ratio 1440/960

Since real photography/video isn't available, use flat gradient placeholder art per card (a distinct duotone gradient per project) at the correct aspect ratio.

---

## SECTION 4: BIO / RECOGNITION / RELEVANT PROJECTS / QUICK LINKS (`s4`, black, same row-grid pattern as `s2`, bordered rows)

1. **Bio row** - left, large (2x) white heading: *"JARCOS is a design practice led by João Ferreira, a Brazilian multidisciplinary designer with over 14 years of experience in branding and digital design."* Right, gray paragraphs: *"Started in 2012, JARCOS is both a personal experiment and a collaborative platform, shaped by João's perspective on design and extended through trusted partners."* / *"The practice focuses on brand identities and digital experiences, built through strategy, storytelling, and craft, in collaboration with global studios and clients across finance, technology, and consumer sectors."* then a link **"Read full bio"**.
2. **Recognition row** - left heading "Recognition". Right, gray lines:
   - "9× Adobe Best of Behance · +44× Features"
   - "Awwwards · 1× SOTD · 7× HM"
   - "iF Design Award · GOL Linhas Aéreas (TangerinaDS)"
   - "Wolda · Localiza (FutureBrand)"
   - "Features · Communication Arts · World Brand Design · Mindsparkle Mag"
3. **Relevant projects row** - left heading "Relevant projects". Right, gray lines:
   - "Nubank · Brand Identity (Koto)"
   - "Android Drop · Campaign (Koto)"
   - "O Globo · Brand Refresh (Asia)"
   - "Compsych · Brand Identity (Konpo)"
   - "Avenue · Brand Identity (iN)"
   - "The Fini Company · Brand Identity (FutureBrand)"
4. **Quick links row** - left heading "Quick links". Right, links: Linkedin, Instagram, Savee, Email, AI Profile.

---

## SECTION: FOOTER META ROW

Left: **"© 2026"**. Right: bold **"This is a small selection of my work."** with a gray line under it, **"A full portfolio upon request."** as a `mailto:` link with a prefilled subject/body asking for the full portfolio.

---

## SECTION 5: CLOSING WORDMARK (`s5`, white background)

A second giant edge-to-edge **"JARCOS"** wordmark identical in styling to the hero's, filling the final screen of the page. Because it sits after the black section in normal document flow, it visually slides up from below and covers the pinned white hero underneath it once scrolled fully into view - the page's closing "bookend" screen.

---

## TECHNICAL NOTES

- Pure HTML/CSS/JS, no build step, deployable as static files (e.g. GitHub Pages).
- The hero's `position: sticky` + the black sections' plain solid backgrounds in normal flow (later DOM = painted on top) is what produces the whole page's signature "panels sliding up over a pinned white card" scroll choreography - no JS scroll-jacking required for that part.
- Everything else (letter reveal, IntersectionObserver fades, nav-pill slider, custom cursor, DVD-bounce image, button hover wipe, gallery hover zoom) is small, independent, progressively-enhanced JS - the page should still read fine with JS disabled (reveals default to visible, cursor default to native).
