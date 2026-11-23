/*!
 * Reel Fishy — v1.2.0
 * Self-contained video player web component: <reel-fishy>
 * Chaotic Fish Design · GPL-2.0-or-later
 *
 * Changelog
 * 1.2.0 — Hover preview: with a mouse, the poster plays a muted 6-second preview
 *         before the first play (`hover-preview`: on / off / a start time; local
 *         files only). Frame tools in the Share panel: back or forward one frame
 *         (, and . keys) and Save frame as a PNG (`frame-tools`). End screen and
 *         hotspot links can be mailto:, tel: or sms:, and open in place.
 * 1.1.0 — Renamed from Bioluminescence to Reel Fishy throughout (package, plugins,
 *         media folder, server event onReelFishyRender). No player changes.
 * 1.0.1 — Packaging: Joomla update server, installer checks (PHP 8.2+, Joomla 5+),
 *         plugins switched on at first install. No player changes.
 * 1.0.0 — First stable release. Editor popup builds playlists. Full test pass.
 * 0.9.0 — Sparkle pack: end screen fades in `end-lead` seconds early; ambient glow;
 *         end confetti; theater mode (W); hover thumbnails (live, or a thumbnails
 *         VTT sprite); timed hotspots from a VTT; playlists (`playlist` JSON from
 *         {reelfishy-playlist}) with a track list and Up next.
 * 0.8.0 — Caption languages (`captions="en:a.vtt; es:b.vtt"`), with a captions menu
 *         (hold CC) for language, size and background, remembered per visitor.
 *         Audio description: `descriptions` VTT read aloud by the browser (D key);
 *         the video ducks while it speaks and pauses if a description runs long.
 *         End screen: message, up to two link buttons and Replay.
 * 0.7.1 — TikTok (their embed player, driven by postMessage). `aspect` setting;
 *         Shorts and TikTok are 9:16 and files take their own shape. Portrait
 *         videos get a phone-shaped column with the transcript beside it.
 * 0.7.0 — YouTube and Vimeo links in `src`. Their own player plays the video (their
 *         controls, nothing of ours on top of it); the Reel Fishy bar, transcript,
 *         chapters, clips, share links, resume, mini player and carry-over work
 *         alongside through their official APIs. A privacy screen keeps anything
 *         from loading until play is pressed (youtube-nocookie, Vimeo dnt=1), with
 *         an optional "always load" choice. Site switches: youtube, vimeo, privacy,
 *         privacyRemember, privacyThumbs, privacyText.
 * 0.6.0 — `end` and `loop`: play a span, stop at its end or repeat it (or loop the
 *         whole video); times as seconds or m:ss. Share panel: link to the
 *         current moment, or mark a start and end (I / O keys) to share or loop a
 *         clip. Per-line transcript links. Shared links (#rf=id&t=a,b&loop) seek
 *         and scroll to the player. `lazy="click"` loads the video on first play.
 * 0.5.0 — SRT captions and transcripts. `transcript-file` adds a Download
 *         transcript button (TXT, DOC, DOCX, PDF). Hooks for a future playlist /
 *         site-search component: `video-id`, load(), and bubbling events
 *         (reelfishy:ready, play, pause, seeked, ended, cuechange).
 *         ReelFishy.parseVTT() is exposed for indexing.
 * 0.3.0 — Your own mascot: `play-image` and `loader-image` (PNG or SVG) replace
 *         the wrasse on the play button and the loading screen. Falls back to
 *         the wrasse if an image can't load. Editor button popup (Joomla).
 * 0.2.2 — Fish loading screen: a wrasse swims in circles while a video loads or
 *         buffers (`loader` attribute: auto / fish / ring). Every button has a
 *         hover tooltip with its keyboard shortcut.
 * 0.2.1 — Starting one player pauses any other that's playing. Joomla plugin
 *         leaves tags inside <pre>/<code> alone; \{reelfishy} prints a tag.
 * 0.2.0 — Mini player: docks to a corner when you scroll past a playing video
 *         (close + back buttons). Carry-over: keeps the video with you as you
 *         browse the site, reopening as a corner mini player that waits for a
 *         tap. `pip`, `mini`, `carry-over`, `dock`, `start` attributes.
 *         Joomla package (system plugin + editor button).
 * 0.1.1 — Speed button: tap cycles, long-press / right-click / ↑↓ opens a
 *         speed picker; < and > shortcuts; `speeds` attribute. Progress bar
 *         now animates with transforms and the clock redraws once a second
 *         (lighter per-frame work).
 * 0.1.0 — First prototype: custom controls, keyboard shortcuts, captions,
 *         chapter markers, resume playback, searchable click-to-seek
 *         transcript (with lead-in offset), icon sets (fishy/classic/minimal),
 *         sparkle bursts + shimmer progress. Every extra is optional.
 *
 * Global defaults (the Joomla plugin will print these from its options):
 *   window.ReelFishyDefaults = { sparkles: true, icons: 'fishy', searchOffset: 3, ... }
 * Per-player attributes override the defaults (see README).
 */
