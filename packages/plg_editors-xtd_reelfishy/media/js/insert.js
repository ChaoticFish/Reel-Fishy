/**
 * Reel Fishy — editor button popup, v1.2.0
 * (C) 2026 Chaotic Fish Design · GPL-2.0-or-later
 *
 * Builds a {reelfishy} tag. Every control starts at the site's plugin settings,
 * and only the choices that differ are written into the tag. Select an existing
 * tag before clicking the button to edit it; select a video path to start from it.
 * Browse opens Joomla's own Media Manager when the site is set up for that file type
 * (same dialog and selection event as Joomla's media field). Otherwise, or on the
 * front end, it uses the built-in picker backed by the system plugin's com_ajax endpoint.
 *
 * Look: a native <dialog> in the plain, light style of the Chaos Filet button,
 * using the admin template's own Bootstrap colours (so dark mode follows along).
 */
// eslint-disable-next-line import/no-unresolved
import { JoomlaEditorButton } from 'editor-api';
// eslint-disable-next-line import/no-unresolved
import JoomlaDialog from 'joomla.dialog';

const OPT = (window.Joomla && Joomla.getOptions && Joomla.getOptions('plg_editors-xtd_reelfishy')) || {};
const SITE = Object.assign({
  icons: 'fishy', sparkles: true, loader: 'auto', 'play-image': '', 'loader-image': '',
  'transcript-open': false, 'captions-on': false, resume: true, mini: true, dock: 'right',
  'carry-over': true, pip: true, speeds: '0.5,0.75,1,1.25,1.5,2', 'search-offset': 3, loop: false, lazy: false, aspect: 'auto',
  'descriptions-on': false, glow: true, confetti: true, theater: true, previews: true, 'hover-preview': true, 'frame-tools': true, 'end-lead': 2, 'end-screen': true, 'end-message': '', 'end-button': '', 'end-url': '', 'end-button-2': '', 'end-url-2': '',
}, OPT.defaults || {});
const BROWSE = OPT.browse && OPT.browse.url && OPT.browse.token ? OPT.browse : null;
const MM = OPT.media && OPT.media.url ? OPT.media : null;

