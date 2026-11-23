# Reel Fishy

A self-contained, sparkly video player for Joomla 5 and 6, by Chaotic Fish Design.
One script, no dependencies. Its CSS lives inside the player (Shadow DOM), so it can't clash with your template.

**Version:** 1.2.0 · **License:** GPL v2 or later · **Needs:** Joomla 5 or 6, PHP 8.2+

## What's in the package

| Extension | What it does |
|---|---|
| `plg_system_reelfishy` | Turns `{reelfishy …}` tags into players, loads the script, holds the options |
| `plg_editors-xtd_reelfishy` | **Reel Fishy** editor button: a popup that builds the tag for you |

## Install

1. **System → Install → Extensions**, upload `pkg_reelfishy-1.2.0.zip`.
2. That's it. On a first install both plugins are switched on for you:
   - *System - Reel Fishy*
   - *Button - Reel Fishy*

   A plugin that was already installed keeps its on/off setting. The installer stops, and says why, on PHP below 8.2 or Joomla below 5.

### Moving from Bioluminescence

Up to 1.0.1, Reel Fishy was called **Bioluminescence**. Joomla sees the renamed package as a new extension, so it installs beside the old one rather than over it. The installer takes care of the switch:

1. Install `pkg_reelfishy-1.2.0.zip` (or any later version) as usual. If the old plugins are found, their settings are copied into Reel Fishy and the old plugins are switched off, so tags aren't turned into players twice. A yellow message says so.
2. **System → Manage → Extensions**, search for *Bioluminescence*, and uninstall the **package**. That removes both old plugins.

Your `{reelfishy}` tags don't change. If you uninstall the old package first instead, nothing is lost but its settings; set them again in **System → Plugins → System - Reel Fishy**.

**For developers:** the server event is now `onReelFishyRender` (was `onBioluminescenceRender`), and the editor's file endpoint is `com_ajax&plugin=reelfishy`.

### Updates

Reel Fishy updates through Joomla: **System → Update → Extensions** offers new versions, and **System → Update Sites** lists one entry, *Chaotic Fish Design*, shared by every CFD extension.

## Add a video

Click the **Reel Fishy** button. Where it lives depends on your editor:

- **TinyMCE:** in the **CMS Content** menu on the toolbar.
- **CodeMirror and Editor - None:** below the editor, with the Article, Image and Read More buttons.
- **JCE:** also below the editor, with the other buttons. This is a guess from reading JCE's code; I haven't tested it in JCE.

A popup opens with four groups: **Files**, **Look**, **Behavior** and **Advanced**. Everything starts at the plugin's settings, and only what you change is written into the tag (changed options are marked •). The tag builds itself at the bottom as you go.

- **Editing:** select an existing tag before clicking the button to open it in the popup. The button then says *Update tag*.
- **Quick start:** select a video path or a YouTube / Vimeo / TikTok link first and it fills it in. A short TikTok link (`vm.tiktok.com/…`) is swapped for the full link automatically.
- **Browse:** every file field has a **Browse…** button.
  - **In the administrator** it opens Joomla's own **Media Manager**, the same picker as the Media button, with upload and new folder. It only shows the right kind of file for the field. Click a file, then **Select**.
  - **The fallback:** if the Media Manager can't show that kind of file (see [Set up the Media Manager](#set-up-the-media-manager)), the user can't manage media, or you're editing on the front end, you get the built-in simple picker instead. It's also a **Simple picker** button in the Media Manager's header.
  - **Where it opens:** the folder of the file already in the field, else the last folder you used for that kind of file, else the video's folder. So captions open next to the video.

Or type the tag yourself:

```
{reelfishy src="images/videos/kitty.mp4" poster="images/videos/kitty.jpg" captions="images/videos/kitty.vtt" label="Treadmill kitty"}
{reelfishy src="https://www.youtube.com/watch?v=XXXXXXXXXXX" captions="images/videos/song.vtt" label="Our song"}
```

Tags work in articles and in Custom modules with **Prepare Content** turned on.
Paths without a leading `/` or `https://` are treated as relative to the site root.

### Playlists

Wrap several tags in `{reelfishy-playlist}` to get one player with a track list under it. The editor button builds it for you: tick **Playlist**, fill in a video and click **Add to playlist**, repeat, then **Insert playlist**. Reorder, edit or remove videos in the list, and select an existing playlist before clicking the button to change it. Or type it:

```
{reelfishy-playlist title="Barn tour"}
{reelfishy src="files/barn/1-arrival.mp4" label="Arrival" video-id="barn-1" captions="files/barn/1.vtt"}
{reelfishy src="files/barn/2-hay.mp4" label="Hay math" video-id="barn-2"}
{reelfishy src="https://youtu.be/XXXXXXXXXXX" label="Tancho's big day" video-id="barn-3"}
{/reelfishy-playlist}
```

- **The first tag sets the look and behavior** (icons, sparkles, speeds and so on). Each tag keeps its own video, poster, captions, descriptions, chapters, transcript, thumbnails, hotspots, label, `video-id`, start, end, loop and shape.
- **Up next:** when a video ends, the end screen shows the next one with a 5-second countdown, **Play now** and **Cancel**. Videos can mix files, YouTube, Vimeo and TikTok (a YouTube video still waits behind its privacy screen).
- **Shift+N / Shift+P** play the next / previous video.
- **Give each video a `video-id`.** Share links (`#rf=barn-2&t=30`) then open that video in the playlist, and carry-over keeps the right one.
- The wrapper can sit in separate paragraphs, the way editors put each tag on its own line.

To show a tag as an example, put it in a `<pre>` or `<code>` block, or start it with a backslash: `\{reelfishy …}`. Either way it prints as text.

### Tag attributes

Every attribute except `src` is optional. Attributes override the plugin options for that one player.

