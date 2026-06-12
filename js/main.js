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

  /* ---------- Impact: news feed ----------
     Rendered from assets/data/news.json, which scripts/update_news.py
     (run daily by a GitHub Action) refreshes from cfa.harvard.edu/news. */

  const newsGrid = document.getElementById("news-grid");
  if (newsGrid) {
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
              <h4></h4>
            </div>`;
          card.querySelector("h4").textContent = item.title;
          newsGrid.append(card);
        }
      })
      .catch(() => {
        const fallback = document.createElement("a");
        fallback.className = "card-link";
        fallback.href = "https://www.cfa.harvard.edu/news";
        fallback.textContent = "Read the latest discoveries at cfa.harvard.edu/news";
        newsGrid.append(fallback);
      });
  }

  /* ---------- Impact: initiatives carousel ---------- */

  const carousel = document.querySelector(".carousel");
  if (carousel) {
    const prev = document.querySelector(".carousel-prev");
    const next = document.querySelector(".carousel-next");
    const step = () => {
      const card = carousel.querySelector(".initiative-card");
      return card ? card.offsetWidth + 22 : 460;
    };
    const slide = (dir) =>
      carousel.scrollBy({ left: dir * step(), behavior: reduceMotion ? "auto" : "smooth" });

    prev.addEventListener("click", () => slide(-1));
    next.addEventListener("click", () => slide(1));

    const updateButtons = () => {
      prev.disabled = carousel.scrollLeft <= 4;
      next.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 4;
    };
    carousel.addEventListener("scroll", updateButtons, { passive: true });
    // ResizeObserver re-evaluates once styles/layout land (a load-time check
    // can run before CSS applies, when the carousel doesn't overflow yet).
    new ResizeObserver(updateButtons).observe(carousel);
    updateButtons();

    // Mouse drag-to-scroll (touch devices scroll natively)
    let dragStartX = 0;
    let dragStartScroll = 0;
    let dragging = false;

    carousel.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartScroll = carousel.scrollLeft;
      carousel.setPointerCapture(e.pointerId);
    });
    carousel.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const moved = e.clientX - dragStartX;
      if (Math.abs(moved) > 6) carousel.classList.add("dragging");
      carousel.scrollLeft = dragStartScroll - moved;
    });
    const endDrag = () => {
      dragging = false;
      carousel.classList.remove("dragging");
    };
    carousel.addEventListener("pointerup", endDrag);
    carousel.addEventListener("pointercancel", endDrag);

    // Left/right arrows scroll the carousel when it has keyboard focus
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); slide(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); slide(1); }
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
