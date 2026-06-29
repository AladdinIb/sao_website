# Smithsonian Astrophysical Observatory — Website

A Smithsonian-branded static site for the **Smithsonian Astrophysical Observatory (SAO)**: SAO-led missions and projects, our history since 1890, and our place within the Center for Astrophysics | Harvard & Smithsonian. Design language follows [science.si.edu](https://science.si.edu/) (Geologica type, Smithsonian blue & sunburst yellow, vibrant full-bleed imagery).

**Live site: <https://granttremblay.github.io/sao_website/>**

Deployed via GitHub Pages from the `main` branch root — every push to `main` goes live in about a minute. No build step, no dependencies: plain HTML/CSS/JS.

## Structure

```
index.html                  Single-page site (hero, stats, impact, missions, history, CfA, footer)
css/style.css               All styles; brand colors as CSS variables in :root
js/main.js                  Interactions: nav, scroll reveals, hero slideshow,
                            rotating stat, photo mosaic, news feed,
                            initiatives carousel, timeline
assets/
  logos/                    SI/AO, CfA, Smithsonian Science, STARS, AstroAI (SVG)
  data/news.json            CfA news feed data (auto-generated — do not hand-edit)
  images/                   Web-optimized JPEGs used by the site
    card_images/            Mission card photos (~900px wide)
    hero_images/            Hero backdrop slideshow frames (~1920px wide JPEGs)
    history_images/         Timeline photos
    mosaic/                 600x600 tiles for the rotating stats mosaic
    mosaic_sources/         Raw drop folder for new mosaic images (gitignored)
    news/                   Cached CfA news images (auto-generated)
  favicon.svg               Smithsonian sunburst (+ PNG fallbacks)
scripts/
  add_mosaic_images.sh      Mosaic image pipeline (see below)
  add_hero_images.sh        Hero slideshow image pipeline (see below)
  update_news.py            CfA news feed scraper (see below)
.github/workflows/
  update-news.yml           Daily Action that refreshes the news feed
```

Heavy source images (original PNGs/screenshots) stay local and are gitignored; the repo only ships web-optimized JPEGs. See `.gitignore`.

## Adding images to the mosaic rotation

1. Drop images — any size, any filename (jpg/png/heic/webp/tiff) — into `assets/images/mosaic_sources/`
2. Run:

   ```bash
   ./scripts/add_mosaic_images.sh          # process + update manifest locally
   ./scripts/add_mosaic_images.sh --push   # ...and commit + push to deploy
   ```

The script center-crops each image to a 600×600 JPEG tile named `mosaic_NN.jpg`, regenerates the `MOSAIC_MANIFEST` array in `js/main.js`, syntax-checks the result, and moves processed sources to `mosaic_sources/processed/`. It also rejects images that already exist in the roster under a different filename (perceptual hash comparison) — the on-page rotation guarantees no image ever appears in two grid tiles at once, but it can only do that if each image exists exactly once. macOS only (uses `sips`; duplicate detection needs Pillow, and is skipped gracefully without it).

## The news feed (Impact section)

"News from the Smithsonian Astrophysical Observatory" renders from `assets/data/news.json`, which
`scripts/update_news.py` builds by scraping the Recent News Releases list on
[cfa.harvard.edu/news](https://www.cfa.harvard.edu/news) (top 6 items, images downloaded and
optimized into `assets/images/news/`). A scheduled GitHub Action
(`.github/workflows/update-news.yml`) runs it daily and commits any changes, so the live site
stays current without manual work. To refresh on demand: run the script locally and push, or
trigger the Action from the repo's Actions tab ("Run workflow"). If the CfA page layout changes,
the script exits nonzero rather than writing a bad feed — check the Action logs.

The cards always render as a single row: when the viewport can't fit them all, the row scrolls
horizontally (hidden scrollbar, scroll-snap) behind circular arrow buttons that appear only when
there is actually overflow in that direction.

## Collapsible sections (Impact & Top Ten Discoveries)

"News from the Smithsonian Astrophysical Observatory" (#news) is always visible; below it,
"Science in service to the nation" and "Ten discoveries that changed the universe" are compact
banner cards sitting side by side (#impact section). Clicking a banner (or its button) expands
that card's content to full width beneath the pair — accordion style, so opening one closes the
other. The initiative cards and the discoveries list are plain HTML in `index.html`
(`.initiative-card`, `.discovery`) — edit or add entries there. Collapsed content is `inert`,
so it stays out of the keyboard tab order.

## Hero backdrop slideshow

The landing hero auto-plays a crossfading slideshow of the images in
`assets/images/hero_images/`. The play order and per-image credit lines live in the
`HERO_MANIFEST` array in [`js/main.js`](js/main.js) (search "Hero backdrop slideshow") —
`{ file, credit }` per slide. The page builds the `.hero-slide` layers from it, shows each
slide's `credit` verbatim in the small `.hero-credit` caption (bottom-left), and advances every
`SLIDE_MS` (10 s — ~8 s hold + 2 s crossfade) with a gentle Ken-Burns zoom on the active frame.

### Adding / changing images

Just drop image(s) — any size, any format (jpg/png/heic/webp/tiff) — into
`assets/images/hero_images/` and run:

```bash
./scripts/add_hero_images.sh          # optimize + refresh the manifest
./scripts/add_hero_images.sh --push   # ...and commit + push to deploy
```

The script produces a web-optimized `<name>.jpg` (max 1920px wide, quality auto-stepped down from
88 to stay under ~500KB) and regenerates `HERO_MANIFEST`. It **preserves the credit text** you've
written for existing images and gives brand-new ones a placeholder credit to edit. Heavy
originals stay on disk as masters but are gitignored: the non-jpg you dropped, plus a backup of
any oversized jpg in `hero_images/originals/`. Removing an image from the folder and re-running
drops it from the slideshow.

- **Reorder** by editing the order of `HERO_MANIFEST` entries (new images are appended at the end).
- **Edit a credit** by changing its `credit:` string in `HERO_MANIFEST`.
- A small play/pause control (bottom-right) lets visitors stop the rotation; with
  `prefers-reduced-motion` enabled it starts paused on a single frame and the Ken-Burns/crossfade
  animations are disabled. A two-image-minimum guard disables auto-play if only one slide exists.

### Contrast

There is **no darkening overlay** — backdrops show as-is. Legibility of the centred logo/tagline
comes from text-shadows on the text itself (`.hero-logo img`, `.hero-title`, `.hero-sub`), which
protect the glyphs without tinting the photo. When swapping in a new image, check it behind the
title/tagline: very bright, busy frames *centred* behind the text (e.g. a bright ring or galactic
core dead-centre) are the risk. If one is too low-contrast, drop it rather than re-adding a
full-image gradient.

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
- **Motion** — with `prefers-reduced-motion` enabled, reveals/starfield/mosaic/stat rotation and
  the hero slideshow all go static (the slideshow starts paused on one frame).
- **Structure** — one `<h1>`, logical heading order, `<main>` landmark present, nav landmarks
  labeled, decorative glyphs (↗ arrows) wrapped in `aria-hidden` spans.

## Social sharing

Open Graph / Twitter card tags live in `index.html` and point at
`assets/images/social_card.jpg` (1200×630). If the site URL changes (e.g. a custom domain),
update the absolute `og:url` / `og:image` / `twitter:image` URLs.
