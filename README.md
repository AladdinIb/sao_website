# Smithsonian Astrophysical Observatory — Website

A Smithsonian-branded static site for the **Smithsonian Astrophysical Observatory (SAO)**: SAO-led missions and projects, our history since 1890, and our place within the Center for Astrophysics | Harvard & Smithsonian. Design language follows [science.si.edu](https://science.si.edu/) (Geologica type, Smithsonian blue & sunburst yellow, vibrant full-bleed imagery).

**Live site: <https://granttremblay.github.io/sao_website/>**

Deployed via GitHub Pages from the `main` branch root — every push to `main` goes live in about a minute. No build step, no dependencies: plain HTML/CSS/JS.

## Structure

```
index.html                  Single-page site (hero, stats, missions, history, CfA, footer)
css/style.css               All styles; brand colors as CSS variables in :root
js/main.js                  Interactions: nav, scroll reveals, rotating stat,
                            photo mosaic, timeline progress
assets/
  logos/                    SI/AO, CfA, Smithsonian Science, STARS, AstroAI (SVG)
  images/                   Web-optimized JPEGs used by the site
    card_images/            Mission card photos (~900px wide)
    history_images/         Timeline photos
    mosaic/                 600x600 tiles for the rotating stats mosaic
    mosaic_sources/         Raw drop folder for new mosaic images (gitignored)
  favicon.svg               Smithsonian sunburst (+ PNG fallbacks)
scripts/
  add_mosaic_images.sh      Mosaic image pipeline (see below)
```

Heavy source images (original PNGs/screenshots) stay local and are gitignored; the repo only ships web-optimized JPEGs. See `.gitignore`.

## Adding images to the mosaic rotation

1. Drop images — any size, any filename (jpg/png/heic/webp/tiff) — into `assets/images/mosaic_sources/`
2. Run:

   ```bash
   ./scripts/add_mosaic_images.sh          # process + update manifest locally
   ./scripts/add_mosaic_images.sh --push   # ...and commit + push to deploy
   ```

The script center-crops each image to a 600×600 JPEG tile named `mosaic_NN.jpg`, regenerates the `MOSAIC_MANIFEST` array in `js/main.js`, syntax-checks the result, and moves processed sources to `mosaic_sources/processed/`. macOS only (uses `sips`).

## Adding to the rotating stats

Edit the `ROTATING_STATS` array near the top of [`js/main.js`](js/main.js):

```js
{ big: "1890", label: "Exploring the cosmos<br>since our founding" },
```

- `big` — the headline. Pure numbers (optionally with a trailing `+`, e.g. `"16+"`) count up
  each time they appear; anything else (`"Two"`, `"Thousands"`) displays as text, automatically
  smaller when longer than 6 characters.
- `label` — the line underneath; `<br>` is allowed.
- **Mind the commas between entries** — a missing comma is a syntax error that breaks the whole
  page (every section waits on JS-driven reveal animations). Check before pushing:

  ```bash
  node --check js/main.js
  ```

## Accessibility checks

The site is built to WCAG-minded standards. After meaningful changes, verify:

- **Automated audit** — run [axe-core](https://github.com/dequelabs/axe-core) against the page
  (e.g. paste into DevTools console):

  ```js
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
  s.onload = () => axe.run().then(r => console.log(r.violations));
  document.head.appendChild(s);
  ```

  Target: **zero violations** (the current baseline).

- **Images** — every `<img>` needs `alt` text; purely decorative images (logo overlays whose
  names appear in adjacent headings, the aria-hidden mosaic) use `alt=""`.
- **Keyboard** — Tab from the top: the "Skip to main content" link appears first; all links show
  a visible cyan focus outline; on mobile widths the closed menu must NOT be tabbable, Escape
  closes the open menu and returns focus to the toggle.
- **Motion** — with `prefers-reduced-motion` enabled, reveals/starfield/mosaic/stat rotation all
  go static.
- **Structure** — one `<h1>`, logical heading order, `<main>` landmark present, nav landmarks
  labeled, decorative glyphs (↗ arrows) wrapped in `aria-hidden` spans.

## Social sharing

Open Graph / Twitter card tags live in `index.html` and point at
`assets/images/social_card.jpg` (1200×630). If the site URL changes (e.g. a custom domain),
update the absolute `og:url` / `og:image` / `twitter:image` URLs.
