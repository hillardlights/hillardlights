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

    function applySeason(season) {
        document.documentElement.setAttribute("data-theme", season);
        try { localStorage.setItem("hl-season", season); } catch (e) { /* ignore */ }
    }

    let storedSeason = null;
    try { storedSeason = localStorage.getItem("hl-season"); } catch (e) { /* ignore */ }
    applySeason(storedSeason || detectSeason());

    const themeToggle = $(".theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const cur = document.documentElement.getAttribute("data-theme");
            applySeason(cur === "halloween" ? "christmas" : "halloween");
        });
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
    // Countdown
    // --------------------------------------------------------
    const countdown = data.countdown;
    const cdEl = $("#countdown");
    if (cdEl && countdown && countdown.target) {
        const target = new Date(countdown.target);
        if (!isNaN(target.getTime()) && target > new Date()) {
            cdEl.hidden = false;
            $("#countdown-label").textContent = countdown.label || "Coming up";
            const tick = () => {
                const diff = target - new Date();
                if (diff <= 0) { cdEl.hidden = true; return; }
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
            setInterval(tick, 1000);
        }
    }

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
    let nextEventDate = upcoming.length ? +upcoming[0]._date : null;

    function renderEvents(filter) {
        const list = $("#schedule-list");
        const empty = $("#schedule-empty");
        if (!list) return;

        const filtered = upcoming.filter(e => filter === "all" || e.season === filter);

        if (!filtered.length) {
            list.innerHTML = "";
            empty.hidden = false;
            return;
        }
        empty.hidden = true;

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

    renderEvents("all");

    $$(".schedule-filters .chip").forEach(btn => {
        btn.addEventListener("click", () => {
            $$(".schedule-filters .chip").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderEvents(btn.dataset.filter);
        });
    });

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
    // Interactive house — rendered from real xLights layout
    // (layout-data.js sets window.HILLARD_LAYOUT)
    // --------------------------------------------------------
    (function renderHouse() {
        const layout = window.HILLARD_LAYOUT;
        const svg    = $("#house-svg");
        const wrap   = $(".house-wrap");
        const tooltip = $("#prop-tooltip");
        if (!layout || !svg || !wrap) return;

        // Show the count in the section lead
        const lead = $("#prop-count-lead");
        if (lead) lead.textContent =
            `${layout.count} props in ${layout.groupCount} groups.`;

        const SVG_NS = "http://www.w3.org/2000/svg";
        const VB_W = 1600, VB_H = 900;
        const PAD_X = 60, PAD_Y = 60;

        const { minX, maxX, minY, maxY } = layout.bounds;
        const worldW = maxX - minX || 1;
        const worldH = maxY - minY || 1;

        function toSvg(x, y) {
            const nx = (x - minX) / worldW;
            const ny = (y - minY) / worldH;
            return {
                x: PAD_X + nx * (VB_W - PAD_X * 2),
                // xLights Y is up → SVG Y is down, so flip
                y: PAD_Y + (1 - ny) * (VB_H - PAD_Y * 2)
            };
        }

        function makeEl(tag, attrs) {
            const el = document.createElementNS(SVG_NS, tag);
            for (const k in attrs) el.setAttribute(k, attrs[k]);
            return el;
        }

        // --- Category → color map (Halloween palette + accents) ---
        const CAT_COLORS = {
            "Moving Head":        "#5ce0a5",
            "DMX Flood":          "#ff8f3a",
            "Roof Flood":         "#ffb347",
            "Flood":              "#ff8f3a",
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
            "Other":              "#ff6b1a"
        };
        const colorFor = cat => CAT_COLORS[cat] || CAT_COLORS.Other;

        // --- Layer stack (bottom → top): backdrop, ground, props ---
        const layerHouse = makeEl("g", { class: "layer-house" });
        const layerBg    = makeEl("g", { class: "layer-connect" });
        const layerMain  = makeEl("g", { class: "layer-props" });
        svg.appendChild(layerHouse);
        svg.appendChild(layerBg);
        svg.appendChild(layerMain);

        // --- House silhouette backdrop (from home-model.obj) ---
        const house = window.HILLARD_HOUSE;
        const cfg   = (data.houseBackdrop) || {};
        if (house && cfg.visible !== false) {
            // Auto-fit: match the house width to the roofline group's X-span
            // if we can find one; otherwise scale to ~55% of the world width.
            const roofGroup = layout.groups.find(g =>
                /roof/i.test(g.key) || /entrance roof/i.test(g.key));

            let targetW; // width in xLights world units
            if (roofGroup) {
                // Find X-min and X-max of the roofline group's members
                let rMinX = Infinity, rMaxX = -Infinity;
                let rMinY = Infinity, rMaxY = -Infinity;
                for (const m of layout.models) {
                    if (m.group === roofGroup.key) {
                        if (m.x < rMinX) rMinX = m.x; if (m.x > rMaxX) rMaxX = m.x;
                        if (m.y < rMinY) rMinY = m.y; if (m.y > rMaxY) rMaxY = m.y;
                    }
                }
                targetW = (rMaxX - rMinX) * 1.35;    // roofline usually spans the eaves
                if (!isFinite(targetW) || targetW <= 0) targetW = worldW * 0.55;
                var houseCenterX = (rMinX + rMaxX) / 2;
                var houseBaseY   = rMinY;   // xLights Y-up, so lower Y = lower on the wall
            } else {
                targetW = worldW * 0.55;
                var houseCenterX = (minX + maxX) / 2;
                var houseBaseY   = minY;
            }

            const hb = house.bounds;
            const hw = hb.width;
            const hh = hb.height;
            const scaleFactor = (targetW / hw) * (cfg.scale || 1);

            // The house shape's own centroid at (hb.minX+hw/2, hb.minY)
            // We want it placed at (houseCenterX, houseBaseY) in world coords.
            // Then apply the same toSvg() transform.
            const p0 = toSvg(houseCenterX, houseBaseY);
            // Same-scale ratio for xLights world -> SVG pixels:
            const svgScaleX = (VB_W - PAD_X * 2) / worldW;
            const svgScaleY = (VB_H - PAD_Y * 2) / worldH;
            // OBJ x maps: (obj_x - hb.centerX) * scaleFactor -> world dx -> svg dx
            const houseSvgScaleX = scaleFactor * svgScaleX;
            // Y flip: OBJ +Y up -> SVG +Y down, so use -1
            const houseSvgScaleY = -scaleFactor * svgScaleY;

            const hCenterOx = hb.minX + hw / 2;
            const hAnchorOy = hb.minY; // ground of the OBJ

            const tx = p0.x - hCenterOx * houseSvgScaleX + (cfg.offsetX || 0);
            const ty = p0.y - hAnchorOy * houseSvgScaleY + (cfg.offsetY || 0);

            layerHouse.setAttribute(
                "transform",
                `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${houseSvgScaleX.toFixed(4)} ${houseSvgScaleY.toFixed(4)})`
            );
            layerHouse.style.opacity = cfg.opacity != null ? cfg.opacity : 0.55;

            // Emit all face paths in a single <path> for speed
            const combined = house.paths.join(" ");
            const facesEl = makeEl("path", {
                d: combined,
                class: "house-face",
                "fill-rule": "evenodd"
            });
            layerHouse.appendChild(facesEl);
        }

        // --- Ground line ---
        svg.appendChild(makeEl("line", {
            x1: 0, x2: VB_W,
            y1: VB_H - PAD_Y + 8, y2: VB_H - PAD_Y + 8,
            stroke: "rgba(255,255,255,0.08)", "stroke-width": 1
        }));

        // Index groups by key for lookups
        const groupIndex = {};
        for (const g of layout.groups) groupIndex[g.key] = g;

        // Convert an xLights world-unit LENGTH (not a point) to SVG units
        const svgUnitPerWorldX = (VB_W - PAD_X * 2) / worldW;
        const svgUnitPerWorldY = (VB_H - PAD_Y * 2) / worldH;

        // --- Render each model as its true shape ---
        for (const m of layout.models) {
            // Skip anything way outside the trimmed bounds (helper labels etc.)
            if (m.x < minX || m.x > maxX || m.y < minY || m.y > maxY) continue;

            // Skip pure label / reference models
            if (m.displayAs === "Image" || m.displayAs === "Ruler" ||
                m.displayAs === "Mesh") continue;

            const p = toSvg(m.x, m.y);
            const color = colorFor(m.cat);
            const shapeGroup = makeEl("g", {
                class: "prop",
                "data-group": m.group,
                "data-cat":   m.cat,
                "data-name":  m.name
            });
            shapeGroup.style.color = color; // for currentColor in child styles

            // Physical size in SVG units (from CustomWidth/Height × Scale)
            const svgW = Math.max(4, (m.w || 0) * svgUnitPerWorldX);
            const svgH = Math.max(4, (m.h || 0) * svgUnitPerWorldY);

            if (m.displayAs === "DmxMovingHeadAdv") {
                // Beam pointing down
                shapeGroup.appendChild(makeEl("path", {
                    class: "mh-beam",
                    d: `M ${p.x - 30} ${p.y + 90} L ${p.x} ${p.y + 4} L ${p.x + 30} ${p.y + 90} Z`
                }));
                shapeGroup.appendChild(makeEl("circle", {
                    class: "mh-head", cx: p.x, cy: p.y, r: 9
                }));
                shapeGroup.appendChild(makeEl("circle", {
                    class: "mh-lens", cx: p.x, cy: p.y, r: 4
                }));
            } else if (m.displayAs === "DmxFloodlight") {
                shapeGroup.appendChild(makeEl("polygon", {
                    class: "px-flood",
                    points: pointsHex(p.x, p.y, 8)
                }));
            } else if ((m.x2 || m.y2) && (m.displayAs === "Single Line" || m.displayAs === "Arches")) {
                // Line with pixel dots along it
                const p2 = toSvg(m.x + m.x2, m.y + m.y2);
                if (m.displayAs === "Arches") {
                    // Curve up between endpoints
                    const midX = (p.x + p2.x) / 2;
                    const midY = Math.min(p.y, p2.y) - Math.abs(p2.x - p.x) * 0.28;
                    shapeGroup.appendChild(makeEl("path", {
                        class: "px-line",
                        d: `M ${p.x} ${p.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`,
                        fill: "none"
                    }));
                } else {
                    shapeGroup.appendChild(makeEl("line", {
                        class: "px-line",
                        x1: p.x, y1: p.y, x2: p2.x, y2: p2.y
                    }));
                }
                // Dots at ends
                shapeGroup.appendChild(makeEl("circle", {
                    class: "px-endpoint", cx: p.x, cy: p.y, r: 2
                }));
                shapeGroup.appendChild(makeEl("circle", {
                    class: "px-endpoint", cx: p2.x, cy: p2.y, r: 2
                }));
            } else if (m.displayAs === "Custom" || m.displayAs === "Matrix") {
                // Rectangle sized to the real prop
                const rotDeg = m.rot || 0;
                const rectX = p.x - svgW / 2;
                const rectY = p.y - svgH / 2;
                const rect = makeEl("rect", {
                    class: "px-custom",
                    x: rectX, y: rectY, width: svgW, height: svgH,
                    rx: Math.min(6, Math.min(svgW, svgH) / 4)
                });
                if (rotDeg) {
                    rect.setAttribute("transform",
                        `rotate(${(-rotDeg).toFixed(2)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
                }
                shapeGroup.appendChild(rect);
                // A subtle center dot for visual anchor on tiny props
                if (svgW < 12 && svgH < 12) {
                    shapeGroup.appendChild(makeEl("circle", {
                        class: "px", cx: p.x, cy: p.y, r: 2
                    }));
                }
            } else {
                // Fallback dot
                shapeGroup.appendChild(makeEl("circle", {
                    class: "px", cx: p.x, cy: p.y, r: 3
                }));
            }

            layerMain.appendChild(shapeGroup);
        }

        function pointsHex(cx, cy, r) {
            const pts = [];
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI / 6;
                pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
            }
            return pts.join(" ");
        }

        // --- Build category filter chips ---
        const filterHost = $("#layout-filters");
        if (filterHost) {
            const cats = Object.entries(layout.categories)
                .sort((a, b) => b[1] - a[1]);
            const chips = [
                `<button class="chip active" data-cat="all">All (${layout.count})</button>`
            ].concat(cats.map(([c, n]) =>
                `<button class="chip" data-cat="${escapeAttr(c)}" style="--chip-c:${colorFor(c)}">${escapeHtml(c)} (${n})</button>`
            ));
            filterHost.innerHTML = chips.join("");

            filterHost.addEventListener("click", e => {
                const b = e.target.closest("button.chip");
                if (!b) return;
                $$(".chip", filterHost).forEach(c => c.classList.remove("active"));
                b.classList.add("active");
                const cat = b.dataset.cat;
                svg.classList.toggle("filtered", cat !== "all");
                $$("[data-cat]", svg).forEach(el => {
                    el.classList.toggle("dim", cat !== "all" && el.dataset.cat !== cat);
                });
            });
        }

        // --- Group hover + tap tooltip ---
        let highlighted = null;
        function highlightGroup(key) {
            if (highlighted === key) return;
            clearHighlight();
            $$(`[data-group="${cssEscape(key)}"]`, svg).forEach(el => el.classList.add("hl"));
            highlighted = key;
        }
        function clearHighlight() {
            if (!highlighted) return;
            $$(`.hl`, svg).forEach(el => el.classList.remove("hl"));
            highlighted = null;
        }

        function showTooltipForGroup(key, anchorEl) {
            const g = groupIndex[key];
            if (!g || !tooltip) return;
            $(".tt-name", tooltip).textContent = g.label;
            $(".tt-desc", tooltip).textContent = g.description || "";
            const catEl = $(".tt-cat", tooltip);
            catEl.textContent = g.cat;
            catEl.style.color = colorFor(g.cat);
            $(".tt-count", tooltip).textContent =
                g.count > 1 ? `${g.count}×` : "";

            // Sub-list of members / xLights groups
            const membersEl = $(".tt-members", tooltip);
            if (membersEl) {
                const parts = [];
                if (g.count > 1 && g.members.length <= 8) {
                    parts.push("<em>Members:</em> " + g.members.map(escapeHtml).join(", "));
                } else if (g.count > 1) {
                    parts.push(`<em>${g.count} members</em>`);
                } else {
                    parts.push("<em>Model:</em> " + escapeHtml(g.members[0]));
                }
                if (g.modelGroups && g.modelGroups.length) {
                    const sampled = g.modelGroups.slice(0, 4).map(escapeHtml).join(", ");
                    const more = g.modelGroups.length > 4 ? `, +${g.modelGroups.length - 4} more` : "";
                    parts.push(`<em>xLights groups:</em> ${sampled}${more}`);
                }
                membersEl.innerHTML = parts.join("<br>");
            }

            tooltip.hidden = false;
            positionTooltip(anchorEl);
            requestAnimationFrame(() => tooltip.classList.add("show"));
        }

        function positionTooltip(anchor) {
            const wb = wrap.getBoundingClientRect();
            const ab = anchor.getBoundingClientRect();
            const x = ab.left + ab.width / 2 - wb.left;
            const y = ab.top - wb.top;
            tooltip.style.left = x + "px";
            tooltip.style.top  = y + "px";
        }

        function hideTooltip() {
            if (!tooltip) return;
            tooltip.classList.remove("show");
            setTimeout(() => {
                if (!tooltip.classList.contains("show")) tooltip.hidden = true;
            }, 180);
        }

        // Desktop hover
        svg.addEventListener("pointermove", e => {
            const el = e.target.closest("[data-group]");
            if (!el) return;
            highlightGroup(el.dataset.group);
            showTooltipForGroup(el.dataset.group, el);
            tooltip.dataset.groupKey = el.dataset.group;
        });
        svg.addEventListener("pointerleave", () => {
            clearHighlight();
            hideTooltip();
            tooltip.dataset.groupKey = "";
        });

        // Mobile tap
        svg.addEventListener("click", e => {
            const el = e.target.closest("[data-group]");
            if (!el) { clearHighlight(); hideTooltip(); return; }
            if (tooltip.dataset.groupKey === el.dataset.group && !tooltip.hidden) {
                clearHighlight(); hideTooltip();
                tooltip.dataset.groupKey = "";
            } else {
                highlightGroup(el.dataset.group);
                showTooltipForGroup(el.dataset.group, el);
                tooltip.dataset.groupKey = el.dataset.group;
            }
        });

        // Reposition on scroll/resize while shown
        function reposition() {
            const key = tooltip.dataset.groupKey;
            if (!key || tooltip.hidden) return;
            const el = svg.querySelector(`[data-group="${cssEscape(key)}"]`);
            if (el) positionTooltip(el);
        }
        window.addEventListener("scroll", reposition, { passive: true });
        window.addEventListener("resize", reposition);

        function cssEscape(s) {
            return (window.CSS && CSS.escape) ? CSS.escape(s)
                : String(s).replace(/["\\]/g, "\\$&");
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
