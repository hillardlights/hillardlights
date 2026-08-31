/* ============================================================
   Hillard Lights — Scripts
   ============================================================ */

(function () {
    "use strict";

    const data = window.HILLARD || {};
    const $  = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    // Reveal-on-scroll observer — declared up-front so early callers
    // (renderEvents → observeReveals) don't hit a temporal dead zone.
    let observer;
    function observeReveals() {
        if (!("IntersectionObserver" in window)) {
            $$(".reveal").forEach(el => el.classList.add("in"));
            return;
        }
        if (!observer) {
            observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("in");
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
        }
        $$(".reveal:not(.in)").forEach(el => observer.observe(el));
    }

    // --------------------------------------------------------
    // Hero video (optional — set data.heroVideo or per-season
    // override in data.js). If empty, CSS animated bg shows.
    // --------------------------------------------------------
    function applyHeroVideo(season) {
        const vid = $("#hero-video");
        if (!vid) return;
        const src = (data.heroVideoBySeason && data.heroVideoBySeason[season])
            || data.heroVideo || "";
        if (!src) {
            vid.classList.remove("playing");
            if (vid.src) { vid.pause(); vid.removeAttribute("src"); vid.load(); }
            return;
        }
        if (vid.getAttribute("src") === src) return;
        vid.src = src;
        vid.load();
        vid.play().then(() => vid.classList.add("playing"))
                  .catch(() => vid.classList.remove("playing"));
    }

    // --------------------------------------------------------
    // Season detection & toggle
    // --------------------------------------------------------
    function detectSeason() {
        if (data.season && data.season !== "auto") return data.season;

        const now  = new Date();
        const y    = now.getFullYear();
        const halloweenStart = new Date(y, 8, 15);   // Sep 15
        const halloweenEnd   = new Date(y, 10, 5);   // Nov 5
        const christmasStart = new Date(y, 10, 15);  // Nov 15
        const christmasEnd   = new Date(y + 1, 0, 5);  // Jan 5 next year
        const christmasStartPrev = new Date(y - 1, 10, 15);
        const christmasEndPrev   = new Date(y, 0, 5);

        if (now >= halloweenStart && now <= halloweenEnd) return "halloween";
        if (now >= christmasStart && now <= christmasEnd) return "christmas";
        if (now >= christmasStartPrev && now <= christmasEndPrev) return "christmas";

        // Between seasons: pick whichever comes next
        return now < halloweenStart ? "halloween" : "christmas";
    }

    // Season subscribers — invoked whenever the active season changes so
    // countdown, schedule, etc. can re-render for the new season.
    const seasonSubscribers = [];
    function onSeasonChange(fn) { seasonSubscribers.push(fn); }

    function applySeason(season) {
        document.documentElement.setAttribute("data-theme", season);
        try { localStorage.setItem("hl-season", season); } catch (e) { /* ignore */ }
        applyHeroVideo(season);
        seasonSubscribers.forEach(fn => { try { fn(season); } catch (e) { /* ignore */ } });
    }

    let storedSeason = null;
    try { storedSeason = localStorage.getItem("hl-season"); } catch (e) { /* ignore */ }
    const initialSeason = storedSeason || detectSeason();
    applySeason(initialSeason);

    const themeToggle = $(".theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const cur = document.documentElement.getAttribute("data-theme");
            applySeason(cur === "halloween" ? "christmas" : "halloween");
        });
    }

    function currentSeason() {
        return document.documentElement.getAttribute("data-theme") || "halloween";
    }

    // --------------------------------------------------------
    // Announcement
    // --------------------------------------------------------
    const announcement = data.announcement;
    const annEl = $("#announcement");
    if (annEl && announcement && announcement.active && announcement.text) {
        $("#announcement-text").textContent = announcement.text;
        annEl.hidden = false;
    }

    // --------------------------------------------------------
    // About
    // --------------------------------------------------------
    const aboutEl = $("#about-text");
    if (aboutEl && Array.isArray(data.about)) {
        aboutEl.innerHTML = data.about
            .map(p => `<p class="about-para">${escapeHtml(p)}</p>`)
            .join("");
    }

    // --------------------------------------------------------
    // Countdown (per-season; re-renders on toggle)
    // --------------------------------------------------------
    const cdEl = $("#countdown");
    let cdInterval = null;

    function pickCountdown(season) {
        const c = data.countdown;
        if (!c) return null;
        // Per-season object: { halloween: {label,target}, christmas: {...} }
        if (c[season] && typeof c[season] === "object") return c[season];
        // Legacy flat shape: { label, target }
        if (c.target) return c;
        return null;
    }

    function applyCountdown(season) {
        if (!cdEl) return;
        if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }

        const countdown = pickCountdown(season);
        if (!countdown || !countdown.target) { cdEl.hidden = true; return; }

        const target = new Date(countdown.target);
        if (isNaN(target.getTime()) || target <= new Date()) { cdEl.hidden = true; return; }

        cdEl.hidden = false;
        $("#countdown-label").textContent = countdown.label || "Coming up";

        const tick = () => {
            const diff = target - new Date();
            if (diff <= 0) {
                cdEl.hidden = true;
                if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff / 3600000) % 24);
            const m = Math.floor((diff / 60000) % 60);
            const s = Math.floor((diff / 1000) % 60);
            $("#cd-days").textContent = d;
            $("#cd-hours").textContent = String(h).padStart(2, "0");
            $("#cd-mins").textContent = String(m).padStart(2, "0");
            $("#cd-secs").textContent = String(s).padStart(2, "0");
        };
        tick();
        cdInterval = setInterval(tick, 1000);
    }

    applyCountdown(currentSeason());
    onSeasonChange(applyCountdown);

    // --------------------------------------------------------
    // Schedule
    // --------------------------------------------------------
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    function parseDateLocal(str) {
        // "YYYY-MM-DD" -> local midnight (avoids timezone-shift bugs)
        const [y, m, d] = str.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    const events = (data.events || [])
        .map(e => Object.assign({}, e, {
            _date:    parseDateLocal(e.date),
            _dateEnd: e.dateEnd ? parseDateLocal(e.dateEnd) : null
        }))
        .sort((a, b) => a._date - b._date);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // An event is "upcoming" if its LAST day (dateEnd or date) is today or later
    const upcoming = events.filter(e => (e._dateEnd || e._date) >= now);

    function renderEvents(season) {
        const list = $("#schedule-list");
        const empty = $("#schedule-empty");
        if (!list) return;

        const filtered = upcoming.filter(e => e.season === season);

        if (!filtered.length) {
            list.innerHTML = "";
            empty.hidden = false;
            return;
        }
        empty.hidden = true;

        const nextEventDate = +filtered[0]._date;

        list.innerHTML = filtered.map(e => {
            const d  = e._date;
            const dE = e._dateEnd;
            const isNext = +d === nextEventDate;
            const seasonIcon = e.season === "halloween" ? "🎃" : "🎄";

            // Date display — single day OR range
            let dateBlock;
            if (dE) {
                const sameMonth = d.getMonth() === dE.getMonth();
                const dayRange = sameMonth
                    ? `${d.getDate()}<span class="event-day-dash">–</span>${dE.getDate()}`
                    : `${monthNames[d.getMonth()]} ${d.getDate()}<span class="event-day-dash">–</span>${monthNames[dE.getMonth()]} ${dE.getDate()}`;
                dateBlock = `
                    <div class="event-date event-date-range">
                        <span class="event-day event-day-range">${dayRange}</span>
                        <span class="event-month-year">
                            <strong>${sameMonth ? monthNames[d.getMonth()] : ""}</strong>
                            <span>${d.getFullYear()}</span>
                        </span>
                    </div>`;
            } else {
                dateBlock = `
                    <div class="event-date">
                        <span class="event-day">${d.getDate()}</span>
                        <span class="event-month-year">
                            <strong>${monthNames[d.getMonth()]}</strong>
                            <span>${d.getFullYear()}</span>
                        </span>
                    </div>`;
            }

            return `
                <article class="event-card reveal" data-type="${e.type || "show"}" data-next="${isNext}">
                    ${isNext ? '<span class="event-next-tag">Next up</span>' : ""}
                    ${dateBlock}
                    <h3 class="event-title">${seasonIcon} ${escapeHtml(e.title || "")}</h3>
                    ${e.subtitle ? `<div class="event-subtitle">${escapeHtml(e.subtitle)}</div>` : ""}
                    ${e.time ? `<div class="event-time">🕕 ${escapeHtml(e.time)}</div>` : ""}
                    ${e.fm ? `<span class="event-fm">📻 ${escapeHtml(e.fm)}</span>` : ""}
                    ${e.description ? `<p class="event-description">${escapeHtml(e.description)}</p>` : ""}
                </article>
            `;
        }).join("");

        observeReveals();
    }

    renderEvents(currentSeason());
    onSeasonChange(renderEvents);

    // --------------------------------------------------------
    // Videos
    // --------------------------------------------------------
    const vidGrid = $("#videos-grid");
    if (vidGrid && Array.isArray(data.videos)) {
        vidGrid.innerHTML = data.videos.map(v => {
            // 1. URL-based: link-out card (TikTok, external YouTube, etc.)
            if (v.url) {
                const isTikTok = v.platform === "tiktok" || /tiktok\.com/.test(v.url);
                const kindLabel = v.kind === "playlist" ? "Playlist" : "Video";
                const icon = isTikTok
                    ? `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M19.6 6.7a5.7 5.7 0 0 1-3.4-1.1 5.7 5.7 0 0 1-2.2-3.5h-3.4v13.2a2.7 2.7 0 1 1-2.7-2.8c.3 0 .5 0 .8.1V9.2a6.2 6.2 0 0 0-.8 0 6.2 6.2 0 1 0 6.2 6.1V9a8.9 8.9 0 0 0 5.5 1.9V7.5c-.1-.2-.1-.5 0-.8Z"/></svg>`
                    : `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z"/></svg>`;
                const platformLabel = isTikTok ? "TikTok" : "YouTube";
                return `
                    <a class="video-card video-card-link ${isTikTok ? 'is-tiktok' : 'is-youtube'} reveal" href="${escapeAttr(v.url)}" target="_blank" rel="noopener">
                        <div class="video-thumb">
                            <span class="video-icon">${icon}</span>
                            <span class="video-play">▶</span>
                        </div>
                        <div class="video-card-body">
                            <div class="video-title">${escapeHtml(v.title || "")}</div>
                            <div class="video-meta">
                                <span>Watch on ${platformLabel}</span>
                                <span class="video-kind">${escapeHtml(kindLabel)}</span>
                            </div>
                        </div>
                    </a>
                `;
            }
            // 2. Legacy YouTube-ID embed
            const isPlaceholder = !v.id || v.id.startsWith("REPLACE_ME");
            const embed = isPlaceholder
                ? `<div class="video-embed">Add a YouTube video ID in <code>data.js</code></div>`
                : `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}" title="${escapeAttr(v.title || "Video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
            return `
                <div class="video-card reveal">
                    ${embed}
                    <div class="video-title">${escapeHtml(v.title || "")}</div>
                </div>
            `;
        }).join("");
    }

    // --------------------------------------------------------
    // Gallery + lightbox
    // --------------------------------------------------------
    let currentGalleryItems = [];
    let currentGalleryIndex = 0;

    function renderGallery(filter) {
        const grid = $("#gallery-grid");
        if (!grid || !Array.isArray(data.gallery)) return;

        // filter = "all" or a 4-digit year string
        const items = data.gallery.filter(g =>
            filter === "all" || String(g.year) === filter
        );
        grid.innerHTML = items.map((g, i) => `
            <button type="button" class="gallery-item reveal" data-idx="${i}" aria-label="Open photo">
                <img src="${escapeAttr(g.src)}" alt="${escapeAttr(g.caption || 'Hillard Lights photo')}" loading="lazy">
                ${g.caption ? `<span class="caption">${escapeHtml(g.caption)}</span>` : ""}
            </button>
        `).join("");

        $$("#gallery-grid .gallery-item").forEach(el => {
            el.addEventListener("click", () => {
                currentGalleryItems = items;
                openLightbox(+el.dataset.idx);
            });
        });

        observeReveals();
    }

    // Build year filter chips from the gallery data, newest year first
    const galleryFilters = $("#gallery-filters");
    if (galleryFilters && Array.isArray(data.gallery)) {
        const yearCounts = {};
        for (const g of data.gallery) {
            const y = g.year || "Undated";
            yearCounts[y] = (yearCounts[y] || 0) + 1;
        }
        const years = Object.keys(yearCounts)
            .filter(y => y !== "Undated")
            .sort((a, b) => Number(b) - Number(a));
        const chips = [
            `<button class="chip active" type="button" data-gfilter="all">All (${data.gallery.length})</button>`
        ].concat(years.map(y =>
            `<button class="chip" type="button" data-gfilter="${y}">${y} (${yearCounts[y]})</button>`
        ));
        if (yearCounts["Undated"]) {
            chips.push(`<button class="chip" type="button" data-gfilter="Undated">Undated (${yearCounts["Undated"]})</button>`);
        }
        galleryFilters.innerHTML = chips.join("");

        galleryFilters.addEventListener("click", e => {
            const btn = e.target.closest("button.chip");
            if (!btn) return;
            $$(".chip", galleryFilters).forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderGallery(btn.dataset.gfilter);
        });
    }

    renderGallery("all");

    const lightbox   = $("#lightbox");
    const lbImg      = $("#lightbox-img");
    const lbCap      = $("#lightbox-caption");
    const lbCounter  = $("#lightbox-counter");

    function openLightbox(index) {
        if (!currentGalleryItems.length) return;
        currentGalleryIndex = clampIndex(index);
        showCurrent();
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
        // Preload immediate neighbours for snappy nav
        preload(currentGalleryIndex + 1);
        preload(currentGalleryIndex - 1);
    }

    function showCurrent() {
        const item = currentGalleryItems[currentGalleryIndex];
        if (!item) return;
        lbImg.src   = item.src;
        lbImg.alt   = item.caption || "";
        lbCap.textContent = item.caption || "";
        if (lbCounter) {
            lbCounter.textContent = `${currentGalleryIndex + 1} / ${currentGalleryItems.length}`;
        }
    }

    function step(delta) {
        if (!currentGalleryItems.length) return;
        currentGalleryIndex = clampIndex(currentGalleryIndex + delta);
        showCurrent();
        preload(currentGalleryIndex + delta);
    }

    function clampIndex(i) {
        const n = currentGalleryItems.length;
        return ((i % n) + n) % n;   // wrap around
    }

    function preload(index) {
        const item = currentGalleryItems[clampIndex(index)];
        if (item) { const im = new Image(); im.src = item.src; }
    }

    function closeLightbox() {
        lightbox.hidden = true;
        lbImg.src = "";
        document.body.style.overflow = "";
    }

    $("#lightbox-close").addEventListener("click", closeLightbox);
    $("#lightbox-prev").addEventListener("click",  e => { e.stopPropagation(); step(-1); });
    $("#lightbox-next").addEventListener("click",  e => { e.stopPropagation(); step( 1); });

    // Click backdrop (not the image or controls) to close
    lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });

    document.addEventListener("keydown", e => {
        if (lightbox.hidden) return;
        if      (e.key === "Escape")     closeLightbox();
        else if (e.key === "ArrowRight") step( 1);
        else if (e.key === "ArrowLeft")  step(-1);
    });

    // Swipe support on touch devices
    let touchX = null;
    lightbox.addEventListener("touchstart", e => {
        if (e.touches.length === 1) touchX = e.touches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener("touchend", e => {
        if (touchX == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        touchX = null;
    });

    // --------------------------------------------------------
    // Socials + location
    // --------------------------------------------------------
    if (data.socials) {
        if (data.socials.youtube) {
            const ytEls = $$("#social-youtube, #youtube-cta");
            ytEls.forEach(a => a.href = data.socials.youtube);
        }
        if (data.socials.tiktok) {
            $("#social-tiktok").href = data.socials.tiktok;
        }
        if (data.socials.instagram) {
            $("#social-instagram").href = data.socials.instagram;
        }
        if (data.socials.facebook) {
            $("#social-facebook").href = data.socials.facebook;
        }
    }

    $("#year").textContent = new Date().getFullYear();
    if (data.location) $("#loc").textContent = data.location;

    // --------------------------------------------------------
    // Hero: twinkling star field
    // --------------------------------------------------------
    const starField = $("#star-field");
    if (starField && !prefersReducedMotion()) {
        const starCount = window.innerWidth < 720 ? 60 : 120;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < starCount; i++) {
            const s = document.createElement("span");
            s.className = "star" + (Math.random() > 0.85 ? " big" : "");
            s.style.top  = Math.random() * 70 + "%";  // upper 70% only
            s.style.left = Math.random() * 100 + "%";
            s.style.animationDelay = (Math.random() * 4) + "s";
            s.style.animationDuration = (3 + Math.random() * 3) + "s";
            frag.appendChild(s);
        }
        starField.appendChild(frag);
    }

    // --------------------------------------------------------
    // Hero: falling particles (leaves / snow)
    // --------------------------------------------------------
    const particles = $("#particles");
    if (particles && !prefersReducedMotion()) {
        const count = window.innerWidth < 720 ? 22 : 45;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const p = document.createElement("span");
            p.className = "particle" + (i % 3 === 0 ? " p-alt" : "");
            p.style.left = Math.random() * 100 + "%";
            p.style.animationDuration =
                (10 + Math.random() * 14) + "s, " + (2 + Math.random() * 3) + "s";
            p.style.animationDelay =
                (-Math.random() * 18) + "s, " + (-Math.random() * 3) + "s";
            const scale = 0.6 + Math.random() * 0.9;
            p.style.transform = "scale(" + scale + ")";
            frag.appendChild(p);
        }
        particles.appendChild(frag);
    }

    // --------------------------------------------------------
    // Interactive layout — one dot per xLights auto-group at
    // the group's centroid, mapped from world coords into the
    // PNG's coordinate space. `aggregate` rules in zones-data.js
    // collapse over-fragmented categories (e.g. 30+ roofline
    // pixel segments → one "Roofline" dot).
    // --------------------------------------------------------
    (function renderLayout() {
        const zonesData = window.HILLARD_ZONES;
        const layout    = window.HILLARD_LAYOUT;
        const wrap      = $("#layout-wrap");
        const img       = $("#layout-img");
        const svg       = $("#layout-overlay");
        const panel     = $("#zone-panel");
        const tooltip   = ensureTooltip();
        if (!zonesData || !layout || !wrap || !img || !svg || !panel) return;

        const SVG_NS = "http://www.w3.org/2000/svg";
        const html   = document.documentElement;

        // Category → color palette (matches the SVG dot fill)
        const CAT_COLORS = {
            "Moving Head":        "#5ce0a5",
            "DMX Flood":          "#ff8f3a",
            "Roof Flood":         "#ffb347",
            "Flood":              "#f28c3a",
            "Roofline Pixels":    "#c8a8ff",
            "Ghost":              "#e8ecff",
            "Flying Bat":         "#8f5cff",
            "Bat (Tree)":         "#6a3bd6",
            "Spider":             "#ff4d5a",
            "Spider Web":         "#c0c8e0",
            "Tombstone":          "#9aa0b8",
            "Singing Pumpkin":    "#ff6b1a",
            "Pumpkin Arch":       "#ff8f3a",
            "Gate Matrix":        "#5cd4ff",
            "Gothic Arch":        "#c8a8ff",
            "Gothic Bush":        "#7cd48f",
            "Fence":              "#e8c860",
            "Fence Extension":    "#e8c860",
            "Garage":             "#a8b0c8",
            "Garage Matrix":      "#5cd4ff",
            "Window Matrix":      "#ffd97a",
            "Matrix Column":      "#ff5cf1",
            "Headless Horseman":  "#ffffff",
            "Lamppost":           "#ffd97a",
            "Cactus":             "#7cd48f",
            "Spooky Tree":        "#c8a8ff",
            "Steampunk Spinner":  "#ffc02a",
            "Philips Hue":        "#a06bff",
            "Snowflake":          "#9edcff",
            "Mega Tree":          "#22c55e",
            "Mini Tree":          "#22c55e",
            "Tree":               "#22c55e",
            "Wreath":             "#ff5252",
            "Candy Cane":         "#ff5252",
            "Gift Box":           "#ffd93d",
            "Star Topper":        "#ffe066",
            "Reindeer":           "#d4a373",
            "Santa":              "#ff5252",
            "Other":              "#ff6b1a"
        };
        const colorForCat = c => CAT_COLORS[c] || CAT_COLORS.Other;

        let currentSeason = null;
        let activeKey     = null;
        let currentDots   = [];

        function makeEl(tag, attrs) {
            const el = document.createElementNS(SVG_NS, tag);
            for (const k in attrs) el.setAttribute(k, attrs[k]);
            return el;
        }

        function pixelsOfModel(m) {
            return (m && ((m.pixels && m.pixels.length) || m.pixelCount)) || 0;
        }

        function pixelsOfGroup(g, seasonData) {
            let total = 0;
            for (const name of g.members) {
                const m = seasonData.models.find(mm => mm.name === name);
                total += pixelsOfModel(m);
            }
            return total;
        }

        // Turn a season's real xLights groups + config aggregations into a
        // flat list of dots.
        function computeDots(season) {
            const data = layout[season];
            const cfg  = zonesData[season] || {};
            if (!data) return [];

            const remaining = new Set(data.groups.map(g => g.key));
            const dots = [];

            for (const agg of (cfg.aggregate || [])) {
                const patterns = agg.match.map(s => new RegExp(s));
                const matched = data.groups.filter(g =>
                    remaining.has(g.key) && patterns.some(re => re.test(g.key))
                );
                if (!matched.length) continue;
                for (const g of matched) remaining.delete(g.key);

                // Weighted centroid (weight = member count)
                let sumX = 0, sumY = 0, w = 0;
                let totalProps = 0, totalPixels = 0;
                const memberNames = [];
                for (const g of matched) {
                    sumX += g.cx * g.count;
                    sumY += g.cy * g.count;
                    w    += g.count;
                    totalProps  += g.count;
                    totalPixels += pixelsOfGroup(g, data);
                    memberNames.push(...g.members);
                }
                dots.push({
                    key: "agg-" + agg.key,
                    label: agg.label,
                    cat:   agg.cat || matched[0].cat,
                    description: agg.description || matched[0].description,
                    cx: sumX / w,
                    cy: sumY / w,
                    px: agg.px,   // optional manual override in image %
                    py: agg.py,
                    count: totalProps,
                    pixels: totalPixels,
                    members: memberNames,
                    subGroups: matched.map(g => ({
                        label: g.label, count: g.count,
                        pixels: pixelsOfGroup(g, data)
                    })),
                    aggregated: true
                });
            }

            // Everything not aggregated → one dot per auto-group
            const positions = cfg.positions || {};
            const hidden    = new Set(cfg.hide || []);
            for (const g of data.groups) {
                if (!remaining.has(g.key)) continue;
                if (hidden.has(g.key)) continue;
                const pos = positions[g.key];
                dots.push({
                    key: g.key,
                    label: g.label,
                    cat: g.cat,
                    description: g.description,
                    cx: g.cx,
                    cy: g.cy,
                    px: pos && pos.px,
                    py: pos && pos.py,
                    count: g.count,
                    pixels: pixelsOfGroup(g, data),
                    members: g.members,
                    subGroups: null,
                    aggregated: false
                });
            }

            return dots;
        }

        function renderSeason(season) {
            if (season === currentSeason) return;
            currentSeason = season;
            hidePanel();

            const cfg  = zonesData[season];
            const data = layout[season];
            if (!cfg || !data) return;

            img.setAttribute("src", cfg.image);
            img.setAttribute("alt", cfg.alt || "");

            while (svg.firstChild) svg.removeChild(svg.firstChild);

            const b = data.bounds;
            const spanX = b.maxX - b.minX;
            const spanY = b.maxY - b.minY;
            // padX/padY are symmetric shorthand; padLeft/padRight/padTop/padBottom
            // override per-edge for images whose crop isn't centered.
            const padLeft   = cfg.padLeft   != null ? cfg.padLeft   : (cfg.padX || 0);
            const padRight  = cfg.padRight  != null ? cfg.padRight  : (cfg.padX || 0);
            const padTop    = cfg.padTop    != null ? cfg.padTop    : (cfg.padY || 0);
            const padBottom = cfg.padBottom != null ? cfg.padBottom : (cfg.padY || 0);
            const usableX = 100 - padLeft - padRight;
            const usableY = 100 - padTop  - padBottom;

            currentDots = computeDots(season);

            for (const d of currentDots) {
                // Manual (px, py) in image % wins; fall back to the auto-mapping
                // from xLights world coords into the padded viewport.
                const pctX = (d.px != null)
                    ? d.px
                    : padLeft + ((d.cx - b.minX) / spanX) * usableX;
                // xLights Y is up → SVG y is down: flip.
                const pctY = (d.py != null)
                    ? d.py
                    : padTop  + ((b.maxY - d.cy) / spanY) * usableY;
                d._px = pctX;
                d._py = pctY;

                const g = makeEl("g", { class: "dot-group", "data-key": d.key });
                const r = d.count > 1 ? 1.7 : 1.2;
                const c = makeEl("circle", {
                    class: "group-dot",
                    cx: pctX, cy: pctY, r,
                    "data-cat": d.cat,
                    tabindex: 0, role: "button",
                    "aria-label": d.label
                });
                c.style.setProperty("--dot-color", colorForCat(d.cat));
                g.appendChild(c);
                svg.appendChild(g);
            }
        }

        // -- Panel --
        function showPanel(dot) {
            $("#zone-panel-title").textContent = dot.label;
            $("#zone-panel-cat").textContent   = dot.cat || "";
            $("#zone-panel-cat").style.color   = colorForCat(dot.cat);
            $("#zone-panel-cat").style.background =
                "rgba(" + hexToRgb(colorForCat(dot.cat)) + ",0.14)";
            $("#zone-panel-desc").textContent  = dot.description || "";

            const stats = $("#zone-panel-stats");
            stats.innerHTML = "";
            stat(stats, "Props",   dot.count);
            stat(stats, "Pixels",  dot.pixels.toLocaleString());
            if (dot.aggregated && dot.subGroups) {
                stat(stats, "Subgroups", dot.subGroups.length);
            }

            const propsHost = $("#zone-panel-props");
            let listHtml = "";
            if (dot.aggregated && dot.subGroups) {
                const items = dot.subGroups
                    .sort((a, b) => b.count - a.count)
                    .map(sg => `
                        <li>
                            <span class="prop-name">${escapeHtml(sg.label)}</span>
                            <span class="prop-count">${sg.count > 1 ? sg.count + "× · " : ""}<strong>${sg.pixels.toLocaleString()}</strong> px</span>
                        </li>`).join("");
                listHtml = `<strong>Includes</strong><ul>${items}</ul>`;
            } else if (dot.members && dot.members.length > 1) {
                const seasonData = layout[currentSeason];
                const items = dot.members.map(name => {
                    const m = seasonData.models.find(mm => mm.name === name);
                    const px = pixelsOfModel(m);
                    return `
                        <li>
                            <span class="prop-name">${escapeHtml(name)}</span>
                            <span class="prop-count"><strong>${px.toLocaleString()}</strong> px</span>
                        </li>`;
                }).join("");
                listHtml = `<strong>Individual props</strong><ul>${items}</ul>`;
            } else if (dot.members && dot.members.length === 1) {
                listHtml = `<strong>Prop name</strong><ul><li><span class="prop-name">${escapeHtml(dot.members[0])}</span></li></ul>`;
            }
            propsHost.innerHTML = listHtml;

            panel.hidden = false;
        }

        function stat(host, label, value) {
            if (value == null || value === "" || value === 0) return;
            const el = document.createElement("div");
            el.innerHTML = `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd>`;
            host.appendChild(el);
        }

        function hidePanel() {
            panel.hidden = true;
            clearHighlights();
            activeKey = null;
        }

        function clearHighlights() {
            $$(".group-dot.hl", svg).forEach(el => el.classList.remove("hl"));
        }

        // -- Hover tooltip --
        function ensureTooltip() {
            let t = document.querySelector(".dot-tooltip");
            if (!t) {
                t = document.createElement("div");
                t.className = "dot-tooltip";
                t.hidden = true;
                document.body.appendChild(t);
            }
            return t;
        }

        function showTooltip(dot, evt) {
            tooltip.textContent = dot.label +
                (dot.count > 1 ? ` · ${dot.count}×` : "");
            tooltip.hidden = false;
            tooltip.style.left = evt.clientX + "px";
            tooltip.style.top  = (evt.clientY - 28) + "px";
        }
        function hideTooltip() { tooltip.hidden = true; }

        svg.addEventListener("pointermove", e => {
            const dotEl = e.target.closest(".group-dot");
            if (!dotEl) { hideTooltip(); return; }
            const key = dotEl.parentNode.dataset.key;
            const dot = currentDots.find(d => d.key === key);
            if (!dot) return;
            if (!activeKey) {
                clearHighlights();
                dotEl.classList.add("hl");
            }
            showTooltip(dot, e);
        });
        svg.addEventListener("pointerleave", () => {
            hideTooltip();
            if (!activeKey) clearHighlights();
        });

        svg.addEventListener("click", e => {
            const dotEl = e.target.closest(".group-dot");
            if (!dotEl) return;
            const key = dotEl.parentNode.dataset.key;
            const dot = currentDots.find(d => d.key === key);
            if (!dot) return;
            if (activeKey === key) { hidePanel(); return; }
            clearHighlights();
            dotEl.classList.add("hl");
            activeKey = key;
            showPanel(dot);
        });

        $("#zone-panel-close").addEventListener("click", hidePanel);

        document.addEventListener("click", e => {
            if (!wrap.contains(e.target) && !panel.contains(e.target)) hidePanel();
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && !panel.hidden) hidePanel();
        });

        // Section subtitle: real numbers from the xLights export
        const lead = $("#prop-count-lead");
        function updateLead(season) {
            const d = layout[season];
            if (lead && d) lead.textContent =
                `${d.count} props across ${d.groupCount} groups.`;
        }

        // Season swap
        new MutationObserver(() => {
            const s = html.getAttribute("data-theme") || "halloween";
            renderSeason(s);
            updateLead(s);
        }).observe(html, { attributes: true, attributeFilter: ["data-theme"] });

        const initial = html.getAttribute("data-theme") || "halloween";
        renderSeason(initial);
        updateLead(initial);

        function hexToRgb(hex) {
            const h = hex.replace("#", "");
            return parseInt(h.slice(0,2),16) + "," + parseInt(h.slice(2,4),16) + "," + parseInt(h.slice(4,6),16);
        }
    })();

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // Mark section headers etc. reveal-able (observer defined near top)
    $$(".section-header, .feature, .about-para, .social-btn, .hero-countdown").forEach(el => el.classList.add("reveal"));
    observeReveals();

    // --------------------------------------------------------
    // Helpers
    // --------------------------------------------------------
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[ch]);
    }
    function escapeAttr(str) { return escapeHtml(str); }

})();
