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
    { big: "Six", label: "Scientific divisions spanning all of astrophysics" }
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
    "mosaic_01.jpg", "mosaic_02.jpg", "mosaic_03.jpg", "mosaic_04.jpg",
    "mosaic_05.jpg", "mosaic_06.jpg", "mosaic_07.jpg", "mosaic_08.jpg",
    "mosaic_09.jpg", "mosaic_10.jpg", "mosaic_11.jpg", "mosaic_12.jpg",
    "mosaic_13.jpg"
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
      for (let i = 0; i < TILE_COUNT; i++) {
        const tile = document.createElement("div");
        tile.className = "mosaic-tile";
        const a = new Image();
        const b = new Image();
        a.src = MOSAIC_DIR + files[i % files.length];
        a.className = "front";
        a.alt = "";
        b.alt = "";
        tile.append(a, b);
        mosaic.append(tile);
        tiles.push({ imgs: [a, b], front: 0 });
      }

      // Rotation only makes sense with more images than tiles.
      if (reduceMotion || files.length <= TILE_COUNT) return;

      let cursor = TILE_COUNT;
      setInterval(() => {
        const t = tiles[Math.floor(Math.random() * tiles.length)];
        const visible = new Set(tiles.map((x) => x.imgs[x.front].src));
        // Skip images already on screen in another tile.
        for (let tries = 0; tries < files.length; tries++) {
          const candidate = new URL(MOSAIC_DIR + files[cursor % files.length], location.href).href;
          if (!visible.has(candidate)) break;
          cursor++;
        }
        const back = t.imgs[1 - t.front];
        back.onload = () => {
          back.classList.add("front");
          t.imgs[t.front].classList.remove("front");
          t.front = 1 - t.front;
        };
        back.src = MOSAIC_DIR + files[cursor % files.length];
        cursor++;
      }, 1800);
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
