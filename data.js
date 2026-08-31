// ============================================================
// Hillard Lights — Site Content
// ------------------------------------------------------------
// Edit this file to update the site. No coding required —
// just change the text between the quotes and add/remove items.
//
// After editing, refresh the browser. That's it.
// ============================================================

window.HILLARD = {

  // Where the show is
  location: "Arizona",

  // Which season the site is in ("halloween", "christmas", or "auto")
  // "auto" picks based on today's date:
  //   Sep 15 - Nov 5   -> Halloween
  //   Nov 15 - Jan 5   -> Christmas
  //   In-between       -> whichever is next
  season: "auto",

  // Optional hero background video — full-viewport looping highlight reel
  // playing behind the title. Muted, auto-play. Leave as "" to keep the
  // current animated CSS background (moon, stars, bats, snow) instead.
  //
  // Drop a small (10-30s) mp4 into videos/ and set the path here. Tips:
  //   - Encode with H.264 + AAC for broad browser support
  //   - Keep under ~5MB for fast load; downscale to 1280px wide if bigger
  //   - Silent-friendly (no audio needed since it plays muted)
  heroVideo: "",
  // Optional per-season override. If set, wins over heroVideo above.
  heroVideoBySeason: {
    halloween: "",
    christmas: ""
  },

  // Show a big banner near the top with news / important info.
  // Set active: false to hide it.
  announcement: {
    active: true,
    text: "🎃 Halloween 2026 opening night is Sunday, October 11. Tune in to 105.3 FM."
  },

  // Optional countdown target. Leave as "" to hide.
  // Format: "YYYY-MM-DDTHH:mm" in your local time.
  countdown: {
    label: "Opening Night",
    target: "2026-10-11T18:30"
  },

  // Short "About the show" paragraphs shown in the About section.
  about: [
    "Hillard Lights is a residential Halloween and Christmas light show synced to music, right in the neighborhood.",
    "Tune your car radio to the posted FM station, park nearby, and enjoy the show. Everything runs on a schedule — see below for show times.",
    "Two seasons, one house. Spooky animations in October. Full holiday cheer in December."
  ],

  // ============================================================
  // SCHEDULE — add / remove show nights and announcements
  // ============================================================
  //   type:     "show" | "special" | "closed"
  //   season:   "halloween" | "christmas"
  //   date:     "YYYY-MM-DD"  (start date if a range)
  //   dateEnd:  "YYYY-MM-DD"  (optional — end date for grouped ranges)
  //   time:     display string  (e.g. "6:30 PM - 10:00 PM" or "TBD")
  //   fm:       FM radio display (optional)
  //   title:    short name
  //   subtitle: optional short line under the title (e.g. "Sun–Thu")
  //   description: optional extra info
  // ============================================================
  events: [
    // ---- HALLOWEEN 2026 ----
    {
      season: "halloween", type: "closed",
      date: "2026-10-01", dateEnd: "2026-10-10",
      title: "Setup Week",
      subtitle: "10 nights of build",
      description: "10 days of build-out — pixel strings, gothic arch, gate matrices, the headless horseman, and 200+ props. No shows during this window."
    },
    {
      season: "halloween", type: "special",
      date: "2026-10-11",
      time: "6:30 PM – 9:00 PM", fm: "105.3 FM",
      title: "Opening Night",
      subtitle: "Sun",
      description: "First show of the 2026 Halloween season. Come see the new songs and animations."
    },
    {
      season: "halloween", type: "show",
      date: "2026-10-12", dateEnd: "2026-10-15",
      time: "6:30 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Mon – Thu"
    },
    {
      season: "halloween", type: "show",
      date: "2026-10-16", dateEnd: "2026-10-17",
      time: "6:30 PM – 10:00 PM", fm: "105.3 FM",
      title: "Weekend",
      subtitle: "Fri – Sat"
    },
    {
      season: "halloween", type: "show",
      date: "2026-10-18", dateEnd: "2026-10-22",
      time: "6:30 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Sun – Thu"
    },
    {
      season: "halloween", type: "show",
      date: "2026-10-23", dateEnd: "2026-10-24",
      time: "6:30 PM – 10:00 PM", fm: "105.3 FM",
      title: "Weekend",
      subtitle: "Fri – Sat"
    },
    {
      season: "halloween", type: "show",
      date: "2026-10-25", dateEnd: "2026-10-29",
      time: "6:30 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Sun – Thu"
    },
    {
      season: "halloween", type: "show",
      date: "2026-10-30",
      time: "6:30 PM – 10:00 PM", fm: "105.3 FM",
      title: "Halloween Eve",
      subtitle: "Fri"
    },
    {
      season: "halloween", type: "special",
      date: "2026-10-31",
      time: "6:30 PM – 10:00 PM", fm: "105.3 FM",
      title: "Halloween Night 🎃",
      subtitle: "Sat",
      description: "The big one. Candy, extra songs, and a full run of the show."
    },

    // ---- CHRISTMAS 2026 ----
    {
      season: "christmas", type: "closed",
      date: "2026-11-26", dateEnd: "2026-11-30",
      title: "Christmas Setup",
      subtitle: "5 nights of swap-over",
      description: "Full display swap from Halloween to Christmas. 5 days of build-out — first show ready Dec 1."
    },
    {
      season: "christmas", type: "special",
      date: "2026-12-01",
      time: "6:00 PM – 9:00 PM", fm: "105.3 FM",
      title: "Christmas Opening Night 🎄",
      subtitle: "Tue",
      description: "First night of the Christmas show. Fresh songs and a full display walkthrough."
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-02", dateEnd: "2026-12-03",
      time: "6:00 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Wed – Thu"
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-04", dateEnd: "2026-12-05",
      time: "6:00 PM – 10:00 PM", fm: "105.3 FM",
      title: "Weekend",
      subtitle: "Fri – Sat"
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-06", dateEnd: "2026-12-10",
      time: "6:00 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Sun – Thu"
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-11", dateEnd: "2026-12-12",
      time: "6:00 PM – 10:00 PM", fm: "105.3 FM",
      title: "Weekend",
      subtitle: "Fri – Sat"
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-13", dateEnd: "2026-12-17",
      time: "6:00 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Sun – Thu"
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-18", dateEnd: "2026-12-19",
      time: "6:00 PM – 10:00 PM", fm: "105.3 FM",
      title: "Weekend",
      subtitle: "Fri – Sat"
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-20", dateEnd: "2026-12-23",
      time: "6:00 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Sun – Wed"
    },
    {
      season: "christmas", type: "special",
      date: "2026-12-24",
      time: "6:00 PM – 9:00 PM", fm: "105.3 FM",
      title: "Christmas Eve 🎄",
      subtitle: "Thu",
      description: "One of the biggest nights of the season. Full show through the evening."
    },
    {
      season: "christmas", type: "special",
      date: "2026-12-25",
      time: "6:00 PM – 10:00 PM", fm: "105.3 FM",
      title: "Christmas Night 🎄",
      subtitle: "Fri",
      description: "The main event. Come see the show for the holidays."
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-26",
      time: "6:00 PM – 10:00 PM", fm: "105.3 FM",
      title: "Boxing Day",
      subtitle: "Sat"
    },
    {
      season: "christmas", type: "show",
      date: "2026-12-27", dateEnd: "2026-12-31",
      time: "6:00 PM – 9:00 PM", fm: "105.3 FM",
      title: "Weeknights",
      subtitle: "Sun – Thu",
      description: "Final week of the 2026 Christmas season."
    }
  ],

  // ============================================================
  // FEATURED VIDEOS
  // ------------------------------------------------------------
  // Two ways to feature a video:
  //   url:      any TikTok / YouTube / other URL  (opens in new tab)
  //   id:       11-char YouTube ID  (embeds inline via iframe)
  // ============================================================
  videos: [
    {
      title: "Halloween 2025 Highlights",
      url: "https://www.tiktok.com/@hillardlights/playlist/Halloween%202025-7559436264735345422",
      season: "halloween",
      platform: "tiktok",
      kind: "playlist"
    },
    {
      title: "Christmas 2025 Full Show",
      url: "https://www.tiktok.com/@hillardlights/playlist/Christmas%202025-7578365456348695310",
      season: "christmas",
      platform: "tiktok",
      kind: "playlist"
    },
    {
      title: "Behind the Scenes",
      url: "https://www.tiktok.com/@hillardlights/video/7425777315558296874",
      season: "halloween",
      platform: "tiktok",
      kind: "video"
    }
  ],

  // ============================================================
  // GALLERY
  // ------------------------------------------------------------
  // Add a photo:
  //   1. Drop the JPG into images/gallery/
  //   2. Add an entry below with src: "images/gallery/your-file.jpg"
  //
  // Entries sorted newest-first by capture date. Add caption
  // and/or season ("halloween"/"christmas") for filtering.
  // ============================================================
  gallery: [
    { src: "images/gallery/vlcsnap-2026-07-11-20h21m24s957.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_0186(2).jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_0184(2).jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_0991.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_0104.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_1353.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_1340.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_1332.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_1325.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_1323.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_1318.jpg", year: 2025, caption: "" },
    { src: "images/gallery/IMG_1170.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_1140.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_3473.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_1010.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_1009.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_0979.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_0970.jpg", year: 2024, caption: "" },
    { src: "images/gallery/BA189750-05AC-4F89-AD75-8E4C180A3E5F.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_0959.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_0957.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_0842.jpg", year: 2024, caption: "" },
    { src: "images/gallery/IMG_0838.jpg", year: 2023, caption: "" },
    { src: "images/gallery/IMG_0798.jpg", year: 2023, caption: "" },
    { src: "images/gallery/IMG_0767.jpg", year: 2023, caption: "" },
    { src: "images/gallery/71804475102__FABA9458-9F7E-4FD6-933F-84BDD4BD2759.jpg", year: 2023, caption: "" },
    { src: "images/gallery/IMG_0754.jpg", year: 2023, caption: "" },
    { src: "images/gallery/IMG_0753.jpg", year: 2023, caption: "" },
    { src: "images/gallery/IMG_0427.jpg", year: 2023, caption: "" },
    { src: "images/gallery/IMG_0678.jpg", year: 2023, caption: "" },
    { src: "images/gallery/IMG_0420.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_0418.jpg", year: 2022, caption: "" },
    { src: "images/gallery/68600407441__34629F5E-3C36-4274-BEB5-7E344600D1B1.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_0397.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_0342.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_0324.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_0286.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_0246.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_0049.jpg", year: 2022, caption: "" },
    { src: "images/gallery/IMG_1007(1).jpg", year: 2021, caption: "" },
    { src: "images/gallery/IMG_1003(1).jpg", year: 2021, caption: "" },
    { src: "images/gallery/IMG_1001(1).jpg", year: 2021, caption: "" },
    { src: "images/gallery/IMG_0995(1).jpg", year: 2021, caption: "" },
    { src: "images/gallery/IMG_0992.jpg", year: 2021, caption: "" },
    { src: "images/gallery/vlcsnap-2026-07-11-20h25m36s013.jpg", year: 2021, caption: "" }
  ],

  // ============================================================
  // HOUSE BACKDROP
  // ------------------------------------------------------------
  // The interactive layout renders a silhouette of the actual
  // house behind the props, projected from home-model.obj.
  // Tune these values if the silhouette doesn't line up.
  //   scale   : multiplier applied to the auto-fit size (1 = default)
  //   offsetX : horizontal shift, in the SVG's viewBox units (1600 wide)
  //   offsetY : vertical shift  (up is negative)
  //   opacity : 0 = invisible, 1 = fully lit
  // ============================================================
  houseBackdrop: {
    visible: true,
    scale:   1.0,
    offsetX: 0,
    offsetY: 0,
    opacity: 0.55
  },

  // ============================================================
  // INTERACTIVE HOUSE — hover/tap each prop for a tooltip
  // ------------------------------------------------------------
  // The SVG house has clickable regions matched by "id" below.
  // Edit the name / description to change the tooltip content.
  // Set show: false to hide a prop entirely.
  // ============================================================
  props: {
    roofline: {
      name: "Roofline Pixels",
      description: "500+ RGB pixels along the entire roof edge. Perfect for color sweeps and chases synced to the beat.",
      show: true
    },
    megatree: {
      name: "Mega Tree",
      description: "12-foot cone of RGB pixel strands — the centerpiece of the yard. Runs vertical sweeps, spirals, and beat-drop bursts.",
      show: true
    },
    star: {
      name: "Mega Tree Star",
      description: "Animated topper. Pulses on the vocals during ballads; strobes on the drops.",
      show: true
    },
    arches: {
      name: "Pixel Arches",
      description: "Twin arches over the walkway. Great for wave effects and back-and-forth chases.",
      show: true
    },
    windows: {
      name: "Window Outlines",
      description: "Warm white outline lights framing every front-facing window. Sync as one bar or independently.",
      show: true
    },
    door: {
      name: "Door Arch",
      description: "Archway of lights over the front door — the welcome mat for trick-or-treaters and carolers.",
      show: true
    },
    tree: {
      name: "Wrapped Tree",
      description: "Front yard tree wrapped top-to-bottom in RGB pixels. Rainbow drips, twinkle, and full-tree color washes.",
      show: true
    },
    // Halloween-only prop
    pumpkin: {
      name: "Singing Pumpkin",
      description: "Custom-carved pumpkin face that syncs mouth movement to the vocals. It watches you.",
      show: true,
      season: "halloween"
    },
    // Christmas-only prop
    snowman: {
      name: "Frosty",
      description: "8-foot inflatable snowman with dedicated RGB spotlights. Color changes with the song.",
      show: true,
      season: "christmas"
    }
  },

  // ============================================================
  // SOCIAL LINKS
  // ============================================================
  socials: {
    youtube:   "https://www.youtube.com/@hillardlights",
    tiktok:    "https://www.tiktok.com/@hillardlights",
    instagram: "https://www.instagram.com/hillardlights/",
    facebook:  "https://www.facebook.com/hillardlights/"
  }
};