| Attribute | Example | What it does |
|---|---|---|
| `src` | `images/videos/clip.mp4` | The video: an MP4/WebM file, or a YouTube, Vimeo or TikTok link (see [YouTube, Vimeo and TikTok](#youtube-vimeo-and-tiktok)). **Required.** |
| `poster` | `images/videos/clip.jpg` | Image shown before playing |
| `captions` | `images/videos/clip.vtt` | WebVTT or SRT captions; also feeds the transcript. For several languages: `en:clip.vtt; es:clip-es.vtt` (see [Captions](#captions-languages-and-style)) |
| `descriptions` | `images/videos/clip-desc.vtt` | Audio description: a VTT of short descriptions, read aloud when the visitor turns on **AD**. Languages work like `captions` |
| `descriptions-on` | `on` / `off` | Audio description on from the start (visitors can turn it off; their choice is remembered) |
| `transcript` | `images/videos/clip-full.vtt` | A different VTT or SRT just for the transcript. Without it, the transcript follows the caption language |
| `thumbnails` | `images/videos/clip-thumbs.vtt` | Seek-bar thumbnails from a thumbnails VTT (each cue points at an image, or a spot in a sprite: `sprite.jpg#xywh=0,0,160,90`). Without it, local files show live previews |
| `hotspots` | `images/videos/clip-hotspots.vtt` | Clickable labels at set times (see [Hotspots](#hotspots)) |
| `end-screen` | `on` / `off` | Show the end screen when the video finishes (it only appears when there's a message or a button) |
| `end-lead` | `2` | Seconds before the end that the end screen fades in, while the video finishes playing. `0` shows it only at the end |
| `end-message` | `Help us feed Tancho` | End screen message. Overrides the plugin's |
| `end-button` / `end-url` | `Donate` / `/donate` | End screen button 1. The link can be a page, `https://…`, `mailto:` or `tel:`. `end-button=""` hides the site's button 1 for this video |
| `end-button-2` / `end-url-2` | `Meet the herd` / `/herd` | End screen button 2 |
| `transcript-file` | `files/videos/clip.pdf` | TXT, DOC, DOCX or PDF. Adds a **Download transcript** button (opens in a new tab). Not searchable. |
| `chapters` | `images/videos/clip-chapters.vtt` | Chapter markers on the seek bar |
| `label` | `Treadmill kitty` | Name read by screen readers |
| `video-id` | `barn-tour` | A short, stable name for the video, for future playlists and site search |
| `start` | `42` or `1:30` | Start here. Seconds or m:ss / h:mm:ss |
| `end` | `2:15` | Stop here. With `start`, plays just that clip; pressing play again restarts the clip |
| `loop` | `on` / `off` | Repeat the video, or just the clip when there's an `end` |
| `lazy` | `click` / `off` | `click` shows only the poster until play, so the page loads faster. Use a poster with it |
| `aspect` | `auto` / `16:9` / `9:16` / `4:3` / `1:1` | The player's shape. `auto`: Shorts and TikTok are 9:16, video files use their own shape, everything else is 16:9. Use `9:16` for a vertical video posted as a regular YouTube link |
| `glow` | `on` / `off` | Ambient glow around the player in the video's colours |
| `confetti` | `on` / `off` | Confetti when the video finishes (needs sparkles) |
| `theater` | `on` / `off` | Theater mode button |
| `previews` | `on` / `off` | Live seek-bar previews for local files |
| `hover-preview` | `on` / `off` / `0:12` | A silent 6-second preview over the poster when a mouse rests on a video that hasn't played yet. A time starts the preview there (default: `start`, or the beginning). Video files only |
| `frame-tools` | `on` / `off` | **Grab a frame** in the Share panel: step one frame back or forward, save the frame as a PNG. Video files only |
| `icons` | `fishy` / `classic` / `minimal` | Button style |
| `sparkles` | `on` / `off` | Bursts and shimmer |
| `resume` | `on` / `off` | Remember the visitor's place |
| `captions-on` | `on` / `off` | Captions showing from the start |
| `transcript-open` | `on` / `off` | Transcript panel open from the start |
| `search-offset` | `3` | Seconds of lead-in when jumping to a search match |
| `speeds` | `0.5,1,1.5,2` | Speeds offered (1 is always added) |
| `mini` | `on` / `off` | Dock to a corner while scrolling |
| `dock` | `right` / `left` | Which corner |
| `carry-over` | `on` / `off` | Follow the visitor to other pages |
| `pip` | `on` / `off` | Browser picture-in-picture button (video files only) |
| `loader` | `auto` / `fish` / `ring` | Loading screen (auto: fish with the Fishy icons or a loading image, ring otherwise). Video files only |
| `play-image` | `images/me.svg` | PNG or SVG on the play button instead of the wrasse |
| `loader-image` | `images/me.png` | PNG or SVG on the loading screen instead of the wrasse |

## YouTube, Vimeo and TikTok

Put a YouTube, Vimeo or TikTok link in `src`, and the video plays in **their own player**, with their controls. The Reel Fishy bar sits **below** it. Your transcript, chapters, captions file, clips, share links, resume, mini player and carry-over all work alongside, through each service's official player API.

**Links it understands**
- **YouTube:** `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/shorts/…`, `youtube.com/embed/…`, `youtube.com/live/…`
- **Vimeo:** `vimeo.com/123456`, `vimeo.com/123456/abcdef` (unlisted), `player.vimeo.com/video/123456?h=abcdef`
- **TikTok:** `tiktok.com/@name/video/123…`, `tiktok.com/embed/v2/123…`, `tiktok.com/player/v1/123…`. Short links (`vm.tiktok.com/…`) don't include the video number, so they can't play. The editor button expands them into full links for you; typed into a tag by hand, they show a notice with a link.

**Privacy screen** (on by default)
- Nothing loads from YouTube, Vimeo or TikTok until the visitor presses play: no iframe, no script, no thumbnail.
- The screen says where the video comes from and links to that service's privacy policy.
- An optional **Always load YouTube videos on this site** checkbox remembers the choice in that browser, separately for each service. After that, those videos load with the page, but they don't autoplay.
- Videos always play from **youtube-nocookie.com** and with Vimeo's **do-not-track** mode (`dnt=1`), screen or not.
- **Use a `poster`.** Without one, the screen is a plain dark panel. The plugin can show YouTube's own thumbnail instead, but that image comes from YouTube's servers, so it's off by default.

**Staying inside their terms.** Their player is never covered, resized below their minimum, or changed:
- Nothing of ours sits on top of their player. Captions from your file, notices, the share panel, the speed menu and the mini player's buttons all go below it. Sparkle bursts and the fish loader are off for these videos; the shimmer on the seek bar stays.
- The mini player docks at 360 px wide (over 200 px tall), or 225 × 400 for portrait videos. On screens too small for that, it doesn't dock and carry-over is skipped.
- There's no picture-in-picture button; their player has its own where they allow it.
- A **Watch on YouTube** / **Vimeo** / **TikTok** button links to the original.
- Pressing play is the only step before a video plays.

**What's different from video files**
- **Speed:** works on YouTube. Vimeo only allows it on some accounts; when Vimeo refuses, the player says so. TikTok's player has no speed control, so the speed button is hidden for TikTok.
- **TikTok volume:** TikTok's player only mutes and unmutes, so the volume slider is hidden; the mute button works.
- **Captions:** YouTube's and Vimeo's own captions stay in their player. A `captions` file you add shows below the video and feeds the transcript.
- **Buffering and volume** come from their player. Volume changes made in their controls show up in ours.
- **If an owner blocks embedding**, the player says so and offers the Watch on YouTube / Vimeo link.

**Switched off?** With **Allow YouTube videos** (or Vimeo, or TikTok) off in the plugin, those tags show "YouTube videos are turned off on this site" with a link, and nothing loads.

## Set up the Media Manager

**Browse** uses Joomla's Media Manager wherever your site allows it, and the simple picker everywhere else. These steps let the Media Manager handle every file field. Each is a one-time setting.

**1. Show the `files` folder** (if your videos live there)
1. **System → Plugins**, open **Filesystem - Local**.
2. Under **Directories**, add `files` if it isn't already listed. Joomla 6 includes it by default; Joomla 5 only lists `images`.
3. Save.

**2. Let the Media Manager show and accept these file types**
1. **System → Global Configuration → Media**.
2. Add the file types below to these three lists:

| File type | Add to **Allowed Extensions** | Add to | Used for |
|---|---|---|---|
| `svg` | yes | **Allowed Image Extensions** | mascot images |
| `vtt`, `srt` | yes | **Allowed Document Extensions** | captions, chapters, transcripts |
| `docx` | yes | **Allowed Document Extensions** | transcript downloads (`txt`, `doc` and `pdf` are already there) |
| `webm` | already there | **Allowed Video Extensions** | WebM video (`mp4` is already there) |

3. Save.

- **What each list does:** a file shows up in the Media Manager when its type is in the Image, Video or Document list. Uploading also needs it in **Allowed Extensions**.
- **If an upload is still refused (unverified):** this is a guess, but Joomla's MIME check might refuse VTT or SRT uploads. If it does, add `text/vtt` and `text/plain` to **Legal MIME Types**, or upload those files by FTP. Picking files that are already there works either way.

**Can't change these settings?** Nothing breaks. Browse uses the simple picker for anything the Media Manager can't show, and you can always type a path.

## Plugin options

- **Basic:** sparkles, ambient glow, confetti, theater mode button, live seek previews, hover preview, frame tools, icon set, loading screen, play button image, loading screen image, loop, load videos (with the page / on click), resume, captions on, playback speeds
- **Transcript:** open by default, search lead-in seconds
- **Captions and descriptions:** caption size and background (visitors can change both), audio description on by default
- **End screen:** message, button 1 text and link, button 2 text and link, how many seconds before the end it fades in. All empty means no end screen
- **Mini player:** dock while scrolling, dock corner, carry-over, carry-over expiry, picture-in-picture button
- **YouTube, Vimeo, TikTok:** allow YouTube, allow Vimeo, allow TikTok, privacy screen, offer "always load", YouTube thumbnail on the screen, your own notice text (`{service}` becomes the service's name)
- **Search engines:** video structured data on or off
- **Editor button:** which top-level folders the Browse picker can open
- **Colors:** the four accent colors

## Features

- **Share:** the Share button copies a link to the current moment. Below it, set a **Start** and **End** to play, share, or **loop** a clip. **Now** fills in the current time, and **I** / **O** set them from the keyboard. Each transcript line has a link button too (hover, or press **S** on a line).
  - **How shared links work:** a link opens the page, scrolls to the player, jumps to the moment and waits for one tap to play. A clip stops at its end, or loops. Links look like `page#rf=barn-tour&t=90,105&loop`.
  - **Set a `video-id`** on videos you expect people to share. Without one, the link uses the video's position on the page, which changes if you add a video above it.
- **Clips and loops:** `start`, `end` and `loop` play part of a video, stop at the end, or repeat it. The clip shows as a band on the seek bar (striped when it loops). Clips and loops don't save a resume point, and carry-over keeps the clip when you change pages.
- **Structured data:** for videos in articles, the page tells search engines about each video (Google's VideoObject): title, description, date, poster, the video's URL (`contentUrl` for files, `embedUrl` for YouTube, Vimeo and TikTok), the transcript text, and chapters as key moments that link to that second.
  - **Where the details come from:** the article's title, meta description (else the intro text) and publish date.
  - **One entry per video:** a video that appears twice on a page (say, on its own and in a playlist) is described once.
  - **Skipped:** remote captions files, videos with no date (such as ones in Custom modules), YouTube / Vimeo / TikTok videos the site has switched off, and short TikTok links.
  - **Thumbnail:** the poster. For YouTube without a poster, YouTube's thumbnail URL. Vimeo and TikTok need a poster for a thumbnail.
- **Portrait videos:** Shorts, TikTok, vertical video files, or anything with `aspect="9:16"` or `1:1` get a phone-shaped column, up to 420 px wide and no taller than 80% of the screen, centered. With the transcript open and room beside it, the transcript sits next to the video; otherwise it goes below.
- <a id="captions-languages-and-style"></a>**Captions: languages and style.** Tap **CC** to turn captions on or off. Hold it (or right-click, or press ↑/↓ on it) for the captions menu: language, **size** (small to extra large) and **background** (solid, see-through, or none with an outline). The visitor's choices are remembered on your site and follow them between videos and pages.
  - **Several languages:** `captions="en:clip.vtt; es:clip-es.vtt"`. Each language is named in itself (English, Español). The first visit picks the one matching the visitor's browser language, else the first listed.
  - **The transcript follows the caption language**, unless the tag has its own `transcript` file.
- **Audio description:** add a `descriptions` VTT, and an **AD** button appears (key **D**). The visitor's browser reads each description aloud when playback reaches it, in the browser's own voice.
  - **While it speaks,** the video's volume drops to about a third. If a description runs longer than its slot in the VTT, the video pauses until it's finished, then carries on.
  - **Writing descriptions:** put each one where there's a gap in the dialogue, describing what's on screen. Keep the cue's end time where the next dialogue starts, so long descriptions pause instead of talking over it.
- **End screen:** a message and up to two buttons (Donate, Visit…) plus **Replay**. It fades in 2 seconds before the end (change it with `end-lead` or the plugin; 0 waits for the very end), while the last moments play. Seeking back hides it. Set it once in the plugin, and change or turn it off per video. Links to other sites open in a new tab; `mailto:`, `tel:` and `sms:` links open the visitor's email, phone or messages app. For YouTube, Vimeo and TikTok it appears below their player, never on it.
- **Ambient glow:** while a video plays, a soft glow around the player takes on the video's colours. YouTube, Vimeo and TikTok glow in your accent colour (their pixels can't be read), and so do files from another site that doesn't allow it.
- **Confetti** rains down when a video finishes (with sparkles on; not over YouTube, Vimeo or TikTok).
- **Theater mode:** the theater button (or **W**) dims the page and grows the player in the middle of the screen, with the transcript beside it when there's room. **Esc** or a click on the dimmed page closes it.
- **Seek thumbnails:** hovering the seek bar shows a picture of that moment. For local files it's live, taken from the file itself (mouse only; it downloads bits of the video as you hover). For a faster, lighter version, or for YouTube / Vimeo / TikTok, give a `thumbnails` VTT.
- <a id="hotspots"></a>**Hotspots:** clickable labels that appear during set moments, from a VTT where each cue reads `Label | link | corner`:
  ```
  00:00:12.000 --> 00:00:20.000
  Meet Tancho | /animals/tancho | top-right

  00:01:05.000 --> 00:01:15.000
  Skip to feeding time | t=2:30 | bottom-left
  ```
  - **Corners:** `top-left`, `top-right` (default), `bottom-left`, `bottom-right`. Several at once stack.
  - **Links:** a page on your site opens there (and carry-over keeps the video playing in the corner), another site opens in a new tab, `mailto:` / `tel:` open the email or phone app, and `t=2:30` jumps to that time.
  - For YouTube, Vimeo and TikTok they show below the player.
- **Hover preview:** before a video has been played, resting a mouse on it fades in a silent preview over the poster: 6 seconds from `start` (or from the time in `hover-preview="0:12"`), on repeat until the mouse leaves. Clicking play starts the real video as usual.
  - **When it stays off:** touch screens, YouTube / Vimeo / TikTok, videos set to **Load on click**, the mini player, carried-over videos, and visitors whose device asks for less motion or to save data.
  - **Cost:** it downloads the start of the file while the mouse is there. Turn it off for very large files, or pick a later start with a short, fast-loading video.
- **Frame tools:** the Share panel has **Grab a frame**: **‹ Frame** and **Frame ›** pause and step one frame (also `,` and `.`), and **Save frame** downloads that frame as a full-size PNG named after the video and time (`barn-tour-1-05-3.png`).
  - **Frame length** is measured while the video plays; before that it steps 1/30 of a second.
  - **Videos on another site** can only be saved if that site allows it (CORS); otherwise the panel says so. Video files only.
- **Searchable transcript:** built from your VTT. Matches are highlighted, and phrases that span two captions still match. **Enter** jumps to the next match, a few seconds early. Clicking a line jumps to exactly that line.
- **Speed:** tap the speed button to cycle. Hold it, right-click it, or press ↑/↓ on it for the picker.
- **Mini player:** when a playing video scrolls out of view, it docks to a corner. ✕ closes it, and the arrow scrolls back to the video.
- **Carry-over:** if a video is playing when the visitor moves to another page, it reopens there in the corner at the same spot. It waits for one tap, because browsers block autoplay with sound. The arrow returns to the page the video came from, and ✕ forgets it.
- **Picture-in-picture:** the browser's floating video, in Chrome, Edge, and Safari.
- **Resume, chapters, captions, fullscreen**, and an icon set API: `ReelFishy.registerIcons(name, map)`.

### Keyboard

These work when the player has focus:

| Keys | Action |
|---|---|
| `Space` / `K` | Play / pause |
| `J` / `L` | Back / forward 10 seconds |
| `←` / `→` | Back / forward 5 seconds |
| `↑` / `↓` | Volume |
| `0`–`9` | Jump to 0–90% |
| `Home` / `End` | Start / end |
| `<` / `>` | Slower / faster |
| `F` | Fullscreen |
| `M` | Mute |
| `C` | Captions |
| `T` | Transcript |
| `D` | Audio description |
| `W` | Theater mode |
| `Shift`+`N` / `Shift`+`P` | Next / previous video in a playlist |
| `/` | Search the transcript |
| `Enter` / `Shift`+`Enter` | Next / previous match |
| `S` | Open the Share panel (on a transcript line: copy a link to that line) |
| `I` / `O` | Set the clip start / end to now |
| `,` / `.` | Back / forward one frame (pauses; video files) |
| `Esc` | Clear the search, close the Share panel, or leave theater mode |

### Accessibility

- Every control is a labeled button, and the seek bar is an ARIA slider.
- State changes are announced to screen readers.
- Focus rings are visible.
- Sparkles and animations turn off automatically for reduced-motion users.
- Captions in several languages, with size and background the visitor controls.
- Audio description from a VTT, read aloud by the browser.

## Good to know

- **SVG mascots:** Joomla doesn't allow SVG by default. See [Set up the Media Manager](#set-up-the-media-manager). PNGs work out of the box.
- **Carry-over loads the script on every page**, about 108 KB (34 KB compressed), deferred. Turn carry-over off and the script loads only on pages with a player.
- **The server must support byte-range requests** for seeking and resume. Apache and nginx do by default.
- **Carry-over is per browser tab** (sessionStorage). It needs the video at a real URL, so a file picked on a test page won't follow you.
- **Audio description voices** come from the visitor's browser and system, so they sound different on each device. Browsers without speech support don't show the AD button.
- **Content Security Policy:** if you use Joomla's **HTTP Headers** plugin with a CSP, YouTube, Vimeo and TikTok need to be allowed. This list is a guess, not tested against a live CSP: `script-src https://www.youtube.com https://player.vimeo.com`, `frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com`, and `img-src https://i.ytimg.com` if you turn on YouTube thumbnails.
- **Referrer-Policy:** YouTube refuses to play when it can't tell which site is asking. The player's iframe sends the site's address on its own, even if your site's policy is stricter.
- **Possible template conflict (unverified):** the docked mini player uses `position: fixed`. If a template wraps content in an element with a CSS `transform` or `filter`, the dock would pin to that element instead of the screen. If it shows up in the wrong place, that's the likely cause.

## For developers

Hooks for a future playlist or site-wide search component.

**Player events.** Each player fires these on itself. They bubble, and they cross the Shadow DOM:

| Event | When |
|---|---|
| `reelfishy:ready` | Captions, transcript and chapters are loaded |
| `reelfishy:play` / `reelfishy:pause` | Playback starts or stops |
| `reelfishy:seeked` | The playhead moved |
| `reelfishy:ended` | The video finished |
| `reelfishy:cuechange` | The transcript line changed. `detail.cue` is `{ start, end, text, plain, who }` |
| `reelfishy:spanchange` | The clip changed. `detail.span` is `{ start, end, loop }` |
| `reelfishy:spanend` / `reelfishy:spanloop` | A clip stopped at its end, or looped |
| `reelfishy:description` | An audio description started. `detail.cue` is the description |
| `reelfishy:endscreen` | The end screen appeared. `detail.early` is true when it faded in before the end |
| `reelfishy:hotspot` | A hotspot was clicked. `detail.hotspot` is `{ label, link, seek, start, end }` |
| `reelfishy:theater` | Theater mode changed. `detail.on` |
| `reelfishy:playlistchange` | A playlist moved to another video. `detail.index`, `detail.item` |

Every event's `detail` has `player`, `id` (the `video-id`), `src`, `source` (`file`, `youtube`, `vimeo` or `tiktok`) and `time`.

**Player methods:** `play()`, `pause()`, `seek(seconds)`, `theater(on)`, and

```js
player.load({ src, poster, captions, descriptions, chapters, transcript, thumbnails, hotspots, 'transcript-file', label, 'video-id', start, end, loop, aspect, autoplay })
```

`load()` swaps the video in place, including between files, YouTube, Vimeo and TikTok. Anything left out is cleared; look and behavior settings stay.

**YouTube, Vimeo and TikTok in scripts**
- `play()` can't skip the privacy screen. Until the visitor has pressed play (or chosen "always load"), it does nothing and resolves to `false`. `load({ autoplay: true })` works the same way.
- `player.video` is a small stand-in with the same basics as a `<video>`: `currentTime`, `duration`, `paused`, `playbackRate`, `volume`, `muted`, `play()`, `pause()`, and the same events.
- `ReelFishy.embedOf(url)` tells you whether a link is a YouTube, Vimeo or TikTok video: `{ kind, name, id, h, tall, watch }` or `null`. `tall` is true for Shorts and TikTok; `short: true` marks a short TikTok link that can't play.

**`ReelFishy.parseVTT(text)`** turns WebVTT or SRT text into cues, for building a search index.

**Server side.** Every rendered player fires the Joomla event `onReelFishyRender`, with `context`, `itemId`, `itemTitle` and `attributes`. A plugin can listen for it to index which videos and transcripts appear on which pages.

## Changelog

### 1.2.0
- **Hover preview:** with a mouse, a video that hasn't been played yet shows a silent 6-second preview over its poster. Site option *Hover preview*, tag attribute `hover-preview` (`on`, `off`, or a start time). Video files only.
- **Frame tools:** *Grab a frame* in the Share panel steps one frame back or forward (`,` and `.` keys) and saves the frame as a PNG. Site option *Frame tools*, tag attribute `frame-tools`. Video files only.
- **Email and phone links:** end screen buttons and hotspots can link to `mailto:`, `tel:` or `sms:`. Before, the plugin turned them into broken links on your own site, and the player opened them in a new tab.
- Editor popup: *Hover preview on the poster* (Look) and *Frame tools* (Behavior), and a hint under the button links.

### 1.1.0
- **Renamed to Reel Fishy** everywhere. Until now it was *Bioluminescence (Reel Fishy)*. The package is now `pkg_reelfishy` (packagename `reelfishy`), the plugins are `plg_system_reelfishy` (*System - Reel Fishy*) and `plg_editors-xtd_reelfishy` (*Button - Reel Fishy*), and their files live in `media/plg_system_reelfishy` and `media/plg_editors-xtd_reelfishy`.
- **Moving over:** installing 1.1.0 on a site with the old Bioluminescence plugins copies their settings, switches the old plugins off, and asks you to uninstall the old package. See [Moving from Bioluminescence](#moving-from-bioluminescence).
- **For developers:** `onBioluminescenceRender` is now `onReelFishyRender`, and the com_ajax endpoint is `plugin=reelfishy`. The `{reelfishy}` tag, the `<reel-fishy>` element, the JavaScript API and visitors' saved choices are unchanged.
- No changes to the player or the editor popup.

### 1.0.1
- **Updates through Joomla:** the package now has the Chaotic Fish Design update server, so new versions appear under System → Update → Extensions.
- **Installer checks:** stops with a message on PHP below 8.2 or Joomla below 5.
- **Plugins switch on by themselves** on a first install; plugins already on the site keep their setting.
- `LICENSE.txt` is now in the package.
- No changes to the player or the editor popup.

### 1.0.0
- **First stable release.**
- **Editor popup builds playlists:** tick Playlist, add videos one at a time, reorder, edit or remove them, and insert. Selecting an existing playlist opens it for editing. Each tag goes in its own paragraph.
- **Structured data** lists each video once, even when it appears twice on a page.
- **Full test pass** across every feature since 0.1.0, on the minified build: files, YouTube, Vimeo and TikTok (the last three against stand-ins for their player APIs).
- The landing page is rolled up with everything, including a YouTube Shorts demo.

### 0.9.0
- **End screen fades in early:** 2 seconds before the end by default, while the video finishes (`end-lead`, plugin **End screen → Show before the end**). 0 waits for the end.
- **Sparkle pack:**
  - **Ambient glow** in the video's colours.
  - **Confetti** at the end.
  - **Theater mode** (W).
  - **Seek thumbnails:** live for local files, or from a `thumbnails` VTT sprite.
  - **Hotspots** from a VTT (`Label | link | corner`, with `t=` links that jump).
- **Playlists:** `{reelfishy-playlist}` around several tags gives one player with a track list, Up next with a countdown, Shift+N / Shift+P, share links to any video in it, and carry-over that keeps the current one.
- Carry-over now takes the video that's actually playing after `load()`, not the tag's first one.
- **Editor popup:** thumbnails and hotspots fields, the four new look switches, and "Show end screen early".

### 0.8.0
- **Caption languages:** `captions="en:clip.vtt; es:clip-es.vtt"`. A captions menu (hold CC) picks the language; the transcript follows it.
- **Caption style:** size and background in the same menu, remembered per visitor. The plugin sets the starting style.
- **Audio description:** a `descriptions` VTT read aloud by the browser (AD button, key D). The video ducks while it speaks and pauses if a description runs long. It can be on by default, site-wide or per video.
- **End screen:** a message, up to two link buttons and Replay. It's set in a new **End screen** plugin tab and can be overridden per video. Below the player for YouTube, Vimeo and TikTok.
- **Editor popup:** new fields for descriptions, audio description on, and the end screen. With a caption language already listed, Browse adds another (`xx:` until you fill in the language).
- Carry-over keeps the caption language and audio description setting.
- Fixed: tag attributes with a number in their name (like `end-url-2`) were dropped.

### 0.7.1
- **Portrait and other shapes:** a new `aspect` setting (plugin popup: **Look → Shape**). YouTube Shorts and TikTok are 9:16 automatically, and video files now take their own shape instead of always 16:9.
- **Portrait layout:** a phone-shaped column, centered, with the transcript beside it when there's room. The docked mini player goes portrait too (225 × 400).
- **TikTok:** TikTok links play in TikTok's own embed player, with the privacy screen, an **Allow TikTok videos** switch, and the Reel Fishy bar, transcript, chapters, clips and share links. No speed control (TikTok's player has none). Short links get a notice; the editor button expands them into full links.
- Narrow players fit their buttons on one row where possible.

### 0.7.0
- **YouTube and Vimeo:** put their link in `src`. Their own player plays it, with the Reel Fishy bar, transcript, chapters, clips, share links, resume, mini player and carry-over alongside, through their official APIs.
- **Privacy screen:** nothing loads from YouTube or Vimeo until play is pressed, with an optional "always load" choice. They always use youtube-nocookie.com and Vimeo's do-not-track mode.
- **Their terms:** nothing covers their player, the mini player keeps it at least 200 px tall, and there's a Watch on YouTube / Vimeo link.
- **New plugin tab, YouTube and Vimeo:** allow each one, privacy screen, "always load", YouTube thumbnail, your own notice text.
- **Structured data:** YouTube and Vimeo videos use `embedUrl`, and YouTube's thumbnail when there's no poster.
- **Editor popup:** the video field takes YouTube and Vimeo links, says which one it found (or that it's switched off), and hides the options that don't apply.
- Events now include `detail.source`. New `ReelFishy.embedOf()`. `load()` can switch between files and YouTube / Vimeo.
- README: where the button lives in TinyMCE, CodeMirror and JCE.

### 0.6.0
- **Clips and loops:** new `end` and `loop` settings. `start` plus `end` plays just a clip, and `loop` repeats it or the whole video. Times can be written as `1:30`. The clip shows as a band on the seek bar.
- **Share:** a Share panel with a link to the current moment, plus start/end fields to play, share, or loop a clip (also the I and O keys). Each transcript line gets a copy-link button.
- **Shared links:** `#rf=<video-id>&t=start,end&loop` scrolls to the player, jumps to the moment, and plays or loops the clip after one tap. It works on page load and when the link changes.
- **Load on click:** the `lazy` setting (and a site option) shows only the poster until the first play, then loads the video.
- **Structured data:** VideoObject for search engines, with the transcript text and chapters as key moments. It can be switched off in the new **Search engines** tab.
- Clips and loops don't save a resume point; carry-over keeps the clip.
- Fixed: the public `seek()` method was hidden by an internal property, so `player.seek(seconds)` didn't work.

### 0.5.0
- **Browse with Joomla's Media Manager:** in the administrator, Browse opens the real Media Manager (with upload), filtered to the right file types. The simple picker is the fallback, and is one click away in its header. Added a **Set up the Media Manager** how-to.
- **SRT captions and transcripts:** SRT works anywhere VTT does, with search and seek.
- **Transcript download:** the new `transcript-file` setting (TXT, DOC, DOCX, PDF) adds a Download transcript button.
- **Pickers open beside the video:** Browse for captions, chapters or a transcript starts in the video's folder.
- **Developer hooks:** `video-id`, player events, `load()`, `ReelFishy.parseVTT()`, and the `onReelFishyRender` server event.

### 0.4.0
- **Browse for files:** each file field in the editor popup has a Browse… button with a folder picker, filtered to the right file types, with image thumbnails. It's served by the system plugin and only answers signed-in users who can write content, with a valid session token, inside the folders allowed in the new **Browse folders** option.
- **Cleaner popup:** rebuilt as a plain, light dialog in the same style as the Chaos Filet button. It has more breathing room, a pinned tag preview and footer, follows the admin's dark mode, and stacks neatly on a phone.

### 0.3.0
- **Your own mascot:** a play button image and a loading screen image, each a PNG or SVG, replacing the wrasse. The wrasse stays the default, and comes back if an image can't load. Set them site-wide with media pickers, or per video with `play-image` and `loader-image`.
- **Editor popup:** the Reel Fishy button opens a popup with Files, Look, Behavior and Advanced groups. It starts from the plugin's settings, writes only what you change, edits a selected tag, and shows the tag live.
- The editor button plugin is now listed as *Button - Reel Fishy*.

### 0.2.2
- Fish loading screen: a cleaner wrasse swims in circles while a video loads or buffers. It only appears after a short wait, so quick loads never flash it. The `loader` option picks fish or a plain ring.
- Every control has a hover tooltip, with its keyboard shortcut where it has one. Captions and Transcript say Show or Hide to match their state.

### 0.2.1
- Tags inside `<pre>` and `<code>` blocks are left alone, and `\{reelfishy …}` prints the tag as text
- Starting one player pauses any other player on the page, so two mini players never stack

### 0.2.0
- Mini player that docks while scrolling, with close and back buttons
- Carry-over between pages: reopens as a mini player that waits for a tap
- Joomla package: system plugin (`{reelfishy}` tag, options, accent colors) and editor button
- New attributes: `pip`, `mini`, `dock`, `carry-over`, `start`
- Fix: resume position is applied only after the video's metadata has loaded

### 0.1.1
- Speed picker: long-press, right-click, or ↑/↓. `<` / `>` shortcuts. `speeds` attribute.
- Lighter per-frame work: the progress bar uses transforms, and the clock redraws once a second

### 0.1.0
- First prototype: custom controls, keyboard shortcuts, captions, chapters, resume, searchable click-to-seek transcript, icon sets, and sparkles

## Test checklist

1. Install the package on J5 and on J6, and enable both plugins. The plugin options open with no errors.
2. Click **Reel Fishy** in an article editor. A tag appears. Select a video path first and the path becomes the `src`.
3. Save the article and view it. The player renders, plays, and the transcript appears (with `captions` set).
4. Search the transcript and press Enter. It jumps a few seconds before the match.
5. Hold the speed button. The picker opens and a choice sticks.
6. Play, then scroll down. The video docks to a corner. Scroll back up and it returns. ✕ pauses and undocks.
7. Play, then click to another page. The mini player is waiting there, and one tap continues from the same spot.
8. On that page, the arrow goes back to the original page. ✕ dismisses it, and it doesn't return on the next page.
9. Turn carry-over off. Pages without a tag no longer load `reel-fishy.min.js`. Check in view-source.
10. Change an accent color. The progress bar changes.
11. Turn on your device's reduced-motion setting. No sparkles and no shimmer.
12. Put a tag in a Custom module with Prepare Content on. It renders.
13. Put a tag inside a `<pre><code>` block. It shows as text, not a player.
14. With two players on a page, start one, then the other. The first one pauses.
15. Hover each control. Every one has a tooltip; Captions and Transcript switch between Show and Hide.
16. Play a large video on a slow connection (DevTools → Network → Slow 4G). The wrasse swims while it loads, then goes away when playback starts.
17. Set a play button image (SVG) and a loading screen image (PNG) in the plugin. Both replace the wrasse. Point one at a missing file and the wrasse comes back.
18. Click **Reel Fishy** in an editor. The popup's choices match the plugin settings. Change a few, insert, and check that only those appear in the tag.
19. Select that tag and click **Reel Fishy** again. The popup shows your choices and the button says Update tag.
20. Turn carry-over off in the plugin. In the popup, Carry-over is greyed out with a note.
21. In the popup, click **Browse…** next to Video file. Open a folder, pick an MP4, and it fills the field. Browse for Captions: it starts in the same folder and only shows `.vtt` files.
22. Browse for the Play button image: PNG and SVG files show as thumbnails.
23. Press Escape in the picker. It goes back to the form, and a second Escape closes the popup.
24. Sign in as a user who can't edit articles and try Browse. It shows an error, and typing a path still works.
25. Switch the admin to dark mode. The popup follows it.
26. In the administrator, click **Browse…** next to Video file. Joomla's Media Manager opens, showing videos only. Pick one and click **Select**: the field fills in and you're back in the popup.
27. Browse for Captions. It opens in the video's folder. With `vtt`/`srt` added to the Document extensions it uses the Media Manager; without them, the simple picker.
28. In the Media Manager, click **Simple picker**. The built-in picker opens in the same spot.
29. Set Captions to an `.srt` file. Captions, transcript search and seek all work.
30. Set **Transcript to download** to a PDF. A Download transcript button appears on the player and opens the PDF in a new tab.
31. Add `start="0:05" end="0:12"` to a tag. The video starts at 0:05 and stops at 0:12, and a band shows on the seek bar. Press play again and it restarts at 0:05.
32. Add `loop="on"` to that tag. The clip repeats, and the band turns striped.
33. Open **Share**. **Copy link at…** copies a link. Open it in a new tab: it scrolls to the player at that moment and waits for **Play**.
34. In Share, set Start and End, tick **Loop this clip**, and copy the clip link. Opening it loops just that clip.
35. Hover a transcript line, click its link button, and open the copied link.
36. Set **Load videos** to **On click**. View source or the browser's Network tab: the video file isn't requested until you press play.
37. Paste an article URL into Google's Rich Results Test. It finds the VideoObject, with the transcript and key moments when the files are local.
38. Add `{reelfishy src="https://www.youtube.com/watch?v=<any public video>"}`. The page shows the privacy screen, and the browser's Network tab shows nothing from youtube.com yet.
39. Press play. The video plays in YouTube's player from `youtube-nocookie.com`, and our time, seek bar and play button follow it. Seek with our bar and with J / L; pause with K.
40. Add a `captions` file to the YouTube tag. The transcript works, clicking a line seeks YouTube, and captions (C) show **below** the video, not on it.
41. Mark a clip with I and O, then play into it. It stops at the end, and the share link opens the page, waits for a tap, and plays the clip.
42. Scroll past the playing YouTube video. It docks at 360 px wide and keeps playing without reloading. Nothing of ours covers it.
43. Go to another page while it plays. It reopens in the corner, waits for a tap, then continues from the same spot.
44. Tick **Always load YouTube videos on this site** and press play, then reload. The video loads straight away but doesn't start by itself.
45. Repeat 38–39 with a Vimeo link. Check the Vimeo iframe URL has `dnt=1`.
46. Turn **Allow YouTube videos** off. YouTube tags show the "turned off" notice with a link, and nothing loads.
47. Use a video whose owner blocks embedding. The player says so and offers Watch on YouTube.
48. In the editor popup, paste a YouTube link. The note under the field says YouTube, and Picture-in-picture and the loading screen options disappear.
49. Add your Shorts link (`youtube.com/shorts/…`). The player is a tall, centered column. Open the transcript on a wide page: it sits beside the video. On a phone it goes below.
50. Add `aspect="9:16"` to a regular YouTube link of a vertical video. Same column. Add `aspect="1:1"` to another: a square up to 420 px.
51. Use a vertical MP4 with no `aspect`. The player takes the file's shape once it loads.
52. Scroll past a playing portrait video. The mini player docks at 225 × 400.
53. Add a TikTok link (`tiktok.com/@name/video/…`). Privacy screen first; press play and it plays in TikTok's player. Our seek bar, K, J/L, M, the transcript and clip links control it. There's no speed button or volume slider.
54. In the editor popup, paste a short TikTok link (`vm.tiktok.com/…`). It's replaced with the full link within a few seconds. If your server can't reach TikTok, a note tells you to paste the full link.
55. Type a short TikTok link straight into a tag. The page shows "This is a short TikTok link…" with a link, and nothing loads.
56. Turn **Allow TikTok videos** off. TikTok tags show the "turned off" notice.
57. Add `captions="en:kitty.vtt; es:kitty-es.vtt"`. Hold CC: the menu lists English and Español. Pick Español: captions and transcript switch. Reload: still Español.
58. In the same menu, pick Extra large and None. The captions grow and lose their box. Open another video on the site: it uses the same style.
59. Add a `descriptions` VTT. The AD button appears. Turn it on and play: each description is read aloud, the video gets quieter while it speaks, and a long one pauses the video until it's done.
60. Pause while a description is being read. It stops, and the volume comes back.
61. Fill in the plugin's **End screen** tab (message, Donate → an outside link, a second button → a page on your site). Play a video to the end: the card shows both buttons and Replay. Donate opens a new tab; the other doesn't.
62. Add `end-screen="off"` to one tag: no card. Add `end-message="Thanks!" end-button=""` to another: your message, no button 1.
63. Let a YouTube video with an end screen finish. The card appears **below** the player.
64. In the editor popup, put `en:` before a captions file, then Browse for a second file. It's added as `; xx:…` and flagged until you replace `xx` with the language.
65. Set an end screen message and play to the end. It fades in 2 seconds early while the video finishes. Seek back: it disappears. Set `end-lead="0"` on a tag: it waits for the end.
66. Play a local video with sparkles on. The player glows in the video's colours, and confetti falls at the end.
67. Press W (or the theater button). The page dims and the player fills the middle; open the transcript and it sits beside it. Esc, or a click on the dimmed area, closes it.
68. Hover the seek bar of a local video with a mouse. A picture of that moment appears above the time. Add a `thumbnails` VTT (sprite) to another: those pictures show instead.
69. Add a `hotspots` VTT. Labels appear in their corners at their times; a `t=` link jumps, an outside link opens a new tab.
70. Make a `{reelfishy-playlist}` with three videos (one YouTube). The list shows under the player. Let one end: Up next counts down and plays the next. Click the YouTube one: its privacy screen shows.
71. Open the page with `#rf=<second video's id>&t=10`. The playlist switches to it at 0:10.
72. Play the second playlist video and go to another page. The mini player brings that video, not the first.
73. In the editor popup, tick **Playlist**. Add three videos (one YouTube link), move one up, edit one, then **Insert playlist**. Each tag lands in its own paragraph, and the page shows one player with a three-item list.
74. Select that playlist in the editor and click the button again. The popup opens with Playlist ticked, the title and the three videos listed; **Update playlist** replaces it.
75. Put the same video in a playlist and on its own on one page. Google's Rich Results Test lists it once.
76. On a site with 1.0.0, install 1.0.1 over it. Settings stay, both plugins keep their on/off state, and **System → Update Sites** gets a *Chaotic Fish Design* entry.
77. On a fresh site, install 1.0.1. Both plugins are switched on without visiting the Plugins list.
78. Once a higher version is published, **System → Update → Extensions → Find Updates** offers it, and it installs.
79. On a site with Bioluminescence 1.0.1 (with a few settings changed, e.g. icons and accent colours), install Reel Fishy 1.1.0. The yellow message appears; *System - Reel Fishy* has the same settings and is on; both Bioluminescence plugins are off; pages show one player per tag.
80. Uninstall the Bioluminescence package. Reel Fishy keeps working, and only one *Chaotic Fish Design* entry is left in Update Sites.
81. On a clean site, install 1.1.0. No message about Bioluminescence; both plugins are on.
82. Set an end screen button to `mailto:hello@example.com` and another to `tel:+13045550100`. At the end of the video, the first opens your email app and the second offers to call, both without a new tab. Hotspot links with `mailto:` do the same.
83. With a mouse, rest on a local video that hasn't been played. After a moment a silent preview fades in over the poster and repeats its first 6 seconds; move away and it fades out. Press play: the real video starts from the beginning, with sound, and the preview is gone for good.
84. Add `hover-preview="1:00"` to a tag: the preview starts at 1:00. Add `hover-preview="off"` to another: no preview. Check there's no preview on a YouTube video, on a phone, or with `lazy="click"`.
85. Turn on your computer's reduced-motion setting and reload: no preview.
86. Play a local video, pause it, and press `.` a few times: it moves one frame at a time; `,` goes back. Open Share: **Grab a frame** is there; ‹ Frame and Frame › do the same.
87. Press **Save frame**: a PNG of the current frame downloads, full size, named after the video and time. On a YouTube video, Grab a frame isn't in the Share panel.
88. Turn off *Frame tools* in the plugin: Grab a frame is gone, and `,` and `.` do nothing.