(() => {
  'use strict';
  if (customElements.get('reel-fishy')) return;

  const DEFAULTS = Object.assign({
    captionBg: 'solid',
    captionSize: 'm',
    captionsOn: false,
    carry: true,
    carryMinutes: 30,
    confetti: true,
    descriptionsOn: false,
    dockPosition: 'right',
    endLead: 2,
    endButton: '',
    endButton2: '',
    endMessage: '',
    endUrl: '',
    endUrl2: '',
    frameTools: true,
    glow: true,
    hoverPreview: true,
    icons: 'fishy',
    lazy: 'off',
    loader: 'auto',
    loaderImage: '',
    loop: false,
    mini: true,
    pip: true,
    playImage: '',
    previews: true,
    privacy: true,
    privacyRemember: true,
    privacyText: '',
    privacyThumbs: false,
    resume: true,
    searchOffset: 3,
    sparkles: true,
    speeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
    theater: true,
    tiktok: true,
    transcriptOpen: false,
    vimeo: true,
    youtube: true
  }, window.ReelFishyDefaults || {});

  /* ---------- helpers ---------- */
  const CARRY_KEY = 'reelfishy:carry';
  // only PNG and SVG files over http(s) or a site path
  const imgUrl = u => {
    u = String(u || '').trim().split('#')[0];
    if (!u || /^\s*(javascript|vbscript|data):/i.test(u)) return '';
    return /\.(png|svg)(\?.*)?$/i.test(u) ? u : '';
  };
  // 'clip.vtt' or 'en:clip.vtt; es:clip-es.vtt' -> [{ lang, url }]
  const parseTracks = v => String(v || '').split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const m = x.match(/^([a-z]{2,3}(?:-[a-z0-9]{2,8})*):(?!\/\/)(.+)$/i);
    return m ? { lang: m[1], url: m[2].trim() } : { lang: '', url: x };
  }).filter(t => t.url && !/^\s*(javascript|vbscript|data):/i.test(t.url));
  // 'es' -> 'Español' (each language named in itself)
  const langName = code => {
    if (!code) return 'Captions';
    try { const n = new Intl.DisplayNames([code], { type: 'language' }).of(code); return n ? n[0].toLocaleUpperCase(code) + n.slice(1) : code; } catch (e) { return code; }
  };
  // the track that best matches the visitor's languages (or the first one)
  const bestTrack = (tracks, want) => {
    if (!tracks.length) return -1;
    const prefs = [want, ...(navigator.languages || [navigator.language || ''])].filter(Boolean).map(x => x.toLowerCase());
    for (const p of prefs) {
      let i = tracks.findIndex(t => t.lang.toLowerCase() === p);
      if (i < 0) i = tracks.findIndex(t => t.lang && t.lang.toLowerCase().split('-')[0] === p.split('-')[0]);
      if (i > -1) return i;
    }
    return 0;
  };
  const CC_KEY = 'reelfishy:cc';
  const ccPrefs = () => { try { return JSON.parse(localStorage.getItem(CC_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const ccSave = patch => { try { localStorage.setItem(CC_KEY, JSON.stringify(Object.assign(ccPrefs(), patch))); } catch (e) { /* storage blocked */ } };
  const CC_SIZES = [['s', 'Small', 0.75], ['m', 'Medium', 1], ['l', 'Large', 1.3], ['xl', 'Extra large', 1.65]];
  const CC_BGS = [['solid', 'Solid'], ['clear', 'See-through'], ['none', 'None']];
  // a link opens a new tab when it leaves the site; mailto:, tel: and sms: open in place
  const newTab = u => { if (/^\s*(mailto|tel|sms):/i.test(u)) return false; try { return new URL(u, location.href).origin !== location.origin; } catch (e) { return false; } };
  // what a file name may hold: 'Barn tour!' -> 'barn-tour'
  const slug = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'video';
  const HOVER_SECONDS = 6;
  const safeHref = u => { u = String(u || '').trim(); return u && !/^\s*(javascript|vbscript|data):/i.test(u) ? u : ''; };
  // '16:9', '9/16', '1:1' -> width / height (NaN for 'auto' or anything else)
  const parseAspect = v => {
    const m = String(v || '').trim().match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/i);
    return m && +m[1] > 0 && +m[2] > 0 ? +m[1] / +m[2] : NaN;
  };
  const LOAD_LINES = ['Reeling it in…', 'Swimming upstream…', 'Untangling the line…', 'Waiting for the tide…', 'Herding the school…'];
  const clearCarry = () => { try { sessionStorage.removeItem(CARRY_KEY); } catch (e) { /* storage blocked */ } };
  const pad = n => String(n).padStart(2, '0');
  const fmt = s => {
    s = Math.max(0, Math.floor(isFinite(s) ? s : 0));
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  };
  // '90', '90.5', '1:30', '1:02:03' -> seconds (NaN when it isn't a time)
  const parseTime = v => {
    const str = String(v ?? '').trim();
    if (!/^\d+(\.\d+)?$|^\d+:\d{1,2}(\.\d+)?$|^\d+:\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) return NaN;
    return str.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
  };
  // 1:23 or 1:23.4 (tenths only when there are any)
  const fmtT = n => {
    const r = Math.round(Math.max(0, n) * 10) / 10, whole = Math.floor(r), tenth = Math.round((r - whole) * 10);
    return fmt(whole) + (tenth ? `.${tenth}` : '');
  };
  // seconds for links: 90, 90.5
  const tLink = n => String(Math.round(Math.max(0, n) * 10) / 10);
  const toSec = t => {
    const p = t.trim().replace(',', '.').split(':').map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  };
  const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&lrm;': '', '&rlm;': '' };
  const parseVTT = src => {
    const out = [];
    // WebVTT or SRT: SRT uses a comma before the milliseconds and numbers each cue
    src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/\n{2,}/).forEach(block => {
      const lines = block.split('\n');
      const i = lines.findIndex(l => l.includes('-->'));
      if (i < 0) return;
      const [a, b] = lines[i].split('-->');
      const start = toSec(a), end = toSec(b.trim().split(/\s+/)[0]);
      const raw = lines.slice(i + 1).join('\n');
      if (!raw.trim() || !isFinite(start) || !isFinite(end)) return;
      const v = raw.match(/<v(?:\.[^\s>]*)?\s+([^>]+)>/);
      const text = raw.replace(/<[^>]*>/g, '').replace(/&[a-z0-9#]+;/gi, m => ENT[m] ?? m).trim();
      out.push({ start, end, text, plain: text.replace(/\s*\n\s*/g, ' '), who: v ? v[1].trim() : '' });
    });
    return out.sort((x, y) => x.start - y.start);
  };
  const vttCache = new Map();
  const loadVTT = url => {
    if (!url) return Promise.resolve([]);
    if (!vttCache.has(url)) {
      vttCache.set(url, fetch(url)
        .then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
        .then(parseVTT)
        .catch(e => { console.warn('[Reel Fishy] Could not load', url, e); return []; }));
    }
    return vttCache.get(url);
  };
  // index of the last cue that has started at time t (or -1)
  const lastStart = (c, t) => {
    let lo = 0, hi = c.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (c[m].start <= t) { r = m; lo = m + 1; } else hi = m - 1; }
    return r;
  };
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };

  /* ---------- icons (24×24) ---------- */
  const O = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  const SPK = 'M4 9v6h4l5 4V5L8 9z';
  const X = 'M15.5 9.9l1.4-1.4 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1z';
  const SMALLFISH = 'M1 8.5l3.5 3.5L1 15.5zM4.5 12c1.6-2.8 4.2-4.2 6.6-4.2 2.1 0 3.9 1.9 3.9 4.2s-1.8 4.2-3.9 4.2c-2.4 0-5-1.4-6.6-4.2z' + O(12.3, 11.3, 0.8);
  const WRASSE =
    '<path class="w-b" d="M1.5 8.5L5 12l-3.5 3.5zM5 12c2-2.6 6.5-4 11-4 3.4 0 6.5 1.8 6.5 4s-3.1 4-6.5 4c-4.5 0-9-1.4-11-4z"/>' +
    '<path class="w-s" d="M2.6 11.4l2.6.2c3.2.3 8.2.1 13.3-.4l1.8.1v1.4l-1.8.1c-5.1-.5-10.1-.7-13.3-.4l-2.6.2z"/>' +
    `<path class="w-e" d="${O(19.6, 10.6, 0.85)}"/><path class="w-s" d="${O(19.75, 10.6, 0.4)}"/>`;

  const ICONS = {
    classic: {
      fx: ['star'],
      play: 'M8 5v14l11-7z',
      pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
      vol: SPK + 'M16 8.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2zM18.5 6a8.5 8.5 0 0 1 0 12l-1.4-1.4a6.5 6.5 0 0 0 0-9.2z',
      mute: SPK + X,
      cc: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm2 4v6h4v-2H7v-2h2V9zm6 0v6h4v-2h-2v-2h2V9z',
      tx: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4v2h10V7zm0 4v2h10v-2zm0 4v2h6v-2z',
      pip: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v10h16V7zm8 4h7v5h-7z',
      fs: 'M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z',
      fsx: 'M8 4h2v6H4V8h4zM14 4h2v4h4v2h-6zM4 14h6v6H8v-4H4zM14 14h6v2h-4v4h-2z',
      dl: 'M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V8h4.5zM11 10v5.2l-2.1-2.1-1.4 1.4L12 19l4.5-4.5-1.4-1.4-2.1 2.1V10z',
      share: 'M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7c0 .3 0 .5.1.8L8.4 11.2a3 3 0 1 0 0 3.6l6.7 3.4A3 3 0 1 0 18 16z',
      link: 'M13.1 6.6l1.8-1.8a4 4 0 0 1 5.7 5.7l-3 3a4 4 0 0 1-5.7 0l1.4-1.4a2 2 0 0 0 2.9 0l3-3a2 2 0 0 0-2.9-2.9l-1.8 1.8zM10.9 17.4l-1.8 1.8a4 4 0 0 1-5.7-5.7l3-3a4 4 0 0 1 5.7 0l-1.4 1.4a2 2 0 0 0-2.9 0l-3 3a2 2 0 0 0 2.9 2.9l1.8-1.8z',
      up: 'M7 14l5-5 5 5z',
      down: 'M7 10l5 5 5-5z',
      back: 'M10 5l-7 7 7 7v-4.5c5 0 8.5 1.5 11 5-1-5-4-10-11-11z',
      close: 'M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z',
      ext: 'M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
      ad: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v10h16V7zm2 8l2.2-6h1.6L12 15h-1.6l-.4-1.2H7.9L7.5 15zm2.3-2.6h1.3L9 10.6zM13 9h2.2a3 3 0 0 1 0 6H13zm1.5 1.4v3.2h.7a1.6 1.6 0 0 0 0-3.2z',
      replay: 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
      theater: 'M2 6h20v12H2zm2 2v8h16V8z',
      theaterx: 'M5 8h14v8H5zm2 2v4h10v-4z',
      list: 'M3 5h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z'
    },
    fishy: {
      fx: ['bubble', 'star', 'fish'],
      big: WRASSE,
      play: 'M2 7.5l4.5 4.5L2 16.5zM7 12c2.2-4 6-6 9.5-6C19.5 6 22 8.7 22 12s-2.5 6-5.5 6C13 18 9.2 16 7 12z' + O(18.5, 11, 1.1),
      pause: 'M7 4c-1.5 2.5 1.5 5 0 8s1.5 5.5 0 8h3c1.5-2.5-1.5-5 0-8s-1.5-5.5 0-8zM14 4c-1.5 2.5 1.5 5 0 8s1.5 5.5 0 8h3c1.5-2.5-1.5-5 0-8s-1.5-5.5 0-8z',
      vol: SMALLFISH + O(17.6, 10.2, 1.3) + O(20.2, 7.2, 1.6) + O(18.4, 3.9, 0.9),
      mute: SMALLFISH + X
    },
    minimal: {
      fx: ['dot'],
      stroke: true,
      play: 'M7 5l12 7-12 7z',
      pause: 'M8 5v14M16 5v14',
      vol: 'M4 10v4h3l5 4V6L7 10zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
      mute: 'M4 10v4h3l5 4V6L7 10zM16 9l5 6M21 9l-5 6',
      cc: 'M3 6h18v12H3zM10 10H8v4h2M16 10h-2v4h2',
      tx: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
      pip: 'M3 6h18v12H3zM12 11h7v5h-7z',
      fs: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
      fsx: 'M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5',
      dl: 'M14 3H6v18h12V7zM14 3v4h4M12 10v7M9 14l3 3 3-3',
      share: 'M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
      link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
      up: 'M7 14l5-5 5 5',
      down: 'M7 10l5 5 5-5',
      back: 'M9 6l-5 5 5 5M4 11h10a5 5 0 0 1 0 10h-3',
      close: 'M6 6l12 12M18 6L6 18',
      ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
      ad: 'M3 6h18v12H3zM6.5 15l2-6 2 6M7.2 13h2.6M13 9v6h1.5a3 3 0 0 0 0-6z',
      replay: 'M5 12a7 7 0 1 0 2-5M7 3v4h4',
      theater: 'M2 6h20v12H2z',
      theaterx: 'M5 8h14v8H5z',
      list: 'M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1'
    }
  };
  const svg = (set, name) => {
    let src = ICONS[set] || ICONS.classic;
    if (!src[name]) { if (name === 'big' && src.play) name = 'play'; else src = ICONS.classic; }
    if (!src[name] && name === 'big') name = 'play';
    const d = src[name];
    const attrs = src.stroke
      ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
      : 'fill="currentColor" fill-rule="evenodd"';
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${attrs}>${d[0] === '<' ? d : `<path d="${d}"/>`}</svg>`;
  };

  /* ---------- styles (scoped to the shadow root) ---------- */
  const CSS = `:host {
  --rf-accent: #f26b1d;
  --rf-accent-2: #7b3fa0;
  --rf-accent-3: #05b5c3;
  --rf-accent-4: #fcd602;
  --rf-bg: #0b1020;
  --rf-fg: #f5f7ff;
  --rf-line: rgba(255, 255, 255, .1);
  --rf-muted: #9aa4c2;
  --rf-panel: #121a30;
  --rf-radius: 14px;
  --rf-tx-width: 340px;
  color: var(--rf-fg);
  display: block;
  font-family: var(--rf-font, inherit);
  line-height: 1.4;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
.rf{background:var(--rf-bg);border-radius:var(--rf-radius);display:grid;grid-template-columns:minmax(0,1fr);outline:none;overflow:hidden;position:relative}
.rf:focus-visible{box-shadow:0 0 0 3px var(--rf-accent-4)}
.rf.wide.tx-open{grid-template-columns:minmax(0,1fr) var(--rf-tx-width)}
.rf:fullscreen{border-radius:0;height:100%;width:100%}
.main{display:flex;flex-direction:column;min-width:0}
.rf:fullscreen .main{height:100%}
.stage{aspect-ratio:var(--rf-ar,16/9);background:#000;cursor:pointer;position:relative}
.rf:fullscreen .stage{aspect-ratio:auto;flex:1;min-height:0}
video{display:block;height:100%;object-fit:contain;width:100%}
.hpv{inset:0;opacity:0;pointer-events:none;position:absolute;transition:opacity .35s}
.hpv.on{opacity:1}
.fx{height:100%;inset:0;pointer-events:none;position:absolute;width:100%;z-index:5}
.big{align-items:center;background:rgba(11,16,32,.6);border:2px solid var(--rf-accent-3);border-radius:50%;color:var(--rf-fg);cursor:pointer;display:flex;height:92px;justify-content:center;left:50%;padding:0;position:absolute;top:50%;transform:translate(-50%,-50%);transition:opacity .2s,transform .2s;width:92px}
.big:hover{transform:translate(-50%,-50%) scale(1.08)}
.big:focus-visible{outline:3px solid var(--rf-accent-4);outline-offset:3px}
.big svg,.big .pimg{height:60px;width:60px}
.pimg,.limg{object-fit:contain}
.orbit .limg{height:44px;left:50%;margin:-22px 0 0 -22px;position:absolute;top:50%;transform:translateY(-34px);width:44px}
.rf.playing .big{opacity:0;pointer-events:none}
.w-b{fill:var(--rf-accent-3)}
.w-e{fill:#fff}
.w-s{fill:#0b1020}
.cc{bottom:14px;left:50%;max-width:92%;pointer-events:none;position:absolute;text-align:center;transform:translateX(-50%);width:max-content}
.cc span{-webkit-box-decoration-break:clone;background:rgba(0,0,0,.8);border-radius:6px;box-decoration-break:clone;color:#fff;font-size:calc(clamp(14px,2.4vw,24px) * var(--rf-cc-scale,1));line-height:1.55;padding:2px 10px}
.rf.cc-clear .cc span{background:rgba(0,0,0,.45)}
.rf.cc-none .cc span{background:none;text-shadow:0 0 3px #000,0 1px 2px #000,0 0 6px #000}
.spin{animation:rf-spin 1s linear infinite;border:4px solid rgba(255,255,255,.2);border-radius:50%;border-top-color:var(--rf-accent-3);display:none;height:48px;left:50%;margin:-24px 0 0 -24px;position:absolute;top:50%;width:48px}
.rf.loading.ring .spin{display:block}
.loader{align-items:center;background:radial-gradient(circle,rgba(11,16,32,.55) 0,rgba(11,16,32,0) 70%);display:none;flex-direction:column;gap:12px;inset:0;justify-content:center;pointer-events:none;position:absolute;z-index:2}
.rf.loading.fishload .loader{display:flex}
.rf.loading .big{opacity:0;pointer-events:none}
.tank{height:96px;position:relative;width:96px}
.orbit{animation:rf-orbit 1.6s linear infinite;inset:0;position:absolute}
.orbit svg{height:44px;left:50%;margin:-22px 0 0 -22px;position:absolute;top:50%;transform:translateY(-34px)}
.bub{animation:rf-bub 1.6s ease-in infinite;border:1.5px solid var(--rf-accent-3);border-radius:50%;height:8px;left:50%;opacity:0;position:absolute;top:56%;width:8px}
.bub:nth-child(3){animation-delay:.5s;height:6px;margin-left:-10px;width:6px}
.bub:nth-child(4){animation-delay:1s;height:5px;margin-left:8px;width:5px}
.ltxt{background:rgba(11,16,32,.75);border-radius:999px;color:var(--rf-fg);font-size:13px;margin:0;padding:4px 12px}
.rf.docked .tank{transform:scale(.7)}
.rf.docked .ltxt{display:none}
.toast{align-items:center;background:rgba(11,16,32,.94);border:1px solid var(--rf-accent-3);border-radius:10px;cursor:default;display:none;font-size:14px;gap:10px;left:12px;padding:6px 12px;position:absolute;top:12px;z-index:4}
.toast.show{display:flex}
.toast button{background:none;border:0;color:var(--rf-accent-4);cursor:pointer;font:inherit;padding:0;text-decoration:underline}
.bar{background:var(--rf-panel);padding:8px 12px 10px}
.seek{cursor:pointer;height:20px;position:relative;touch-action:none}
.seek:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:2px}
.track{background:rgba(255,255,255,.14);border-radius:4px;height:6px;left:0;position:absolute;right:0;top:7px}
.buf,.played{border-radius:4px;height:100%;left:0;position:absolute;top:0}
.buf{background:rgba(255,255,255,.26);width:0}
.played{background:linear-gradient(90deg,var(--rf-accent-3),var(--rf-accent-2),var(--rf-accent));transform:scaleX(0);transform-origin:0 50%;width:100%;will-change:transform}
.rf.sparkle .played{animation:rf-shimmer 4s linear infinite;background:linear-gradient(90deg,var(--rf-accent-3),var(--rf-accent-2),var(--rf-accent),var(--rf-accent-4),var(--rf-accent-3));background-size:200% 100%}
.marks{inset:0;position:absolute}
.span{background:rgba(252,214,2,.3);border-left:2px solid var(--rf-accent-4);border-right:2px solid var(--rf-accent-4);display:none;height:100%;position:absolute;top:0}
.span.on{display:block}
.span.loop{background:repeating-linear-gradient(90deg,rgba(252,214,2,.35) 0 6px,rgba(252,214,2,.15) 6px 12px)}
.mark{background:var(--rf-panel);height:100%;position:absolute;top:0;width:3px}
.knob{background:var(--rf-fg);border-radius:50%;box-shadow:0 0 0 3px var(--rf-accent-2);height:14px;left:0;margin-left:-7px;position:absolute;top:3px;width:14px;will-change:transform}
.rf.sparkle .knob{box-shadow:0 0 0 3px var(--rf-accent-2),0 0 14px 2px var(--rf-accent-4)}
.tip{background:#000;border-radius:6px;bottom:24px;color:#fff;display:none;font-size:12px;padding:4px 8px;pointer-events:none;position:absolute;transform:translateX(-50%);white-space:nowrap;z-index:4}
.seek:hover .tip{display:block}
.row{align-items:center;display:flex;flex-wrap:wrap;gap:2px;margin-top:4px}
.btn{align-items:center;background:none;border:0;border-radius:8px;color:var(--rf-fg);cursor:pointer;display:inline-flex;font:inherit;height:38px;justify-content:center;min-width:38px;padding:0 6px}
.btn:hover{background:rgba(255,255,255,.1)}
.btn:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:1px}
.btn:disabled{cursor:default;opacity:.35}
a.btn{text-decoration:none}
.btn svg{height:22px;width:22px}
.btn[aria-pressed=true]{background:rgba(5,181,195,.16);color:var(--rf-accent-3)}
.ratewrap{display:inline-flex;position:relative}
.ccwrap{display:inline-flex;position:relative}
.ccmenu{min-width:150px;overflow-y:auto}
.ccmenu .mh{color:var(--rf-muted);font-size:11px;font-weight:700;letter-spacing:.05em;margin:6px 10px 2px;text-transform:uppercase}
.ccmenu .mh:first-child{margin-top:2px}
.endcard{align-items:center;background:rgba(11,16,32,.88);display:flex;flex-direction:column;gap:12px;inset:0;justify-content:center;padding:16px;position:absolute;text-align:center;z-index:3}
.rf.ended .big{opacity:0;pointer-events:none}
.ec-msg{color:var(--rf-fg);font-size:clamp(15px,2.2vw,22px);font-weight:700;margin:0;max-width:560px}
.ec-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.ec-btn{align-items:center;background:rgba(255,255,255,.1);border:1px solid var(--rf-line);border-radius:999px;color:var(--rf-fg);cursor:pointer;display:inline-flex;font:inherit;font-size:14px;gap:6px;padding:8px 16px;text-decoration:none}
.ec-btn:hover{background:rgba(255,255,255,.18)}
.ec-btn:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:2px}
.ec-btn.primary{background:var(--rf-accent-3);border-color:transparent;color:#0b1020;font-weight:700}
.ec-btn svg{height:18px;width:18px}
.rf.docked .endcard{gap:8px;padding:8px}
.rf.docked .ec-msg{font-size:13px}
.rf.docked .ec-btn{font-size:12px;padding:5px 10px}
.under .endcard{background:none;padding:10px 0 2px;position:static}
.rate{-webkit-touch-callout:none;-webkit-user-select:none;font-size:14px;font-variant-numeric:tabular-nums;font-weight:700;touch-action:manipulation;user-select:none}
.sharewrap{display:inline-flex;position:relative}
.share{background:var(--rf-panel);border:1px solid var(--rf-line);border-radius:10px;bottom:calc(100% + 6px);box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px);overflow:auto;padding:12px;position:absolute;right:0;width:280px;z-index:6}
.sh-h{color:var(--rf-muted);font-size:11px;font-weight:700;letter-spacing:.05em;margin:0;text-transform:uppercase}
.sbtn{background:rgba(255,255,255,.08);border:1px solid var(--rf-line);border-radius:8px;color:var(--rf-fg);cursor:pointer;font:inherit;font-size:13px;padding:6px 10px;text-align:left;white-space:nowrap}
.sbtn:hover{background:rgba(255,255,255,.15)}
.sbtn:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:1px}
.sbtn.primary{background:var(--rf-accent-3);border-color:transparent;color:#0b1020;font-weight:700}
.sh-row{align-items:center;display:flex;gap:6px}
.sh-row>label{color:var(--rf-muted);flex:none;font-size:13px;width:38px}
.sh-in,.sh-url{background:var(--rf-bg);border:1px solid rgba(255,255,255,.2);border-radius:6px;color:var(--rf-fg);font:inherit;font-size:13px;min-width:0;padding:5px 8px}
.sh-in{flex:1;font-variant-numeric:tabular-nums;width:0}
.sh-in:focus-visible,.sh-url:focus-visible{border-color:var(--rf-accent-3);outline:2px solid var(--rf-accent-3);outline-offset:0}
.sh-in.bad{border-color:#e0605a}
.sh-url{font-size:12px;width:100%}
.sh-check{align-items:center;color:var(--rf-fg);display:flex;font-size:13px;gap:6px}
.sh-check input{accent-color:var(--rf-accent-3);margin:0}
.sh-sep{border-top:1px solid var(--rf-line);margin:2px 0}
.sh-frame{display:flex;flex-wrap:wrap;gap:6px}
.sh-msg{color:var(--rf-accent-3);font-size:12px;margin:0;min-height:1.2em}
.rf.docked .sharewrap{display:none!important}
.rmenu{background:var(--rf-panel);border:1px solid var(--rf-line);border-radius:10px;bottom:calc(100% + 6px);box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;flex-direction:column;min-width:104px;padding:4px;position:absolute;right:0;z-index:6}
.rmenu button{background:none;border:0;border-radius:6px;color:var(--rf-fg);cursor:pointer;font:inherit;font-size:14px;font-variant-numeric:tabular-nums;padding:6px 10px;text-align:left}
.rmenu button:hover,.rmenu button:focus-visible{background:rgba(255,255,255,.1);outline:none}
.rmenu button[aria-checked=true]{color:var(--rf-accent-3);font-weight:700}
.rmenu button[aria-checked=true]::after{content:"✓";float:right;margin-left:12px}
.time{color:var(--rf-muted);font-size:13px;font-variant-numeric:tabular-nums;margin:0 8px;white-space:nowrap}
.grow{flex:1}
.vol{accent-color:var(--rf-accent-3);cursor:pointer;width:84px}
.rf.narrow .vol{display:none}
.rf.narrow .btn{min-width:32px;padding:0 3px}
.rf.narrow .time{font-size:12px;margin:0 4px}
.tx{background:var(--rf-panel);border-top:1px solid var(--rf-line);display:none;flex-direction:column;max-height:360px;min-height:0}
.rf.tx-open .tx{display:flex}
.rf.wide .tx{border-left:1px solid var(--rf-line);border-top:0;height:0;max-height:none;min-height:100%}
.txhead{border-bottom:1px solid var(--rf-line);display:flex;flex-direction:column;gap:6px;padding:10px}
.search{background:var(--rf-bg);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:var(--rf-fg);font:inherit;padding:8px 10px;width:100%}
.search:focus-visible{border-color:var(--rf-accent-3);outline:2px solid var(--rf-accent-3);outline-offset:0}
.sbar{align-items:center;color:var(--rf-muted);display:flex;font-size:13px;gap:2px;min-height:38px}
.list{flex:1;list-style:none;margin:0;min-height:0;overflow-y:auto;padding:6px;position:relative}
.cue{background:none;border:0;border-radius:8px;color:var(--rf-fg);cursor:pointer;display:grid;font:inherit;gap:0 10px;grid-template-columns:auto 1fr;padding:6px 8px;text-align:left;width:100%}
.cue:hover{background:rgba(255,255,255,.06)}
.cue:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:-2px}
.cue time{color:var(--rf-accent-3);font-size:12px;font-variant-numeric:tabular-nums;grid-row:span 2;padding-top:3px}
.who{color:var(--rf-accent-4);font-size:12px;font-weight:700}
.txt{grid-column:2;line-height:1.45}
.list>li{position:relative}
.list .cue{padding-right:38px}
.cue-link{align-items:center;background:var(--rf-panel);border:1px solid var(--rf-line);border-radius:6px;color:var(--rf-muted);cursor:pointer;display:flex;height:26px;justify-content:center;opacity:0;padding:0;position:absolute;right:6px;top:6px;width:26px}
.list>li:hover>.cue-link,.cue-link:focus-visible{opacity:1}
.cue-link:hover{color:var(--rf-fg)}
.cue-link:focus-visible{outline:2px solid var(--rf-accent-4)}
.cue-link svg{height:14px;width:14px}
.cue.now{background:rgba(5,181,195,.14);box-shadow:inset 3px 0 0 var(--rf-accent-3)}
.list.searching .cue:not(.hit){opacity:.45}
.cue.hit-cur{box-shadow:inset 3px 0 0 var(--rf-accent-4)}
mark{background:var(--rf-accent-4);border-radius:3px;color:#111;padding:0 2px}
.sr{clip:rect(0 0 0 0);height:1px;margin:-1px;overflow:hidden;position:absolute;white-space:nowrap;width:1px}
.dockbar{display:none;gap:4px;position:absolute;right:6px;top:6px;z-index:3}
.rf.docked .dockbar{display:flex}
.dockbar .btn{background:rgba(11,16,32,.78);height:32px;min-width:32px}
.dockbar .btn:hover{background:rgba(11,16,32,.95)}
.dockbar .btn svg{height:18px;width:18px}
.rf.docked{animation:rf-dock .25s ease-out;bottom:16px;box-shadow:0 12px 36px rgba(0,0,0,.5);grid-template-columns:minmax(0,1fr)!important;position:fixed;right:16px;width:min(360px,calc(100vw - 32px));z-index:2147483000}
.rf.docked.dock-left{left:16px;right:auto}
.rf.docked .b-ad,.rf.docked .b-tx,.rf.docked .tx,.rf.docked .vol{display:none!important}
.rf.docked .big{height:64px;width:64px}
.rf.docked .big svg,.rf.docked .big .pimg{height:40px;width:40px}
.rf.docked .cc span{font-size:calc(13px * var(--rf-cc-scale,1))}
.rf.docked .toast{font-size:13px;max-width:calc(100% - 92px)}
.emb{height:100%;position:relative;width:100%}
.eframe{border:0;display:block;height:100%;inset:0;position:absolute;width:100%}
.consent{align-items:center;background:radial-gradient(circle at 50% 40%,#1b2547 0,#0b1020 75%);color:var(--rf-fg);display:flex;flex-direction:column;gap:8px;inset:0;justify-content:flex-end;padding:12px 16px 14px;position:absolute;text-align:center}
.consent.off{justify-content:center}
.rf.live .consent{display:none}
.c-img{height:100%;inset:0;object-fit:cover;opacity:.55;position:absolute;width:100%}
.c-name{background:rgba(11,16,32,.85);border-radius:999px;font-size:12px;font-weight:700;left:12px;padding:3px 10px;position:absolute;top:12px}
.c-txt{background:rgba(11,16,32,.85);border-radius:10px;font-size:13px;margin:0;max-width:560px;padding:6px 12px;position:relative}
.c-txt a{color:var(--rf-accent-4)}
.c-rem{align-items:center;background:rgba(11,16,32,.85);border-radius:999px;cursor:pointer;display:flex;font-size:13px;gap:6px;padding:3px 12px;position:relative}
.c-rem input{accent-color:var(--rf-accent-3);margin:0}
.rf.docked .c-txt{font-size:11px;padding:4px 8px}
.rf.docked .c-name,.rf.docked .c-rem{display:none}
.under{background:var(--rf-panel);display:flex;flex-direction:column;padding:0 12px}
.under:empty{display:none}
.under .cc{max-width:none;padding-top:8px;position:static;transform:none;width:auto}
.under .cc:empty{display:none}
.under .cc span{font-size:calc(16px * var(--rf-cc-scale,1))}
.under .toast{align-self:flex-start;margin-top:8px;position:static}
.row>.dockbar{position:static}
.rf.embed{overflow:visible}
.rf.embed .fx,.rf.embed .loader,.rf.embed .spin,.rf.embed.live .big{display:none!important}
.rf.embed .stage{border-radius:var(--rf-radius) var(--rf-radius) 0 0;overflow:hidden}
.rf.embed .bar,.rf.embed .tx{border-radius:0 0 var(--rf-radius) var(--rf-radius)}
.rf.embed.tx-open .bar{border-radius:0}
.rf.embed.wide.tx-open .stage{border-top-right-radius:0}
.rf.embed.wide.tx-open .bar{border-bottom-left-radius:var(--rf-radius)}
.rf.embed.wide .tx{border-radius:0 var(--rf-radius) var(--rf-radius) 0}
.rf.embed:fullscreen .bar,.rf.embed:fullscreen .stage{border-radius:0}
.rf.embed .rmenu,.rf.embed .share{bottom:auto;top:calc(100% + 6px)}
.rf.embed .tip{bottom:auto;top:22px}
.rf.embed.docked{min-width:356px}
.rf.portrait{grid-template-columns:minmax(0,var(--rf-pw));margin:0 auto;max-width:100%;width:fit-content}
.rf.portrait.wide.tx-open{grid-template-columns:minmax(0,var(--rf-pw)) var(--rf-tx-width)}
.rf.portrait:fullscreen{grid-template-columns:minmax(0,1fr);width:100%}
.rf.portrait.docked{width:min(225px,calc(100vw - 32px))}
.rf.embed.portrait.docked{min-width:200px}
.rf[data-source=tiktok] .ratewrap,.rf[data-source=tiktok] .vol{display:none!important}
.rf.embed.docked .ratewrap,.rf.embed.docked .ccmenu{display:none!important}
.dim{background:rgba(5,8,18,.88);inset:0;position:fixed;z-index:2147482999}
.rf.glow{transition:box-shadow 1.2s}
.rf.glow.playing:not(.docked){box-shadow:0 0 70px 8px var(--rf-glow,transparent)}
.rf.glow.playing:not(.docked):focus-visible{box-shadow:0 0 0 3px var(--rf-accent-4),0 0 70px 8px var(--rf-glow,transparent)}
.rf.portrait.theater,.rf.theater{height:fit-content;inset:0;margin:auto;max-height:96vh;max-width:none;position:fixed;width:var(--rf-thw);z-index:2147483000}
.rf.theater.tx-open:not(.wide){overflow-y:auto}
.rf.theater:fullscreen{height:100%;inset:auto;margin:0;max-height:none;width:100%}
.rf.docked .b-th{display:none!important}
.tipt{display:block;text-align:center}
.thumb{background-color:#000;background-repeat:no-repeat;border:2px solid var(--rf-fg);border-radius:6px;margin:-2px -6px 4px;overflow:hidden}
.thumb canvas{display:block;height:100%;width:100%}
.rf.embed .thumb{margin:4px -6px -2px}
.rf.embed .seek:hover .tip{display:flex;flex-direction:column-reverse}
.hots{inset:0;pointer-events:none;position:absolute;z-index:3}
.hot{animation:rf-fade .35s ease-out;background:rgba(11,16,32,.85);border:1px solid var(--rf-accent-3);border-radius:999px;color:var(--rf-fg);cursor:pointer;font:inherit;font-size:14px;font-weight:700;max-width:calc(50% - 24px);overflow:hidden;padding:6px 14px;pointer-events:auto;position:absolute;text-decoration:none;text-overflow:ellipsis;white-space:nowrap}
.hot:hover{background:var(--rf-accent-3);color:#0b1020}
.hot:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:2px}
.hot.pos-tl{left:12px;top:calc(12px + var(--n,0) * 40px)}
.hot.pos-tr{right:12px;top:calc(12px + var(--n,0) * 40px)}
.hot.pos-bl{bottom:calc(14px + var(--n,0) * 40px);left:12px}
.hot.pos-br{bottom:calc(14px + var(--n,0) * 40px);right:12px}
.rf.docked .hots{display:none}
.under .hots{display:flex;flex-wrap:wrap;gap:6px;position:static}
.under .hots:empty{display:none}
.under .hots:not(:empty){padding-top:8px}
.under .hot{max-width:none;position:static}
.endcard:not([hidden]){animation:rf-fade .6s ease-out}
.ec-next{align-items:center;border-top:1px solid var(--rf-line);display:flex;flex-direction:column;gap:8px;padding-top:12px}
.ec-up{color:var(--rf-fg);font-size:15px;margin:0}
.ec-upl{color:var(--rf-accent-3);font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.ec-cnt{color:var(--rf-muted);font-variant-numeric:tabular-nums}
.pl{background:var(--rf-panel);border-top:1px solid var(--rf-line)}
.pl-head{align-items:center;background:none;border:0;color:var(--rf-fg);cursor:pointer;display:flex;font:inherit;font-size:14px;font-weight:700;gap:8px;padding:10px 12px;text-align:left;width:100%}
.pl-head svg{height:18px;width:18px}
.pl-head:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:-2px}
.pl-count{color:var(--rf-muted);font-size:13px;font-weight:400;margin-left:auto}
.pl-list{list-style:none;margin:0;max-height:260px;overflow-y:auto;padding:0 6px 8px}
.pl-item{align-items:center;background:none;border:0;border-radius:8px;color:var(--rf-fg);cursor:pointer;display:flex;font:inherit;font-size:14px;gap:10px;padding:7px 8px;text-align:left;width:100%}
.pl-item:hover{background:rgba(255,255,255,.06)}
.pl-item:focus-visible{outline:2px solid var(--rf-accent-4);outline-offset:-2px}
.pl-item[aria-current=true]{background:rgba(5,181,195,.14);box-shadow:inset 3px 0 0 var(--rf-accent-3)}
.pl-n{color:var(--rf-muted);font-size:12px;font-variant-numeric:tabular-nums;min-width:1.5em}
.pl-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-src{background:rgba(255,255,255,.08);border-radius:999px;color:var(--rf-muted);font-size:11px;padding:1px 8px}
.rf.docked .pl{display:none}
.rf.embed .pl{border-radius:0 0 var(--rf-radius) var(--rf-radius)}
.rf.embed .bar:has(+ .pl:not([hidden])){border-radius:0}
@keyframes rf-fade {
  from {
    opacity: 0;
  }
}
@keyframes rf-dock {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}
@keyframes rf-orbit {
  to {
    transform: rotate(360deg);
  }
}
@keyframes rf-bub {
  0% {
    opacity: 0;
    transform: translate(-50%, 8px) scale(.6);
  }
  25% {
    opacity: .9;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -40px) scale(1.1);
  }
}
@keyframes rf-shimmer {
  to {
    background-position: -200% 0;
  }
}
@keyframes rf-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .big {
    transition: none;
  }
  .rf.docked {
    animation: none;
  }
  .orbit,
  .spin {
    animation: none;
  }
  .bub {
    display: none;
  }
  .rf.sparkle .played {
    animation: none;
  }
  .endcard,
  .hot {
    animation: none !important;
  }
  .rf.glow {
    transition: none;
  }
}`;

  /* ---------- particle layer ---------- */
  class FX {
    constructor(c) { this.c = c; this.g = c.getContext('2d'); this.p = []; this.on = false; this.w = 0; this.h = 0; }
    size(w, h) {
      const d = window.devicePixelRatio || 1;
      this.w = w; this.h = h;
      this.c.width = Math.round(w * d); this.c.height = Math.round(h * d);
      this.g.setTransform(d, 0, 0, d, 0, 0);
    }
    burst(x, y, n, cols, shapes, power) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = (1.2 + Math.random() * 3.2) * power;
        this.p.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2 * power,
          life: 1, decay: 0.012 + Math.random() * 0.018,
          r: 2.5 + Math.random() * 4, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.3,
          col: cols[i % cols.length], sh: shapes[(Math.random() * shapes.length) | 0]
        });
      }
      if (!this.on) { this.on = true; requestAnimationFrame(() => this.tick()); }
    }
    // confetti falling from the top edge across the whole player
    shower(n, cols) {
      for (let i = 0; i < n; i++) {
        this.p.push({
          x: Math.random() * this.w, y: -10 - Math.random() * this.h * 0.4, vx: (Math.random() - 0.5) * 1.2, vy: 1 + Math.random() * 2.2,
          life: 1, decay: 0.004 + Math.random() * 0.004, r: 3 + Math.random() * 3.5, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.25,
          col: cols[i % cols.length], sh: 'conf'
        });
      }
      if (!this.on) { this.on = true; requestAnimationFrame(() => this.tick()); }
    }
    tick() {
      const g = this.g;
      g.clearRect(0, 0, this.w, this.h);
      this.p = this.p.filter(p => p.life > 0);
      for (const p of this.p) {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.98;
        p.vy += p.sh === 'bubble' ? -0.03 : (p.sh === 'conf' ? 0.025 : 0.06);
        if (p.sh === 'conf') p.vx += Math.sin(p.life * 12 + p.rot) * 0.03;
        p.rot += p.vr; p.life -= p.decay;
        g.save();
        g.globalAlpha = Math.max(0, p.life);
        g.translate(p.x, p.y);
        g.fillStyle = g.strokeStyle = p.col;
        g.beginPath();
        if (p.sh === 'bubble') {
          g.lineWidth = 1.5; g.arc(0, 0, p.r, 0, 6.283); g.stroke();
        } else if (p.sh === 'fish') {
          g.rotate(Math.atan2(p.vy, p.vx));
          g.ellipse(0, 0, p.r * 1.4, p.r * 0.7, 0, 0, 6.283);
          g.moveTo(-p.r * 1.2, 0); g.lineTo(-p.r * 2.3, -p.r * 0.8); g.lineTo(-p.r * 2.3, p.r * 0.8); g.closePath();
          g.fill();
        } else if (p.sh === 'conf') {
          g.rotate(p.rot); g.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
        } else if (p.sh === 'dot') {
          g.arc(0, 0, p.r * 0.6, 0, 6.283); g.fill();
        } else {
          g.rotate(p.rot);
          for (let k = 0; k < 8; k++) {
            const rr = k % 2 ? p.r * 0.35 : p.r * 1.2, a = k * Math.PI / 4;
            g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          g.closePath(); g.fill();
        }
        g.restore();
      }
      if (this.p.length) requestAnimationFrame(() => this.tick());
      else { this.on = false; g.clearRect(0, 0, this.w, this.h); }
    }
  }

  /* ---------- YouTube and Vimeo ---------- */
  // which hosted video a src points at: { kind, name, id, h, watch } or null for a plain file
  const embedOf = src => {
    let u;
    try { u = new URL(String(src || '').trim(), location.href); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname.replace(/^(www|m)\./, ''), p = u.pathname.split('/').filter(Boolean);
    let id = '';
    if (host === 'youtu.be') id = p[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (p[0] === 'watch') id = u.searchParams.get('v');
      else if (['embed', 'shorts', 'live', 'v'].includes(p[0])) id = p[1];
    }
    if (id && /^[\w-]{11}$/.test(id)) return { kind: 'youtube', name: 'YouTube', id, h: '', tall: p[0] === 'shorts', watch: p[0] === 'shorts' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}` };
    // TikTok: tiktok.com/@name/video/123…, /embed/v2/123…, /player/v1/123…; short links can't be read here
    if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || (host === 'tiktok.com' && p[0] === 't')) return { kind: 'tiktok', name: 'TikTok', id: '', h: '', tall: true, short: true, watch: u.href };
    if (host === 'tiktok.com') {
      const vi = p.indexOf('video');
      const tid = vi > -1 ? p[vi + 1] : (p[0] === 'embed' || p[0] === 'player' ? p[p.length - 1] : (p[0] === 'v' ? String(p[1] || '').replace(/\.html$/, '') : ''));
      if (/^\d{8,}$/.test(tid || '')) return { kind: 'tiktok', name: 'TikTok', id: tid, h: '', tall: true, watch: p[0] && p[0][0] === '@' ? `https://www.tiktok.com/${p[0]}/video/${tid}` : `https://www.tiktok.com/embed/v2/${tid}` };
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      let i = -1;
      p.forEach((seg, k) => { if (/^\d+$/.test(seg)) i = k; });
      if (i > -1) {
        const h = u.searchParams.get('h') || (p[i + 1] && /^[0-9a-f]{6,}$/i.test(p[i + 1]) ? p[i + 1] : '');
        return { kind: 'vimeo', name: 'Vimeo', id: p[i], h: /^[0-9a-f]+$/i.test(h) ? h : '', watch: `https://vimeo.com/${p[i]}${h ? '/' + h : ''}` };
      }
    }
    return null;
  };
  const PRIVACY = { youtube: 'https://policies.google.com/privacy', vimeo: 'https://vimeo.com/privacy', tiktok: 'https://www.tiktok.com/legal/privacy-policy' };
  const okKey = k => 'reelfishy:ok:' + k;
  const consented = k => { try { return localStorage.getItem(okKey(k)) === '1'; } catch (e) { return false; } };
  // their official player APIs, loaded only when a visitor plays one of their videos
  const API = {
    youtube: ['https://www.youtube.com/iframe_api', () => window.YT && typeof window.YT.Player === 'function'],
    vimeo: ['https://player.vimeo.com/api/player.js', () => window.Vimeo && typeof window.Vimeo.Player === 'function']
  };
  const apiCache = {};
  // TikTok's player takes plain postMessage commands: no script of theirs to load
  const loadApi = kind => !API[kind] ? Promise.resolve() : apiCache[kind] || (apiCache[kind] = new Promise((res, rej) => {
    const [url, ok] = API[kind];
    if (ok()) { res(); return; }
    const s = document.createElement('script');
    s.src = url; s.async = true;
    s.onerror = () => { delete apiCache[kind]; rej(new Error('Could not load ' + url)); };
    document.head.append(s);
    const t0 = Date.now(), wait = setInterval(() => {
      if (ok()) { clearInterval(wait); res(); }
      else if (Date.now() - t0 > 20000) { clearInterval(wait); delete apiCache[kind]; rej(new Error('Timed out loading ' + url)); }
    }, 50);
  }));
  const YT_ERR = {
    2: "That YouTube link isn't valid.",
    5: "YouTube couldn't play this video here.",
    100: 'This YouTube video was removed or is private.',
    101: "The video's owner doesn't allow it to play on other sites.",
    150: "The video's owner doesn't allow it to play on other sites.",
    153: "YouTube didn't get this site's address. Check the site's Referrer-Policy setting."
  };

  // Wraps a YouTube or Vimeo player so it looks like a <video> to the rest of the player:
  // currentTime, duration, paused, play(), pause(), and the same events.
  class Embed extends EventTarget {
    constructor(box, info, title) {
      super();
      Object.assign(this, {
        box, info, title, paused: true, ended: false, readyState: 0, booted: false, p: null,
        disablePictureInPicture: true, currentSrc: info.watch, src: info.watch,
        _t: 0, _ts: 0, _dur: NaN, _rate: 1, _vol: 1, _muted: false, _frac: 0, _hold: 0,
        _want: { play: false, t: null }
      });
    }
    _fire(type) { this.dispatchEvent(new Event(type)); }
    _clock(t) { this._t = t; this._ts = performance.now(); }
    get duration() { return this._dur; }
    get currentTime() {
      let t = this._t;
      if (!this.paused && this._ts) t += (performance.now() - this._ts) / 1000 * this._rate;
      return isFinite(this._dur) ? Math.min(this._dur, t) : t;
    }
    set currentTime(t) {
      t = Math.max(0, +t || 0);
      this._clock(t); this.ended = false;
      if (!this.p) { this._want.t = t; return; }
      this._fire('seeking');
      // a drag sends lots of seeks: pass on at most one every 150ms, always the last one
      clearTimeout(this._sk);
      const go = () => { this._ls = performance.now(); this._hold = this._ls + 700; this._seek(this._t); };
      const wait = 150 - (performance.now() - (this._ls || 0));
      if (wait <= 0) go(); else this._sk = setTimeout(go, wait);
    }
    get playbackRate() { return this._rate; }
    set playbackRate(r) {
      r = +r || 1;
      if (!this.p) { this._rate = r; this._fire('ratechange'); return; }
      this._setRate(r);
    }
    get volume() { return this._vol; }
    set volume(x) { this._vol = Math.min(1, Math.max(0, +x || 0)); this._volOut(); this._fire('volumechange'); }
    get muted() { return this._muted; }
    set muted(m) { this._muted = !!m; this._volOut(); this._fire('volumechange'); }
    get buffered() {
      const e = this._frac * (this._dur || 0);
      return e > 0 ? { length: 1, start: () => 0, end: () => e } : { length: 0, start: () => 0, end: () => 0 };
    }
    load() {}
    play() {
      this._want.play = true;
      if (!this.booted) this.boot(true);
      else if (this.p) this._play();
      return Promise.resolve();
    }
    pause() { this._want.play = false; if (this.p) this._pause(); }

    // build their iframe (their player, their controls) and connect to it through their API
    boot(autoplay) {
      if (this.booted) return;
      this.booted = true;
      if (autoplay) this._want.play = true;
      const i = this.info, f = document.createElement('iframe'), q = new URLSearchParams();
      // TikTok has no start parameter: it seeks once its player is ready
      const start = this._bootT = i.kind === 'tiktok' ? 0 : Math.floor(this._want.t || 0);
      let src;
      if (i.kind === 'tiktok') {
        q.set('rel', '0');
        if (autoplay) q.set('autoplay', '1');
        src = `https://www.tiktok.com/player/v1/${i.id}?${q}`;
        this._tiktok();
      } else if (i.kind === 'youtube') {
        q.set('enablejsapi', '1'); q.set('origin', location.origin); q.set('playsinline', '1'); q.set('rel', '0');
        if (autoplay) q.set('autoplay', '1');
        if (start) q.set('start', start);
        src = `https://www.youtube-nocookie.com/embed/${i.id}?${q}`;
      } else {
        q.set('dnt', '1'); q.set('playsinline', '1');
        if (i.h) q.set('h', i.h);
        if (autoplay) q.set('autoplay', '1');
        src = `https://player.vimeo.com/video/${i.id}?${q}${start ? `#t=${start}s` : ''}`;
      }
      f.className = 'eframe';
      f.title = this.title;
      f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
      f.allowFullscreen = true;
      // YouTube needs to know which site is playing it: never strip the Referer
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.src = src;
      this.box.append(f);
      this.frame = f;
      this._fire('loadstart');
      loadApi(i.kind).then(() => this._attach()).catch(e => {
        console.warn('[Reel Fishy]', e);
        this.errorMessage = `Couldn't reach ${i.name}'s player. The video may still play using its own buttons.`;
        this._fire('error');
      });
    }
    // TikTok talks back with { type, value, 'x-tiktok-player': true } messages
    _tiktok() {
      this._onMsg = e => {
        if (!this.frame || e.source !== this.frame.contentWindow) return;
        let d = e.data;
        if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
        if (!d || !d['x-tiktok-player']) return;
        const v = d.value;
        if (!this.p && d.type !== 'onPlayerError') { this.p = { tiktok: true }; this._ready(); }
        if (d.type === 'onStateChange') this._yState(+v); // same numbers as YouTube
        else if (d.type === 'onCurrentTime' && v) {
          this._durIs(v.duration);
          if (performance.now() > this._hold) this._clock(+v.currentTime || 0);
          this._fire('timeupdate');
        } else if (d.type === 'onMute') { this._muted = !!v; this._fire('volumechange'); }
        else if (d.type === 'onVolumeChange' && isFinite(v)) { this._vol = v / 100; this._fire('volumechange'); }
        else if (d.type === 'onPlayerError') {
          this.errorMessage = v && v.errorCode === 1001 ? "This TikTok video can't be found, or can't be embedded." : "TikTok couldn't play this video.";
          this._fire('error');
        }
      };
      window.addEventListener('message', this._onMsg);
    }
    _send(type, value) {
      if (this.frame && this.frame.contentWindow) this.frame.contentWindow.postMessage({ type, value, 'x-tiktok-player': true }, 'https://www.tiktok.com');
    }
    _attach() {
      const f = this.frame;
      if (!f || !f.isConnected || this.info.kind === 'tiktok') return;
      if (this.info.kind === 'youtube') {
        const yp = new window.YT.Player(f, {
          events: {
            onReady: () => { this.p = yp; this._ready(); },
            onStateChange: e => this._yState(e.data),
            onPlaybackRateChange: e => { this._clock(this.currentTime); this._rate = +e.data || 1; this._fire('ratechange'); },
            onError: e => { this.errorMessage = YT_ERR[e.data] || "YouTube couldn't play this video."; this._fire('error'); }
          }
        });
        return;
      }
      const vp = new window.Vimeo.Player(f);
      vp.on('play', d => this._playing(d && d.seconds));
      vp.on('pause', d => this._paused(d && d.seconds));
      vp.on('ended', () => { this._paused(this._dur); this.ended = true; this._fire('ended'); });
      vp.on('timeupdate', d => {
        if (d && d.duration) this._durIs(d.duration);
        if (d && performance.now() > this._hold) this._clock(d.seconds);
        this._fire('timeupdate');
      });
      vp.on('seeked', d => { if (d) this._clock(d.seconds); this._hold = 0; this._fire('seeked'); });
      vp.on('progress', d => { this._frac = (d && d.percent) || 0; this._fire('progress'); });
      vp.on('bufferstart', () => this._fire('waiting'));
      vp.on('bufferend', () => this._fire('playing'));
      vp.on('playbackratechange', d => { this._clock(this.currentTime); this._rate = (d && d.playbackRate) || 1; this._fire('ratechange'); });
      vp.on('volumechange', d => { if (d && !this._muted) { this._vol = d.volume; this._fire('volumechange'); } });
      vp.on('error', d => { this.errorMessage = `Vimeo couldn't play this video${d && d.message ? ': ' + d.message : '.'}`; this._fire('error'); });
      vp.ready().then(() => { this.p = vp; return vp.getDuration(); }).then(d => { this._durIs(d); this._ready(); }).catch(e => {
        this.errorMessage = "Vimeo couldn't play this video."; console.warn('[Reel Fishy]', e); this._fire('error');
      });
    }
    // the player is listening: hand over anything asked for while it loaded
    _ready() {
      const w = this._want;
      if (this._rate !== 1) this._setRate(this._rate);
      if (this._vol !== 1 || this._muted) this._volOut();
      if (this.info.kind === 'youtube') { this._poll(); this._pt = setInterval(() => this._poll(), 250); }
      // the iframe started at a whole second; seek only if something else was asked for since
      if (w.t != null && Math.abs(w.t - this._bootT) > 1) this._seek(w.t);
      w.t = null;
      if (w.play) this._play();
    }
    _durIs(d) {
      d = +d;
      if (!(d > 0) || d === this._dur) return;
      const first = !isFinite(this._dur);
      this._dur = d;
      if (first) { this.readyState = 4; this._fire('loadedmetadata'); this._fire('canplay'); }
      this._fire('durationchange');
    }
    _poll() {
      const p = this.p;
      if (!p || !p.getCurrentTime) return;
      this._durIs(p.getDuration());
      if (performance.now() > this._hold) {
        const t = +p.getCurrentTime() || 0;
        if (t !== this._lt) { this._lt = t; this._clock(t); this._fire('timeupdate'); }
      }
      const fr = p.getVideoLoadedFraction ? +p.getVideoLoadedFraction() || 0 : 0;
      if (fr !== this._frac) { this._frac = fr; this._fire('progress'); }
      // volume changed in YouTube's own controls
      const vol = p.getVolume() / 100, m = !!p.isMuted();
      if (isFinite(vol) && (Math.abs(vol - this._vol) > 0.01 || m !== this._muted) && performance.now() > (this._vh || 0)) {
        this._vol = vol; this._muted = m; this._fire('volumechange');
      }
    }
    _yState(s) {
      if (s === 1) this._playing();
      else if (s === 2) this._paused();
      else if (s === 0) { this._paused(this._dur); this.ended = true; this._fire('ended'); }
      else if (s === 3) this._fire('waiting');
    }
    _playing(t) {
      this.ended = false;
      this._clock(t != null && isFinite(t) ? t : (this.p && this.p.getCurrentTime ? +this.p.getCurrentTime() || this._t : this._t));
      if (this.paused) { this.paused = false; this._fire('play'); }
      this._fire('playing');
    }
    _paused(t) {
      if (this.paused) return;
      this._clock(t != null && isFinite(t) ? t : (this.p && this.p.getCurrentTime ? +this.p.getCurrentTime() || this.currentTime : this.currentTime));
      this.paused = true;
      this._want.play = false;
      this._fire('pause');
    }
    _play() { const p = this.p, k = this.info.kind; if (k === 'tiktok') this._send('play'); else if (k === 'youtube') p.playVideo(); else p.play().catch(() => {}); }
    _pause() { const p = this.p, k = this.info.kind; if (k === 'tiktok') this._send('pause'); else if (k === 'youtube') p.pauseVideo(); else p.pause().catch(() => {}); }
    _seek(t) {
      const p = this.p;
      if (this.info.kind === 'tiktok') { this._send('seekTo', t); setTimeout(() => this._fire('seeked'), 0); }
      else if (this.info.kind === 'youtube') { p.seekTo(t, true); setTimeout(() => this._fire('seeked'), 0); }
      else p.setCurrentTime(t).catch(() => {});
    }
    _setRate(r) {
      const p = this.p;
      if (this.info.kind === 'tiktok') { this._rate = 1; this._fire('ratechange'); return; }
      if (this.info.kind === 'youtube') { p.setPlaybackRate(r); return; }
      p.setPlaybackRate(r).catch(() => {
        this.note = "This Vimeo video doesn't allow speed changes.";
        this._fire('rf-note');
        this._fire('ratechange');
      });
    }
    _volOut() {
      const p = this.p;
      if (!p) return;
      this._vh = performance.now() + 600;
      if (this.info.kind === 'tiktok') this._send(this._muted || !this._vol ? 'mute' : 'unMute');
      else if (this.info.kind === 'youtube') {
        if (this._muted) p.mute(); else p.unMute();
        p.setVolume(Math.round(this._vol * 100));
      } else p.setVolume(this._muted ? 0 : this._vol).catch(() => {});
    }
    destroy() {
      clearInterval(this._pt); clearTimeout(this._sk);
      if (this._onMsg) window.removeEventListener('message', this._onMsg);
      try { if (this.p && this.p.destroy) this.p.destroy(); } catch (e) { /* already gone */ }
      if (this.frame) this.frame.remove();
      this.p = null; this.frame = null;
    }
  }

  /* ---------- the component ---------- */
  class ReelFishy extends HTMLElement {
    static get observedAttributes() { return ['src', 'poster']; }

    attributeChangedCallback(n, o, val) {
      if (!this.v || o === val) return;
      if (n === 'src') {
        this.o.src = val || ''; this._restored = false;
        try { this._key = 'reelfishy:' + new URL(this.o.src, location.href).href; } catch (e) { this._key = 'reelfishy:' + this.o.src; }
        this._setMedia(this.o.src, false);
        if (this._emb && !this._blocked && !this._askFirst()) this._bootEmbed(false);
      } else if (!this._emb) this.v.poster = val || '';
    }

    // hover-preview: off / on / a start time ('0:12'); on starts at `start`
    _hoverOpt(a) {
      if (a == null || a === '') return DEFAULTS.hoverPreview ? true : false;
      if (/^(false|off|0|no)$/i.test(a.trim())) return false;
      const t = parseTime(a);
      return isNaN(t) ? true : t;
    }
    _bool(n, d) { const a = this.getAttribute(n); return a === null ? d : !/^(false|off|0|no)$/i.test(a); }
    _num(n, d) { const a = parseFloat(this.getAttribute(n)); return isFinite(a) ? a : d; }

    connectedCallback() {
      if (this.v) { this._listen(true); return; }
      const g = n => this.getAttribute(n) || '';
      const o = this.o = {
        src: g('src'), poster: g('poster'), label: g('label') || 'Video',
        captions: g('captions'), chapters: g('chapters'), transcript: g('transcript'), descriptions: g('descriptions'),
        transcriptFile: g('transcript-file'), id: g('video-id'), aspect: g('aspect'),
        icons: g('icons') || DEFAULTS.icons,
        sparkles: this._bool('sparkles', DEFAULTS.sparkles),
        offset: Math.max(0, this._num('search-offset', DEFAULTS.searchOffset)),
        resume: this._bool('resume', DEFAULTS.resume),
        txOpen: this._bool('transcript-open', DEFAULTS.transcriptOpen),
        ccOn: this._bool('captions-on', DEFAULTS.captionsOn),
        adOn: this._bool('descriptions-on', DEFAULTS.descriptionsOn),
        endOn: this._bool('end-screen', true),
        endLead: Math.max(0, Math.min(15, this._num('end-lead', DEFAULTS.endLead))),
        thumbs: g('thumbnails'), hotspots: g('hotspots'),
        glow: this._bool('glow', DEFAULTS.glow), confetti: this._bool('confetti', DEFAULTS.confetti),
        theater: this._bool('theater', DEFAULTS.theater), previews: this._bool('previews', DEFAULTS.previews),
        pip: this._bool('pip', DEFAULTS.pip),
        mini: this._bool('mini', DEFAULTS.mini),
        carry: this._bool('carry-over', DEFAULTS.carry),
        dock: g('dock') || DEFAULTS.dockPosition,
        loader: g('loader') || DEFAULTS.loader,
        playImage: imgUrl(g('play-image') || DEFAULTS.playImage),
        loaderImage: imgUrl(g('loader-image') || DEFAULTS.loaderImage),
        start: Math.max(0, parseTime(g('start')) || 0),
        end: parseTime(g('end')),
        loop: this._bool('loop', DEFAULTS.loop),
        lazy: (g('lazy') || DEFAULTS.lazy) === 'click',
        hover: this._hoverOpt(g('hover-preview')),
        frameTools: this._bool('frame-tools', DEFAULTS.frameTools),
        speeds: (g('speeds') ? g('speeds').split(',').map(Number).filter(n => n > 0 && n <= 16) : DEFAULTS.speeds.slice())
      };
      this._endCfg();
      if (!o.speeds.length) o.speeds = DEFAULTS.speeds.slice();
      if (!o.speeds.includes(1)) o.speeds.push(1);
      o.speeds.sort((a, b) => a - b);
      this._carried = this.hasAttribute('data-carried');
      this._from = (this._carry && this._carry.from) || location.href;
      if (this._carried) { o.txOpen = false; o.lazy = false; o.hover = false; }
      if (!(o.end > o.start)) o.end = null;
      if (o.loader !== 'fish' && o.loader !== 'ring') o.loader = o.icons === 'fishy' || o.loaderImage ? 'fish' : 'ring';
      const I = n => svg(o.icons, n);
      const r = this.attachShadow({ mode: 'open' });
      r.innerHTML = `<style>${CSS}</style>
<div class="dim" hidden></div>
<div class="rf" tabindex="0" role="region">
<canvas class="fx" aria-hidden="true"></canvas>
<div class="main">
<div class="stage"><div class="cc" aria-hidden="true"></div><div class="spin" aria-hidden="true"></div><div class="loader" aria-hidden="true"><div class="tank"><div class="orbit">${svg('fishy', 'big')}</div><span class="bub"></span><span class="bub"></span><span class="bub"></span></div><p class="ltxt"></p></div><button class="big" type="button" aria-label="Play" title="Play (K)">${I('big')}</button><div class="hots" role="group" aria-label="Links"></div><div class="toast" role="status"></div><div class="endcard" role="group" aria-label="Video finished" hidden><p class="ec-msg"></p><div class="ec-btns"></div></div><div class="dockbar"><button class="btn d-back" type="button" aria-label="Back to the video" title="Back to the video">${I('back')}</button><button class="btn d-close" type="button" aria-label="Close mini player" title="Close mini player">${I('close')}</button></div></div>
<div class="under"></div>
<div class="bar">
<div class="seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00"><div class="track"><div class="buf"></div><div class="span"></div><div class="played"></div><div class="marks"></div></div><div class="knob"></div><div class="tip" aria-hidden="true"><div class="thumb" hidden><canvas></canvas></div><span class="tipt"></span></div></div>
<div class="row">
<button class="btn b-play" type="button" aria-label="Play" title="Play (K)">${I('play')}</button>
<button class="btn b-mute" type="button" aria-label="Mute" title="Mute (M)">${I('vol')}</button>
<input class="vol" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" title="Volume (↑ ↓)">
<span class="time"><span class="cur">0:00</span> / <span class="dur">0:00</span></span>
<span class="grow"></span>
<span class="sharewrap"><button class="btn b-share" type="button" aria-label="Share" aria-haspopup="dialog" aria-expanded="false" title="Share a moment or a clip (S)">${I('share')}</button><div class="share" role="dialog" aria-label="Share" hidden></div></span>
<span class="ratewrap"><button class="btn rate" type="button" aria-label="Playback speed 1x" aria-haspopup="menu" aria-expanded="false" title="Tap to change speed · hold for the speed menu">1×</button><div class="rmenu" role="menu" aria-label="Playback speed" hidden></div></span>
<span class="ccwrap" hidden><button class="btn b-cc" type="button" aria-label="Captions" aria-pressed="false" aria-haspopup="menu" aria-expanded="false" title="Show captions (C) · hold for languages and style">${I('cc')}</button><div class="rmenu ccmenu" role="menu" aria-label="Captions" hidden></div></span>
<button class="btn b-ad" type="button" aria-label="Audio description" aria-pressed="false" title="Audio description (D)" hidden>${I('ad')}</button>
<button class="btn b-tx" type="button" aria-label="Transcript" aria-pressed="false" title="Show transcript (T)" hidden>${I('tx')}</button>
<a class="btn b-dl" target="_blank" rel="noopener" aria-label="Download transcript (opens in a new tab)" title="Download transcript" hidden>${I('dl')}</a>
<button class="btn b-pip" type="button" aria-label="Picture in picture" title="Picture in picture" hidden>${I('pip')}</button>
<a class="btn b-ext" target="_blank" rel="noopener" hidden>${I('ext')}</a>
<button class="btn b-th" type="button" aria-label="Theater mode" title="Theater mode (W)" hidden>${I('theater')}</button>
<button class="btn b-fs" type="button" aria-label="Fullscreen" title="Fullscreen (F)">${I('fs')}</button>
</div></div>
<div class="pl" hidden><button class="pl-head" type="button" aria-expanded="true">${I('list')}<span class="pl-title"></span><span class="pl-count"></span></button><ol class="pl-list"></ol></div>
</div>
<aside class="tx" aria-label="Transcript">
<div class="txhead"><input class="search" type="search" placeholder="Search transcript…" aria-label="Search transcript" title="Search transcript (/)" autocomplete="off">
<div class="sbar"><span class="count" aria-live="polite"></span><span class="grow"></span><button class="btn s-prev" type="button" aria-label="Previous match" title="Previous match (Shift+Enter)" disabled>${I('up')}</button><button class="btn s-next" type="button" aria-label="Next match" title="Next match (Enter)" disabled>${I('down')}</button></div></div>
<ol class="list"></ol>
</aside>
<div class="sr" aria-live="polite"></div>
</div>`;
      const q = s => r.querySelector(s);
      Object.assign(this, {
        rf: q('.rf'), v: null, stage: q('.stage'), under: q('.under'), row: q('.row'), dockbar: q('.dockbar'), spinEl: q('.spin'), bExt: q('.b-ext'), big: q('.big'), ccEl: q('.cc'), toastEl: q('.toast'),
        seekBar: q('.seek'), bufEl: q('.buf'), played: q('.played'), marks: q('.marks'), spanEl: q('.span'), knob: q('.knob'), tipEl: q('.tip'), tipT: q('.tipt'), thumbEl: q('.thumb'), hotsEl: q('.hots'), bTh: q('.b-th'), dimEl: q('.dim'), plEl: q('.pl'), plList: q('.pl-list'),
        bShare: q('.b-share'), shareWrap: q('.sharewrap'), sharePanel: q('.share'),
        bPlay: q('.b-play'), bMute: q('.b-mute'), vol: q('.vol'), cur: q('.cur'), durEl: q('.dur'),
        bRate: q('.rate'), rateWrap: q('.ratewrap'), rMenu: q('.rmenu'), bCc: q('.b-cc'), ccWrap: q('.ccwrap'), ccMenu: q('.ccmenu'), bAd: q('.b-ad'), endEl: q('.endcard'), bTx: q('.b-tx'), bPip: q('.b-pip'), bDl: q('.b-dl'), bFs: q('.b-fs'),
        tx: q('.tx'), search: q('.search'), count: q('.count'), sPrev: q('.s-prev'), sNext: q('.s-next'),
        list: q('.list'), srEl: q('.sr'), bBack: q('.d-back'), bClose: q('.d-close'), docked: false,
        fx: new FX(q('.fx')),
        shapes: (ICONS[o.icons] || ICONS.classic).fx || ['star'],
        capCues: [], txCues: [], chapCues: [], descCues: [], thumbCues: [], hotCues: [], pl: [], plI: 0, capTracks: [], ccLang: -1, rows: [], hits: [], hitPos: -1,
        _ti: -1, _ci: null, _hc: null, _marked: [], _lastQ: ''
      });
      this.rf.setAttribute('aria-label', `${o.label} video player`);
      this.rf.classList.add(o.loader === 'fish' ? 'fishload' : 'ring');
      this.ltxt = q('.ltxt');
      this._mascot(this.big, o.playImage, 'pimg');
      this._mascot(q('.orbit'), o.loaderImage, 'limg');
      try { this._key = 'reelfishy:' + new URL(o.src, location.href).href; } catch (e) { this._key = 'reelfishy:' + o.src; }

      this._setMedia(o.src, o.lazy);
      const backLabel = this._carried ? 'Back to the page this video is on' : 'Scroll back to the video';
      this.bBack.setAttribute('aria-label', backLabel);
      this.bBack.title = backLabel;
      if (this._carried) {
        this.rf.classList.add('docked', 'carried');
        this.rf.classList.toggle('dock-left', o.dock === 'left');
        this.docked = true;
      }

      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this._sparkle();
      if (this.reduced.addEventListener) this.reduced.addEventListener('change', () => this._sparkle());

      this._wire();
      this._ro = new ResizeObserver(entries => {
        for (const en of entries) {
          if (en.target === this.seekBar) { this._sw = en.contentRect.width; this._pf = null; this._paint(); continue; }
          this._layout();
          this.rf.classList.toggle('narrow', (this._ar <= 1 ? Math.min(this._pw, this.rf.clientWidth) : this.rf.clientWidth) < 480);
          this.fx.size(this.rf.clientWidth, this.rf.clientHeight);
        }
      });
      this._onFs = () => {
        const fs = this.shadowRoot.fullscreenElement === this.rf || document.webkitFullscreenElement === this;
        this._icon(this.bFs, fs ? 'fsx' : 'fs', fs ? 'Exit fullscreen' : 'Fullscreen', 'F');
      };
      this._io = new IntersectionObserver(([en]) => { this._inView = en.isIntersecting; this._dockCheck(); }, { threshold: 0 });
      // another player started: pause, and get out of its way
      this._onHash = () => this._checkHash();
      this._onResize = () => { if (this._ar <= 1 || this._th) this._layout(); };
      this._thKey = e => { if (e.key === 'Escape' && this._th && !e.defaultPrevented) { e.preventDefault(); this.theater(false); } };
      this._onOther = e => {
        const p = e.detail && e.detail.player;
        if (!p || p === this) return;
        if (!this.v.paused) this.v.pause();
        if (this._carried) { clearCarry(); this.remove(); }
        else if (this.docked) this._dock(false);
      };
      this._onHide = () => {
        if (this.o.carry && DEFAULTS.carry && !this.v.paused && !this.v.ended && this.dur && this._dockFits()) this._carryOut();
        this._save();
      };
      this._listen(true);

      this.bTh.hidden = !this.o.theater || this._carried;
      this._plInit();
      this._dlLink();
      this._setSpan(null, true);
      this._buildShare();
      this._tracks(true);
      if (this._carried && this._emb) { this._restored = true; this._carryIn(); }
      this._checkHash();
      if (this._emb && !this._carried && !this._blocked && !this._askFirst() && !o.lazy) this._bootEmbed(false);
    }

    // what plays: a <video>, or a YouTube / Vimeo player that waits behind a privacy screen
    _setMedia(src, lazy) {
      const o = this.o, info = embedOf(src), old = this.v;
      if (old) {
        if (old.destroy) old.destroy();
        else { old.pause(); old.removeAttribute('src'); old.load(); }
      }
      this.stage.querySelectorAll('video, .emb').forEach(n => n.remove());
      if (this._pv) { this._pv.removeAttribute('src'); this._pv = null; }
      this._hoverKill(); this._src = src; this._fd = 0; this._fdDone = false;
      this._glowBad = false; clearInterval(this._gt);
      this._emb = info;
      this._blocked = !!info && (DEFAULTS[info.kind] === false || !!info.short);
      this._remBox = null;
      this.rf.classList.toggle('embed', !!info);
      this.rf.classList.remove('live', 'loading', 'playing');
      this._place(!!info);
      this.bExt.hidden = !info;
      this.bPip.hidden = !!info || !(o.pip && document.pictureInPictureEnabled);
      let v;
      if (info) {
        this.bExt.href = info.watch;
        this.bExt.setAttribute('aria-label', `Watch on ${info.name} (opens a new tab)`);
        this.bExt.title = `Watch on ${info.name}`;
        const box = el('div', 'emb');
        this.stage.prepend(box);
        v = new Embed(box, info, `${o.label} (${info.name})`);
        this._lazy = false;
        this._screen(box, info);
      } else {
        v = el('video');
        v.preload = 'metadata';
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        if (o.poster) v.poster = o.poster;
        this.stage.prepend(v);
        this._lazy = !!lazy && !!src;
        if (src && !this._lazy) v.src = src;
      }
      if (old) { v.volume = old.volume; v.muted = old.muted; }
      this.v = v;
      this.big.hidden = this._blocked;
      this._wireMedia();
      if (this.bRate) { this._rateUi(); this._volUi(); }
      this.rf.dataset.source = info ? info.kind : 'file';
      this._frameUi();
      this._shape();
    }
    // the player's shape: the aspect setting, else 9:16 for Shorts and TikTok, else the file's own shape, else 16:9
    _shape() {
      const v = this.v, set = parseAspect(this.o.aspect);
      let r = set;
      if (!(r > 0)) r = this._emb && this._emb.tall ? 9 / 16 : (v && v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9);
      this._ar = r;
      this.rf.style.setProperty('--rf-ar', String(Math.round(r * 10000) / 10000));
      this._layout();
    }
    // portrait and square videos get a phone-shaped column, with the transcript beside it when there's room
    _layout() {
      const r = this._ar || 16 / 9, tall = r <= 1, rf = this.rf;
      rf.classList.toggle('portrait', tall);
      if (this._th) { this._thSize(); return; }
      if (tall) {
        this._pw = Math.round(Math.min(420, Math.min(innerHeight * 0.8, 720) * r));
        rf.style.setProperty('--rf-pw', this._pw + 'px');
        const txw = parseFloat(getComputedStyle(this).getPropertyValue('--rf-tx-width')) || 340;
        rf.classList.toggle('wide', (this.clientWidth || 0) >= this._pw + txw);
      } else rf.classList.toggle('wide', rf.clientWidth >= 760);
    }
    // their player keeps its minimum size when docked: 360px wide for 16:9, 225 x 400 for portrait
    _dockFits() { return !this._emb || ((this._ar || 16 / 9) <= 1 ? innerHeight >= 540 : innerWidth >= 388); }
    // nothing of ours may sit on top of their player: captions, notices and the mini player buttons go below it
    _place(embed) {
      if (embed) { this.under.append(this.ccEl, this.hotsEl, this.toastEl, this.endEl); this.row.append(this.dockbar); }
      else { this.stage.insertBefore(this.ccEl, this.spinEl); this.stage.append(this.hotsEl, this.toastEl, this.endEl, this.dockbar); }
    }
    _askFirst() { return !!this._emb && DEFAULTS.privacy && !consented(this._emb.kind); }
    // the privacy screen (or "turned off" notice) shown before anything loads from YouTube or Vimeo
    _screen(box, info) {
      const o = this.o, d = DEFAULTS, s = el('div', 'consent'), name = info.name;
      const link = (txt, href) => { const a = el('a', '', txt); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
      const pic = o.poster || (info.kind === 'youtube' && d.privacyThumbs ? `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg` : '');
      if (pic) { const im = el('img', 'c-img'); im.alt = ''; im.decoding = 'async'; im.src = pic; s.append(im); }
      s.append(el('span', 'c-name', name));
      if (info.short) {
        const p = el('p', 'c-txt', 'This is a short TikTok link, which can\'t be played here. Use the full link, like tiktok.com/@name/video/123…, or open it: ');
        p.append(link(`Watch on ${name}`, info.watch));
        s.classList.add('off');
        s.append(p);
      } else if (this._blocked) {
        const p = el('p', 'c-txt', `${name} videos are turned off on this site. `);
        p.append(link(`Watch on ${name}`, info.watch));
        s.classList.add('off');
        s.append(p);
      } else if (this._askFirst()) {
        const txt = String(d.privacyText || 'This video is on {service}. Pressing play loads it from {service}, which may set cookies and collect data.').replace(/\{service\}/g, name);
        const p = el('p', 'c-txt', txt + ' ');
        p.append(link(`${name}'s privacy policy`, PRIVACY[info.kind]));
        s.append(p);
        if (d.privacyRemember) {
          const lab = el('label', 'c-rem'), chk = el('input');
          chk.type = 'checkbox';
          lab.append(chk, `Always load ${name} videos on this site`);
          s.append(lab);
          this._remBox = chk;
        }
      }
      box.append(s);
    }
    _bootEmbed(play) {
      const v = this.v;
      if (!this._emb || this._blocked || v.booted) return;
      if (this._remBox && this._remBox.checked) { try { localStorage.setItem(okKey(this._emb.kind), '1'); } catch (e) { /* storage blocked */ } }
      if (!this._restored) this._firstPos();
      this.rf.classList.add('live');
      v.boot(play);
    }

    // captions, transcript and chapters for the current video
    _tracks(first) {
      const o = this.o, n = (this._tn = (this._tn || 0) + 1);
      const pref = ccPrefs(), car = this._carried && this._carry ? this._carry : {};
      this.capTracks = parseTracks(o.captions);
      this.ccLang = bestTrack(this.capTracks, car.ccLang || pref.lang);
      this.descTracks = parseTracks(o.descriptions);
      const cap = this.capTracks[this.ccLang], desc = this.descTracks[bestTrack(this.descTracks, cap && cap.lang)];
      this._descLang = desc ? desc.lang : '';
      return Promise.all([loadVTT(cap ? cap.url : ''), loadVTT(o.transcript ? (parseTracks(o.transcript)[0] || {}).url : (cap ? cap.url : '')), loadVTT(o.chapters), loadVTT(desc ? desc.url : ''), loadVTT(o.thumbs), loadVTT(o.hotspots)]).then(([capC, tx, ch, ds, th, hs]) => {
        if (n !== this._tn) return; // a newer load() won
        const cap = capC;
        this.capCues = cap;
        this.chapCues = ch;
        this.descCues = ds;
        this._thumbsIn(th);
        this._hotsIn(hs);
        this.ccWrap.hidden = !cap.length;
        this._ccMenuBuild();
        if (!cap.length && this.ccOn) this._setCc(false);
        if (first && (o.ccOn || car.cc) && cap.length) this._setCc(true);
        this.bAd.hidden = !ds.length || !('speechSynthesis' in window);
        if (this.bAd.hidden && this.adOn) this._setAd(false);
        if (first && !this.bAd.hidden && (car.ad != null ? car.ad : (pref.ad != null ? pref.ad : o.adOn))) this._setAd(true, true);
        this._buildTx(tx);
        this._marks();
        this._cues();
        this._emit('ready');
      });
    }

    _dlLink() {
      const u = this.o.transcriptFile;
      const ok = u && !/^\s*(javascript|vbscript|data):/i.test(u);
      this.bDl.hidden = !ok;
      if (ok) this.bDl.href = u; else this.bDl.removeAttribute('href');
    }

    // tell the page (and any future playlist / search component) what happened
    _emit(type, extra) {
      this.dispatchEvent(new CustomEvent(`reelfishy:${type}`, {
        bubbles: true,
        composed: true,
        detail: Object.assign({ player: this, id: this.o.id, src: this.o.src, source: this._emb ? this._emb.kind : 'file', time: this.v ? this.v.currentTime : 0 }, extra || {}),
      }));
    }

    disconnectedCallback() { this._listen(false); this._loop(false); this._save(); }

    _listen(on) {
      const m = on ? 'addEventListener' : 'removeEventListener';
      document[m]('fullscreenchange', this._onFs);
      document[m]('webkitfullscreenchange', this._onFs);
      window[m]('pagehide', this._onHide);
      window[m]('hashchange', this._onHash);
      document[m]('reelfishy:play', this._onOther);
      window[m]('resize', this._onResize);
      if (on) { this._ro.observe(this); this._ro.observe(this.rf); this._ro.observe(this.seekBar); this._io.observe(this); }
      else { this._ro.disconnect(); this._io.disconnect(); }
    }

    // media events: the same for a <video> and for a YouTube / Vimeo player
    _wireMedia() {
      const v = this.v, on = (ev, fn) => v.addEventListener(ev, e => { if (this.v === v) fn(e); });
      on('play', () => {
        this._played = true; this._hoverKill();
        this._endCard(false);
        this._glow(true);
        this.rf.classList.add('playing'); this._icon(this.bPlay, 'pause', 'Pause', 'K'); this._loop(true);
        if (this._sticky) { this._sticky = false; this.toastEl.classList.remove('show'); }
        this._emit('play');
        this._dockCheck();
      });
      on('playing', () => this._measureFrame());
      on('pause', () => { if (!this._adHold) this._adStop(); this._glow(false); this._emit('pause'); this.rf.classList.remove('playing'); this._icon(this.bPlay, 'play', 'Play', 'K'); this._loop(false); this._paint(); this._save(); });
      on('ended', () => {
        if (this.o.confetti && this.sparkleOn && !this._emb && !this.span.loop) this._confetti(); else this._fx(null, 'end');
        this._emit('ended');
        if (this.span.loop) { this._seekTo(this.span.start); const pr = v.play(); if (pr) pr.catch(() => {}); return; }
        this._forget(); if (this._carried) clearCarry();
        this._endCard(true);
      });
      on('seeked', () => this._emit('seeked'));
      on('enterpictureinpicture', () => { if (this.docked && !this._carried) this._dock(false); });
      on('loadedmetadata', () => { if (!this._emb && !(parseAspect(this.o.aspect) > 0)) this._shape(); this._meta(); });
      on('durationchange', () => this._meta());
      on('timeupdate', () => {
        this._spanTick();
        this._adTick();
        this._hotTick();
        this._endLeadTick();
        if (!this._raf) this._paint();
        this._cues(); this._aria();
        const n = Date.now();
        if (n - (this._ls || 0) > 5000) { this._ls = n; this._save(); }
      });
      on('progress', () => this._buf());
      ['loadstart', 'waiting', 'seeking'].forEach(ev => on(ev, () => this._busy(true)));
      on('seeking', () => { this._adStop(); this._adI = lastStart(this.descCues, v.currentTime); this._endCard(false); });
      ['playing', 'canplay', 'canplaythrough', 'seeked', 'pause', 'error', 'emptied'].forEach(ev => on(ev, () => this._busy(false)));
      on('loadedmetadata', () => { if (v.paused) this._busy(false); });
      on('ratechange', () => this._rateUi());
      on('volumechange', () => this._volUi());
      on('error', () => {
        const e = this._emb;
        if (e) this._toast(v.errorMessage || "Couldn't load this video.", `Watch on ${e.name}`, () => window.open(e.watch, '_blank', 'noopener'));
        else this._toast("Couldn't load this video.");
      });
      on('rf-note', () => this._toast(v.note));
    }
    _rateUi() {
      const r = this.v.playbackRate;
      this.bRate.textContent = `${r}×`;
      this.bRate.setAttribute('aria-label', `Playback speed ${r}x`);
      this.rMenu.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', +b.dataset.r === r));
    }

    _wire() {
      const on = (t, ev, fn, opt) => t.addEventListener(ev, fn, opt);

      on(this.big, 'click', e => { e.stopPropagation(); this.toggle(e); });
      on(this.stage, 'pointerenter', e => { if (e.pointerType === 'mouse') this._hover(true); });
      on(this.stage, 'pointerleave', e => { if (e.pointerType === 'mouse') this._hover(false); });
      on(this.stage, 'click', e => { if (!e.target.closest('.toast, .c-rem, .c-txt a, .endcard')) this.toggle(e); });
      on(this.stage, 'dblclick', e => { if (!e.target.closest('.toast, .big, .consent, .endcard')) this.fullscreen(); });
      on(this.bPlay, 'click', e => this.toggle(e));
      on(this.bMute, 'click', () => this.mute());
      on(this.vol, 'input', () => { this.v.volume = +this.vol.value; this.v.muted = +this.vol.value === 0; });
      // share panel
      on(this.bShare, 'click', () => this._sharePanel(this.sharePanel.hidden));
      on(this.rf, 'pointerdown', e => { if (!this.sharePanel.hidden && !this.shareWrap.contains(e.target)) this._sharePanel(false); });

      // speed: tap cycles, long-press / right-click / arrow keys open the picker
      this.rMenu.append(...this.o.speeds.map(r => {
        const b = el('button', '', `${r}×`);
        b.type = 'button'; b.dataset.r = r;
        b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', r === 1);
        return b;
      }));
      on(this.bRate, 'pointerdown', e => {
        if (e.button) return;
        this._lp = false; clearTimeout(this._lpt);
        this._lpt = setTimeout(() => { this._lp = true; this._menu(true); }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => on(this.bRate, ev, () => clearTimeout(this._lpt)));
      on(this.bRate, 'click', e => {
        if (this._lp) { this._lp = false; e.preventDefault(); return; }
        if (!this.rMenu.hidden) { this._menu(false); return; }
        this._rate();
      });
      on(this.bRate, 'contextmenu', e => { e.preventDefault(); clearTimeout(this._lpt); this._lp = true; this._menu(true); });
      on(this.bRate, 'keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this._menu(true); }
      });
      on(this.rMenu, 'click', e => {
        const b = e.target.closest('button'); if (!b) return;
        e.stopPropagation();
        this._setRate(+b.dataset.r); this._menu(false, true);
      });
      on(this.rMenu, 'keydown', e => {
        const items = [...this.rMenu.querySelectorAll('button')], i = items.indexOf(e.target);
        const go = n => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
        if (e.key === 'ArrowDown') go(i + 1);
        else if (e.key === 'ArrowUp') go(i - 1);
        else if (e.key === 'Home') go(0);
        else if (e.key === 'End') go(items.length - 1);
        else if (e.key === 'Escape') { e.preventDefault(); this._menu(false, true); }
        else if (e.key === 'Tab') this._menu(false);
      });
      on(this.rateWrap, 'focusout', e => { if (!this.rateWrap.contains(e.relatedTarget)) this._menu(false); });
      on(this.rf, 'pointerdown', e => { if (!this.rMenu.hidden && !this.rateWrap.contains(e.target)) this._menu(false); });
      // captions: tap toggles; long-press / right-click / arrow keys open languages and style
      on(this.bCc, 'pointerdown', e => {
        if (e.button) return;
        this._clp = false; clearTimeout(this._clpt);
        this._clpt = setTimeout(() => { this._clp = true; this._ccMenu(true); }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => on(this.bCc, ev, () => clearTimeout(this._clpt)));
      on(this.bCc, 'click', e => {
        if (this._clp) { this._clp = false; e.preventDefault(); return; }
        if (!this.ccMenu.hidden) { this._ccMenu(false); return; }
        this._setCc(!this.ccOn);
      });
      on(this.bCc, 'contextmenu', e => { e.preventDefault(); clearTimeout(this._clpt); this._clp = true; this._ccMenu(true); });
      on(this.bCc, 'keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this._ccMenu(true); } });
      on(this.ccMenu, 'click', e => {
        const b = e.target.closest('button'); if (!b) return;
        e.stopPropagation();
        const [kind, val] = b.dataset.k.split(':');
        if (kind === 'lang') { if (val === 'off') this._setCc(false); else { this._setLang(+val); if (!this.ccOn) this._setCc(true); } }
        else if (kind === 'size') this._ccStyle({ size: val });
        else if (kind === 'bg') this._ccStyle({ bg: val });
        this._ccMenuSync();
      });
      on(this.ccMenu, 'keydown', e => {
        const items = [...this.ccMenu.querySelectorAll('button')], i = items.indexOf(e.target);
        const go = n => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
        if (e.key === 'ArrowDown') go(i + 1);
        else if (e.key === 'ArrowUp') go(i - 1);
        else if (e.key === 'Home') go(0);
        else if (e.key === 'End') go(items.length - 1);
        else if (e.key === 'Escape') { e.preventDefault(); this._ccMenu(false, true); }
        else if (e.key === 'Tab') this._ccMenu(false);
      });
      on(this.ccWrap, 'focusout', e => { if (!this.ccWrap.contains(e.relatedTarget)) this._ccMenu(false); });
      on(this.rf, 'pointerdown', e => { if (!this.ccMenu.hidden && !this.ccWrap.contains(e.target)) this._ccMenu(false); });
      on(this.bAd, 'click', () => this._setAd(!this.adOn));
      on(this.bTx, 'click', () => this._setTx(!this.txOn));
      on(this.bPip, 'click', () => this.pip());
      on(this.bFs, 'click', () => this.fullscreen());
      on(this.bTh, 'click', () => this.theater());
      on(this.dimEl, 'click', () => this.theater(false));
      on(this.plEl.querySelector('.pl-head'), 'click', () => this._plFold());
      on(this.plList, 'click', e => { const b = e.target.closest('.pl-item'); if (b) this._plGo(+b.dataset.i, true); });
      on(this.hotsEl, 'click', e => {
        const h = e.target.closest('.hot'); if (!h) return;
        e.stopPropagation();
        const c = this.hotCues[+h.dataset.i];
        this._emit('hotspot', { hotspot: c });
        if (c && c.seek != null) { e.preventDefault(); this._seekTo(c.seek); }
      });
      on(this.bClose, 'click', e => { e.stopPropagation(); this.closeMini(); });
      on(this.bBack, 'click', e => { e.stopPropagation(); this.backToVideo(); });

      // seek bar
      const ratio = e => { const b = this.seekBar.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)); };
      on(this.seekBar, 'pointerdown', e => { if (!this.dur) return; this._drag = true; this.seekBar.setPointerCapture(e.pointerId); this._seekTo(ratio(e) * this.dur); });
      on(this.seekBar, 'pointermove', e => { const r = ratio(e), t = r * this.dur; this._tip(t, r, e.pointerType); if (this._drag) this._seekTo(t); });
      on(this.seekBar, 'pointerup', () => { this._drag = false; });
      on(this.seekBar, 'pointercancel', () => { this._drag = false; });

      // transcript
      on(this.list, 'click', e => {
        const lk = e.target.closest('.cue-link');
        if (lk) { const c = this.txCues[+lk.dataset.i]; if (c) this._copyLink({ start: c.start }, `Link to ${fmt(c.start)} copied.`); return; }
        const b = e.target.closest('.cue'); if (!b) return;
        const i = +b.dataset.i;
        const fromSearch = this.list.classList.contains('searching') && b.classList.contains('hit');
        if (fromSearch) this.hitPos = this.hits.indexOf(i);
        this._jump(i, fromSearch);
      });
      ['wheel', 'touchstart', 'pointerdown'].forEach(ev => on(this.list, ev, () => { this._hold = Date.now() + 4000; }, { passive: true }));
      on(this.search, 'input', () => { clearTimeout(this._st); this._st = setTimeout(() => this._search(this.search.value), 150); });
      on(this.sPrev, 'click', () => this._hop(-1));
      on(this.sNext, 'click', () => this._hop(1));

      // keyboard (scoped to this player, never global)
      on(this.rf, 'keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target, k = e.key;
        if (t === this.search) {
          if (k === 'Enter') {
            e.preventDefault(); clearTimeout(this._st);
            if (this.search.value !== this._lastQ) this._search(this.search.value);
            this._hop(e.shiftKey ? -1 : 1);
          } else if (k === 'Escape') {
            e.preventDefault();
            if (this.search.value) { this.search.value = ''; this._search(''); } else this.rf.focus();
          }
          return;
        }
        if (this.shareWrap.contains(t)) {
          if (k === 'Escape') { e.preventDefault(); this._sharePanel(false, true); }
          return;
        }
        if (k === 's' || k === 'S') {
          if (t.classList && t.classList.contains('cue')) { const c = this.txCues[+t.dataset.i]; if (c) this._copyLink({ start: c.start }, `Link to ${fmt(c.start)} copied.`); }
          else this._sharePanel(this.sharePanel.hidden);
          e.preventDefault(); return;
        }
        if (k === 'i' || k === 'I') { e.preventDefault(); this._mark('a'); return; }
        if (k === 'o' || k === 'O') { e.preventDefault(); this._mark('b'); return; }
        const onBtn = t.tagName === 'BUTTON', onVol = t === this.vol;
        const inTx = this.tx.contains(t) || this.rateWrap.contains(t) || this.ccWrap.contains(t);
        let done = true;
        switch (k) {
          case ' ': if (onBtn) { done = false; break; } this.toggle(); break;
          case 'k': case 'K': this.toggle(); break;
          case 'j': case 'J': this._skip(-10); break;
          case 'l': case 'L': this._skip(10); break;
          case 'ArrowLeft': if (onVol || inTx) { done = false; break; } this._skip(-5); break;
          case 'ArrowRight': if (onVol || inTx) { done = false; break; } this._skip(5); break;
          case 'ArrowUp': if (onVol || inTx) { done = false; break; } this._volBy(0.05); break;
          case 'ArrowDown': if (onVol || inTx) { done = false; break; } this._volBy(-0.05); break;
          case 'Home': if (inTx) { done = false; break; } this._seekTo(0); break;
          case 'End': if (inTx) { done = false; break; } this._seekTo(this.dur); break;
          case '<': this._rateBy(-1); break;
          case '>': this._rateBy(1); break;
          case 'f': case 'F': this.fullscreen(); break;
          case 'w': case 'W': if (!this.bTh.hidden) this.theater(); else done = false; break;
          case 'Escape': if (this._th) this.theater(false); else done = false; break;
          case 'N': if (e.shiftKey && this.pl.length > 1 && this.plI < this.pl.length - 1) this._plGo(this.plI + 1, true); else done = false; break;
          case 'P': if (e.shiftKey && this.pl.length > 1 && this.plI > 0) this._plGo(this.plI - 1, true); else done = false; break;
          case ',': if (this._frameOk()) this._step(-1); else done = false; break;
          case '.': if (this._frameOk()) this._step(1); else done = false; break;
          case 'm': case 'M': this.mute(); break;
          case 'c': case 'C': if (this.capCues.length) this._setCc(!this.ccOn); else done = false; break;
          case 'd': case 'D': if (!this.bAd.hidden) this._setAd(!this.adOn); else done = false; break;
          case 't': case 'T': if (this.txCues.length) this._setTx(!this.txOn); else done = false; break;
          case '/':
            if (this.txCues.length) { if (!this.txOn) this._setTx(true); this.search.focus(); } else done = false;
            break;
          default:
            if (/^[0-9]$/.test(k) && this.dur && !inTx) this._seekTo(this.dur * (+k) / 10);
            else done = false;
        }
        if (done) e.preventDefault();
      });
    }

    /* ----- public API ----- */
    get video() { return this.v; }
    get dur() { const d = this.v.duration; return isFinite(d) ? d : 0; }
    // a YouTube / Vimeo video still behind its privacy screen waits for the visitor's own click
    play() {
      if (this._emb && !this.v.booted) {
        if (this._blocked || this._askFirst()) return Promise.resolve(false);
        this._bootEmbed(true);
        return Promise.resolve(true);
      }
      return this.v.play();
    }
    pause() { this.v.pause(); }
    seek(t) { this._seekTo(t); }
    /**
     * Swap to another video in the same player, e.g. for a playlist:
     * player.load({ src, poster, captions, descriptions, chapters, transcript, thumbnails, hotspots, 'transcript-file', label, 'video-id', start, end, loop, aspect, autoplay })
     * Anything left out is cleared. Look and behavior settings stay as they are.
     */
    load(opts = {}) {
      const o = this.o;
      const map = { src: 'src', poster: 'poster', captions: 'captions', chapters: 'chapters', transcript: 'transcript', descriptions: 'descriptions', thumbnails: 'thumbs', hotspots: 'hotspots', 'transcript-file': 'transcriptFile', label: 'label', 'video-id': 'id' };
      this._save();
      // a fresh video: anything not given is cleared, not carried over from the last one
      Object.entries(map).forEach(([k, key]) => { o[key] = String(opts[k] ?? ''); });
      this._adStop(); this._endCard(false);
      o.start = Math.max(0, parseTime(opts.start) || 0);
      o.aspect = String(opts.aspect || '');
      if (this.docked && !this._carried) this._dock(false);
      this.rf.setAttribute('aria-label', `${o.label || 'Video'} video player`);
      try { this._key = 'reelfishy:' + new URL(o.src, location.href).href; } catch (e) { this._key = 'reelfishy:' + o.src; }
      this._restored = false;
      this._lazy = false; this._shared = null; this._pendingT = undefined;
      o.end = 'end' in opts ? parseTime(opts.end) : null;
      o.loop = 'loop' in opts ? (typeof opts.loop === 'string' ? !/^(false|off|0|no)$/i.test(opts.loop) : !!opts.loop) : o.loop;
      if (!(o.end > o.start)) o.end = null;
      this._setSpan(null, true);
      this._setMedia(o.src || '', false);
      const v = this.v;
      this._paint();
      this._dlLink();
      const done = this._tracks(false);
      if (this._emb) {
        if (opts.autoplay) this.play();
        else if (!this._blocked && !this._askFirst()) this._bootEmbed(false);
      } else if (opts.autoplay) {
        const go = () => { const pr = v.play(); if (pr) pr.catch(() => {}); };
        if (v.readyState >= 2) go(); else v.addEventListener('canplay', go, { once: true });
      }
      return done;
    }
    closeMini() {
      this.v.pause();
      if (this._carried) { clearCarry(); this.remove(); return; }
      this._dismiss = true;
      this._dock(false);
    }
    backToVideo() {
      if (this._carried) { location.href = this._from; return; }
      this.scrollIntoView({ behavior: this.reduced.matches ? 'auto' : 'smooth', block: 'center' });
      this.rf.focus({ preventScroll: true });
    }

    toggle(e) {
      const v = this.v;
      if (this._emb) {
        if (this._blocked) return;
        if (!v.booted) { this._bootEmbed(true); return; }
      }
      if (this._lazy) this._activate();
      if (!v.currentSrc && !v.src) return;
      if (v.paused || v.ended) {
        // pressing play after a clip stopped at its end starts the clip again
        if (this._atEnd && this.span.end != null && Math.abs(v.currentTime - this.span.end) < 0.75) this._seekTo(this.span.start);
        this._atEnd = false;
        const p = v.play();
        if (p) p.catch(err => console.warn('[Reel Fishy]', err));
        this._fx(e, 'play');
      } else { v.pause(); this._fx(e, 'pause'); }
    }
    mute() {
      const v = this.v;
      if (v.muted || v.volume === 0) { v.muted = false; if (!v.volume) v.volume = 0.5; } else v.muted = true;
    }
    fullscreen() {
      const rf = this.rf, d = document;
      if (this.shadowRoot.fullscreenElement || d.webkitFullscreenElement) {
        const x = (d.exitFullscreen || d.webkitExitFullscreen).call(d);
        if (x && x.catch) x.catch(() => {});
        return;
      }
      const ios = () => { if (this.v.webkitEnterFullscreen) this.v.webkitEnterFullscreen(); };
      if (rf.requestFullscreen) rf.requestFullscreen().catch(ios);
      else if (rf.webkitRequestFullscreen) rf.webkitRequestFullscreen();
      else ios();
    }
    async pip() {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await this.v.requestPictureInPicture();
      } catch (e) { console.warn('[Reel Fishy]', e); }
    }

    /* ----- internals ----- */
    _icon(btn, name, label, key) {
      btn.innerHTML = svg(this.o.icons, name);
      btn.setAttribute('aria-label', label);
      btn.title = key ? `${label} (${key})` : label;
    }
    _say(m) { this.srEl.textContent = m; }
    // swap the wrasse for the site's own image; put the wrasse back if it won't load
    _mascot(box, url, cls) {
      if (!url) return;
      const keep = [...box.childNodes], im = el('img', cls);
      im.alt = ''; im.decoding = 'async'; im.draggable = false;
      im.addEventListener('error', () => box.replaceChildren(...keep), { once: true });
      im.src = url;
      box.replaceChildren(im);
    }
    // loading screen: only after a short wait, so quick loads never flash it
    _busy(on) {
      clearTimeout(this._bt);
      if (!on) { this.rf.classList.remove('loading'); this.rf.removeAttribute('aria-busy'); return; }
      if (this.rf.classList.contains('loading')) return;
      this._bt = setTimeout(() => {
        this.ltxt.textContent = LOAD_LINES[(Math.random() * LOAD_LINES.length) | 0];
        this.rf.classList.add('loading');
        this.rf.setAttribute('aria-busy', 'true');
      }, 350);
    }
    _sparkle() { this.sparkleOn = this.o.sparkles && !this.reduced.matches; this.rf.classList.toggle('sparkle', this.sparkleOn); }

    _seekTo(t) {
      if (this._lazy || (!this.dur && this.v.readyState < 1 && this._pendingT !== undefined)) { this._pendingT = t; this._activate(); return; }
      const d = this.dur;
      this.v.currentTime = d ? Math.min(d, Math.max(0, t)) : Math.max(0, t);
      this._paint();
    }
    _skip(s) { this._seekTo(this.v.currentTime + s); this._say(`${s > 0 ? 'Forward' : 'Back'} ${Math.abs(s)} seconds`); }
    _volBy(d) {
      const v = this.v;
      v.muted = false; v.volume = Math.min(1, Math.max(0, v.volume + d));
      this._say(`Volume ${Math.round(v.volume * 100)}%`);
    }
    _volUi() {
      if (this._ducked) return;
      const m = this.v.muted || this.v.volume === 0;
      this._icon(this.bMute, m ? 'mute' : 'vol', m ? 'Unmute' : 'Mute', 'M');
      this.vol.value = m ? 0 : this.v.volume;
    }
    _rate() {
      const s = this.o.speeds, i = s.indexOf(this.v.playbackRate);
      this._setRate(s[(i + 1) % s.length]);
    }
    _rateBy(d) {
      const s = this.o.speeds, i = s.indexOf(this.v.playbackRate);
      const n = Math.min(s.length - 1, Math.max(0, (i < 0 ? s.indexOf(1) : i) + d));
      this._setRate(s[n]);
    }
    _setRate(r) { this.v.playbackRate = r; this._say(`Speed ${r}x`); }
    _menu(open, refocus) {
      this.rMenu.hidden = !open;
      this.bRate.setAttribute('aria-expanded', open);
      if (open) {
        const cur = this.rMenu.querySelector('[aria-checked="true"]') || this.rMenu.querySelector('button');
        requestAnimationFrame(() => cur.focus());
      } else if (refocus) this.bRate.focus();
    }
    _setCc(on) {
      this.ccOn = on; this.bCc.setAttribute('aria-pressed', on);
      this.bCc.title = on ? 'Hide captions (C)' : 'Show captions (C)';
      this._ci = null; this._cues(); this._say(on ? 'Captions on' : 'Captions off');
      if (this.ccMenu) this._ccMenuSync();
    }
    // captions: language, size and background (the visitor's choice is remembered on this site)
    _setLang(i) {
      const t = this.capTracks[i];
      if (!t || i === this.ccLang) return;
      this.ccLang = i;
      ccSave({ lang: t.lang });
      const sep = !!this.o.transcript, n = this._tn;
      Promise.all([loadVTT(t.url), sep ? null : loadVTT(t.url)]).then(([cap]) => {
        if (n !== this._tn) return;
        this.capCues = cap; this._ci = null; this._cues();
        if (!sep) { const q = this.search.value; this._buildTx(cap); this._cues(); if (q) { this.search.value = q; this._search(q); } }
        this._say(`Captions: ${langName(t.lang)}`);
      });
    }
    _ccStyle(patch) {
      ccSave(patch);
      this._ccApply();
    }
    _ccApply() {
      const p = ccPrefs(), size = (CC_SIZES.find(z => z[0] === (p.size || DEFAULTS.captionSize)) || CC_SIZES[1]);
      const bg = (CC_BGS.find(z => z[0] === (p.bg || DEFAULTS.captionBg)) || CC_BGS[0])[0];
      this.rf.style.setProperty('--rf-cc-scale', size[2]);
      CC_BGS.forEach(([b]) => this.rf.classList.toggle('cc-' + b, b === bg));
      return { size: size[0], bg };
    }
    _ccMenuBuild() {
      const M = this.ccMenu, st = this._ccApply();
      const item = (k, label, on) => {
        const b = el('button', '', label);
        b.type = 'button'; b.dataset.k = k;
        b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', !!on);
        return b;
      };
      const head = txt => { const h = el('p', 'mh', txt); h.setAttribute('aria-hidden', 'true'); return h; };
      const nodes = [head('Captions'), item('lang:off', 'Off', !this.ccOn)];
      this.capTracks.forEach((t, i) => nodes.push(item(`lang:${i}`, this.capTracks.length > 1 || t.lang ? langName(t.lang) : 'On', this.ccOn && i === this.ccLang)));
      nodes.push(head('Size'), ...CC_SIZES.map(([k, label]) => item(`size:${k}`, label, st.size === k)));
      nodes.push(head('Background'), ...CC_BGS.map(([k, label]) => item(`bg:${k}`, label, st.bg === k)));
      M.replaceChildren(...nodes);
    }
    // tick the current choices without rebuilding (rebuilding would drop focus and close the menu)
    _ccMenuSync() {
      const st = this._ccApply();
      this.ccMenu.querySelectorAll('button').forEach(b => {
        const [kind, val] = b.dataset.k.split(':');
        const on = kind === 'lang' ? (val === 'off' ? !this.ccOn : this.ccOn && +val === this.ccLang) : (kind === 'size' ? st.size === val : st.bg === val);
        b.setAttribute('aria-checked', on);
      });
    }
    _ccMenu(open, refocus) {
      this.ccMenu.hidden = !open;
      this.bCc.setAttribute('aria-expanded', open);
      if (open) {
        this._ccMenuBuild();
        this.ccMenu.style.maxHeight = Math.max(160, this._emb ? innerHeight - this.bCc.getBoundingClientRect().bottom - 16 : this.stage.clientHeight - 12) + 'px';
        const cur = this.ccMenu.querySelector('[data-k^="lang"][aria-checked="true"]') || this.ccMenu.querySelector('button');
        requestAnimationFrame(() => cur.focus());
      } else if (refocus) this.bCc.focus();
    }

    /* ----- audio description: a descriptions VTT read aloud by the browser's voice ----- */
    _setAd(on, quiet) {
      this.adOn = !!on && !!this.descCues.length && 'speechSynthesis' in window;
      this.bAd.setAttribute('aria-pressed', this.adOn);
      this.bAd.title = this.adOn ? 'Turn off audio description (D)' : 'Audio description (D)';
      if (!this.adOn) this._adStop();
      else this._adI = lastStart(this.descCues, this.v.currentTime || 0);
      if (!quiet) { ccSave({ ad: this.adOn }); this._say(this.adOn ? 'Audio description on' : 'Audio description off'); }
    }
    // speak each description as playback reaches it; if it runs past its slot, pause until it's done
    _adTick() {
      if (!this.adOn) return;
      const v = this.v, t = v.currentTime || 0, c = this.descCues, i = lastStart(c, t);
      if (i !== this._adI) {
        this._adI = i;
        if (i > -1 && !v.paused && t - c[i].start < 1.5) this._speak(c[i]);
      }
      const cue = this._adCue;
      if (cue && this._speaking && !v.paused && t >= cue.end - 0.15) { this._adHold = true; v.pause(); }
    }
    _speak(cue) {
      const ss = window.speechSynthesis, v = this.v;
      ss.cancel();
      const u = new SpeechSynthesisUtterance(cue.plain);
      const lang = this._descLang || document.documentElement.lang || '';
      if (lang) {
        u.lang = lang;
        const voice = ss.getVoices().find(vo => vo.lang && vo.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]));
        if (voice) u.voice = voice;
      }
      // duck: the video drops to a third of its volume while the description speaks (TikTok can only mute, so it doesn't duck)
      if (!this._ducked && !(this._emb && this._emb.kind === 'tiktok')) { this._duckVol = v.volume; this._ducked = true; v.volume = v.volume * 0.35; }
      const done = () => {
        if (this._adU !== u) return;
        this._speaking = false; this._adCue = null; this._adU = null;
        this._unduck();
        if (this._adHold) { this._adHold = false; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      };
      u.onend = done; u.onerror = done;
      this._adU = u; this._adCue = cue; this._speaking = true;
      ss.speak(u);
      this._emit('description', { cue });
    }
    _unduck() {
      if (!this._ducked) return;
      this._ducked = false;
      this.v.volume = this._duckVol;
      this._volUi();
    }
    _adStop() {
      const busy = this._speaking;
      this._adHold = false; this._speaking = false; this._adCue = null; this._adU = null;
      if (busy && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      this._unduck();
    }

    /* ----- end screen: a message, up to two link buttons and Replay ----- */
    _endCfg() {
      const o = this.o, d = DEFAULTS, a = n => this.hasAttribute(n) ? this.getAttribute(n) : null;
      const pick = (attr, def) => { const v = a(attr); return v !== null ? v.trim() : String(def || '').trim(); };
      o.endMsg = pick('end-message', d.endMessage);
      o.endBtns = [[pick('end-button', d.endButton), safeHref(pick('end-url', d.endUrl))], [pick('end-button-2', d.endButton2), safeHref(pick('end-url-2', d.endUrl2))]].filter(([t, u]) => t && u);
    }
    // show the end screen a little before the real end (end-lead seconds), while the video plays on
    _endLeadTick() {
      const o = this.o, v = this.v, d = this.dur, sp = this.span;
      if (!o.endLead || !d || v.paused || !this.endEl.hidden || (sp && (sp.loop || (sp.end != null && sp.end < d - 0.05)))) return;
      const left = d - (v.currentTime || 0);
      if (left <= o.endLead && left > 0.1) this._endCard(true, true);
    }
    _endCard(show, early) {
      const o = this.o, E = this.endEl;
      if (!E) return;
      clearInterval(this._nextT); this._nextT = 0;
      const nx = !early && this.pl.length > 1 && this.plI < this.pl.length - 1 ? this.plI + 1 : -1;
      const cta = o.endOn && !!(o.endMsg || o.endBtns.length);
      if (!show || (!cta && nx < 0)) { E.hidden = true; this.rf.classList.remove('ended'); return; }
      const was = !E.hidden;
      E.querySelector('.ec-msg').textContent = cta ? o.endMsg : '';
      E.querySelector('.ec-msg').hidden = !cta || !o.endMsg;
      const btns = (cta ? o.endBtns : []).map(([t, u], i) => {
        const b = el('a', 'ec-btn' + (i ? '' : ' primary'), t);
        b.href = u;
        if (newTab(u)) { b.target = '_blank'; b.rel = 'noopener'; }
        return b;
      });
      const r = el('button', 'ec-btn ec-replay');
      r.type = 'button';
      r.innerHTML = svg(o.icons, 'replay');
      r.append(' Replay');
      r.addEventListener('click', ev => { ev.stopPropagation(); this._endCard(false); this._seekTo(this.span && this.span.end != null ? this.span.start : 0); const pr = this.v.play(); if (pr && pr.catch) pr.catch(() => {}); });
      E.querySelector('.ec-btns').replaceChildren(...btns, r);
      const old = E.querySelector('.ec-next');
      if (old) old.remove();
      if (nx > -1) E.append(this._upNext(nx));
      E.hidden = false;
      this.rf.classList.add('ended');
      if (!was) this._emit('endscreen', { early: !!early });
    }
    // "Up next" in a playlist: plays the next video after a short countdown, unless cancelled
    _upNext(i) {
      const box = el('div', 'ec-next'), it = this.pl[i];
      const line = el('p', 'ec-up');
      line.append(el('span', 'ec-upl', 'Up next'), ' ', el('strong', '', this._plName(it)));
      const go = el('button', 'ec-btn primary', 'Play now'), stop = el('button', 'ec-btn', 'Cancel'), cnt = el('span', 'ec-cnt');
      go.type = stop.type = 'button';
      let n = 6;
      const tick = () => { n--; cnt.textContent = `in ${n}`; if (n <= 0) { clearInterval(this._nextT); this._plGo(i, true); } };
      tick();
      this._nextT = setInterval(tick, 1000);
      go.addEventListener('click', ev => { ev.stopPropagation(); clearInterval(this._nextT); this._plGo(i, true); });
      stop.addEventListener('click', ev => { ev.stopPropagation(); clearInterval(this._nextT); cnt.remove(); stop.remove(); go.textContent = 'Play next'; });
      line.append(' ', cnt);
      const row = el('div', 'ec-btns');
      row.append(go, stop);
      box.append(line, row);
      return box;
    }

    /* ----- confetti and ambient glow ----- */
    _confetti() {
      const cs = getComputedStyle(this);
      const cols = ['--rf-accent', '--rf-accent-2', '--rf-accent-3', '--rf-accent-4'].map(p => cs.getPropertyValue(p).trim()).filter(Boolean);
      this.fx.shower(150, cols.length ? cols : ['#fff']);
    }
    // a soft glow around the player in the video's own colours (the accent colour for YouTube / Vimeo / TikTok,
    // or when the browser won't let the page read the video's pixels)
    _glow(on) {
      clearInterval(this._gt);
      const rf = this.rf;
      rf.classList.toggle('glow', !!this.o.glow);
      if (!on || !this.o.glow) return;
      if (this._emb || this._glowBad) { rf.style.setProperty('--rf-glow', 'color-mix(in srgb, var(--rf-accent-3) 45%, transparent)'); return; }
      const c = this._gc || (this._gc = document.createElement('canvas'));
      c.width = 8; c.height = 5;
      const g = c.getContext('2d', { willReadFrequently: true });
      const sample = () => {
        const v = this.v;
        if (!v || v.readyState < 2) return;
        try {
          g.drawImage(v, 0, 0, 8, 5);
          const d = g.getImageData(0, 0, 8, 5).data;
          let r = 0, gr = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
          const n = d.length / 4;
          rf.style.setProperty('--rf-glow', `rgba(${(r / n) | 0},${(gr / n) | 0},${(b / n) | 0},.55)`);
        } catch (e) { this._glowBad = true; this._glow(true); }
      };
      sample();
      this._gt = setInterval(sample, 700);
    }

    /* ----- theater mode: the page dims and the player grows ----- */
    theater(on) {
      on = on === undefined ? !this._th : !!on;
      if (on === !!this._th || (on && (this.bTh.hidden || this._carried))) return;
      if (on && this.docked) this._dock(false);
      this._th = on;
      this.style.minHeight = on ? this.offsetHeight + 'px' : '';
      this.dimEl.hidden = !on;
      this.rf.classList.toggle('theater', on);
      document[on ? 'addEventListener' : 'removeEventListener']('keydown', this._thKey);
      this._icon(this.bTh, on ? 'theaterx' : 'theater', on ? 'Exit theater mode' : 'Theater mode', 'W');
      this._layout();
      if (!on) this.rf.focus({ preventScroll: true });
      this._say(on ? 'Theater mode on' : 'Theater mode off');
      this._emit('theater', { on });
    }
    _thSize() {
      const r = this._ar || 16 / 9, rf = this.rf;
      const txw = parseFloat(getComputedStyle(this).getPropertyValue('--rf-tx-width')) || 340;
      const W = innerWidth * 0.94, H = innerHeight * 0.92 - 100;
      let vw = Math.max(200, Math.min(W, H * r));
      const beside = !!this.txOn && W - txw >= Math.min(vw, 360);
      if (beside) vw = Math.min(vw, W - txw);
      rf.classList.toggle('wide', beside);
      rf.style.setProperty('--rf-thw', Math.round(vw + (beside ? txw : 0)) + 'px');
      rf.style.setProperty('--rf-pw', Math.round(vw) + 'px');
    }

    /* ----- hover thumbnails: a thumbnails VTT (sprite) if given, else live frames from a hidden copy ----- */
    _thumbsIn(cues) {
      const base = (() => { try { return new URL(this.o.thumbs, location.href); } catch (e) { return null; } })();
      this.thumbCues = cues.map(c => {
        const m = c.plain.trim().match(/^(.*?)(?:#xywh=(\d+),(\d+),(\d+),(\d+))?$/);
        let url = '';
        try { url = base ? new URL(m[1], base).href : m[1]; } catch (e) { url = ''; }
        return { start: c.start, end: c.end, url, xywh: m[2] ? [+m[2], +m[3], +m[4], +m[5]] : null };
      }).filter(c => c.url && !/^\s*(javascript|vbscript|data):/i.test(c.url));
      if (this._pv) { this._pv.removeAttribute('src'); this._pv = null; }
    }
    _thumb(t, ptr) {
      const box = this.thumbEl, cv = box.querySelector('canvas');
      if (this.thumbCues.length) {
        const c = this.thumbCues[Math.max(0, lastStart(this.thumbCues, t))];
        cv.hidden = true;
        const [x, y, w, h] = c.xywh || [0, 0, 160, Math.round(160 / (this._ar || 16 / 9))];
        Object.assign(box.style, { backgroundImage: `url("${c.url.replace(/"/g, '%22')}")`, backgroundPosition: c.xywh ? `-${x}px -${y}px` : 'center', backgroundSize: c.xywh ? 'auto' : 'cover', height: h + 'px', width: w + 'px' });
        box.hidden = false;
        return;
      }
      // live frames: local files only, mouse only, once the video's details are known
      if (!this.o.previews || this._emb || this._lazy || ptr !== 'mouse' || !this.dur || !this.v.currentSrc) { box.hidden = true; return; }
      const r = this._ar || 16 / 9, w = r >= 1 ? 160 : Math.round(160 * r), h = r >= 1 ? Math.round(160 / r) : 160;
      if (!this._pv) {
        const pv = this._pv = document.createElement('video');
        pv.muted = true; pv.preload = 'auto'; pv.playsInline = true;
        pv.src = this.v.currentSrc;
        pv.addEventListener('seeked', () => {
          if (this._pv !== pv) return;
          cv.width = w; cv.height = h;
          try { cv.getContext('2d').drawImage(pv, 0, 0, w, h); cv.hidden = false; } catch (e) { /* not drawable */ }
          const want = this._pvWant;
          this._pvBusy = false;
          if (want != null && Math.abs(want - pv.currentTime) > 0.4) this._pvSeek(want);
        });
      }
      Object.assign(box.style, { backgroundImage: '', height: h + 'px', width: w + 'px' });
      box.hidden = false;
      this._pvSeek(t);
    }
    _pvSeek(t) {
      const pv = this._pv;
      this._pvWant = t;
      if (!pv || this._pvBusy) return;
      if (pv.readyState < 1) { if (!this._pvWait) { this._pvWait = true; pv.addEventListener('loadedmetadata', () => { this._pvWait = false; this._pvSeek(this._pvWant); }, { once: true }); } return; }
      this._pvBusy = true;
      this._pvWant = null;
      pv.currentTime = Math.max(0, Math.min(t, (pv.duration || t) - 0.05));
    }

    /* ----- timed hotspots: a hotspots VTT whose cues read "Label | link | corner" ----- */
    _hotsIn(cues) {
      this.hotCues = cues.map(c => {
        const [label, link, corner] = c.plain.split('|').map(x => x.trim());
        const tm = /^(?:#?t=|@)(.+)$/i.exec(link || ''), seek = tm ? parseTime(tm[1]) : NaN;
        const pos = { 'top-left': 'tl', tl: 'tl', 'top-right': 'tr', tr: 'tr', 'bottom-left': 'bl', bl: 'bl', 'bottom-right': 'br', br: 'br' }[String(corner || '').toLowerCase()] || 'tr';
        return { start: c.start, end: c.end, label: label || '', link: isNaN(seek) ? safeHref(link) : '', seek: isNaN(seek) ? null : seek, pos };
      }).filter(h => h.label && (h.link || h.seek != null));
      this._hotOn = '';
      this.hotsEl.replaceChildren();
      this._hotTick();
    }
    _hotTick() {
      const t = this.v ? this.v.currentTime || 0 : 0, on = [];
      this.hotCues.forEach((h, i) => { if (t >= h.start && t < h.end) on.push(i); });
      const key = on.join(',');
      if (key === this._hotOn) return;
      this._hotOn = key;
      const stack = {};
      this.hotsEl.replaceChildren(...on.map(i => {
        const h = this.hotCues[i], a = el(h.seek != null ? 'button' : 'a', `hot pos-${h.pos}`, h.label);
        a.dataset.i = i;
        if (h.seek != null) { a.type = 'button'; a.title = `Jump to ${fmt(h.seek)}`; }
        else {
          a.href = h.link;
          if (newTab(h.link)) { a.target = '_blank'; a.rel = 'noopener'; }
        }
        const k = stack[h.pos] = (stack[h.pos] || 0) + 1;
        a.style.setProperty('--n', k - 1);
        return a;
      }));
    }

    /* ----- playlist: one player, a list of videos, and Up next ----- */
    _plInit() {
      let items = [];
      try { items = JSON.parse(this.getAttribute('playlist') || '[]'); } catch (e) { items = []; }
      this.pl = Array.isArray(items) ? items.filter(it => it && typeof it.src === 'string' && it.src) : [];
      this.plI = Math.max(0, Math.min(this.pl.length - 1, parseInt(this.getAttribute('playlist-index'), 10) || 0));
      const P = this.plEl;
      P.hidden = this.pl.length < 2;
      if (P.hidden) return;
      P.querySelector('.pl-title').textContent = this.getAttribute('playlist-title') || 'Playlist';
      this.plList.replaceChildren(...this.pl.map((it, i) => {
        const li = el('li'), b = el('button', 'pl-item');
        b.type = 'button'; b.dataset.i = i;
        const e = embedOf(it.src);
        b.append(el('span', 'pl-n', String(i + 1)), el('span', 'pl-name', this._plName(it)));
        if (e) b.append(el('span', 'pl-src', e.name));
        li.append(b);
        return li;
      }));
      this._plMark();
    }
    _plName(it) {
      if (it.label) return it.label;
      const e = embedOf(it.src);
      if (e) return `${e.name} video`;
      try { return decodeURIComponent(new URL(it.src, location.href).pathname.split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')) || 'Video'; } catch (x) { return 'Video'; }
    }
    _plMark() {
      this.plList.querySelectorAll('.pl-item').forEach((b, i) => { if (i === this.plI) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      this.plEl.querySelector('.pl-count').textContent = `${this.plI + 1} / ${this.pl.length}`;
    }
    _plGo(i, autoplay) {
      const it = this.pl[i];
      if (!it) return;
      this.plI = i;
      this._plMark();
      this.load(Object.assign({}, it, { autoplay: !!autoplay }));
      this._emit('playlistchange', { index: i, item: Object.assign({}, it) });
      this._say(`Playing ${i + 1} of ${this.pl.length}: ${this._plName(it)}`);
    }
    _plFold() {
      const h = this.plEl.querySelector('.pl-head'), open = h.getAttribute('aria-expanded') !== 'true';
      h.setAttribute('aria-expanded', open);
      this.plList.hidden = !open;
    }

    _setTx(on) {
      this.txOn = on; this.rf.classList.toggle('tx-open', on); this.bTx.setAttribute('aria-pressed', on);
      this.bTx.title = on ? 'Hide transcript (T)' : 'Show transcript (T)';
      if (this._th) this._thSize();
      if (on && this._ti > -1) { this._hold = 0; requestAnimationFrame(() => this._scrollTo(this._ti)); }
    }

    _loop(run) {
      cancelAnimationFrame(this._raf); this._raf = 0;
      if (run) { const f = () => { this._spanTick(); this._paint(); this._raf = requestAnimationFrame(f); }; this._raf = requestAnimationFrame(f); }
    }
    _paint() {
      const d = this.dur, t = this.v.currentTime || 0, f = d ? Math.min(1, t / d) : 0;
      if (f !== this._pf) {
        this._pf = f;
        this.played.style.transform = `scaleX(${f})`;
        this.knob.style.transform = `translateX(${f * (this._sw || this.seekBar.clientWidth)}px)`;
      }
      const s = Math.floor(t);
      if (s !== this._ps) { this._ps = s; this.cur.textContent = fmt(t); }
    }
    _aria() {
      const t = this.v.currentTime || 0;
      this.seekBar.setAttribute('aria-valuenow', Math.floor(t));
      this.seekBar.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(this.dur)}`);
    }
    _buf() {
      const b = this.v.buffered, d = this.dur;
      if (!d || !b.length) return;
      let e = 0;
      for (let i = 0; i < b.length; i++) if (b.start(i) <= this.v.currentTime + 0.5) e = b.end(i);
      this.bufEl.style.width = (e / d * 100) + '%';
    }
    _meta() {
      const d = this.dur;
      this.durEl.textContent = fmt(d);
      this.seekBar.setAttribute('aria-valuemax', Math.floor(d));
      this._marks(); this._buf(); this._aria();
      this._spanUi();
      if (!this._restored && d && this.v.readyState >= 1) this._firstPos();
    }
    // where a video starts: carried over, a shared link, resume, or the tag's start time
    _firstPos() {
      this._restored = true;
      const pend = this._pendingT, d = this.dur, st = this.o.start;
      this._pendingT = undefined;
      if (this._carried) this._carryIn();
      else if (this._shared) this._applyShared();
      else if (pend !== undefined && pend !== null) this._seekTo(pend);
      else if (!this._restore() && st > 0 && (!d || st < d) && Math.abs((this.v.currentTime || 0) - st) > 1) this._seekTo(st);
    }
    _marks() {
      const d = this.dur;
      if (!d || !this.chapCues.length) return;
      this.marks.replaceChildren(...this.chapCues.filter(c => c.start > 0 && c.start < d).map(c => {
        const m = el('span', 'mark'); m.style.left = (c.start / d * 100) + '%'; return m;
      }));
    }
    _tip(t, r, ptr) {
      const ch = this.chapCues.length ? this.chapCues[lastStart(this.chapCues, t)] : null;
      this.tipT.textContent = fmt(t) + (ch ? ' · ' + ch.plain : '');
      this._thumb(t, ptr);
      const W = this.seekBar.clientWidth, w = this.tipEl.offsetWidth;
      this.tipEl.style.left = (w ? Math.min(W - w / 2, Math.max(w / 2, r * W)) : r * W) + 'px';
    }

    _cues() {
      const t = this.v.currentTime || 0, c = this.capCues, i = lastStart(c, t);
      const k = this.ccOn && i > -1 && t < c[i].end ? i : -1;
      if (k !== this._ci) {
        this._ci = k;
        this.ccEl.replaceChildren();
        if (k > -1) c[k].text.split('\n').forEach((ln, j) => { if (j) this.ccEl.append(el('br')); this.ccEl.append(el('span', '', ln)); });
      }
      if (!this.txCues.length) return;
      const ti = lastStart(this.txCues, t);
      if (ti !== this._ti) {
        if (this._ti > -1) this.rows[this._ti].classList.remove('now');
        this._ti = ti;
        this._emit('cuechange', { cue: ti > -1 ? this.txCues[ti] : null, index: ti });
        if (ti > -1) {
          this.rows[ti].classList.add('now');
          if (this.txOn && Date.now() > (this._hold || 0)) this._scrollTo(ti);
        }
      }
    }

    _buildTx(tx) {
      this.txCues = tx;
      this.rows = []; this._ti = -1; this._marked = []; this.hits = []; this.hitPos = -1; this._hc = null;
      if (this.search) { this.search.value = ''; this._lastQ = ''; this.count.textContent = ''; this.list.classList.remove('searching'); this.sPrev.disabled = this.sNext.disabled = true; }
      let prev = '';
      const lis = tx.map((c, i) => {
        const li = el('li'), b = el('button', 'cue');
        b.type = 'button'; b.dataset.i = i;
        b.append(el('time', '', fmt(c.start)));
        if (c.who && c.who !== prev) b.append(el('span', 'who', c.who));
        prev = c.who;
        b.append(el('span', 'txt', c.plain));
        const lk = el('button', 'cue-link');
        lk.type = 'button'; lk.dataset.i = i; lk.tabIndex = -1;
        lk.title = lk.ariaLabel = `Copy link to ${fmt(c.start)}`;
        lk.setAttribute('aria-label', `Copy link to ${fmt(c.start)}`);
        lk.innerHTML = svg(this.o.icons, 'link');
        li.append(b, lk);
        this.rows.push(b);
        return li;
      });
      this.list.replaceChildren(...lis);
      // one searchable haystack so phrases that straddle two cues still match
      this._starts = [];
      let pos = 0;
      this._hay = tx.map(c => { this._starts.push(pos); const s = c.plain.toLowerCase(); pos += s.length + 1; return s; }).join(' ');
      this.bTx.hidden = !tx.length;
      if (!tx.length && this.txOn) this._setTx(false);
      if (tx.length && this.o.txOpen) this._setTx(true);
    }
    _cueAt(p) { const s = this._starts; let lo = 0, hi = s.length - 1, r = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (s[m] <= p) { r = m; lo = m + 1; } else hi = m - 1; } return r; }

    _search(raw) {
      this._lastQ = raw;
      const q = raw.trim().toLowerCase();
      this._marked.forEach(i => { const b = this.rows[i]; b.classList.remove('hit', 'hit-cur'); b.querySelector('.txt').textContent = this.txCues[i].plain; });
      this._marked = []; this.hits = []; this.hitPos = -1; this._hc = null;
      this.list.classList.toggle('searching', !!q);
      if (!q) { this.count.textContent = ''; this.sPrev.disabled = this.sNext.disabled = true; return; }
      const found = new Set();
      let p = this._hay.indexOf(q);
      while (p !== -1) { found.add(this._cueAt(p)); p = this._hay.indexOf(q, p + 1); }
      this.hits = [...found].sort((a, b) => a - b);
      const re = new RegExp(escRe(raw.trim()), 'gi');
      this.hits.forEach(i => { this.rows[i].classList.add('hit'); this._hl(i, re); });
      this._marked = this.hits.slice();
      const n = this.hits.length;
      this.count.textContent = n ? `${n} match${n === 1 ? '' : 'es'} · Enter to jump` : 'No matches';
      this.sPrev.disabled = this.sNext.disabled = !n;
    }
    _hl(i, re) {
      const span = this.rows[i].querySelector('.txt'), txt = this.txCues[i].plain;
      span.replaceChildren();
      let last = 0;
      txt.replace(re, (m, off) => { span.append(txt.slice(last, off), el('mark', '', m)); last = off + m.length; return m; });
      span.append(txt.slice(last));
    }
    _hop(dir) {
      const n = this.hits.length;
      if (!n) return;
      this.hitPos = this.hitPos < 0 ? (dir > 0 ? 0 : n - 1) : (this.hitPos + dir + n) % n;
      this._jump(this.hits[this.hitPos], true);
    }
    _jump(i, lead) {
      const c = this.txCues[i];
      if (!c) return;
      const t = Math.max(0, c.start - (lead ? this.o.offset : 0));
      this._seekTo(t);
      if (this._hc != null && this.rows[this._hc]) this.rows[this._hc].classList.remove('hit-cur');
      this._hc = lead ? i : null;
      if (lead) this.rows[i].classList.add('hit-cur');
      this._hold = 0;
      this._scrollTo(i);
      this._say(lead ? `Match ${this.hitPos + 1} of ${this.hits.length}. Jumped to ${fmt(t)}.` : `Jumped to ${fmt(t)}.`);
      this._fx(this.rows[i], 'hop');
    }
    _scrollTo(i) {
      const b = this.rows[i], L = this.list;
      if (!b || !this.txOn) return;
      L.scrollTo({ top: Math.max(0, b.offsetTop - L.clientHeight / 3), behavior: this.reduced.matches ? 'auto' : 'smooth' });
    }

    _fx(src, kind) {
      if (!this.sparkleOn || this._emb) return;
      const R = this.rf.getBoundingClientRect();
      let x = R.width / 2, y = R.height / 2;
      if (src && src.clientX != null && src.detail) { x = src.clientX - R.left; y = src.clientY - R.top; }
      else {
        const t = src && (src.currentTarget || src);
        if (t && t.getBoundingClientRect) { const b = t.getBoundingClientRect(); x = b.left + b.width / 2 - R.left; y = b.top + b.height / 2 - R.top; }
      }
      const cs = getComputedStyle(this);
      const cols = ['--rf-accent', '--rf-accent-2', '--rf-accent-3', '--rf-accent-4'].map(p => cs.getPropertyValue(p).trim()).filter(Boolean);
      const n = { play: 28, pause: 12, hop: 14, end: 80 }[kind] || 16;
      this.fx.burst(x, y, n, cols.length ? cols : ['#fff'], this.shapes, kind === 'end' ? 1.8 : 1);
    }

    _toast(msg, label, fn, sticky) {
      const t = this.toastEl;
      t.replaceChildren(el('span', '', msg));
      if (label) {
        const b = el('button', '', label);
        b.type = 'button';
        b.addEventListener('click', e => { e.stopPropagation(); fn(); t.classList.remove('show'); });
        t.append(b);
      }
      t.classList.add('show');
      clearTimeout(this._tt);
      this._sticky = !!sticky;
      if (!sticky) this._tt = setTimeout(() => t.classList.remove('show'), 8000);
    }

    _save() {
      if (!this.o.resume || !this.dur || this.v.ended || this._spanOn()) return;
      try { localStorage.setItem(this._key, String(Math.floor(this.v.currentTime))); } catch (e) { /* storage blocked */ }
    }
    _forget() { try { localStorage.removeItem(this._key); } catch (e) { /* storage blocked */ } }
    _restore() {
      if (!this.o.resume || this._spanOn()) return false;
      let s = 0;
      try { s = +localStorage.getItem(this._key) || 0; } catch (e) { /* storage blocked */ }
      if (s > 5 && (!this.dur || s < this.dur - 5)) {
        this.v.currentTime = s;
        this._paint();
        this._toast(`Picked up where you left off (${fmt(s)}).`, 'Start over', () => this._seekTo(0));
        return true;
      }
      return false;
    }

    /* ----- spans: start / end / loop ----- */
    _spanOn() { return !!this.span && (this.span.end != null || this.span.loop); }
    // s: { start, end, loop } or null for the tag's own span
    _setSpan(s, quiet) {
      const o = this.o;
      const base = { start: o.start || 0, end: o.end, loop: !!o.loop };
      const sp = s ? { start: Math.max(0, +s.start || 0), end: s.end != null && +s.end > +s.start ? +s.end : null, loop: !!s.loop } : base;
      this.span = sp;
      this._user = !!s;
      this._atEnd = false;
      const t = this.v ? this.v.currentTime || 0 : 0;
      this._inSpan = sp.end != null && t >= sp.start - 0.25 && t < sp.end;
      this._spanUi();
      if (!quiet) this._emit('spanchange', { span: Object.assign({}, sp) });
    }
    _spanUi() {
      if (!this.spanEl) return;
      const s = this.span, d = this.dur, on = !!s && s.end != null && d > 0;
      this.spanEl.classList.toggle('on', on);
      this.spanEl.classList.toggle('loop', on && s.loop);
      if (on) {
        this.spanEl.style.left = (Math.min(s.start, d) / d * 100) + '%';
        this.spanEl.style.width = (Math.max(0, Math.min(s.end, d) - Math.min(s.start, d)) / d * 100) + '%';
      }
    }
    // stop or loop when playback runs into the end of the span
    _spanTick() {
      const s = this.span, v = this.v;
      if (!s || s.end == null || !this.dur) return;
      const t = v.currentTime, end = Math.min(s.end, this.dur);
      if (end >= this.dur - 0.05) return; // the real end of the video handles it
      if (t >= s.start - 0.25 && t < end - 0.02) { this._inSpan = true; return; }
      if (t >= end && this._inSpan && !v.paused) {
        this._inSpan = false;
        if (s.loop) {
          this._seekTo(s.start);
          this._inSpan = true;
          this._emit('spanloop', { span: Object.assign({}, s) });
        } else {
          v.pause();
          v.currentTime = end;
          this._atEnd = true;
          this._paint();
          this._emit('spanend', { span: Object.assign({}, s) });
        }
      } else if (t < s.start - 0.25 || t > end + 0.5) this._inSpan = false;
    }

    /* ----- load on click ----- */
    _activate() {
      if (!this._lazy || this._emb) return;
      this._lazy = false;
      this.v.src = this.o.src;
    }

    /* ----- sharing ----- */
    _pageIndex() { return [...document.querySelectorAll('reel-fishy:not([data-carried])')].indexOf(this) + 1; }
    _link(s) {
      const id = this.o.id || String(this._pageIndex() || 1);
      let t = tLink(s.start || 0);
      if (s.end != null && s.end > s.start) t += ',' + tLink(s.end);
      const base = (this._carried ? this._from : location.href).split('#')[0];
      return `${base}#rf=${encodeURIComponent(id)}&t=${t}${s.loop ? '&loop' : ''}`;
    }
    async _copyLink(s, okMsg) {
      const url = this._link(s);
      if (this.shUrl) this.shUrl.value = url;
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
        try { if (this.shUrl && !this.sharePanel.hidden) { this.shUrl.select(); ok = document.execCommand('copy'); } } catch (e2) { ok = false; }
      }
      const msg = ok ? okMsg : 'Copy the link below.';
      if (!this.sharePanel.hidden) { this.shMsg.textContent = msg; if (!ok) this.shUrl.select(); }
      else if (ok) this._toast(msg);
      else { this._sharePanel(true); this.shUrl.value = url; this.shMsg.textContent = msg; this.shUrl.select(); }
      this._say(msg);
      return url;
    }
    /* ----- 1.2.0: hover preview and frame tools ----- */
    // a muted preview over the poster while a mouse rests on a video that hasn't played yet
    _hover(on) {
      clearTimeout(this._hpT);
      const o = this.o, src = this._src;
      if (!on) { const h = this._hpv; if (h) { h.classList.remove('on'); this._hpT = setTimeout(() => { if (this._hpv === h) h.pause(); }, 400); } return; }
      if (o.hover === false || this._played || this._emb || this._lazy || this._blocked || !src || !this.v.paused || this.rf.classList.contains('docked')) return;
      try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) { /* old browser */ }
      if (navigator.connection && navigator.connection.saveData) return;
      this._hpT = setTimeout(() => {
        if (this._played || !this.v.paused) return;
        const from = Math.max(0, typeof o.hover === 'number' ? o.hover : (o.start || 0));
        let h = this._hpv;
        if (!h) {
          h = this._hpv = el('video', 'hpv');
          h.muted = true; h.defaultMuted = true; h.playsInline = true; h.setAttribute('playsinline', ''); h.preload = 'auto';
          h.setAttribute('aria-hidden', 'true'); h.tabIndex = -1;
          h.addEventListener('timeupdate', () => { if (h.currentTime >= this._hpFrom + HOVER_SECONDS || h.currentTime < this._hpFrom - 0.5) h.currentTime = this._hpFrom; });
          h.addEventListener('ended', () => { h.currentTime = this._hpFrom; h.play().catch(() => {}); });
          h.addEventListener('playing', () => { if (this._hpv === h && !this._played) h.classList.add('on'); });
          h.addEventListener('error', () => this._hoverKill());
          h.src = src;
          this.v.after(h);
        }
        this._hpFrom = from;
        const go = () => { if (this._hpv !== h) return; if (Math.abs(h.currentTime - from) > HOVER_SECONDS) h.currentTime = Math.min(from, Math.max(0, (h.duration || from) - 1)); h.play().catch(() => this._hoverKill()); };
        if (h.readyState >= 1) go(); else h.addEventListener('loadedmetadata', go, { once: true });
      }, 300);
    }
    _hoverKill() {
      clearTimeout(this._hpT);
      const h = this._hpv;
      if (!h) return;
      this._hpv = null;
      h.pause(); h.removeAttribute('src'); h.load(); h.remove();
    }
    _frameOk() { return !!this.o.frameTools && !this._emb && !!this._src; }
    _frameUi() { if (this.shFrame) this.shFrame.style.display = this._frameOk() ? 'contents' : 'none'; }
    // one frame's length, measured while the video plays (1/30 s until then)
    _measureFrame() {
      const v = this.v;
      if (this._emb || this._fdDone || !v.requestVideoFrameCallback) return;
      this._fdDone = true;
      let last = null, n = 0, best = Infinity;
      const cb = (now, m) => {
        if (this.v !== v) return;
        if (last != null) { const d = m.mediaTime - last; if (d > 0.004 && d < best) best = d; }
        last = m.mediaTime;
        if (++n < 30 && !v.paused) v.requestVideoFrameCallback(cb);
        else if (best < 0.2) this._fd = best;
        else this._fdDone = false;
      };
      v.requestVideoFrameCallback(cb);
    }
    _step(dir) {
      if (!this._frameOk()) return;
      const v = this.v, fd = this._fd || 1 / 30;
      if (!v.paused) v.pause();
      // land in the middle of the next frame, so rounding never shows the same one twice
      const f = Math.round(v.currentTime / fd) + dir;
      const t = Math.max(0, f * fd + fd / 2);
      this._seekTo(t);
      this._say(`${dir > 0 ? 'Forward' : 'Back'} one frame, ${fmtT(t)}`);
    }
    _saveFrame() {
      const v = this.v, msg = t => { if (this.shMsg) this.shMsg.textContent = t; this._say(t); };
      if (!this._frameOk()) return;
      if (!v.videoWidth || v.readyState < 2) { msg('Play or seek the video first, then save the frame.'); return; }
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      const name = `${slug(this.o.id || this.o.label)}-${fmtT(v.currentTime).replace(/[:.]/g, '-')}.png`;
      try {
        c.getContext('2d').drawImage(v, 0, 0);
        c.toBlob(b => {
          if (!b) { msg('This frame couldn\'t be saved.'); return; }
          const a = document.createElement('a'), u = URL.createObjectURL(b);
          a.href = u; a.download = name; document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 4000);
          msg(`Saved ${name}`);
        }, 'image/png');
      } catch (e) {
        msg('The site hosting this video doesn\'t allow saving frames.');
      }
    }
    _buildShare() {
      const P = this.sharePanel;
      const row = (label, cls) => {
        const r = el('div', 'sh-row'), lab = el('label', '', label), inp = el('input', 'sh-in ' + cls), now = el('button', 'sbtn', 'Now');
        const id = 'sh-' + cls + '-' + Math.random().toString(36).slice(2, 7);
        inp.id = id; lab.htmlFor = id; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.placeholder = cls === 'sh-a' ? '0:00' : '—';
        now.type = 'button'; now.setAttribute('aria-label', `Set ${label.toLowerCase()} to now`);
        r.append(lab, inp, now);
        return [r, inp, now];
      };
      const bNow = el('button', 'sbtn primary');
      bNow.type = 'button';
      const [ra, inA, nowA] = row('Start', 'sh-a');
      const [rb, inB, nowB] = row('End', 'sh-b');
      const lp = el('label', 'sh-check'), chk = el('input');
      chk.type = 'checkbox';
      lp.append(chk, 'Loop this clip');
      const btns = el('div', 'sh-row'), bClip = el('button', 'sbtn primary', 'Copy clip link'), bClear = el('button', 'sbtn', 'Clear');
      bClip.type = bClear.type = 'button';
      btns.append(bClip, bClear);
      const url = el('input', 'sh-url'), msg = el('p', 'sh-msg');
      url.readOnly = true; url.setAttribute('aria-label', 'Link');
      msg.setAttribute('aria-live', 'polite');
      const fr = el('div', 'sh-fwrap'), fBtns = el('div', 'sh-frame'), fBack = el('button', 'sbtn', '‹ Frame'), fFwd = el('button', 'sbtn', 'Frame ›'), fSave = el('button', 'sbtn', 'Save frame');
      fBack.type = fFwd.type = fSave.type = 'button';
      fBack.title = 'Back one frame (,)'; fBack.setAttribute('aria-label', 'Back one frame');
      fFwd.title = 'Forward one frame (.)'; fFwd.setAttribute('aria-label', 'Forward one frame');
      fSave.title = 'Save this frame as a PNG picture';
      fBtns.append(fBack, fFwd, fSave);
      fr.append(el('div', 'sh-sep'), el('p', 'sh-h', 'Grab a frame'), fBtns);
      P.append(el('p', 'sh-h', 'Share this moment'), bNow, el('div', 'sh-sep'), el('p', 'sh-h', 'Share or loop a clip'), ra, rb, lp, btns, url, fr, msg);
      Object.assign(this, { shNow: bNow, shA: inA, shB: inB, shLoop: chk, shUrl: url, shMsg: msg, shFrame: fr });
      fBack.addEventListener('click', () => this._step(-1));
      fFwd.addEventListener('click', () => this._step(1));
      fSave.addEventListener('click', () => this._saveFrame());
      this._frameUi();
      bNow.title = 'Copy a link to this moment';
      nowA.title = 'Set the start to now (I)';
      nowB.title = 'Set the end to now (O)';
      bClip.title = 'Copy a link to this clip';
      bClear.title = 'Clear the clip';

      const read = () => {
        const a = inA.value.trim() === '' ? NaN : parseTime(inA.value), b = inB.value.trim() === '' ? NaN : parseTime(inB.value);
        inA.classList.toggle('bad', inA.value.trim() !== '' && isNaN(a));
        inB.classList.toggle('bad', inB.value.trim() !== '' && (isNaN(b) || (!isNaN(a) && b <= a)));
        return { a, b };
      };
      // typing a start and end plays that clip right away (an A-B loop when Loop is ticked)
      const apply = () => {
        const { a, b } = read();
        if (!isNaN(a) && !isNaN(b) && b > a) this._setSpan({ start: a, end: b, loop: chk.checked });
        else if (this._user && (inA.value.trim() === '' || inB.value.trim() === '')) this._setSpan(chk.checked && !isNaN(a) ? { start: a, end: null, loop: true } : null);
        url.value = this._link(this._shareSpan());
      };
      this._shareRead = read;
      inA.addEventListener('change', apply);
      inB.addEventListener('change', apply);
      chk.addEventListener('change', () => {
        const { a, b } = read();
        if (!isNaN(a) && !isNaN(b) && b > a) this._setSpan({ start: a, end: b, loop: chk.checked });
        else if (!this._user && !(this.o.end != null)) this._setSpan(chk.checked ? { start: isNaN(a) ? 0 : a, end: null, loop: true } : null);
        url.value = this._link(this._shareSpan());
      });
      nowA.addEventListener('click', () => { inA.value = fmtT(this.v.currentTime); apply(); });
      nowB.addEventListener('click', () => { inB.value = fmtT(this.v.currentTime); apply(); });
      bNow.addEventListener('click', () => this._copyLink({ start: this.v.currentTime }, `Link to ${fmt(this.v.currentTime)} copied.`));
      bClip.addEventListener('click', () => {
        const { a } = read();
        if (isNaN(a)) { msg.textContent = 'Add a start time first.'; inA.focus(); return; }
        const sp = this._shareSpan();
        this._copyLink(sp, sp.end != null ? `Link to ${fmtT(sp.start)}–${fmtT(sp.end)} copied.` : `Link to ${fmtT(sp.start)} copied.`);
      });
      bClear.addEventListener('click', () => { inA.value = ''; inB.value = ''; chk.checked = false; read(); this._setSpan(null); this._fillShare(); msg.textContent = ''; });
    }
    // the clip described by the panel's fields (falls back to the current moment)
    _shareSpan() {
      const { a, b } = this._shareRead();
      if (isNaN(a)) return { start: this.v.currentTime || 0, end: null, loop: false };
      return { start: a, end: !isNaN(b) && b > a ? b : null, loop: this.shLoop.checked };
    }
    _fillShare() {
      const s = this.span;
      this.shNow.textContent = `Copy link at ${fmt(this.v.currentTime || 0)}`;
      if (!this.shA.value && (s.start > 0 || s.end != null)) this.shA.value = fmtT(s.start);
      if (!this.shB.value && s.end != null) this.shB.value = fmtT(s.end);
      this.shLoop.checked = !!s.loop;
      this._shareRead();
      this.shUrl.value = this._link(this._shareSpan());
    }
    _sharePanel(open, refocus) {
      const P = this.sharePanel;
      P.hidden = !open;
      this.bShare.setAttribute('aria-expanded', open);
      if (open) {
        this._fillShare();
        this.shMsg.textContent = '';
        P.style.maxHeight = Math.max(160, this._emb ? innerHeight - this.bShare.getBoundingClientRect().bottom - 16 : this.stage.clientHeight - 12) + 'px';
        requestAnimationFrame(() => this.shNow.focus());
      } else if (refocus) this.bShare.focus();
    }
    // I / O keys: mark the clip's start or end at the current time
    _mark(which) {
      const t = this.v.currentTime || 0, inp = which === 'a' ? this.shA : this.shB;
      inp.value = fmtT(t);
      const { a, b } = this._shareRead();
      if (!isNaN(a) && !isNaN(b) && b > a) this._setSpan({ start: a, end: b, loop: this.shLoop.checked });
      this.shUrl.value = this._link(this._shareSpan());
      this._say(`Clip ${which === 'a' ? 'start' : 'end'} set to ${fmt(t)}`);
      if (this.sharePanel.hidden) this._toast(which === 'a' ? `Clip starts at ${fmtT(t)}. Press O to set the end.` : (!isNaN(a) && b > a ? `Clip ${fmtT(a)}–${fmtT(b)}. Press S to share it.` : `Clip ends at ${fmtT(t)}. Press I to set the start.`));
    }
    // #rf=<video-id or position>&t=90[,105][&loop]
    _checkHash() {
      if (this._carried) return;
      const h = (location.hash || '').replace(/^#/, '');
      if (!/(^|&)rf=/.test(h)) return;
      const q = new URLSearchParams(h), want = q.get('rf') || '';
      const pi = this.pl.length > 1 ? this.pl.findIndex(it => it['video-id'] === want) : -1;
      const mine = pi > -1 || (this.o.id ? want === this.o.id : want === String(this._pageIndex()));
      if (!mine || h === this._lastHash) return;
      if (pi > -1 && pi !== this.plI) this._plGo(pi, false);
      this._lastHash = h;
      const parts = (q.get('t') || '0').split(',');
      const a = parseTime(parts[0]), b = parts[1] !== undefined ? parseTime(parts[1]) : NaN;
      if (isNaN(a)) return;
      this._shared = { start: a, end: !isNaN(b) && b > a ? b : null, loop: q.has('loop') };
      if ((this.dur && this.v.readyState >= 1) || (this._emb && !this.v.booted)) this._applyShared();
      else { this._restored = false; if (this._lazy) this._activate(); }
    }
    _applyShared() {
      const s = this._shared;
      if (!s) return;
      this._shared = null;
      this._restored = true;
      if (s.end != null || s.loop) this._setSpan(s);
      this._seekTo(s.start);
      if (this.shA) { this.shA.value = s.start || s.end != null ? fmtT(s.start) : ''; this.shB.value = s.end != null ? fmtT(s.end) : ''; this.shLoop.checked = s.loop; }
      requestAnimationFrame(() => this.scrollIntoView({ behavior: this.reduced.matches ? 'auto' : 'smooth', block: 'center' }));
      const what = s.end != null ? `Shared clip ${fmtT(s.start)}–${fmtT(s.end)}${s.loop ? ' (loops)' : ''}.` : `Shared moment at ${fmtT(s.start)}.`;
      this._toast(what, 'Play', () => this.toggle(), true);
    }

    /* ----- mini player + carry-over ----- */
    _dockCheck() {
      if (this._inView) { this._dismiss = false; if (this.docked && !this._carried) this._dock(false); return; }
      if (this.docked || this._carried || !this.o.mini || this._dismiss || this.v.paused || this._th) return;
      if (this.shadowRoot.fullscreenElement || document.pictureInPictureElement === this.v) return;
      if (this._inView === undefined) return;
      // their player must stay at least 200px tall, so no docking on very narrow screens
      if (this._emb && (!this.v.booted || !this._dockFits())) return;
      this._dock(true);
    }
    _dock(on) {
      if (on) this.style.minHeight = this.offsetHeight + 'px'; else this.style.minHeight = '';
      this.docked = on;
      this.rf.classList.toggle('docked', on);
      this.rf.classList.toggle('dock-left', on && this.o.dock === 'left');
      this._say(on ? 'Mini player on' : 'Mini player off');
    }
    _carryOut() {
      const a = {};
      for (const at of this.attributes) if (!/^(data-carried|start|end|style|class|id|lazy)$/.test(at.name)) a[at.name] = at.value;
      // after load() or a playlist step, carry the video that's playing now
      const o = this.o, now = { src: o.src, poster: o.poster, captions: o.captions, chapters: o.chapters, transcript: o.transcript, descriptions: o.descriptions, thumbnails: o.thumbs, hotspots: o.hotspots, 'transcript-file': o.transcriptFile, label: o.label, 'video-id': o.id, aspect: o.aspect };
      Object.entries(now).forEach(([k, v]) => { if (v && !(k === 'label' && v === 'Video')) a[k] = v; else delete a[k]; });
      if (this.pl.length > 1) a['playlist-index'] = String(this.plI);
      ['src', 'poster', 'chapters', 'transcript', 'transcript-file', 'thumbnails', 'hotspots', 'play-image', 'loader-image'].forEach(k => { if (a[k]) { try { a[k] = new URL(a[k], location.href).href; } catch (e) { /* keep as-is */ } } });
      ['captions', 'descriptions'].forEach(k => { if (a[k]) a[k] = parseTracks(a[k]).map(t => { let u = t.url; try { u = new URL(u, location.href).href; } catch (e) { /* keep */ } return (t.lang ? t.lang + ':' : '') + u; }).join('; '); });
      const state = {
        attrs: a, t: this.v.currentTime, rate: this.v.playbackRate, vol: this.v.volume, muted: this.v.muted,
        cc: !!this.ccOn, ccLang: this.capTracks[this.ccLang] ? this.capTracks[this.ccLang].lang : '', ad: !!this.adOn, span: this._spanOn() ? this.span : null, from: this._from, title: this._carried ? (this._carry && this._carry.title) : document.title, ts: Date.now()
      };
      try { sessionStorage.setItem(CARRY_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
    }
    _carryIn() {
      const c = this._carry || {}, v = this.v;
      if (c.span) this._setSpan(c.span);
      if (c.t > 0 && (!this.dur || c.t < this.dur)) v.currentTime = c.t;
      if (c.rate) v.playbackRate = c.rate;
      if (typeof c.vol === 'number') v.volume = c.vol;
      v.muted = !!c.muted;
      if (c.cc && this.capCues.length) this._setCc(true);
      this._paint();
      this._toast(`Keep watching from ${fmt(v.currentTime)}?`, 'Play', () => this.toggle(), true);
    }
  }

  customElements.define('reel-fishy', ReelFishy);

  // carry-over: reopen a video that was playing when the visitor left the last page
  function bootCarry() {
    if (!DEFAULTS.carry) return;
    let s = null;
    try { s = JSON.parse(sessionStorage.getItem(CARRY_KEY) || 'null'); } catch (e) { return; }
    if (!s || !s.attrs || !s.attrs.src) return;
    if (Date.now() - (s.ts || 0) > DEFAULTS.carryMinutes * 60000) { clearCarry(); return; }
    const abs = u => { try { return new URL(u, location.href).href; } catch (e) { return u; } };
    const onPage = [...document.querySelectorAll('reel-fishy:not([data-carried])')].some(p => abs(p.getAttribute('src') || '') === s.attrs.src);
    if (onPage) { clearCarry(); return; }
    if (document.querySelector('reel-fishy[data-carried]')) return;
    const p = document.createElement('reel-fishy');
    for (const [k, val] of Object.entries(s.attrs)) p.setAttribute(k, val);
    p.setAttribute('data-carried', '');
    p._carry = s;
    document.body.append(p);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootCarry); else bootCarry();
  window.ReelFishy = {
    version: '1.2.0',
    // which YouTube / Vimeo video a link points at, or null: ReelFishy.embedOf(url)
    embedOf,
    defaults: DEFAULTS,
    // Register a custom icon set before players render: ReelFishy.registerIcons('hooves', { play: 'M…', … })
    registerIcons(name, map) { ICONS[name] = map; },
    // WebVTT / SRT text -> [{ start, end, text, plain, who }], for indexing transcripts
    parseVTT,
    clearCarry
  };
})();
