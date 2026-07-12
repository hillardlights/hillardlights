# Hillard Lights

A modern static site for the Hillard Lights residential Halloween and Christmas light show.

## Files

```
index.html    — page structure (rarely needs editing)
styles.css    — colors, layout, animations
scripts.js    — logic (rarely needs editing)
data.js       — 👈 THIS IS THE ONE YOU EDIT
```

Everything you'll normally update — show dates, gallery photos, videos, the announcement banner — lives in **`data.js`**. Edit that file, save, refresh the browser.

## How to preview locally

Just open `index.html` in a browser. Or from a terminal, run any static server:

```powershell
# Python (works out of the box on Windows)
python -m http.server 8000
# then open http://localhost:8000
```

## Common updates

### Change the announcement banner
Open `data.js`, find `announcement`, change the text or set `active: false` to hide it.

### Add a show night
In `data.js`, add a new object to the `events` array:

```js
{
  season: "halloween",         // or "christmas"
  type: "show",                // "show", "special", or "closed"
  date: "2026-10-15",
  time: "6:30 PM – 10:00 PM",
  fm: "88.1 FM",
  title: "Friday Night Show",
  description: "Optional extra note"
}
```

Past dates are automatically hidden.

### Add a photo to the gallery
1. Drop your image into an `images/` folder next to `index.html`.
2. Add an entry to `gallery` in `data.js`:

```js
{ src: "images/my-photo.jpg", caption: "Front yard glow", season: "halloween" }
```

### Feature a YouTube video
1. Grab the 11-character video ID from the YouTube URL. For `youtube.com/watch?v=dQw4w9WgXcQ` the ID is `dQw4w9WgXcQ`.
2. Update `videos` in `data.js`:

```js
{ id: "dQw4w9WgXcQ", title: "Halloween 2026 Highlights", season: "halloween" }
```

### Force a season theme
By default the site auto-switches between Halloween (Sep 15 – Nov 5) and Christmas (Nov 15 – Jan 5). Visitors can also flip it with the toggle in the top-right.

To force a season, change `season` in `data.js`:

```js
season: "halloween"   // or "christmas" or "auto"
```

## Deploying

The site is 100% static — no build step, no server. Drag the folder onto any static host:

- **GitHub Pages** — enable Pages on the repo, point at `main`.
- **Netlify / Vercel** — drag-and-drop the folder or connect the repo.
- **Any web host** — upload the four files (plus `images/` if you have one).