// What each kind of field needs from the Media Manager: its media type number and the
// extensions it accepts. The Media Manager shows a file when its extension is in that
// type's list in the Media options.
const MM_KINDS = {
  video: { types: '2', list: 'video', exts: ['mp4', 'm4v', 'webm', 'ogv', 'mov'] },
  image: { types: '0', list: 'image', exts: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'] },
  mascot: { types: '0', list: 'image', exts: ['png', 'svg'] },
  vtt: { types: '3', list: 'doc', exts: ['vtt', 'srt'] },
  doc: { types: '3', list: 'doc', exts: ['txt', 'doc', 'docx', 'pdf', 'odt', 'rtf'] },
};
const mmCan = (kind) => {
  const k = MM_KINDS[kind];
  const have = (MM && MM.ext && MM.ext[k && k.list]) || [];
  return !!(k && have.length && k.exts.some((e) => have.includes(e)));
};

const T = (k, fb) => (window.Joomla && Joomla.Text ? Joomla.Text._(`PLG_EDITORS_XTD_REELFISHY_${k}`, fb) : fb);
const VIDEO = /\.(mp4|m4v|webm|ogv|mov)(\?.*)?$/i;
const EMBEDS = Object.assign({ youtube: true, vimeo: true, tiktok: true }, OPT.embeds || {});
// 'youtube', 'vimeo', 'tiktok', 'tiktok-short' or '' (the same link rules as the player)
const hostedKind = (src) => {
  let u;
  try { u = new URL(String(src || '').trim()); } catch (e) { return ''; }
  if (!/^https?:$/.test(u.protocol)) return '';
  const host = u.hostname.replace(/^(www|m)\./, ''), p = u.pathname.split('/').filter(Boolean);
  let id = '';
  if (host === 'youtu.be') id = p[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') id = p[0] === 'watch' ? u.searchParams.get('v') : (['embed', 'shorts', 'live', 'v'].includes(p[0]) ? p[1] : '');
  if (id && /^[\w-]{11}$/.test(id)) return 'youtube';
  if ((host === 'vimeo.com' || host === 'player.vimeo.com') && p.some((seg) => /^\d+$/.test(seg))) return 'vimeo';
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || (host === 'tiktok.com' && p[0] === 't')) return 'tiktok-short';
  if (host === 'tiktok.com') {
    const vi = p.indexOf('video');
    const tid = vi > -1 ? p[vi + 1] : (p[0] === 'embed' || p[0] === 'player' ? p[p.length - 1] : '');
    if (/^\d{8,}$/.test(tid || '')) return 'tiktok';
  }
  return '';
};
// controls that do nothing for a YouTube / Vimeo video (their own player handles these)
const FILE_ONLY = ['pip', 'loader', 'loader-image'];
const NAMES = { youtube: 'YouTube', vimeo: 'Vimeo', tiktok: 'TikTok' };
const FILES = ['src', 'poster', 'captions', 'descriptions', 'chapters', 'thumbnails', 'hotspots', 'transcript', 'transcript-file', 'label', 'video-id'];
// what each video in a playlist keeps for itself (the first tag carries the shared look and behavior)
const ITEM = ['src', 'poster', 'captions', 'descriptions', 'chapters', 'thumbnails', 'hotspots', 'transcript', 'transcript-file', 'label', 'video-id', 'start', 'end', 'aspect'];
// fields that take one file, or one per language: en:clip.vtt; es:clip-es.vtt
const TRACKS = ['captions', 'descriptions'];
const PAIR = /^([a-z]{2,3}(?:-[a-z0-9]{2,8})*):(?!\/\/)(.+)$/i;
// the first file in a field, without its language
const firstFile = (v) => { const f = String(v || '').split(';')[0].trim(); const m = f.match(PAIR); return m ? m[2].trim() : f; };
// a language guessed from a file name: clip.es.vtt, clip-es.vtt, clip_pt-BR.srt
const langOf = (path) => { const m = String(path).match(/[._-]([a-z]{2,3}(?:[-_][A-Za-z]{2})?)\.(vtt|srt)$/i); return m ? m[1].replace('_', '-') : ''; };

// Every control: [attribute, kind, group, label key, fallback label, extra]
// extra.browse is the kind of file the picker shows for that field.
const FIELDS = [
  ['src', 'text', 'files', 'SRC', 'Video', { hint: 'images/videos/clip.mp4', help: ['SRC_HINT', 'An MP4 or WebM file (a path from the site root, or a full URL), or a YouTube, Vimeo or TikTok link.'], required: true, browse: 'video' }],
  ['poster', 'text', 'files', 'POSTER', 'Poster image', { hint: 'images/videos/clip.jpg', browse: 'image' }],
  ['captions', 'text', 'files', 'CAPTIONS', 'Captions (.vtt or .srt)', { hint: 'images/videos/clip.vtt', help: ['CAPTIONS_HINT', 'One file, or one per language: en:clip.vtt; es:clip-es.vtt. With a language already listed, Browse adds another.'], browse: 'vtt' }],
  ['descriptions', 'text', 'files', 'DESCRIPTIONS', 'Audio descriptions (.vtt)', { hint: 'images/videos/clip-descriptions.vtt', help: ['DESCRIPTIONS_HINT', 'Read aloud by the visitor\'s browser when they turn on audio description (AD). One file, or one per language like captions.'], browse: 'vtt' }],
  ['chapters', 'text', 'files', 'CHAPTERS', 'Chapters (.vtt)', { hint: 'images/videos/clip-chapters.vtt', browse: 'vtt' }],
  ['thumbnails', 'text', 'files', 'THUMBNAILS', 'Seek thumbnails (.vtt)', { hint: 'images/videos/clip-thumbs.vtt', help: ['THUMBNAILS_HINT', 'Optional. A thumbnails VTT pointing into a sprite image. Without it, local video files show live previews.'], browse: 'vtt' }],
  ['hotspots', 'text', 'files', 'HOTSPOTS', 'Hotspots (.vtt)', { hint: 'images/videos/clip-hotspots.vtt', help: ['HOTSPOTS_HINT', 'Clickable labels at set times. Each cue reads: Label | link | corner. A link of t=1:30 jumps to that time.'], browse: 'vtt' }],
  ['transcript', 'text', 'files', 'TRANSCRIPT', 'Separate transcript (.vtt or .srt)', { help: ['TRANSCRIPT_HINT', 'Only if it differs from the captions file.'], browse: 'vtt' }],
  ['transcript-file', 'text', 'files', 'TRANSCRIPT_FILE', 'Transcript to download', { hint: 'files/videos/clip-transcript.pdf', help: ['TRANSCRIPT_FILE_HINT', 'TXT, DOC, DOCX or PDF. Adds a Download transcript button; it isn\'t searchable.'], browse: 'doc' }],
  ['label', 'text', 'files', 'LABEL', 'Name for screen readers', { help: ['LABEL_HINT', 'e.g. Barn tour. Read out as Barn tour video player.'] }],

  ['icons', 'select', 'look', 'ICONS', 'Icon set', { options: [['fishy', 'ICONS_FISHY', 'Fishy (wrasse)'], ['classic', 'ICONS_CLASSIC', 'Classic'], ['minimal', 'ICONS_MINIMAL', 'Minimal']] }],
  ['glow', 'bool', 'look', 'GLOW', 'Ambient glow'],
  ['confetti', 'bool', 'look', 'CONFETTI', 'Confetti at the end'],
  ['theater', 'bool', 'look', 'THEATER', 'Theater mode button'],
  ['previews', 'bool', 'look', 'PREVIEWS', 'Live seek previews'],
  ['hover-preview', 'bool', 'look', 'HOVER_PREVIEW', 'Hover preview on the poster'],
  ['aspect', 'select', 'look', 'ASPECT', 'Shape', { options: [['auto', 'ASPECT_AUTO', 'Automatic'], ['16:9', 'ASPECT_WIDE', '16:9 (wide)'], ['9:16', 'ASPECT_TALL', '9:16 (portrait)'], ['4:3', 'ASPECT_43', '4:3'], ['1:1', 'ASPECT_SQUARE', '1:1 (square)']], help: ['ASPECT_HINT', 'Automatic: YouTube Shorts and TikTok are 9:16, video files use their own shape, everything else 16:9.'] }],
  ['loader', 'select', 'look', 'LOADER', 'Loading screen', { options: [['auto', 'LOADER_AUTO', 'Automatic'], ['fish', 'LOADER_FISH', 'Swimming fish'], ['ring', 'LOADER_RING', 'Plain ring']] }],
  ['sparkles', 'bool', 'look', 'SPARKLES', 'Sparkles'],
  ['play-image', 'text', 'look', 'PLAY_IMAGE', 'Play button image', { hint: 'images/my-mascot.svg', help: ['IMAGE_HINT', 'PNG or SVG. Empty uses the site setting.'], browse: 'mascot' }],
  ['loader-image', 'text', 'look', 'LOADER_IMAGE', 'Loading screen image', { hint: 'images/my-mascot.png', help: ['IMAGE_HINT', 'PNG or SVG. Empty uses the site setting.'], browse: 'mascot' }],

  ['transcript-open', 'bool', 'behavior', 'TRANSCRIPT_OPEN', 'Transcript open'],
  ['captions-on', 'bool', 'behavior', 'CAPTIONS_ON', 'Captions on'],
  ['resume', 'bool', 'behavior', 'RESUME', 'Resume where left off'],
  ['mini', 'bool', 'behavior', 'MINI', 'Dock while scrolling'],
  ['carry-over', 'bool', 'behavior', 'CARRY', 'Carry-over between pages'],
  ['pip', 'bool', 'behavior', 'PIP', 'Picture-in-picture button'],
  ['frame-tools', 'bool', 'behavior', 'FRAME_TOOLS', 'Frame tools (step, save PNG)'],
  ['loop', 'bool', 'behavior', 'LOOP', 'Loop'],
  ['descriptions-on', 'bool', 'behavior', 'DESCRIPTIONS_ON', 'Audio description on'],
  ['lazy', 'bool', 'behavior', 'LAZY', 'Load on click', { on: 'click', off: 'off' }],
  ['dock', 'select', 'behavior', 'DOCK', 'Dock corner', { options: [['right', 'DOCK_RIGHT', 'Bottom right'], ['left', 'DOCK_LEFT', 'Bottom left']] }],

  ['start', 'time', 'advanced', 'START', 'Start at', { hint: '1:30', help: ['START_HINT', 'Seconds or m:ss. Empty starts at the beginning.'] }],
  ['end', 'time', 'advanced', 'END', 'End at', { hint: '2:15', help: ['END_HINT', 'Stops here, or loops back to the start with Loop on.'] }],
  ['speeds', 'text', 'advanced', 'SPEEDS', 'Playback speeds', { hint: '0.5,1,1.5,2' }],
  ['search-offset', 'number', 'advanced', 'SEARCH_OFFSET', 'Search lead-in (seconds)', { min: 0, max: 15, step: 0.5 }],
  ['end-screen', 'bool', 'advanced', 'END_SCREEN', 'End screen'],
  ['end-lead', 'number', 'advanced', 'END_LEAD', 'Show end screen early (seconds)', { min: 0, max: 15, step: 0.5, help: ['END_LEAD_HINT', 'Fades in this many seconds before the end. 0: only at the end.'] }],
  ['end-message', 'text', 'advanced', 'END_MESSAGE', 'End screen message', { help: ['END_HINT', 'Empty fields use the site\'s end screen settings.'] }],
  ['end-button', 'text', 'advanced', 'END_BUTTON', 'Button 1 text'],
  ['end-url', 'text', 'advanced', 'END_URL', 'Button 1 link', { hint: '/donate', help: ['END_URL_HINT', 'A page, https://…, mailto: or tel:.'] }],
  ['end-button-2', 'text', 'advanced', 'END_BUTTON_2', 'Button 2 text'],
  ['end-url-2', 'text', 'advanced', 'END_URL_2', 'Button 2 link', { hint: 'https://…' }],
  ['video-id', 'text', 'advanced', 'VIDEO_ID', 'Video ID', { hint: 'barn-tour', help: ['VIDEO_ID_HINT', 'Optional. A short name for this video, for future playlists and site search.'] }],
];
const GROUPS = [['files', 'GROUP_FILES', 'Files'], ['look', 'GROUP_LOOK', 'Look'], ['behavior', 'GROUP_BEHAVIOR', 'Behavior'], ['advanced', 'GROUP_ADVANCED', 'Advanced']];

/* Plain and light, after the Chaos Filet button. Colours come from the admin
   template's Bootstrap variables, with Filet's values as the fallback. */
const CSS = `.rfp{background:var(--bs-body-bg,#fff);border:1px solid var(--bs-border-color,#ccc);border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.25);color:var(--bs-body-color,#212529);font-family:inherit;max-height:min(90vh,860px);max-width:640px;padding:0;width:92%}
.rfp[open]{display:flex;flex-direction:column}
.rfp::backdrop{background:rgba(0,0,0,.45)}
.rfp *{box-sizing:border-box}
.rfp-head{align-items:center;display:flex;gap:12px;justify-content:space-between;padding:1.25rem 1.25rem .75rem}
.rfp-head h3{font-size:1.1rem;font-weight:600;margin:0}
.rfp-x{align-items:center;background:none;border:0;border-radius:6px;color:inherit;cursor:pointer;display:flex;flex:none;font-size:1.4rem;height:32px;justify-content:center;line-height:1;opacity:.6;padding:0;width:32px}
.rfp-x:hover{background:var(--bs-tertiary-bg,rgba(0,0,0,.06));opacity:1}
.rfp-body{display:flex;flex:1;flex-direction:column;gap:.75rem;min-height:0;overflow-y:auto;padding:0 1.25rem 1rem}
.rfp-note{background:var(--bs-warning-bg-subtle,#fff3cd);border-radius:6px;color:var(--bs-warning-text-emphasis,#664d03);font-size:.88em;margin:0;padding:.6rem .8rem}
.rfp-hint{color:var(--bs-secondary-color,#6c757d);font-size:.85em;margin:0}
.rfp-sec{border:1px solid var(--bs-border-color,#dee2e6);border-radius:6px}
.rfp-sec>summary{align-items:center;cursor:pointer;display:flex;font-size:.95em;font-weight:600;gap:.5rem;list-style:none;padding:.65rem .9rem;user-select:none}
.rfp-sec>summary::-webkit-details-marker{display:none}
.rfp-sec>summary::before{content:"▸";display:inline-block;font-size:.8em;opacity:.6;transition:transform .15s}
.rfp-sec[open]>summary::before{transform:rotate(90deg)}
.rfp-sec[open]>summary{border-bottom:1px solid var(--bs-border-color,#dee2e6)}
.rfp-count{background:#05b5c3;border-radius:999px;color:#fff;font-size:.72rem;font-weight:700;line-height:1.5;padding:0 .5rem}
.rfp-grid{display:grid;gap:.9rem 1rem;grid-template-columns:repeat(2,minmax(0,1fr));padding:.9rem}
.rfp-field{display:flex;flex-direction:column;gap:.3rem;min-width:0}
.rfp-field[hidden]{display:none}
.rfp-wide{grid-column:1/-1}
.rfp-field>label{font-size:.92em;font-weight:600;margin:0}
.rfp-check{align-items:center;flex-direction:row;gap:.5rem}
.rfp-check>label{font-weight:400}
.rfp-check input{flex:none;height:1.05em;margin:0;width:1.05em}
.rfp-check .rfp-hint{flex-basis:100%}
.rfp-checks{display:grid;gap:.55rem 1rem;grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr))}
.rfp-changed>label::after{color:#05b5c3;content:" •";font-weight:700}
.rfp-row{display:flex;gap:.5rem}
.rfp-row>input{flex:1;min-width:0}
.rfp-browse{flex:none;white-space:nowrap}
.rfp-tagbox{border-top:1px solid var(--bs-border-color,#dee2e6);display:flex;flex-direction:column;gap:.35rem;padding:.75rem 1.25rem}
.rfp-tag{background:#1b1b2b;border-radius:6px;color:#f5f7ff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.82rem;margin:0;max-height:7em;overflow:auto;overflow-wrap:anywhere;padding:.6rem .75rem;white-space:pre-wrap}
.rfp-pl{border:1px solid var(--bs-border-color,#dee2e6);border-radius:8px;display:flex;flex-direction:column;gap:.6rem;padding:.7rem .9rem}
.rfp-pl-on{font-weight:600}
.rfp-pl-body{display:flex;flex-direction:column;gap:.6rem}
.rfp-pl-body[hidden]{display:none}
.rfp-pl-list{counter-reset:pl;display:flex;flex-direction:column;gap:.25rem;margin:0;padding:0}
.rfp-pl-list:empty{display:none}
.rfp-pl-list li{align-items:center;counter-increment:pl;display:flex;gap:.25rem}
.rfp-pl-list li::before{color:var(--bs-secondary-color,#6c757d);content:counter(pl);font-size:.85em;font-variant-numeric:tabular-nums;min-width:1.4em}
.rfp-pl-list li.is-editing .rfp-pl-name{font-weight:700}
.rfp-pl-list .btn{line-height:1;padding:.15rem .4rem}
.rfp-pl-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rfp-pl-actions{display:flex;gap:.5rem}
.rfp-err{color:var(--bs-danger-text-emphasis,#a33);font-size:.85em;margin:0}
.rfp-foot{align-items:center;display:flex;flex-wrap:wrap;gap:8px;padding:0 1.25rem 1.25rem}
.rfp-foot .btn{white-space:nowrap}
.rfp-foot .rfp-reset{margin-right:auto;padding-left:0;padding-right:0}
.rfp-picker{display:flex;flex-direction:column;gap:.9rem;padding-top:.25rem}
.rfp-bar{align-items:center;display:flex;flex-wrap:wrap;gap:.5rem 1rem}
.rfp-crumb{align-items:center;display:flex;flex-wrap:wrap;font-size:.88em;gap:.25rem;min-width:0}
.rfp-crumb button{background:none;border:0;color:var(--bs-link-color,#0d6efd);cursor:pointer;padding:0}
.rfp-crumb button:hover{text-decoration:underline}
.rfp-crumb span{opacity:.5}
.rfp-files{display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
.rfp-item{align-items:center;background:var(--bs-tertiary-bg,#f8f9fa);border:1px solid transparent;border-radius:6px;color:inherit;cursor:pointer;display:flex;flex-direction:column;font:inherit;gap:.35rem;min-width:0;padding:.6rem .4rem}
.rfp-item:hover{border-color:#05b5c3}
.rfp-item:focus-visible{outline:2px solid #05b5c3;outline-offset:1px}
.rfp-item svg{height:40px;opacity:.75;width:40px}
.rfp-item img{border-radius:4px;height:64px;object-fit:cover;width:100%}
.rfp-item.rfp-svgthumb img{object-fit:contain}
.rfp-name{font-size:.8em;line-height:1.3;overflow:hidden;text-align:center;text-overflow:ellipsis;white-space:nowrap;width:100%}
.rfp-status{color:var(--bs-secondary-color,#6c757d);font-size:.9em;margin:0;padding:1.5rem 0;text-align:center}
.rfp-status.is-error{color:var(--bs-danger-text-emphasis,#a33)}
@media (max-width: 560px) {
  .rfp-checks,
  .rfp-grid {
    grid-template-columns: 1fr;
  }
  .rfp-foot .rfp-reset {
    flex-basis: 100%;
    text-align: left;
  }
  .rfp-foot .btn:not(.rfp-reset) {
    flex: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rfp-sec > summary::before {
    transition: none;
  }
}`;

const ICON = {
  folder: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4l-7 7h4v9h6v-9h4z"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 5h11a2 2 0 0 1 2 2v2.5l4-3v11l-4-3V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>',
  vtt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm2 4v6h4v-2H7v-2h2V9zm6 0v6h4v-2h-2v-2h2V9z"/></svg>',
};

let styled = false;
const addStyle = () => {
  if (styled) return;
  const st = document.createElement('style');
  st.id = 'rfp-style';
  st.textContent = CSS;
  document.head.append(st);
  styled = true;
};

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// values may not contain characters that would break the tag
const clean = (v) => String(v ?? '').replace(/["{}\n\r]/g, '').trim();
const numEq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;
const normSpeeds = (v) => String(v || '').split(',').map((n) => parseFloat(n)).filter((n) => n > 0).join(',');
const toBool = (v) => !/^(false|off|0|no)$/i.test(String(v).trim());
// '90', '1:30', '1:02:03.5' -> seconds, or NaN
const parseTime = (v) => {
  const str = String(v ?? '').trim();
  if (!/^\d+(\.\d+)?$|^\d+:\d{1,2}(\.\d+)?$|^\d+:\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) return NaN;
  return str.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
};
const siteUrl = (p) => {
  if (/^(https?:)?\/\//i.test(p) || p.startsWith('/')) return p;
  const root = (BROWSE && BROWSE.url ? BROWSE.url.replace(/\/(administrator\/)?index\.php.*$/, '') : '');
  return `${root}/${p}`;
};

// Read the attributes of a {reelfishy ...} tag from the editor selection.
const parseTag = (html) => {
  const box = document.createElement('div');
  box.innerHTML = html || '';
  const txt = (box.textContent || '').replace(/[“”″]/g, '"');
  const read = (raw) => { const a = {}; raw.replace(/([a-z][a-z0-9-]*)\s*=\s*"([^"]*)"/gi, (all, k, v) => { a[k.toLowerCase()] = v; return all; }); return a; };
  const pl = txt.match(/\{reelfishy-playlist\b([^}]*)\}([\s\S]*?)\{\/reelfishy-playlist\}/i);
  if (pl) {
    const items = [...pl[2].matchAll(/\{reelfishy\b(?!-)([^}]*)\}/gi)].map((m) => read(m[1])).filter((a) => a.src);
    if (items.length) return { found: true, attrs: items[0], playlist: { title: read(pl[1]).title || '', items } };
  }
  const m = txt.match(/\{reelfishy\b(?!-)([^}]*)\}/i);
  if (!m) return { found: false, text: txt.trim() };
  return { found: true, attrs: read(m[1]) };
};

async function listFolder(type, path) {
  const url = new URL(BROWSE.url, window.location.href);
  url.searchParams.set('type', type);
  url.searchParams.set('path', path || '');
  url.searchParams.set(BROWSE.token, '1');
  const res = await fetch(url.href, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }
  if (!res.ok || !json || json.success !== true) throw new Error((json && json.message) || `HTTP ${res.status}`);
  // com_ajax collects plugin results in an array; ours is the only one.
  const data = Array.isArray(json.data) ? json.data[0] : json.data;
  if (!data || !Array.isArray(data.folders)) throw new Error('Unexpected response');
  return data;
}

function open(editor) {
  addStyle();
  let sel = '';
  try { sel = (editor.getSelection && editor.getSelection()) || ''; } catch (e) { sel = ''; }
  const picked = parseTag(sel);
  const start = picked.found ? Object.assign({}, picked.attrs) : {};
  if (picked.playlist) ITEM.forEach((k) => { delete start[k]; });
  if (!picked.found && (VIDEO.test(picked.text || '') || hostedKind(picked.text))) start.src = picked.text;

  const dlg = el('dialog', 'rfp');
  dlg.setAttribute('aria-labelledby', 'rfp-title');

  const head = el('div', 'rfp-head');
  const title = el('h3', '', T('TITLE', 'Reel Fishy'));
  title.id = 'rfp-title';
  const x = el('button', 'rfp-x', '×');
  x.type = 'button';
  x.setAttribute('aria-label', T('CLOSE', 'Close'));
  x.title = T('CLOSE', 'Close');
  head.append(title, x);

  const body = el('div', 'rfp-body');
  const form = el('div', 'rfp-form');
  form.style.display = 'contents';
  const picker = el('div', 'rfp-picker');
  picker.hidden = true;
  body.append(form, picker);

  if (!OPT.enabled) form.append(el('p', 'rfp-note', T('NOT_ENABLED', 'The System - Reel Fishy plugin is off, so tags won\'t turn into players until it\'s enabled.')));
  if (picked.found) form.append(el('p', 'rfp-hint', T('EDITING', 'Editing the selected tag.')));
  form.append(el('p', 'rfp-hint', T('GROUP_HINT', 'Everything starts at the site\'s settings. Only what you change (marked •) goes into the tag.')));

  const ctl = {};
  const sections = {};
  let srcNote = null;
  let expanding = false;

  /* ---------- playlist: several videos in one player ---------- */
  const plist = picked.playlist ? picked.playlist.items.map((a) => Object.fromEntries(ITEM.filter((k) => a[k]).map((k) => [k, a[k]]))) : [];
  let plEdit = -1;
  const plBox = el('div', 'rfp-pl');
  const plToggle = el('label', 'rfp-check rfp-pl-on');
  const plOn = el('input', 'form-check-input');
  plOn.type = 'checkbox';
  plOn.id = 'rfp-pl-on';
  plOn.checked = !!picked.playlist;
  plToggle.htmlFor = 'rfp-pl-on';
  plToggle.append(plOn, ' ', T('PL_ON', 'Playlist: several videos in one player'));
  const plBody = el('div', 'rfp-pl-body');
  const plTitleWrap = el('div', 'rfp-field');
  const plTitleLab = el('label', '', T('PL_TITLE', 'Playlist title'));
  const plTitle = el('input', 'form-control form-control-sm');
  plTitle.id = 'rfp-pl-title'; plTitleLab.htmlFor = plTitle.id;
  plTitle.placeholder = `e.g. ${T('PL_TITLE_HINT', 'Barn tour')}`;
  plTitle.value = picked.playlist ? picked.playlist.title : '';
  plTitleWrap.append(plTitleLab, plTitle);
  const plList = el('ol', 'rfp-pl-list');
  const plEmpty = el('p', 'rfp-hint', T('PL_EMPTY', 'Fill in a video below, then Add to playlist. Repeat for each video. The look and behavior settings apply to the whole playlist.'));
  const plAdd = el('button', 'btn btn-sm btn-outline-primary', T('PL_ADD', 'Add to playlist'));
  plAdd.type = 'button';
  const plDone = el('button', 'btn btn-sm btn-link', T('PL_NEW', 'Cancel editing'));
  plDone.type = 'button'; plDone.hidden = true;
  const plRow = el('div', 'rfp-pl-actions');
  plRow.append(plAdd, plDone);
  plBody.append(plTitleWrap, plList, plEmpty, plRow);
  plBox.append(plToggle, plBody);
  form.append(plBox);
  GROUPS.forEach(([g, key, fb]) => {
    const d = el('details', 'rfp-sec');
    if (g === 'files') d.open = true;
    const s = el('summary', '', T(key, fb));
    const count = el('span', 'rfp-count');
    count.hidden = true;
    s.append(count);
    const grid = el('div', 'rfp-grid');
    d.append(s, grid);
    form.append(d);
    sections[g] = { grid, count, checks: null };
  });

  FIELDS.forEach(([name, kind, group, key, fb, xo = {}]) => {
    const id = `rfp-${name}`;
    const label = el('label', '', T(key, fb));
    label.htmlFor = id;
    let input;
    let wrap;

    if (kind === 'bool') {
      wrap = el('div', 'rfp-field rfp-check');
      input = el('input', 'form-check-input');
      input.type = 'checkbox';
      input.checked = name in start ? toBool(start[name]) : !!SITE[name];
      wrap.append(input, label);
      if (name === 'carry-over' && !SITE['carry-over']) {
        input.checked = false;
        input.disabled = true;
        wrap.append(el('p', 'rfp-hint', T('CARRY_OFF_SITE', 'Turned off site-wide in the plugin settings.')));
      }
      const sec = sections[group];
      if (!sec.checks) { sec.checks = el('div', 'rfp-checks'); sec.grid.append(sec.checks); }
      sec.checks.append(wrap);
    } else {
      wrap = el('div', 'rfp-field');
      if (kind === 'select') {
        input = el('select', 'form-select form-select-sm');
        xo.options.forEach(([v, k, f]) => input.add(new Option(T(k, f), v)));
        input.value = name in start ? start[name] : SITE[name];
        // keep a shape typed by hand, like 21:9
        if (input.selectedIndex < 0 && name === 'aspect' && /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(start[name] || '')) { input.add(new Option(start[name], start[name])); input.value = start[name]; }
        if (input.selectedIndex < 0) input.value = SITE[name];
      } else {
        input = el('input', 'form-control form-control-sm');
        input.type = kind === 'number' ? 'number' : 'text';
        if (kind === 'time') { input.inputMode = 'decimal'; input.autocomplete = 'off'; }
        if (xo.hint) input.placeholder = `e.g. ${xo.hint}`;
        ['min', 'max', 'step'].forEach((a) => { if (xo[a] !== undefined) input[a] = xo[a]; });
        if (name in start) input.value = start[name];
        else if (name === 'speeds') input.value = SITE.speeds;
        else if (name === 'search-offset' || name === 'end-lead') input.value = SITE[name];
        if (xo.required) input.required = true;
      }
      wrap.append(label);
      if (xo.browse && (BROWSE || mmCan(xo.browse))) {
        const row = el('div', 'rfp-row');
        const b = el('button', 'btn btn-sm btn-outline-secondary rfp-browse', T('BROWSE', 'Browse…'));
        b.type = 'button';
        b.setAttribute('aria-label', `${T('BROWSE', 'Browse…')} ${T(key, fb)}`);
        b.addEventListener('click', () => (mmCan(xo.browse) ? openMM(name, xo.browse, T(key, fb)) : browse(name, xo.browse, T(key, fb))));
        row.append(input, b);
        wrap.append(row);
      } else {
        wrap.append(input);
      }
      if ((FILES.includes(name) && name !== 'video-id') || name.endsWith('-image')) wrap.classList.add('rfp-wide');
      if (xo.help) wrap.append(el('p', 'rfp-hint', T(xo.help[0], xo.help[1])));
      if (name === 'src') { srcNote = el('p', 'rfp-hint rfp-src-note'); srcNote.hidden = true; wrap.append(srcNote); }
      sections[group].grid.append(wrap);
    }
    input.id = id;
    input.name = name;
    ctl[name] = { input, wrap, kind, group };
  });

  const itemName = (it) => it.label || (hostedKind(it.src) ? `${NAMES[hostedKind(it.src)] || 'TikTok'}: ${it.src.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}` : it.src.split('/').pop());
  // the per-video fields of the form, as an item
  const formItem = () => {
    const it = {};
    ITEM.forEach((k) => {
      const v = clean(ctl[k].input.value);
      if (!v) return;
      if (k === 'aspect' && v === SITE.aspect) return;
      if ((k === 'start' || k === 'end') && Number.isNaN(parseTime(v))) return;
      it[k] = v;
    });
    return it;
  };
  const clearItem = () => {
    ITEM.forEach((k) => { const { input, kind } = ctl[k]; if (kind === 'select') input.value = SITE[k]; else input.value = ''; });
  };
  const plRender = () => {
    plBody.hidden = !plOn.checked;
    ctl.src.input.required = !plOn.checked || !plist.length;
    plEmpty.hidden = plist.length > 0;
    plList.replaceChildren(...plist.map((it, i) => {
      const li = el('li', i === plEdit ? 'is-editing' : '');
      li.append(el('span', 'rfp-pl-name', itemName(it)));
      const mk = (txt, label, fn, dis) => { const b = el('button', 'btn btn-sm btn-link', txt); b.type = 'button'; b.title = label; b.setAttribute('aria-label', `${label}: ${itemName(it)}`); b.disabled = !!dis; b.addEventListener('click', fn); return b; };
      li.append(
        mk('↑', T('PL_UP', 'Move up'), () => { [plist[i - 1], plist[i]] = [plist[i], plist[i - 1]]; if (plEdit === i) plEdit--; else if (plEdit === i - 1) plEdit++; plRender(); refresh(); }, i === 0),
        mk('↓', T('PL_DOWN', 'Move down'), () => { [plist[i + 1], plist[i]] = [plist[i], plist[i + 1]]; if (plEdit === i) plEdit++; else if (plEdit === i + 1) plEdit--; plRender(); refresh(); }, i === plist.length - 1),
        mk(T('PL_EDIT', 'Edit'), T('PL_EDIT', 'Edit'), () => { plEdit = i; clearItem(); ITEM.forEach((k) => { if (it[k]) ctl[k].input.value = it[k]; }); sections.files.grid.closest('details').open = true; plRender(); refresh(); ctl.src.input.focus(); }),
        mk('×', T('PL_REMOVE', 'Remove'), () => { plist.splice(i, 1); if (plEdit === i) { plEdit = -1; clearItem(); } else if (plEdit > i) plEdit--; plRender(); refresh(); }),
      );
      return li;
    }));
    plAdd.textContent = plEdit > -1 ? T('PL_SAVE', 'Save this video') : T('PL_ADD', 'Add to playlist');
    plDone.hidden = plEdit < 0;
  };
  plAdd.addEventListener('click', () => {
    const it = formItem();
    if (!it.src) { err.hidden = false; ctl.src.input.focus(); return; }
    if (plEdit > -1) plist[plEdit] = it; else plist.push(it);
    plEdit = -1;
    clearItem();
    plRender(); refresh();
    ctl.src.input.focus();
  });
  plDone.addEventListener('click', () => { plEdit = -1; clearItem(); plRender(); refresh(); });
  plOn.addEventListener('change', () => { plRender(); refresh(); });
  plTitle.addEventListener('input', () => refresh());

  const tagbox = el('div', 'rfp-tagbox');
  const err = el('p', 'rfp-err', T('SRC_REQUIRED', 'Add a video file or link to insert the tag.'));
  err.hidden = true;
  const tagOut = el('pre', 'rfp-tag');
  tagOut.setAttribute('aria-live', 'polite');
  tagOut.setAttribute('aria-label', T('TAG', 'Your tag'));
  tagbox.append(el('span', 'rfp-hint', T('TAG', 'Your tag')), tagOut, err);

  const foot = el('div', 'rfp-foot');
  const bReset = el('button', 'btn btn-link btn-sm rfp-reset', T('RESET', 'Reset to site settings'));
  const bCancel = el('button', 'btn btn-outline-secondary', T('CANCEL', 'Cancel'));
  const bInsert = el('button', 'btn btn-primary', T(picked.found ? 'UPDATE' : 'INSERT', picked.found ? 'Update tag' : 'Insert video'));
  [bReset, bCancel, bInsert].forEach((b) => { b.type = 'button'; });
  foot.append(bReset, bCancel, bInsert);

  dlg.append(head, body, tagbox, foot);
  document.body.append(dlg);

  // Which value this control would write, or null when it matches the site.
  const diff = (name) => {
    const { input, kind, wrap } = ctl[name];
    if (wrap.hidden) return null;
    if (FILES.includes(name)) return clean(input.value) || null;
    if (kind === 'bool') {
      if (input.disabled) return null;
      if (input.checked === !!SITE[name]) return null;
      const xo = (FIELDS.find((f) => f[0] === name) || [])[5] || {};
      return input.checked ? (xo.on || 'on') : (xo.off || 'off');
    }
    if (kind === 'select') return input.value === SITE[name] ? null : input.value;
    if (kind === 'time') {
      const v = clean(input.value), n = parseTime(v);
      if (!v || Number.isNaN(n)) return null;
      if (name === 'start') return n > 0 ? v : null;
      const st = parseTime(clean(ctl.start.input.value));
      return n > (Number.isNaN(st) ? 0 : st) ? v : null;
    }
    if (name === 'search-offset' || name === 'end-lead') { const n = parseFloat(input.value); return Number.isFinite(n) && !numEq(n, SITE[name]) ? String(n) : null; }
    if (name === 'speeds') { const v = normSpeeds(input.value); return v && v !== normSpeeds(SITE.speeds) ? v : null; }
    const v = clean(input.value);
    return v && v !== clean(SITE[name]) ? v : null;
  };
  // show the site's end screen text as placeholders, so empty clearly means "the site's"
  ['end-message', 'end-button', 'end-url', 'end-button-2', 'end-url-2'].forEach((n) => { if (SITE[n]) ctl[n].input.placeholder = SITE[n]; });

  const itemParts = (it) => ITEM.filter((k) => it[k]).map((k) => `${k}="${clean(it[k])}"`);
  // the videos a playlist will hold right now: the list, with the form's video added or saved in place
  const plItems = () => {
    const cur = formItem(), out = plist.slice();
    if (cur.src) { if (plEdit > -1) out[plEdit] = cur; else out.push(cur); }
    return out;
  };
  const tag = () => {
    const shared = [];
    FIELDS.forEach(([name]) => {
      if (plOn.checked && ITEM.includes(name)) return;
      const v = diff(name);
      if (v !== null) shared.push(`${name}="${clean(v)}"`);
    });
    if (plOn.checked) {
      const items = plItems();
      if (!items.length) return '{reelfishy-playlist}\n{/reelfishy-playlist}';
      const t = clean(plTitle.value);
      const lines = items.map((it, i) => `{reelfishy ${itemParts(it).concat(i ? [] : shared).join(' ')}}`);
      return [`{reelfishy-playlist${t ? ` title="${t}"` : ''}}`, ...lines, '{/reelfishy-playlist}'].join('\n');
    }
    return shared.length ? `{reelfishy ${shared.join(' ')}}` : '{reelfishy}';
  };
  // editors that hold HTML get one paragraph per line, so each tag sits on its own line
  const htmlOut = (t) => t.split('\n').map((ln) => `<p>${ln.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('');

  const refresh = () => {
    const counts = {};
    // a YouTube / Vimeo link: say so, warn if the site has them off, hide what doesn't apply
    const hk = hostedKind(clean(ctl.src.input.value));
    FILE_ONLY.forEach((n) => { ctl[n].wrap.hidden = !!hk; });
    srcNote.hidden = !hk;
    if (hk === 'tiktok-short') {
      srcNote.classList.add('rfp-note');
      if (!expanding) srcNote.textContent = T('TIKTOK_SHORT', 'Short TikTok links can\'t play in the player. Open it in your browser and paste the full link (tiktok.com/@name/video/…).');
    } else if (hk) {
      const name = NAMES[hk];
      srcNote.classList.toggle('rfp-note', !EMBEDS[hk]);
      srcNote.textContent = EMBEDS[hk]
        ? T(`${hk.toUpperCase()}_ON`, `${name} video: it plays in ${name}'s own player, with your transcript, chapters and the Reel Fishy bar beside it.${hk === 'tiktok' ? ' TikTok\'s player has no speed control.' : ''}`)
        : T(`${hk.toUpperCase()}_OFF`, `${name} videos are turned off in the plugin settings, so this tag shows a notice with a link instead.`);
    }
    FIELDS.forEach(([name, , group]) => {
      const changed = !FILES.includes(name) && diff(name) !== null;
      ctl[name].wrap.classList.toggle('rfp-changed', changed);
      if (changed) counts[group] = (counts[group] || 0) + 1;
    });
    GROUPS.forEach(([g]) => {
      const n = counts[g] || 0;
      sections[g].count.hidden = !n;
      sections[g].count.textContent = n;
    });
    ['start', 'end'].forEach((n) => {
      const v = clean(ctl[n].input.value), t = parseTime(v);
      const st = parseTime(clean(ctl.start.input.value));
      const bad = v !== '' && (Number.isNaN(t) || (n === 'end' && !Number.isNaN(st) && t <= st));
      ctl[n].input.classList.toggle('is-invalid', bad);
    });
    TRACKS.forEach((n) => { ctl[n].input.classList.toggle('is-invalid', /(^|;)\s*xx:/i.test(ctl[n].input.value)); });
    tagOut.textContent = tag();
    if (clean(ctl.src.input.value) || (plOn.checked && plist.length)) err.hidden = true;
    bInsert.textContent = plOn.checked ? T(picked.playlist ? 'PL_UPDATE' : 'PL_INSERT', picked.playlist ? 'Update playlist' : 'Insert playlist') : T(picked.found ? 'UPDATE' : 'INSERT', picked.found ? 'Update tag' : 'Insert video');
  };
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  plRender();
  refresh();

  // a short TikTok link (vm.tiktok.com/…) is swapped for the full link it leads to, via the system plugin
  const expand = async () => {
    const v = clean(ctl.src.input.value);
    if (hostedKind(v) !== 'tiktok-short' || !BROWSE || expanding) return;
    expanding = true;
    srcNote.textContent = T('TIKTOK_EXPANDING', 'Getting the full TikTok link…');
    let full = '';
    try {
      const url = new URL(BROWSE.url, window.location.href);
      url.searchParams.set('task', 'resolve');
      url.searchParams.set('url', v);
      url.searchParams.set(BROWSE.token, '1');
      const res = await fetch(url.href, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const json = await res.json();
      const data = json && json.success && (Array.isArray(json.data) ? json.data[0] : json.data);
      full = (data && data.url) || '';
    } catch (e) { full = ''; }
    expanding = false;
    if (full && clean(ctl.src.input.value) === v) { ctl.src.input.value = full; refresh(); }
    else { refresh(); if (!full) srcNote.textContent = T('TIKTOK_SHORT_FAIL', 'Couldn\'t expand that short TikTok link. Open it in your browser and paste the full link (tiktok.com/@name/video/…).'); }
  };
  ctl.src.input.addEventListener('change', expand);
  expand();

  const reset = () => {
    FIELDS.forEach(([name, kind]) => {
      const { input } = ctl[name];
      if (FILES.includes(name)) return;
      if (kind === 'bool') { if (!input.disabled) input.checked = !!SITE[name]; } else if (kind === 'select') input.value = SITE[name];
      else if (name === 'speeds') input.value = SITE.speeds;
      else if (name === 'search-offset' || name === 'end-lead') input.value = SITE[name];
      else input.value = '';
    });
    refresh();
  };

  /* ---------- Browse picker ---------- */
  let pick = null; // { name, type, label, returnFocus }
  const lastDir = {}; // remember the folder per file type for this popup

  const showForm = () => {
    picker.hidden = true;
    picker.replaceChildren();
    form.style.display = 'contents';
    tagbox.hidden = false;
    foot.hidden = false;
    title.textContent = T('TITLE', 'Reel Fishy');
    if (pick && pick.returnFocus) pick.returnFocus.focus();
    pick = null;
  };

  // a picked file replaces the field, except a captions / descriptions list with languages, which it joins
  const putPath = (name, path) => {
    const { input } = ctl[name];
    const cur = clean(input.value);
    if (TRACKS.includes(name) && PAIR.test(cur.split(';')[0].trim())) input.value = `${cur}; ${langOf(path) || 'xx'}:${path}`;
    else input.value = path;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const choose = (path) => {
    putPath(pick.name, path);
    showForm();
  };

  const render = (data) => {
    const top = el('div', 'rfp-bar');
    const back = el('button', 'btn btn-sm btn-outline-secondary', T('BROWSE_BACK', '← Back to the form'));
    back.type = 'button';
    back.addEventListener('click', showForm);

    const crumb = el('nav', 'rfp-crumb');
    crumb.setAttribute('aria-label', T('BROWSE_TITLE', 'Choose a file'));
    const rootBtn = el('button', '', T('BROWSE_ROOT', 'Site'));
    rootBtn.type = 'button';
    rootBtn.addEventListener('click', () => go(''));
    crumb.append(rootBtn);
    let acc = '';
    (data.path ? data.path.split('/') : []).forEach((part) => {
      acc = acc ? `${acc}/${part}` : part;
      const to = acc;
      crumb.append(el('span', '', '/'));
      const b = el('button', '', part);
      b.type = 'button';
      b.addEventListener('click', () => go(to));
      crumb.append(b);
    });

    const grid = el('div', 'rfp-files');
    const tile = (cls, icon, name, onClick, ttl) => {
      const b = el('button', `rfp-item ${cls}`);
      b.type = 'button';
      b.title = ttl || name;
      if (typeof icon === 'string') b.insertAdjacentHTML('afterbegin', icon); else b.append(icon);
      b.append(el('span', 'rfp-name', name));
      b.addEventListener('click', onClick);
      grid.append(b);
      return b;
    };
    if (data.parent !== null && data.parent !== undefined) tile('rfp-up', ICON.up, T('BROWSE_UP', 'Up one level'), () => go(data.parent));
    data.folders.forEach((f) => tile('rfp-folder', ICON.folder, f, () => go(data.path ? `${data.path}/${f}` : f)));
    data.files.forEach((f) => {
      let icon = pick.type === 'video' ? ICON.video : ICON.vtt;
      let cls = 'rfp-file';
      if (pick.type === 'image' || pick.type === 'mascot') {
        icon = el('img');
        icon.alt = '';
        icon.loading = 'lazy';
        icon.src = siteUrl(f.path);
        if (/\.svg$/i.test(f.name)) cls += ' rfp-svgthumb';
      }
      tile(cls, icon, f.name, () => choose(f.path), `${T('BROWSE_PICK', 'Use')} ${f.path}`);
    });

    top.append(back, crumb);
    const nodes = [top];
    if (!data.folders.length && !data.files.length && !data.path) nodes.push(el('p', 'rfp-status', T('BROWSE_EMPTY', 'Nothing here to choose.')));
    else if (!data.files.length && !data.folders.length) nodes.push(grid, el('p', 'rfp-status', T('BROWSE_EMPTY', 'Nothing here to choose.')));
    else nodes.push(grid);
    if (data.more) nodes.push(el('p', 'rfp-hint', T('BROWSE_MORE', 'This folder has more files than can be shown. Type the path instead.')));
    picker.replaceChildren(...nodes);
    const first = grid.querySelector('.rfp-folder, .rfp-file') || grid.querySelector('.rfp-up') || back;
    first.focus();
  };

  const go = async (path) => {
    lastDir[pick.type] = path;
    const back = el('button', 'btn btn-sm btn-outline-secondary', T('BROWSE_BACK', '← Back to the form'));
    back.type = 'button';
    back.addEventListener('click', showForm);
    picker.replaceChildren(back, el('p', 'rfp-status', T('BROWSE_LOADING', 'Loading…')));
    try {
      render(await listFolder(pick.type, path));
    } catch (e) {
      const msg = el('p', 'rfp-status is-error', `${T('BROWSE_ERROR', 'Couldn\'t open that folder. You can still type the path.')} (${e.message})`);
      const home = el('button', 'btn btn-sm btn-link', T('BROWSE_ROOT', 'Site'));
      home.type = 'button';
      home.addEventListener('click', () => go(''));
      picker.replaceChildren(back, msg, home);
      back.focus();
    }
  };

  const browse = (name, type, label) => {
    // start in the folder of whatever is already in the field, else the last folder used
    const cur = firstFile(clean(ctl[name].input.value)).replace(/^\/+/, '');
    const folderOf = (v) => (v.includes('/') && !/^[a-z]+:\/\//i.test(v) ? v.split('/').slice(0, -1).join('/') : '');
    const srcDir = folderOf(clean(ctl.src.input.value).replace(/^\/+/, ''));
    const dir = folderOf(cur) || (lastDir[type] ?? (srcDir || lastDir.video || ''));
    pick = { name, type, label, returnFocus: document.activeElement };
    form.style.display = 'none';
    tagbox.hidden = true;
    foot.hidden = true;
    picker.hidden = false;
    title.textContent = `${T('BROWSE_TITLE', 'Choose a file')}: ${label}`;
    go(dir).then(() => {
      // a folder from the field that no longer exists falls back to the top
      if (picker.querySelector('.is-error') && dir) go('');
    });
  };

  /* ---------- Joomla Media Manager ---------- */
  const lastMM = {}; // Media Manager folder per file type for this popup

  // 'local-files:/demos/clip.mp4' -> 'files/demos/clip.mp4'; other adapters ask com_media for the URL
  const mmPath = async (path) => {
    const m = /^local-([^:]+):\/?(.*)$/.exec(path || '');
    if (m && (!MM.dirs.length || MM.dirs.includes(m[1]))) return `${m[1]}/${m[2]}`.replace(/\/+$/, '');
    const url = new URL(MM.api, window.location.href);
    url.searchParams.set('task', 'api.files');
    url.searchParams.set('url', '1');
    url.searchParams.set('path', path);
    url.searchParams.set('mediatypes', '0,1,2,3');
    url.searchParams.set(MM.token, '1');
    const res = await fetch(url.href, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const json = await res.json();
    const item = json && json.success && json.data && json.data[0];
    if (!item || !item.url) throw new Error('No URL');
    const root = String(MM.root || '');
    return root && item.url.startsWith(root) ? item.url.slice(root.length) : item.url;
  };

  // the Media Manager folder to open: the field's own folder, else the last one used for
  // this kind of file, else the video's folder (captions usually sit beside the video)
  const mmFolderOf = (value) => {
    const cur = clean(value).replace(/^\/+/, '');
    const parts = cur.split('/');
    return parts.length > 1 && MM.dirs.includes(parts[0]) && !/^[a-z]+:/i.test(cur) ? `local-${parts[0]}:/${parts.slice(1, -1).join('/')}` : '';
  };
  const mmStart = (name, kind) => {
    const own = mmFolderOf(firstFile(ctl[name].input.value));
    if (own) return own;
    if (lastMM[kind]) return lastMM[kind];
    const beside = name !== 'src' ? mmFolderOf(ctl.src.input.value) : '';
    if (beside) return beside;
    if (['video', 'vtt', 'doc'].includes(kind) && MM.dirs.includes('files')) return 'local-files:/';
    return '';
  };

  const openMM = (name, kind, label) => {
    const k = MM_KINDS[kind];
    let chosen = null;
    const onPick = (e) => {
      const d = e.detail || {};
      chosen = d.type === 'file' && d.path ? d : null;
    };
    const url = new URL(MM.url, window.location.href);
    url.searchParams.set('mediatypes', k.types);
    const startAt = mmStart(name, kind);
    if (startAt) url.searchParams.set('path', startAt);

    const prevModal = window.Joomla && Joomla.Modal && Joomla.Modal.getCurrent ? Joomla.Modal.getCurrent() : null;
    const returnFocus = document.activeElement;
    const buttons = [
      {
        label: T('SELECT', 'Select'),
        className: 'button button-success btn btn-success',
        location: 'header',
        onClick: async () => {
          if (!chosen) { mmDlg.close(); return; }
          try {
            const path = await mmPath(chosen.path);
            lastMM[kind] = chosen.path.replace(/\/[^/]*$/, '/');
            putPath(name, path);
          } catch (err2) {
            const { wrap } = ctl[name];
            let note = wrap.querySelector('.rfp-err');
            if (!note) { note = el('p', 'rfp-err'); wrap.append(note); }
            note.textContent = T('MM_NOTHING', 'Couldn\'t use that file. You can still type the path.');
          }
          mmDlg.close();
        },
      },
    ];
    if (BROWSE) {
      buttons.push({
        label: T('SIMPLE_PICKER', 'Simple picker'),
        className: 'btn btn-outline-secondary',
        location: 'header',
        onClick: () => { mmDlg.close(); browse(name, kind, label); },
      });
    }
    buttons.push({ label: '', ariaLabel: T('CLOSE', 'Close'), className: 'button-close btn-close', data: { buttonClose: '', dialogClose: '' }, location: 'header' });

    const mmDlg = new JoomlaDialog({
      popupType: 'iframe',
      src: url.href,
      textHeader: `${T('BROWSE_TITLE', 'Choose a file')}: ${label}`,
      width: '1100px',
      height: '80vh',
      popupButtons: buttons,
    });
    // the class tells Joomla's media-select script this is a field picker, so it adds no image options
    mmDlg.classList.add('joomla-dialog-media-field', 'rfp-mm');
    document.addEventListener('onMediaFileSelected', onPick);
    mmDlg.addEventListener('joomla-dialog:close', () => {
      document.removeEventListener('onMediaFileSelected', onPick);
      if (window.Joomla && Joomla.Modal && Joomla.Modal.setCurrent) Joomla.Modal.setCurrent(prevModal);
      if (window.Joomla) Joomla.selectedMediaFile = {};
      mmDlg.destroy();
      if (returnFocus && returnFocus.focus) returnFocus.focus();
    });
    mmDlg.show();
    if (window.Joomla && Joomla.Modal && Joomla.Modal.setCurrent) Joomla.Modal.setCurrent(mmDlg);
  };

  /* ---------- dialog wiring ---------- */
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('cancel', (e) => {
    // Escape inside the picker goes back to the form instead of closing everything
    if (!picker.hidden) { e.preventDefault(); showForm(); }
  });
  x.addEventListener('click', close);
  bCancel.addEventListener('click', close);
  bReset.addEventListener('click', reset);
  bInsert.addEventListener('click', () => {
    if (plOn.checked) {
      if (!plItems().length) { err.hidden = false; ctl.src.input.focus(); return; }
      const t = tag();
      editor.replaceSelection(htmlOut(t));
      close();
      return;
    }
    if (!clean(ctl.src.input.value)) {
      err.hidden = false;
      ctl.src.input.focus();
      return;
    }
    editor.replaceSelection(tag());
    close();
  });

  dlg.showModal();
  ctl.src.input.focus();
}

JoomlaEditorButton.registerAction('insert-reelfishy', open);
