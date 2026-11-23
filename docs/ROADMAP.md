# Reel Fishy: roadmap

Current release: **1.2.0** (stable). Package `pkg_reelfishy`: the system plugin `plg_system_reelfishy` plus the editor button `plg_editors-xtd_reelfishy`. Called Bioluminescence (`pkg_bioluminescence`) up to 1.0.1.

## Stages to 1.0

Each stage is a testing release. Landing page HTML waits until 1.0.

| Stage | Version | What's in it |
|---|---|---|
| 1 ✓ | 0.5.0 | Browse with Joomla's Media Manager (built-in picker as fallback) and a README how-to · transcript download link (`transcript-file`) · SRT captions · hooks for a future component |
| 2 ✓ | 0.6.0 | **Loop and end:** `loop` option, and an `end` time next to `start` · **Share:** a link to a moment, a span (start to end), or a looping span, plus per transcript line · VideoObject structured data for search, with the transcript · load on click (poster only until play) |
| 3 ✓ | 0.7.0 | YouTube and Vimeo, each with an admin on/off switch, a click-to-load privacy screen, youtube-nocookie and Vimeo do-not-track, and their own player inside the Reel Fishy shell |
| 3.1 ✓ | 0.7.1 | TikTok (embed player v1, postMessage) · `aspect` setting, Shorts / TikTok auto 9:16, files take their own shape · portrait layout (phone column, transcript beside) · short TikTok links expanded by the editor |
| 4 ✓ | 0.8.0 | Caption languages menu and viewer caption style (size, background, remembered) · audio description read aloud from a VTT · end-screen call to action |
| 5 ✓ | 0.9.0 | Sparkle pack: ambient glow, end confetti, theater mode, hover thumbnails, timed hotspots, playlist / up next · end screen fades in early (`end-lead`, default 2s) |
| 6 ✓ | 1.0.0 | Polish (playlist builder in the editor popup, structured data deduped), full test pass (35 suites), landing page rolled up with everything plus the YouTube Short demo (https://youtube.com/shorts/0rylGW24JE4) |
| 6.1 ✓ | 1.0.1 | Packaging only: `<updateservers>` collection tag on the package, `script.php` (PHP 8.2+ / Joomla 5+ preflight; enables plugins on first install, keeps existing ones' state), `LICENSE.txt`, and `build.py` |
| 7 ✓ | 1.1.0 | Renamed Bioluminescence → Reel Fishy everywhere (package, plugins, classes, namespaces, language keys, media folders, `onReelFishyRender`, com_ajax `plugin=reelfishy`). Installer moves sites over. No player changes |
| 8 ✓ | 1.2.0 | Hover preview on the poster · frame tools (step, save PNG) · `mailto:` / `tel:` / `sms:` end screen and hotspot links. Cheat sheet and training guide made |

## 1.2.0 details (2026-11-17)

- **Hover preview:** before the first play, a mouse resting on the stage for 300 ms fades in a second, muted `<video>` over the poster, looping 6 s from `start` (or from the `hover-preview` time). Site `hover_preview` (default on), tag `hover-preview` = on / off / a time. Skipped for embeds, `lazy="click"`, carried or docked players, touch (pointer type mouse only), `prefers-reduced-motion`, and Save-Data. Removed on the first real play and on `load()`.
- **Frame tools:** *Grab a frame* in the Share panel (‹ Frame, Frame ›, Save frame) plus `,` / `.` keys. Frame length measured with `requestVideoFrameCallback` while playing (1/30 s until then, a guess at the common rate). Save frame draws the frame to a canvas and downloads `<video-id or label>-<time>.png`; a cross-origin file without CORS says the site doesn't allow it. Site `frame_tools` (default on), tag `frame-tools`. Files only.
- **Links:** the plugin's URL check passes `mailto:`, `tel:` and `sms:` through untouched; the player opens them in place, not in a new tab (end screen and hotspots).
- **Tested:** 21 new browser checks, the 35 regression suites, and a 1.1.0 → 1.2.0 update on the Joomla 5.4 test site (settings kept, new options default on, bad `hover-preview` and `javascript:` values dropped).
- **Guides:** *Reel Fishy Cheat Sheet: Adding Videos* (2-page PDF, HTML source, the Unfolder sheet layout) and *Reel Fishy Training: Adding Videos* (Word, 27 pages, Pecking Order / SquidForm guide style, real Joomla 5.4 admin screenshots, critter tips: Bai Tu, Tancho, Cocoa, Kokido, G. Hawke, Ziggy). Sources in `reel-fishy-guides-source-1.2.0.zip`; the manual builds with `node build-manual.js pages.json`, then `finish.py` fills the Contents page numbers.

## The rename (1.1.0, decided 2026-11-17)

- Joomla treats a renamed plugin as a new extension, so 1.1.0 installs **beside** Bioluminescence, not over it.
- **script.php moves sites over:** preflight looks for the old `system/bioluminescence` and `editors-xtd/bioluminescence` plugins; postflight copies the old plugins' settings into the new ones (only on install, and only if the old settings aren't empty), switches the old plugins off, switches the new ones on, and shows a message asking the admin to uninstall the old package.
- **Verified on a real Joomla 5.4 test site (PostgreSQL):** settings copied exactly, new plugins on, old off, the article rendered one player from `media/plg_system_reelfishy`, com_ajax `plugin=reelfishy` answered (permission error, as expected for a guest). Uninstalling the old package removed both old plugins and their media; the "Chaotic Fish Design" update site stayed, now linked to `pkg_reelfishy`. A fresh install (no Bioluminescence) gave defaults with both plugins on.
- **Not seen:** the admin message itself, because the CLI installer doesn't print queued messages. Check it when installing through the admin.
- Tags (`{reelfishy}`, `{reelfishy-playlist}`), the `<reel-fishy>` element, `ReelFishy` JS and the `reelfishy:` localStorage keys were already named Reel Fishy, so content and visitors' saved choices carry over untouched.
- **Clean-up left:** rename the jDownloads entry (still `12-package-bioluminescence-reel-fishy`; the landing page links to it, so change the links if the slug changes); add `pkg_reelfishy` to the update registry; retire `pkg_bioluminescence` there. Old 1.0.1 sites get no update offer for 1.1.0 (different element), so they install it by hand once (or the update chat can publish 1.1.0 under the old element too; this is a guess at what's wanted).

## Building (from 1.0.1; names from 1.1.0)

`python3 build.py` in the package folder, with `packages/plg_system_reelfishy/media/js/reel-fishy.js` as the player source.
- **Checks:** the version in every manifest, both JS headers, `ReelFishy.version`, and the README (version line, zip name, changelog); the update server tag on the package only; CSS property order; PHP lint.
- **Builds:** minifies the player, then writes `dist/pkg_reelfishy-<v>.zip` (install) and `-source.zip`. Zips are deterministic, so a rebuild of the same source gives the same checksum.
- **Update XML:** calls `cfd_update.release('pkg_reelfishy', zip)` when `CFD_UPDATES` or `../cfd-updates` exists. Otherwise, or when the generator refuses, it finishes with a note.
- Existing sites on 1.0.0 or earlier need 1.0.1 installed once to get the update site.

Decided against:
- reading TXT, DOC, DOCX or PDF into the transcript panel. They only appear as a download link.
- **Instagram** (decided 0.7.1): no player API, it needs a Meta app and access token, and Meta's embeds don't support Shadow DOM.

## 0.7.0 details (YouTube and Vimeo)

- **Their player, their controls.** The Reel Fishy bar sits below their iframe and drives it through their official APIs (`youtube.com/iframe_api`, `player.vimeo.com/api/player.js`). These load only after the visitor presses play. An `Embed` adapter makes their player look like a `<video>`, so transcript, chapters, clips, share links, resume, mini player and carry-over all work unchanged.
- **Terms (YouTube Required Minimum Functionality):** nothing overlays their player. Captions, toasts, share panel, speed menu and dock buttons go below it. Sparkle bursts and the fish loader are off for embeds. The player stays at least 200×200: docked at 360 px, no docking or carry-over under 388 px viewport width. The Referer is kept (`referrerpolicy="strict-origin-when-cross-origin"`). There's a Watch on YouTube / Vimeo link, and pressing play is the only gate.
- **Privacy:** the screen loads nothing (no iframe, script or thumbnail) until play. An optional "always load" choice is saved per service in localStorage (`reelfishy:ok:youtube` / `vimeo`). The YouTube thumbnail option is off by default because it contacts YouTube. Videos always use youtube-nocookie and Vimeo `dnt=1`. Public `play()` can't bypass the screen.
- **Plugin options (new "YouTube and Vimeo" tab):** allow_youtube, allow_vimeo, privacy_screen, privacy_remember, privacy_thumbs, privacy_text (`{service}`).
- **Structured data:** `embedUrl` for embeds, plus YouTube's thumbnail when there's no poster. Switched-off services are skipped.
- **Known differences:** Vimeo speed works only on some accounts (the player shows a notice when Vimeo refuses). Their own captions stay inside their player.
- **Tested only against stand-in APIs**, not live YouTube or Vimeo. Fishie's live test is the real check.

## 0.7.1 details

- **Portrait layout (decided: layout A):** when the ratio is ≤ 1, the player becomes a centered column `min(420px, min(80vh, 720px) × ratio)` wide. The transcript sits beside it when the host is at least column + transcript width; otherwise it goes below. The docked mini player is 225 px wide; for embeds it docks only when the viewport is at least 540 px tall.
- **Shape order:** the `aspect` attribute, then 9:16 for Shorts and TikTok, then the file's videoWidth/videoHeight, then 16:9.
- **TikTok:** `tiktok.com/player/v1/<id>`, commands `{type, value, 'x-tiktok-player': true}`, events onPlayerReady / onStateChange / onCurrentTime / onMute / onVolumeChange / onPlayerError. No speed or volume level (mute only), so those controls are hidden. No start parameter, so it seeks after ready.
- **Short links:** the system plugin's com_ajax `task=resolve` follows redirects by hand, HTTPS and tiktok.com only, up to 5 hops. This is untested against live TikTok.

## 0.8.0 details (decided)

- **Caption languages:** explicit pairs, `captions="en:a.vtt; es:b.vtt"`. A plain single file still works. The first pick matches the browser language, and the visitor's choice is saved in localStorage `reelfishy:cc`, along with size, background and AD. The transcript follows the caption language unless `transcript` is set.
- **CC button:** tap toggles; hold, right-click or ↑↓ opens a menu (Captions / Size / Background), the same pattern as speed. Sizes are S 0.75, M 1, L 1.3, XL 1.65 (`--rf-cc-scale`). Backgrounds are solid, see-through, or none (outline).
- **Audio description:** `descriptions` VTT plus speechSynthesis. **Duck, then pause if long:** the volume drops to 35% while speaking; if speech outlasts the cue's end, the video pauses until speech ends, then resumes. A user pause or seek cancels the speech. TikTok doesn't duck (mute only). `descriptions-on` / site `descriptions_on`.
- **End screen:** a message and 2 buttons, plus Replay. Site defaults live in the End screen tab; per-tag `end-message`, `end-button`, `end-url`, `end-button-2`, `end-url-2` fall back field by field; `end-screen="off"` disables it. It shows only when there's a message or button. External links open in a new tab. For embeds it sits in the strip under the player.

## 0.9.0 details (decided)

- **End lead:** the end screen fades in `end-lead` seconds (default 2, site `end_lead`, 0 to 15) before the real end, while the video plays on. Not for clips or loops. Seeking hides it. Up next is added only once the video has actually ended.
- **Thumbnails (decided: live plus optional VTT):** a `thumbnails` VTT (sprite `#xywh=`, URLs relative to the VTT) wins. Otherwise local files use live frames from a hidden copy of the video (mouse only; seeks throttled to one at a time). Embeds get VTT only. Site `previews` switch.
- **Hotspots (decided: VTT):** the cue text is `Label | link | corner`. `t=` / `@` links seek; same-site links navigate (carry-over follows), other sites open a new tab. Corners tl/tr/bl/br stack. For embeds they sit in the strip under the player.
- **Playlist (decided: wrapper tag):** `{reelfishy-playlist title}…{/reelfishy-playlist}`. The plugin renders one `<reel-fishy>` from the first tag, with a `playlist` JSON attribute (per-video attributes only: src, poster, captions, descriptions, chapters, transcript, transcript-file, label, video-id, start, end, loop, aspect, thumbnails, hotspots) and `playlist-title`. The list sits under the bar. Up next counts down 5s. `#rf=<item video-id>` switches the item. Carry-over writes the current item's attributes plus `playlist-index`.
- **Glow:** the average colour of an 8×5 canvas sample every 700ms while playing; tainted canvas or embeds fall back to accent-3. **Confetti:** a 150-piece shower on ended (files only). **Theater:** a fixed, centred player with a dim backdrop; the transcript sits beside it when there's room; W / Esc / backdrop click.
- **Popup playlist builder:** shipped in 1.0.0.

## After 1.0 (ideas, nothing scheduled)

- The Reel Fishy component (below): playlists managed in the admin, and a search across every transcript on the site.
- Parked from the original list: glitter trail on the seek handle, skins per video, Konami-code fish rain. (Frame step, save frame and hover preview shipped in 1.2.0, as did `mailto:` / `tel:` links.)

## Bigger project later: a Reel Fishy component

A separate component for **playlists** and **searching every transcript on the site**. **Decided (Fishie, 2026-11-17): it pairs with the plugin, not a replacement.** The plugin keeps working on its own; the component adds to it. Scope still to be discussed. Hooks for it shipped in 0.5.0 (README, "For developers"):
- `video-id` on each player
- player events: `reelfishy:ready`, `play`, `pause`, `seeked`, `ended`, `cuechange`. They bubble, and their detail carries `player`, `id`, `src`, `source` (file/youtube/vimeo, since 0.7.0) and `time`.
- `player.load()` to swap videos (for playlists; switches between files and YouTube / Vimeo since 0.7.0), plus `play()`, `pause()` and `seek()`
- `ReelFishy.parseVTT()` to parse WebVTT and SRT into cues; `ReelFishy.embedOf()` to identify hosted links
- the Joomla event `onReelFishyRender` (was `onBioluminescenceRender` before 1.1.0) (context, itemId, itemTitle, attributes), fired for every rendered player, so a listener can index videos and transcripts

## Media Manager notes (verified in Joomla 5.0 and 6.1 source)

- Joomla's media field opens com_media in a `JoomlaDialog` iframe at `index.php?option=com_media&view=media&tmpl=component&mediatypes=…&asset=…&author=…&path=<adapter>:/<folder>`. It adds the class `joomla-dialog-media-field` and calls `Joomla.Modal.setCurrent()`. Reel Fishy does the same.
- The iframe fires `onMediaFileSelected` on `window.parent.document`. The detail is `{ type, name, path: 'local-files:/x/y.mp4', extension, fileType, … }`, and clicking a file again sends an empty detail.
- Media types: 0 images, 1 audio, 2 video, 3 documents. The Media Manager lists a file when its extension is in that type's list (`image_extensions`, `video_extensions`, `doc_extensions`), per `ApiModel::isMediaFile`. Uploading also needs `restrict_uploads_extensions`.
- Local adapter paths map to `<directory>/<rest>`. Other adapters resolve through `com_media&format=json&task=api.files&url=1&path=…` (`data[0].url`).
- In Joomla 6.1, *Filesystem - Local* includes `images` and `files` by default; in Joomla 5 only `images`.
- Editor buttons: TinyMCE shows them in its **CMS Content** toolbar menu (confirmed by Fishie). JCE supports the same editor API on Joomla 5+.

## Ideas parked for later

- From the original list: glitter trail on the seek handle, skins/themes per video, Konami-code fish rain. (A–B loop moved into 0.6.0; frame step, save frame and hover preview into 1.2.0.)
