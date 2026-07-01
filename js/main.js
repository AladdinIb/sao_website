/* Smithsonian Astrophysical Observatory — site interactions */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header state ---------- */

  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Show the header logo only once the hero logo has scrolled out of view,
  // so the SAO lockup never appears twice at the same time.
  const heroLogo = document.querySelector(".hero-logo");
  if (heroLogo) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("brand-visible", !entry.isIntersecting);
    }).observe(heroLogo);
  } else {
    header.classList.add("brand-visible");
  }

  /* ---------- Mobile nav ---------- */

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });

  /* ---------- Scroll-reveal ---------- */

  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    revealObserver.observe(el);
  });

  /* ---------- Hero backdrop ----------
     Static backdrops the visitor switches with the arrow controls — no
     auto-advance, no Ken Burns. Slides are built from HERO_MANIFEST below,
     each { file, credit }, with credit shown in .hero-credit. To add/optimize
     images and regenerate this list, drop full-size files into
     assets/images/hero_images/originals/ and run scripts/add_hero_images.sh
     (it preserves the credit text you write here). */

  const HERO_DIR = "assets/images/hero_images/";
  const HERO_MANIFEST = [
    { file: "galactic.jpg", credit: "Placeholder credit — the center of the Milky Way in X-ray, infrared, and radio light. Credit: [Name / Institution]." },
    { file: "milkyway_backdrop.jpg", credit: "Placeholder credit — a 360° panorama of the Milky Way. Credit: [Name / Institution]." }
  ];

  const slideshow = document.querySelector(".hero-slideshow");
  if (slideshow && HERO_MANIFEST.length) {
    const credit = document.querySelector(".hero-credit");
    const prevBtn = document.querySelector(".hero-prev");
    const nextBtn = document.querySelector(".hero-next");
    let idx = 0;

    // Build the slide layers from the manifest.
    const slides = HERO_MANIFEST.map((item) => {
      const slide = document.createElement("div");
      slide.className = "hero-slide";
      slide.style.backgroundImage = `url("${HERO_DIR}${item.file}")`;
      slideshow.append(slide);
      return slide;
    });

    const show = (i) => {
      slides[idx].classList.remove("is-active");
      idx = (i + slides.length) % slides.length;
      slides[idx].classList.add("is-active");
      if (credit) credit.textContent = HERO_MANIFEST[idx].credit || "";
    };

    slides[0].classList.add("is-active");
    if (credit) credit.textContent = HERO_MANIFEST[0].credit || "";

    // A single backdrop needs no controls.
    const nav = document.querySelector(".hero-nav");
    if (slides.length < 2) {
      if (nav) nav.hidden = true;
    } else {
      if (prevBtn) prevBtn.addEventListener("click", () => show(idx - 1));
      if (nextBtn) nextBtn.addEventListener("click", () => show(idx + 1));
    }
  }

  /* ---------- Rotating lead stat ----------
     Numbers (with optional "+") count up each time they appear;
     word stats ("Two", "Thousands") slide in as text. */

  const ROTATING_STATS = [
    { big: "1890", label: "Exploring the cosmos<br>since our founding" },
    { big: "600", label: "People pushing the frontiers of astrophysics" },
    { big: "300", label: "Years of combined history" },
    { big: "Two", label: "Nobel prizes" },
    { big: "Thousands", label: "Of major discoveries" },
    { big: "Fifty", label: "States where our science has impact" },
    { big: "16+", label: "World-class observatories" },
    { big: "Six", label: "Scientific divisions spanning all of astrophysics" },
    { big: "Humanity's First", label: "Image of a black hole" }
  ];

  const lead = document.querySelector(".stat-lead");
  if (lead) {
    const numEl = lead.querySelector(".stat-number");
    const labelEl = lead.querySelector(".stat-lead-label");

    const countTo = (el, target, suffix, duration) => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased)) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const showStat = (stat, animateNumbers) => {
      const m = stat.big.match(/^(\d+)(\+?)$/);
      numEl.classList.toggle("long", stat.big.length > 6);
      if (m && animateNumbers) countTo(numEl, parseInt(m[1], 10), m[2], 1000);
      else numEl.textContent = stat.big;
      labelEl.innerHTML = stat.label;
    };

    let idx = 0;

    const rotate = () => {
      lead.classList.add("stat-leaving");
      setTimeout(() => {
        idx = (idx + 1) % ROTATING_STATS.length;
        lead.classList.remove("stat-leaving");
        lead.classList.add("stat-entering");
        showStat(ROTATING_STATS[idx], true);
        setTimeout(() => lead.classList.remove("stat-entering"), 800);
      }, 400);
    };

    const leadObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      leadObserver.disconnect();
      if (reduceMotion) {
        showStat(ROTATING_STATS[0], false);
        return;
      }
      showStat(ROTATING_STATS[0], true);
      setInterval(rotate, 4200);
    }, { threshold: 0.6 });

    leadObserver.observe(lead);
  }

  /* ---------- Rotating image mosaic (stats section) ----------
     Drop square images into assets/images/mosaic/ and they are picked up
     automatically when the server lists directories (python -m http.server
     does). On hosts that don't, add the filenames to MOSAIC_MANIFEST. */

  const MOSAIC_DIR = "assets/images/mosaic/";
  const MOSAIC_MANIFEST = [
    "mosaic_01.jpg",
    "mosaic_02.jpg",
    "mosaic_03.jpg",
    "mosaic_04.jpg",
    "mosaic_05.jpg",
    "mosaic_06.jpg",
    "mosaic_08.jpg",
    "mosaic_09.jpg",
    "mosaic_10.jpg",
    "mosaic_11.jpg",
    "mosaic_12.jpg",
    "mosaic_13.jpg",
    "mosaic_14.jpg",
    "mosaic_15.jpg",
    "mosaic_16.jpg",
    "mosaic_17.jpg",
    "mosaic_18.jpg"
  ];

  const mosaic = document.querySelector(".stats-mosaic");
  if (mosaic) {
    const TILE_COUNT = 6;

    const discoverImages = async () => {
      try {
        const res = await fetch(MOSAIC_DIR);
        if (res.ok && (res.headers.get("content-type") || "").includes("html")) {
          const html = await res.text();
          const files = [...html.matchAll(/href="([^"?]+\.(?:jpe?g|png|webp|avif))"/gi)]
            .map((m) => decodeURIComponent(m[1]).split("/").pop());
          if (files.length) return [...new Set(files)];
        }
      } catch (_) { /* static host: fall back to the manifest */ }
      return MOSAIC_MANIFEST;
    };

    discoverImages().then((files) => {
      const tiles = [];
      // An image is "reserved" from the moment it is assigned to a tile until
      // it has fully faded out — so no two tiles can ever show it at once,
      // even mid-crossfade or while a swap is still loading.
      const reserved = new Set();

      for (let i = 0; i < TILE_COUNT; i++) {
        const tile = document.createElement("div");
        tile.className = "mosaic-tile";
        const a = new Image();
        const b = new Image();
        const file = files[i % files.length];
        a.src = MOSAIC_DIR + file;
        a.className = "front";
        a.alt = "";
        b.alt = "";
        tile.append(a, b);
        mosaic.append(tile);
        reserved.add(file);
        tiles.push({ imgs: [a, b], front: 0, current: file, pending: false });
      }

      // Rotation only makes sense with more images than tiles.
      if (reduceMotion || files.length <= TILE_COUNT) return;

      const FADE_MS = 1300; // a hair over the 1.2s CSS opacity transition
      let cursor = TILE_COUNT;

      setInterval(() => {
        const t = tiles[Math.floor(Math.random() * tiles.length)];
        if (t.pending) return; // tile is mid-swap; skip this beat

        let candidate = null;
        for (let tries = 0; tries < files.length; tries++) {
          const f = files[cursor % files.length];
          cursor++;
          if (!reserved.has(f)) { candidate = f; break; }
        }
        if (!candidate) return; // every image is on screen or still fading

        reserved.add(candidate);
        t.pending = true;
        const outgoing = t.current;
        const back = t.imgs[1 - t.front];
        back.onload = () => {
          back.classList.add("front");
          t.imgs[t.front].classList.remove("front");
          t.front = 1 - t.front;
          t.current = candidate;
          t.pending = false;
          // Release the outgoing image only after its crossfade completes.
          setTimeout(() => reserved.delete(outgoing), FADE_MS);
        };
        back.onerror = () => {
          reserved.delete(candidate);
          t.pending = false;
        };
        back.src = MOSAIC_DIR + candidate;
      }, 1800);
    });
  }

  /* ---------- Horizontal carousel helper ----------
     Overflow-aware prev/next arrows plus optional auto-advance with a
     pause/play toggle. Auto-advance and smooth scrolling both respect
     prefers-reduced-motion. Shared by the news, impact, and discovery rows. */

  const initScroller = (track, opts = {}) => {
    const { prev, next, toggle, autoplay = false, interval = 6000 } = opts;
    if (!track) return { update: () => {} };

    const hasOverflow = () => track.scrollWidth > track.clientWidth + 4;
    const atEnd = () => track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;

    const update = () => {
      const overflow = hasOverflow();
      if (prev) prev.hidden = !overflow || track.scrollLeft <= 4;
      if (next) next.hidden = !overflow || atEnd();
      // The pause/play control is only meaningful when the row actually auto-scrolls.
      if (toggle) toggle.hidden = !(overflow && autoplay && !reduceMotion);
    };

    const step = () => {
      const card = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 22;
      return card ? card.getBoundingClientRect().width + gap : 320;
    };
    const slide = (dir) =>
      track.scrollBy({ left: dir * step(), behavior: reduceMotion ? "auto" : "smooth" });

    if (prev) prev.addEventListener("click", () => slide(-1));
    if (next) next.addEventListener("click", () => slide(1));
    track.addEventListener("scroll", update, { passive: true });
    new ResizeObserver(update).observe(track);
    update();

    if (autoplay && !reduceMotion) {
      let timer = null;
      let userPaused = false;

      const tick = () =>
        atEnd() ? track.scrollTo({ left: 0, behavior: "smooth" }) : slide(1);
      const start = () => {
        if (timer || userPaused || !hasOverflow()) return;
        timer = window.setInterval(tick, interval);
      };
      const stop = () => { window.clearInterval(timer); timer = null; };

      if (toggle) {
        toggle.setAttribute("aria-pressed", "false");
        toggle.addEventListener("click", () => {
          userPaused = !userPaused;
          if (userPaused) stop(); else start();
          toggle.setAttribute("aria-pressed", String(userPaused));
        });
      }
      // Transient pause while the user hovers or keyboard-focuses the row.
      track.addEventListener("pointerenter", stop);
      track.addEventListener("pointerleave", start);
      track.addEventListener("focusin", stop);
      track.addEventListener("focusout", start);

      start();
    }

    return { update };
  };

  /* ---------- News feed ----------
     Rendered from assets/data/news.json, which scripts/update_news.py
     (run daily by a GitHub Action) refreshes from cfa.harvard.edu/news. */

  const newsGrid = document.getElementById("news-grid");
  if (newsGrid) {
    const newsScroller = initScroller(newsGrid, {
      prev: document.querySelector(".news-scroller .scroll-prev"),
      next: document.querySelector(".news-scroller .scroll-next")
    });

    fetch("assets/data/news.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((items) => {
        for (const item of items) {
          const card = document.createElement("a");
          card.className = "news-card";
          card.href = item.url;
          card.target = "_blank";
          card.rel = "noopener";

          const date = new Date(item.date + "T12:00:00");
          const dateText = isNaN(date) ? item.date
            : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

          card.innerHTML = `
            ${item.image ? `<div class="news-card-photo"><img src="${item.image}" alt="" loading="lazy"></div>` : ""}
            <div class="news-card-body">
              <div class="news-card-meta"><span>${item.label}</span><time datetime="${item.date}">${dateText}</time></div>
              <h3></h3>
            </div>`;
          card.querySelector("h3").textContent = item.title;
          newsGrid.append(card);
        }
        newsScroller.update();
      })
      .catch(() => {
        const fallback = document.createElement("a");
        fallback.className = "card-link";
        fallback.href = "https://www.cfa.harvard.edu/news";
        fallback.textContent = "Read the latest discoveries at cfa.harvard.edu/news";
        newsGrid.append(fallback);
      });
  }

  /* ---------- Impact accordion ----------
     Themed disclosures, one open at a time. Bodies render open (no-JS safe);
     here we switch on the collapse, open the first row, and keep closed bodies
     out of the tab order via `inert`. */

  const impactAcc = document.getElementById("impact-accordion");
  if (impactAcc) {
    impactAcc.classList.add("js");
    const items = Array.from(impactAcc.querySelectorAll(".impact-item"));

    const setOpen = (item, open) => {
      item.classList.toggle("open", open);
      item.querySelector(".impact-acc-header").setAttribute("aria-expanded", String(open));
      item.querySelector(".impact-acc-body").inert = !open;
    };

    items.forEach((item, i) => setOpen(item, i === 0));

    items.forEach((item) => {
      item.querySelector(".impact-acc-header").addEventListener("click", () => {
        const willOpen = !item.classList.contains("open");
        items.forEach((other) => setOpen(other, false));
        if (willOpen) setOpen(item, true);
      });
    });
  }

  /* ---------- SAO Discoveries carousel ----------
     A rotating, non-ranked showcase. To add one: drop an image into
     assets/images/discoveries/ and run scripts/add_discovery_images.sh
     (which appends a stub entry here), then edit its title/blurb/credit.
     The commented entries below are written and just need a real image. */

  const DISCOVERIES = [
    { title: "Humanity's first image of a black hole",
      blurb: "The Event Horizon Telescope, led from SAO, unveiled the glowing ring of M87* in 2019 — then our galaxy's Sagittarius A* in 2022 — turning an untestable idea into an observable object.",
      image: "black_hole.jpg", credit: "Image: EHT Collaboration" },
    { title: "Direct evidence for dark matter",
      blurb: "Chandra's image of the Bullet Cluster caught dark matter sailing ahead of colliding gas — the first direct empirical proof that it exists.",
      image: "dark_matter.jpg", credit: "X-ray: NASA/CXC/CfA · lensing & optical: NASA/STScI; Magellan" },
    { title: "Touching the Sun",
      blurb: "SAO-built instruments aboard Parker Solar Probe sampled the solar wind as the spacecraft crossed into the Sun's corona in 2021 — the first time humanity touched a star.",
      image: "parker_sun.jpg", credit: "Illustration: NASA/Johns Hopkins APL" },
    { title: "Opening the X-ray universe",
      blurb: "From the Einstein Observatory to Chandra, SAO scientists built the field of X-ray astronomy — recognized with the 2002 Nobel Prize — and revealed the hot, violent cosmos.",
      image: "xray_universe.jpg", credit: "Illustration: NASA/CXC" },
    { title: "The cosmic web",
      blurb: "The CfA Redshift Survey produced the first true maps of large-scale structure, discovering the “Great Wall” of galaxies and revealing a universe of filaments and voids.",
      image: "cosmic_web.jpg", credit: "Visualization: cosmological simulation" },
    { title: "Weighing and shaping the Earth",
      blurb: "At the dawn of the Space Age, SAO's worldwide satellite-tracking network pioneered space geodesy — refining Earth's shape and gravity field, laying groundwork for modern GPS.",
      image: "earth_geodesy.jpg", credit: "Image: NASA" }

    // Ready to go live once a real image is dropped in (see README):
    // { title: "The accelerating universe",
    //   blurb: "The High-Z Supernova Search, co-founded at the CfA, found that cosmic expansion is speeding up — revealing dark energy and earning the 2011 Nobel Prize.",
    //   image: "_placeholder.jpg", credit: "" },
    // { title: "The first exoplanet atmosphere",
    //   blurb: "CfA astronomers watched HD 209458 b cross its star in 1999, then detected sodium in its air — founding the science of exoplanet characterization.",
    //   image: "_placeholder.jpg", credit: "" },
    // { title: "Comets are icy worlds",
    //   blurb: "SAO director Fred Whipple's 1950 “dirty snowball” model explained what comets actually are — and has guided every comet mission since.",
    //   image: "_placeholder.jpg", credit: "" },
    // { title: "The fourth test of general relativity",
    //   blurb: "SAO director Irwin Shapiro predicted and measured the delay of radar signals grazing the Sun — a fundamental test of Einstein's theory that now bears his name.",
    //   image: "_placeholder.jpg", credit: "" }
  ];

  const discoveryGrid = document.getElementById("discovery-grid");
  if (discoveryGrid && DISCOVERIES.length) {
    const DISCOVERY_DIR = "assets/images/discoveries/";
    for (const d of DISCOVERIES) {
      const card = document.createElement("article");
      card.className = "discovery-card";
      card.innerHTML = `
        <div class="card-art"><img src="${DISCOVERY_DIR}${d.image}" alt="" loading="lazy"></div>
        <div class="discovery-card-body">
          <h3></h3>
          <p></p>
          ${d.credit ? '<p class="discovery-credit"></p>' : ""}
        </div>`;
      card.querySelector("h3").textContent = d.title;
      card.querySelector(".discovery-card-body > p:not(.discovery-credit)").textContent = d.blurb;
      if (d.credit) card.querySelector(".discovery-credit").textContent = d.credit;
      discoveryGrid.append(card);
    }
    initScroller(discoveryGrid, {
      prev: document.querySelector(".discovery-scroller .scroll-prev"),
      next: document.querySelector(".discovery-scroller .scroll-next"),
      toggle: document.querySelector('.carousel-toggle[data-carousel="discovery"]'),
      autoplay: true,
      interval: 6000
    });
  }

  /* ---------- Timeline progress line ---------- */

  const timeline = document.querySelector(".timeline");
  const progress = document.querySelector(".timeline-progress");
  if (timeline && progress) {
    const updateProgress = () => {
      const rect = timeline.getBoundingClientRect();
      const viewportMid = window.innerHeight * 0.6;
      const pct = Math.max(0, Math.min(1, (viewportMid - rect.top) / rect.height));
      progress.style.height = `${pct * 100}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  /* ---------- Footer year ---------- */

  document.getElementById("year").textContent = new Date().getFullYear();
})();
