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

    // Season swap with the View Transitions API: the incoming season
    // is revealed by a circular clip-path that grows out of the toggle
    // button (or the click point). Falls back to an instant swap in
    // browsers without support and when reduced motion is preferred.
    function swapSeason(next, event) {
        const html = document.documentElement;
        const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || typeof document.startViewTransition !== "function") {
            applySeason(next);
            return;
        }

        const src = event && event.currentTarget;
        const rect = src && src.getBoundingClientRect
            ? src.getBoundingClientRect()
            : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const endRadius = Math.hypot(
            Math.max(x, innerWidth - x),
            Math.max(y, innerHeight - y)
        );

        html.style.setProperty("--vt-x", x + "px");
        html.style.setProperty("--vt-y", y + "px");
        html.style.setProperty("--vt-r", endRadius + "px");
        html.classList.add("season-swapping");

        const vt = document.startViewTransition(() => applySeason(next));
        vt.finished.finally(() => html.classList.remove("season-swapping"));
    }

    const themeToggle = $(".theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", (e) => {
            const cur = document.documentElement.getAttribute("data-theme");
            swapSeason(cur === "halloween" ? "christmas" : "halloween", e);
        });
    }

    function currentSeason() {
        return document.documentElement.getAttribute("data-theme") || "halloween";
    }

    // --------------------------------------------------------
    // Announcement (supports per-season { halloween, christmas } text or a
    // single string for both seasons)
    // --------------------------------------------------------
    const announcement = data.announcement;
    const annEl = $("#announcement");
    function announcementText(season) {
        if (!announcement || !announcement.text) return "";
        const t = announcement.text;
        if (typeof t === "string") return t;
        return t[season] || t.halloween || t.christmas || "";
    }
    function applyAnnouncement(season) {
        if (!annEl || !announcement || !announcement.active) return;
        const txt = announcementText(season);
        if (!txt) { annEl.hidden = true; return; }
        $("#announcement-text").textContent = txt;
        annEl.hidden = false;
    }
    applyAnnouncement(currentSeason());
    onSeasonChange(applyAnnouncement);

    // --------------------------------------------------------
    // Live "Now Playing" bar — polls Remote Falcon's viewer GraphQL
    // for `playingNow`. Hides itself when the show is off (empty
    // string) or the network is unreachable. Only polls while the tab
    // is visible so a backgrounded phone tab isn't hitting RF forever.
    // --------------------------------------------------------
    (function initNowPlaying() {
        const rf = data.remoteFalcon;
        const bar = $("#now-playing");
        if (!bar || !rf || !rf.enabled || !rf.baseUrl || !rf.subdomain) return;

        const songEl   = $("#now-playing-song");
        const artistEl = $("#now-playing-artist");
        const ctaEl    = $("#now-playing-cta");
        if (ctaEl && rf.viewerUrl) ctaEl.setAttribute("href", rf.viewerUrl);

        const pollMs = Math.max(2000, rf.pollMs || 5000);
        const query = "query GetShow($s: String!) { getShow(showSubdomain: $s) { " +
            "playingNow playingNowSequence { displayName artist } } }";

        // Season window: Halloween runs through Nov 1, Christmas Nov 2 – Jan 1.
        // The LIVE NOW card only shows when the visitor's current theme matches
        // the calendar window — no Halloween song appears if you're browsing
        // Christmas mode, or vice versa.
        function activeShowSeason() {
            const d = new Date();
            const m = d.getMonth(); // 0-based; Nov=10, Dec=11, Jan=0
            const day = d.getDate();
            if (m === 10 && day >= 2) return "christmas"; // Nov 2–30
            if (m === 11) return "christmas";              // Dec 1–31
            if (m === 0 && day === 1) return "christmas";  // Jan 1
            return "halloween";                             // rest of the year
        }

        let timer = null;
        let inflight = null;
        let lastSong = null;
        let lastShow = null; // cache last RF payload for re-render on season toggle

        function stop() {
            if (timer) { clearTimeout(timer); timer = null; }
            if (inflight) { inflight.abort(); inflight = null; }
        }

        function schedule(ms) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(tick, ms);
        }

        async function tick() {
            timer = null;
            if (document.visibilityState !== "visible") return;
            const ac = new AbortController();
            inflight = ac;
            try {
                const res = await fetch(rf.baseUrl + "/graphql", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ query, variables: { s: rf.subdomain } }),
                    signal: ac.signal
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                const body = await res.json();
                lastShow = body && body.data && body.data.getShow;
                render(lastShow);
            } catch (err) {
                // Silent failure — hide the bar, try again later.
                lastShow = null;
                hide();
            } finally {
                inflight = null;
                // Only reschedule if the tab is still visible — a background
                // → foreground → background flip during the fetch would
                // otherwise leave a pending tick that fires on a hidden tab.
                if (document.visibilityState === "visible") schedule(pollMs);
            }
        }

        function hide() {
            bar.hidden = true;
            lastSong = null;
        }

        function render(show) {
            if (!show) return hide();
            // Gate on calendar season — don't surface a Halloween song while
            // the visitor is browsing Christmas mode (or vice versa).
            if (currentSeason() !== activeShowSeason()) return hide();
            const raw = (show.playingNow || "").trim();
            if (!raw) return hide();
            const seq = show.playingNowSequence || {};
            const song = (seq.displayName || raw).trim();
            const artist = (seq.artist || "").trim();
            if (song !== lastSong) {
                songEl.textContent = song;
                artistEl.textContent = artist;
                lastSong = song;
            } else if (artistEl.textContent !== artist) {
                artistEl.textContent = artist;
            }
            bar.hidden = false;
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") schedule(0);
            else stop();
        });

        // Season toggle: re-run render against the cached RF payload so the
        // card hides/shows immediately instead of waiting for the next poll.
        onSeasonChange(() => render(lastShow));

        tick();
    })();

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
    //
    // Smart modes — on show days, the grid switches from the static
    // "days until opening night" clock to a live one:
    //
    //   LIVE   — a show is running right now.
    //            Label: "🔴 Live now · Tune in on 105.3 FM"
    //            Grid:  countdown to when tonight's show ends
    //   SOON   — a show starts later today.
    //            Label: "🎃 Tonight's show starts in"
    //            Grid:  countdown to start time (days cell hidden)
    //   FUTURE — no show today. Fall through to data.countdown target
    //            (opening night). Original behavior.
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

    // Parse "6:30 PM" -> { h: 18, m: 30 }
    function parseTime12h(str) {
        if (!str) return null;
        const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(str).trim());
        if (!m) return null;
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        if (/pm/i.test(m[3]) && h !== 12) h += 12;
        if (/am/i.test(m[3]) && h === 12) h = 0;
        return { h, m: min };
    }

    // Parse "6:30 PM – 9:00 PM" -> { start, end }. Handles em/en/hyphen.
    function parseTimeRange(str) {
        if (!str) return null;
        const parts = String(str).split(/\s*[–—-]\s*/);
        return {
            start: parseTime12h(parts[0]),
            end:   parts[1] ? parseTime12h(parts[1]) : null
        };
    }

    // Find the event covering "now" for this season, if any. Returns
    // { event, mode: "LIVE"|"SOON", startAt, endAt } or null.
    function findRelevantEvent(season, now) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        for (const ev of events) {
            if (ev.season !== season) continue;
            if (ev.type === "closed") continue;
            if (!ev.time) continue;
            const endRange = ev._dateEnd || ev._date;
            if (today < ev._date || today > endRange) continue;

            const range = parseTimeRange(ev.time);
            if (!range || !range.start) continue;

            const startAt = new Date(today);
            startAt.setHours(range.start.h, range.start.m, 0, 0);
            const endAt = range.end ? new Date(today) : null;
            if (endAt) endAt.setHours(range.end.h, range.end.m, 0, 0);

            if (endAt && now >= startAt && now <= endAt) {
                return { event: ev, mode: "LIVE", startAt, endAt };
            }
            if (now < startAt) {
                return { event: ev, mode: "SOON", startAt, endAt };
            }
            // Show ended earlier today — keep looking (nothing else will match today
            // in practice, but be defensive).
        }
        return null;
    }

    function writeClock(diff) {
        if (diff < 0) diff = 0;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff / 60000) % 60);
        const s = Math.floor((diff / 1000) % 60);
        $("#cd-days").textContent = d;
        $("#cd-hours").textContent = String(h).padStart(2, "0");
        $("#cd-mins").textContent = String(m).padStart(2, "0");
        $("#cd-secs").textContent = String(s).padStart(2, "0");
        // Hide the days cell whenever it's zero so the grid doesn't lead
        // with a giant "0". Toggled every tick; cheap.
        cdEl.classList.toggle("compact", d === 0);
    }

    function applyCountdown(season) {
        if (!cdEl) return;
        if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }

        const emoji = season === "christmas" ? "🎄" : "🎃";
        const fallback = pickCountdown(season);
        const fallbackTarget = fallback && fallback.target ? new Date(fallback.target) : null;
        const fallbackLabel = (fallback && fallback.label) || "Coming up";

        const tick = () => {
            const now = new Date();
            const rel = findRelevantEvent(season, now);

            if (rel && rel.mode === "LIVE") {
                cdEl.hidden = false;
                cdEl.classList.add("live");
                $("#countdown-label").textContent = "Live now · Tune in on 105.3 FM";
                writeClock(rel.endAt - now);
                return;
            }

            cdEl.classList.remove("live");

            if (rel && rel.mode === "SOON") {
                cdEl.hidden = false;
                $("#countdown-label").textContent = `${emoji} Tonight's show starts in`;
                writeClock(rel.startAt - now);
                return;
            }

            // FUTURE — fall through to configured opening night target.
            if (!fallbackTarget || isNaN(fallbackTarget.getTime()) || fallbackTarget <= now) {
                cdEl.hidden = true;
                return;
            }
            cdEl.hidden = false;
            $("#countdown-label").textContent = fallbackLabel;
            writeClock(fallbackTarget - now);
        };

        tick();
        cdInterval = setInterval(tick, 1000);
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

    // Kick off the countdown now that `events` is populated; it reads
    // them via findRelevantEvent to detect a live/upcoming show.
    applyCountdown(currentSeason());
    onSeasonChange(applyCountdown);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // An event is "upcoming" if its LAST day (dateEnd or date) is today or later
    const upcoming = events.filter(e => (e._dateEnd || e._date) >= now);

    // --------------------------------------------------------
    // Add-to-calendar (.ics)
    // Phoenix, AZ doesn't observe DST — we always shift the local
    // time by exactly +7h to reach UTC, no VTIMEZONE block needed.
    // --------------------------------------------------------
    const AZ_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
    const ICS_LOCATION = "758 W Yellow Wood Ave, Queen Creek, AZ";
    const ICS_URL      = "https://hillardlights.com/";

    function parseTimeRange(str) {
        if (!str) return null;
        // "6:30 PM – 9:00 PM" (en-dash) or "6:30 PM - 9:00 PM"
        const m = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–\-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!m) return null;
        const to24 = (h, ap) => {
            h = +h;
            if (/PM/i.test(ap) && h !== 12) h += 12;
            if (/AM/i.test(ap) && h === 12) h = 0;
            return h;
        };
        return {
            startH: to24(m[1], m[3]), startM: +m[2],
            endH:   to24(m[4], m[6]), endM:   +m[5],
        };
    }
    function icsEscape(s) {
        return String(s || "").replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
    }
    function fmtIcsUtc(d) {
        return d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    }
    function fmtIcsDate(d) {
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    }
    function slugify(s) {
        return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    function buildIcs(ev) {
        const start = parseDateLocal(ev.date);
        const end   = ev.dateEnd ? parseDateLocal(ev.dateEnd) : start;
        const times = parseTimeRange(ev.time);
        const dayCount = Math.round((end - start) / 86400000) + 1;

        const lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Hillard Lights//Show Schedule//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            `UID:${ev.date}-${slugify(ev.title)}-${ev.season}@hillardlights.com`,
            `DTSTAMP:${fmtIcsUtc(new Date())}`,
        ];

        if (times) {
            const y = start.getFullYear(), mo = start.getMonth(), da = start.getDate();
            const startUtc = new Date(Date.UTC(y, mo, da, times.startH, times.startM) + AZ_UTC_OFFSET_MS);
            const endUtc   = new Date(Date.UTC(y, mo, da, times.endH,   times.endM  ) + AZ_UTC_OFFSET_MS);
            lines.push(`DTSTART:${fmtIcsUtc(startUtc)}`);
            lines.push(`DTEND:${fmtIcsUtc(endUtc)}`);
            if (dayCount > 1) lines.push(`RRULE:FREQ=DAILY;COUNT=${dayCount}`);
        } else {
            // All-day. DTEND is exclusive per RFC 5545.
            const dayAfter = new Date(end);
            dayAfter.setDate(dayAfter.getDate() + 1);
            lines.push(`DTSTART;VALUE=DATE:${fmtIcsDate(start)}`);
            lines.push(`DTEND;VALUE=DATE:${fmtIcsDate(dayAfter)}`);
        }

        const emoji = ev.season === "christmas" ? "🎄" : "🎃";
        const summary = `${emoji} Hillard Lights — ${ev.title}`;
        const descParts = [
            ev.subtitle,
            ev.description,
            ev.fm ? `Tune to ${ev.fm}.` : null,
            "Park along Hearn St or N Eliana Dr.",
            ICS_URL,
        ].filter(Boolean);
        lines.push(`SUMMARY:${icsEscape(summary)}`);
        lines.push(`DESCRIPTION:${icsEscape(descParts.join("\n\n"))}`);
        lines.push(`LOCATION:${icsEscape(ICS_LOCATION)}`);
        lines.push(`URL:${ICS_URL}`);
        lines.push("END:VEVENT");
        lines.push("END:VCALENDAR");

        return lines.join("\r\n");
    }

    function downloadIcs(ev) {
        const ics = buildIcs(ev);
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `hillard-lights-${slugify(ev.title)}-${ev.date}.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function calendarButton(ev) {
        if (ev.type === "closed") return "";
        const attrs = [
            `data-date="${escapeAttr(ev.date)}"`,
            ev.dateEnd     ? `data-date-end="${escapeAttr(ev.dateEnd)}"` : "",
            ev.time        ? `data-time="${escapeAttr(ev.time)}"` : "",
            `data-title="${escapeAttr(ev.title || "")}"`,
            ev.subtitle    ? `data-subtitle="${escapeAttr(ev.subtitle)}"` : "",
            ev.description ? `data-description="${escapeAttr(ev.description)}"` : "",
            ev.fm          ? `data-fm="${escapeAttr(ev.fm)}"` : "",
            `data-season="${escapeAttr(ev.season)}"`,
            ev.type        ? `data-type="${escapeAttr(ev.type)}"` : "",
        ].filter(Boolean).join(" ");
        return `<button type="button" class="event-calendar-btn" ${attrs} aria-label="Add ${escapeAttr(ev.title || "show")} to your calendar">📅 Add to calendar</button>`;
    }

    // One delegated listener; #schedule-list persists across season swaps.
    const scheduleListEl = $("#schedule-list");
    if (scheduleListEl) {
        scheduleListEl.addEventListener("click", e => {
            const btn = e.target.closest(".event-calendar-btn");
            if (!btn) return;
            const ds = btn.dataset;
            downloadIcs({
                date: ds.date, dateEnd: ds.dateEnd, time: ds.time,
                title: ds.title, subtitle: ds.subtitle, description: ds.description,
                fm: ds.fm, season: ds.season, type: ds.type,
            });
        });
    }

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
                    ${calendarButton(e)}
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
        grid.innerHTML = items.map((g, i) => {
            const webp = g.src.replace(/\.(jpe?g|png)$/i, ".webp");
            const useWebp = webp !== g.src;
            return `
            <button type="button" class="gallery-item reveal" data-idx="${i}" aria-label="Open photo">
                <picture>
                    ${useWebp ? `<source srcset="${escapeAttr(webp)}" type="image/webp">` : ""}
                    <img src="${escapeAttr(g.src)}" alt="${escapeAttr(g.caption || 'Hillard Lights photo')}" loading="lazy">
                </picture>
                ${g.caption ? `<span class="caption">${escapeHtml(g.caption)}</span>` : ""}
            </button>
        `;
        }).join("");

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

    function preferWebp(src) {
        return src.replace(/\.(jpe?g|png)$/i, ".webp");
    }

    function showCurrent() {
        const item = currentGalleryItems[currentGalleryIndex];
        if (!item) return;
        const webp = preferWebp(item.src);
        // Fall back to the original if the .webp isn't there (new photo
        // added before running tools/convert-gallery.ps1).
        lbImg.onerror = () => { lbImg.onerror = null; lbImg.src = item.src; };
        lbImg.src = (webp !== item.src) ? webp : item.src;
        lbImg.alt = item.caption || "";
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
        if (!item) return;
        const im = new Image();
        const webp = preferWebp(item.src);
        im.onerror = () => { im.onerror = null; im.src = item.src; };
        im.src = (webp !== item.src) ? webp : item.src;
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
        let currentYear   = null;
        let activeKey     = null;
        let currentDots   = [];

        function makeEl(tag, attrs) {
            const el = document.createElementNS(SVG_NS, tag);
            for (const k in attrs) el.setAttribute(k, attrs[k]);
            return el;
        }

        function pixelsOfModel(m) {
            if (!m) return 0;
            if (m.pixels && m.pixels.length) return m.pixels.length;
            // xLights matrix models store pixelCount as "pixels per string";
            // Custom/Line models default strings=1 so this is safe globally.
            const per = m.pixelCount || 0;
            const strings = m.strings || 1;
            return per * strings;
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
            const overrides = cfg.overrides || {};
            // Whitelist mode: when `showOnly` is set, keep only those keys.
            // Applies to both aggregate-generated dots (matched by their
            // `agg.key`) and raw group dots (matched by their group key).
            const showOnly = Array.isArray(cfg.showOnly) && cfg.showOnly.length
                ? new Set(cfg.showOnly)
                : null;

            function applyOverride(dot, key) {
                const o = overrides[key];
                if (!o) return dot;
                if (o.label != null)    dot.label    = o.label;
                if (o.note != null)     dot.note     = o.note;
                if (o.hideName != null) dot.hideName = !!o.hideName;
                if (o.pixels != null)   dot.pixels   = o.pixels;
                if (o.size != null)     dot.size     = o.size;
                if (Array.isArray(o.subs)) dot.overrideSubs = o.subs;
                return dot;
            }

            // Auto-derive a "W' × H'" size string from the xLights model's
            // w/h, using cfg.scaleUnitsPerFoot as the conversion factor.
            // Only applies to single-model groups; multi-model groups have
            // no single "size" that makes sense.
            const scale = cfg.scaleUnitsPerFoot;
            function autoSize(members) {
                if (!scale || !members || members.length !== 1) return null;
                const m = data.models.find(mm => mm.name === members[0]);
                if (!m || !m.w || !m.h) return null;
                const fmt = n => {
                    const rounded = Math.round(n * 10) / 10;
                    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
                };
                return `${fmt(m.w / scale)}' × ${fmt(m.h / scale)}'`;
            }

            for (const agg of (cfg.aggregate || [])) {
                if (showOnly && !showOnly.has(agg.key)) {
                    // Still consume matches so raw-group loop doesn't
                    // double-render them.
                    const patterns = agg.match.map(s => new RegExp(s));
                    for (const g of data.groups) {
                        if (remaining.has(g.key) && patterns.some(re => re.test(g.key))) {
                            remaining.delete(g.key);
                        }
                    }
                    continue;
                }
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
                dots.push(applyOverride({
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
                }, agg.key));
            }

            // Everything not aggregated → one dot per auto-group
            const positions = cfg.positions || {};
            const hidden    = new Set(cfg.hide || []);
            for (const g of data.groups) {
                if (!remaining.has(g.key)) continue;
                if (hidden.has(g.key)) continue;
                if (showOnly && !showOnly.has(g.key)) continue;
                const pos = positions[g.key];
                dots.push(applyOverride({
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
                    size: autoSize(g.members),
                    members: g.members,
                    subGroups: null,
                    aggregated: false
                }, g.key));
            }

            return dots;
        }

        function pickCurrentYear(season) {
            const cfg = zonesData[season];
            if (!cfg || !Array.isArray(cfg.years) || !cfg.years.length) return null;
            return cfg.years.find(y => y.current) || cfg.years[cfg.years.length - 1];
        }

        function renderYearChips(season) {
            const host = $("#layout-years");
            if (!host) return;
            host.innerHTML = "";
            const cfg = zonesData[season];
            const years = cfg && Array.isArray(cfg.years) ? cfg.years : [];
            if (years.length < 2) return; // no chips if there's nothing to compare
            for (const y of years) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "chip";
                btn.dataset.year = y.year;
                btn.textContent = y.year;
                btn.setAttribute("role", "tab");
                btn.setAttribute("aria-selected", "false");
                btn.addEventListener("click", () => selectYear(y));
                host.appendChild(btn);
            }
            updateChipActive();
        }

        function updateChipActive() {
            const host = $("#layout-years");
            if (!host) return;
            const yr = currentYear ? String(currentYear.year) : null;
            Array.from(host.children).forEach(btn => {
                const on = btn.dataset.year === yr;
                btn.classList.toggle("active", on);
                btn.setAttribute("aria-selected", on ? "true" : "false");
            });
        }

        function applyYearImage() {
            if (!currentYear) return;
            img.setAttribute("src", currentYear.image);
            const seasonLabel = currentSeason === "christmas" ? "Christmas" : "Halloween";
            img.setAttribute("alt", `${seasonLabel} ${currentYear.year} layout`);
            // Dots only make sense on the current year; hide the overlay
            // (and the hover hint) when viewing a past year.
            svg.style.display = currentYear.current ? "" : "none";
            const hint = $(".setup-hint");
            if (hint) hint.style.display = currentYear.current ? "" : "none";
        }

        function selectYear(yearObj) {
            if (currentYear && currentYear.year === yearObj.year) return;
            currentYear = yearObj;
            hidePanel();
            applyYearImage();
            updateChipActive();
            updateLead(currentSeason);
        }

        function renderSeason(season) {
            if (season === currentSeason) return;
            currentSeason = season;
            hidePanel();

            const cfg  = zonesData[season];
            const data = layout[season];
            if (!cfg || !data) return;

            renderYearChips(season);
            currentYear = pickCurrentYear(season);

            img.setAttribute("src", (currentYear && currentYear.image) || cfg.image);
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
                const r = 0.9;
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

            applyYearImage();
            updateChipActive();
        }

        // -- Panel --
        function showPanel(dot) {
            const titleEl = $("#zone-panel-title");
            const catEl   = $("#zone-panel-cat");
            const descEl  = $("#zone-panel-desc");

            titleEl.textContent = dot.hideName ? "" : dot.label;
            titleEl.hidden      = !!dot.hideName;

            // Category chip echoes the prop name for singletons (e.g.
            // "Headless Horseman"); hide it too when the name is suppressed.
            catEl.textContent  = dot.hideName ? "" : (dot.cat || "");
            catEl.hidden       = !!dot.hideName;
            catEl.style.color  = colorForCat(dot.cat);
            catEl.style.background =
                "rgba(" + hexToRgb(colorForCat(dot.cat)) + ",0.14)";

            // A custom `note` (from overrides) replaces the auto description.
            descEl.textContent = dot.note || dot.description || "";

            const stats = $("#zone-panel-stats");
            stats.innerHTML = "";
            stat(stats, "Props",   dot.count);
            if (dot.pixels) stat(stats, "Pixels", dot.pixels.toLocaleString());
            if (dot.size) stat(stats, "Size", dot.size);
            if (dot.aggregated && dot.subGroups) {
                stat(stats, "Subgroups", dot.subGroups.length);
            }

            // When the prop name is suppressed, don't leak it via the
            // individual-prop list either.
            const propsHost = $("#zone-panel-props");
            let listHtml = "";
            if (!dot.hideName) {
                if (Array.isArray(dot.overrideSubs) && dot.overrideSubs.length) {
                    // Curated breakdown from zones-data overrides (e.g.
                    // Rider / Horse for the headless horseman).
                    const items = dot.overrideSubs.map(sg => `
                        <li>
                            <span class="prop-name">${escapeHtml(sg.label)}</span>
                            <span class="prop-count"><strong>${(sg.pixels || 0).toLocaleString()}</strong> px</span>
                        </li>`).join("");
                    listHtml = `<strong>Breakdown</strong><ul>${items}</ul>`;
                } else if (dot.aggregated && dot.subGroups) {
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
            const label = dot.hideName ? "Click for details" : dot.label;
            const suffix = (!dot.hideName && dot.count > 1) ? ` · ${dot.count}×` : "";
            tooltip.textContent = label + suffix;
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

        // Section subtitle: real numbers from the xLights export for the
        // current year; a "past year" line when browsing older layouts.
        // If a season has no `current` year at all (Christmas is a static
        // gallery), drop the "no prop details" tail — every year is the
        // same kind of view, so the disclaimer would just add noise.
        const lead = $("#prop-count-lead");
        function updateLead(season) {
            const d = layout[season];
            if (!lead || !d) return;
            if (currentYear && !currentYear.current) {
                const cfg = zonesData[season];
                const hasCurrentYear = cfg && Array.isArray(cfg.years) &&
                    cfg.years.some(y => y.current);
                lead.textContent = hasCurrentYear
                    ? `Layout from ${currentYear.year} — past-year snapshot, no prop details.`
                    : `Layout from ${currentYear.year}.`;
                return;
            }
            const visible = currentDots.length;
            const totalGroups = d.groupCount;
            if (visible && visible < totalGroups) {
                lead.textContent =
                    `${visible} highlighted ${visible === 1 ? "prop" : "props"} · ${d.count} total in the show. More coming soon.`;
            } else {
                lead.textContent = `${d.count} props across ${totalGroups} groups.`;
            }
        }

        // Season swap. Early-exit when the attribute mutated but the value
        // didn't actually change, so we don't churn the overlay's dots +
        // year chips on unrelated re-applications of the theme attribute.
        let lastAppliedSeason = null;
        function applyForSeason(s) {
            if (s === lastAppliedSeason) return;
            lastAppliedSeason = s;
            renderSeason(s);
            updateLead(s);
        }
        new MutationObserver(() => {
            applyForSeason(html.getAttribute("data-theme") || "halloween");
        }).observe(html, { attributes: true, attributeFilter: ["data-theme"] });

        applyForSeason(html.getAttribute("data-theme") || "halloween");

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

    // --------------------------------------------------------
    // Service worker — installable + offline gallery.
    // No effect over file:// (registration requires http/https).
    // --------------------------------------------------------
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js").catch(() => { /* ignore */ });
        });
    }

})();
