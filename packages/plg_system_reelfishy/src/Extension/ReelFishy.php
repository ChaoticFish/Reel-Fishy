<?php

/**
 * @package     Reel Fishy
 * @subpackage  plg_system_reelfishy
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace ChaoticFishDesign\Plugin\System\ReelFishy\Extension;

use Joomla\CMS\Event\Content\ContentPrepareEvent;
use Joomla\CMS\Event\Plugin\AjaxEvent;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Session\Session;
use Joomla\CMS\Uri\Uri;
use Joomla\Event\Event;
use Joomla\Event\EventInterface;
use Joomla\Event\SubscriberInterface;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * Turns {reelfishy ...} tags into <reel-fishy> players and loads the player script.
 */
final class ReelFishy extends CMSPlugin implements SubscriberInterface
{
    /** Attributes a tag may pass through to the player. */
    private const ATTRS = [
        'src', 'poster', 'captions', 'chapters', 'transcript', 'label',
        'icons', 'sparkles', 'search-offset', 'resume', 'transcript-open', 'captions-on',
        'speeds', 'start', 'pip', 'mini', 'carry-over', 'dock', 'loader', 'play-image', 'loader-image',
        'transcript-file', 'video-id', 'end', 'loop', 'lazy', 'aspect',
        'descriptions', 'descriptions-on', 'end-screen', 'end-message', 'end-button', 'end-url', 'end-button-2', 'end-url-2',
        'end-lead', 'thumbnails', 'hotspots', 'glow', 'confetti', 'theater', 'previews',
        'hover-preview', 'frame-tools',
    ];

    /** Per-video attributes a playlist keeps for each of its videos. */
    private const ITEM_ATTRS = [
        'src', 'poster', 'captions', 'descriptions', 'chapters', 'transcript', 'transcript-file', 'label', 'video-id',
        'start', 'end', 'loop', 'aspect', 'thumbnails', 'hotspots',
    ];

    /** Attributes that take one file, or one per language: "en:clip.vtt; es:clip-es.vtt". */
    private const TRACK_ATTRS = ['captions', 'descriptions'];

    /** Short text shown on the end screen. */
    private const TEXT_ATTRS = ['end-message', 'end-button', 'end-button-2'];

    /** Attributes that hold a file path or URL. */
    private const URL_ATTRS = ['src', 'poster', 'chapters', 'transcript', 'transcript-file', 'play-image', 'loader-image', 'end-url', 'end-url-2', 'thumbnails', 'hotspots'];

    /** Attributes that must point at a PNG or SVG. */
    private const IMAGE_ATTRS = ['play-image', 'loader-image'];

    /** Any tag, including the playlist wrapper and its closing tag (for search indexing). */
    private const TAG = '#\{/?reelfishy(?:-playlist)?\b[^}]*\}#i';

    /**
     * A <pre> or <code> block (left alone); a playlist wrapper with the tags inside it;
     * or a single tag. Either kind can be escaped with a backslash.
     */
    private const SCAN = '#(<(pre|code)\b[^>]*>.*?</\2>)|(\\\\?)\{reelfishy-playlist\b([^}]*)\}(.*?)\{/reelfishy-playlist\}|(\\\\?)\{reelfishy\b(?!-)([^}]*)\}#is';

    /** Set once a tag has been rendered on this page. */
    private bool $used = false;

    /** Players rendered on this page, for the structured data. */
    private array $videos = [];

    /** Attributes that hold a time: seconds or m:ss / h:mm:ss. */
    private const TIME_ATTRS = ['start', 'end'];

    public static function getSubscribedEvents(): array
    {
        return [
            'onContentPrepare'    => 'onContentPrepare',
            'onBeforeCompileHead' => 'onBeforeCompileHead',
            'onAjaxReelfishy' => 'onAjaxReelfishy',
        ];
    }

    public function onContentPrepare(ContentPrepareEvent $event): void
    {
        if (!$this->getApplication()->isClient('site')) {
            return;
        }

        $item = $event->getItem();

        if (!isset($item->text) || !\is_string($item->text) || stripos($item->text, '{reelfishy') === false) {
            return;
        }

        // Search indexing gets the tag removed, not a player.
        if ($event->getContext() === 'com_finder.indexer') {
            $item->text = preg_replace(self::TAG, '', $item->text);

            return;
        }

        $context = $event->getContext();

        $item->text = preg_replace_callback(self::SCAN, function (array $m) use ($context, $item): string {
            // Tags shown as examples inside code blocks stay as text.
            if ($m[1] !== '') {
                return $m[1];
            }

            // A playlist: {reelfishy-playlist title="…"} {reelfishy …} {reelfishy …} {/reelfishy-playlist}
            // (a single tag fills group 7; a playlist stops at group 5)
            if (!isset($m[7]) && isset($m[5])) {
                if ($m[3] !== '') {
                    return '{reelfishy-playlist' . $m[4] . '}' . $m[5] . '{/reelfishy-playlist}';
                }

                $this->used = true;

                return $this->playlist($m[4], $m[5], $context, $item);
            }

            // \{reelfishy ...} prints the tag itself.
            if (($m[6] ?? '') !== '') {
                return '{reelfishy' . $m[7] . '}';
            }

            $this->used = true;

            return $this->render($m[7] ?? '', $context, $item);
        }, $item->text);
    }

    public function onBeforeCompileHead(EventInterface $event): void
    {
        $app = $this->getApplication();

        if (!$app->isClient('site')) {
            return;
        }

        $doc = $app->getDocument();

        if (!$doc || $doc->getType() !== 'html') {
            return;
        }

        $p     = $this->params;
        $carry = (int) $p->get('carry', 1) === 1;

        // Carry-over needs the script on every page so a video can follow the visitor.
        if (!$this->used && !$carry) {
            return;
        }

        $speeds = array_values(array_filter(
            array_map('floatval', explode(',', (string) $p->get('speeds', '0.5,0.75,1,1.25,1.5,2'))),
            static fn (float $n): bool => $n > 0 && $n <= 16
        ));

        $endUrl  = fn (string $k): string => ($u = trim((string) $p->get($k, ''))) !== '' ? (string) $this->url($u) : '';
        $endText = fn (string $k): string => mb_substr(trim(preg_replace('/\s+/', ' ', strip_tags((string) $p->get($k, '')))), 0, 200);

        $defaults = [
            'captionBg'      => \in_array($p->get('caption_bg', 'solid'), ['solid', 'clear', 'none'], true) ? $p->get('caption_bg', 'solid') : 'solid',
            'captionSize'    => \in_array($p->get('caption_size', 'm'), ['s', 'm', 'l', 'xl'], true) ? $p->get('caption_size', 'm') : 'm',
            'captionsOn'     => (int) $p->get('captions_on', 0) === 1,
            'carry'          => $carry,
            'carryMinutes'   => max(1, (int) $p->get('carry_minutes', 30)),
            'confetti'       => (int) $p->get('confetti', 1) === 1,
            'descriptionsOn' => (int) $p->get('descriptions_on', 0) === 1,
            'dockPosition'   => $p->get('dock_position', 'right') === 'left' ? 'left' : 'right',
            'endLead'        => max(0.0, min(15.0, (float) $p->get('end_lead', 2))),
            'endButton'      => $endText('end_button_1'),
            'endButton2'     => $endText('end_button_2'),
            'endMessage'     => $endText('end_message'),
            'endUrl'         => $endUrl('end_url_1'),
            'endUrl2'        => $endUrl('end_url_2'),
            'frameTools'     => (int) $p->get('frame_tools', 1) === 1,
            'glow'           => (int) $p->get('glow', 1) === 1,
            'hoverPreview'   => (int) $p->get('hover_preview', 1) === 1,
            'icons'          => preg_replace('/[^a-z0-9_-]/i', '', (string) $p->get('icons', 'fishy')) ?: 'fishy',
            'lazy'           => $p->get('lazy', 'off') === 'click' ? 'click' : 'off',
            'loader'         => \in_array($p->get('loader', 'auto'), ['fish', 'ring'], true) ? $p->get('loader') : 'auto',
            'loaderImage'    => $this->image((string) $p->get('loader_image', '')),
            'loop'           => (int) $p->get('loop', 0) === 1,
            'mini'           => (int) $p->get('mini', 1) === 1,
            'pip'            => (int) $p->get('pip', 1) === 1,
            'playImage'      => $this->image((string) $p->get('play_image', '')),
            'previews'       => (int) $p->get('previews', 1) === 1,
            'privacy'        => (int) $p->get('privacy_screen', 1) === 1,
            'privacyRemember' => (int) $p->get('privacy_remember', 1) === 1,
            'privacyText'    => mb_substr(trim(preg_replace('/\s+/', ' ', strip_tags((string) $p->get('privacy_text', '')))), 0, 300),
            'privacyThumbs'  => (int) $p->get('privacy_thumbs', 0) === 1,
            'resume'         => (int) $p->get('resume', 1) === 1,
            'searchOffset'   => max(0.0, min(15.0, (float) $p->get('search_offset', 3))),
            'sparkles'       => (int) $p->get('sparkles', 1) === 1,
            'theater'        => (int) $p->get('theater', 1) === 1,
            'tiktok'         => $this->allowed('tiktok'),
            'transcriptOpen' => (int) $p->get('transcript_open', 0) === 1,
            'vimeo'          => $this->allowed('vimeo'),
            'youtube'        => $this->allowed('youtube'),
        ];

        if ($speeds) {
            $defaults['speeds'] = $speeds;
        }

        $wa = $doc->getWebAssetManager();
        $wa->registerAndUseScript(
            'plg_system_reelfishy.player',
            'plg_system_reelfishy/reel-fishy.min.js',
            ['version' => 'auto'],
            ['defer' => true]
        );
        $wa->addInlineScript(
            'window.ReelFishyDefaults=' . json_encode($defaults, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . ';',
            ['position' => 'before'],
            [],
            ['plg_system_reelfishy.player']
        );

        if ($this->videos && (int) $p->get('structured_data', 1) === 1) {
            $data = $this->structuredData();

            if ($data) {
                $wa->addInlineScript(
                    json_encode(\count($data) === 1 ? $data[0] : $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP),
                    ['name' => 'inline.reelfishy.videoobject'],
                    ['type' => 'application/ld+json']
                );
            }
        }

        $css = $this->accentCss();

        if ($css !== '') {
            $wa->addInlineStyle($css);
        }
    }

    /** Builds a <reel-fishy> element from the attribute text inside a tag. */
    private function render(string $raw, string $context = '', ?object $item = null): string
    {
        $attrs = $this->attributes($raw);

        if (empty($attrs['src'])) {
            return '<!-- reelfishy: missing src -->';
        }

        $this->announce($attrs, $context, $item);
        $this->videos[] = ['attrs' => $attrs, 'item' => $item, 'context' => $context];

        return $this->element($attrs);
    }

    /**
     * One player with a list of videos. The first tag inside sets the look and behavior;
     * each tag keeps its own video, captions, transcript, start / end and so on.
     */
    private function playlist(string $raw, string $inner, string $context, ?object $item): string
    {
        $wrapper = $this->attributes($raw, true);
        $items   = [];
        $first   = null;

        preg_match_all('#\{reelfishy\b(?!-)([^}]*)\}#i', $inner, $tags);

        foreach ($tags[1] as $tagRaw) {
            $attrs = $this->attributes($tagRaw);

            if (empty($attrs['src'])) {
                continue;
            }

            $first ??= $attrs;
            $items[] = array_intersect_key($attrs, array_flip(self::ITEM_ATTRS));
            $this->announce($attrs, $context, $item);
            $this->videos[] = ['attrs' => $attrs, 'item' => $item, 'context' => $context];
        }

        if (!$first) {
            return '<!-- reelfishy: empty playlist -->';
        }

        if (\count($items) > 1) {
            $first['playlist'] = json_encode($items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            if (!empty($wrapper['title'])) {
                $first['playlist-title'] = $wrapper['title'];
            }
        }

        return $this->element($first);
    }

    /** <reel-fishy …></reel-fishy> with every value escaped. */
    private function element(array $attrs): string
    {
        $html = '';

        foreach ($attrs as $key => $value) {
            $html .= ' ' . $key . '="' . htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8') . '"';
        }

        return '<reel-fishy' . $html . '></reel-fishy>';
    }

    /** The allowed, checked attributes from a tag's attribute text. $wrapper: a playlist's own (just title). */
    private function attributes(string $raw, bool $wrapper = false): array
    {
        $raw = html_entity_decode(strip_tags($raw), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $raw = str_replace(["\u{201C}", "\u{201D}", "\u{2033}"], '"', $raw);

        preg_match_all('/([a-z][a-z0-9-]*)\s*=\s*"([^"]*)"/i', $raw, $matches, PREG_SET_ORDER);

        $attrs = [];

        foreach ($matches as [, $key, $value]) {
            $key   = strtolower($key);
            $value = trim($value);

            if ($wrapper) {
                if ($key === 'title' && !isset($attrs['title'])) {
                    $attrs['title'] = mb_substr(trim(preg_replace('/\s+/', ' ', $value)), 0, 120);
                }

                continue;
            }

            if (!\in_array($key, self::ATTRS, true) || isset($attrs[$key])) {
                continue;
            }

            if (\in_array($key, self::TIME_ATTRS, true)) {
                if (!preg_match('/^\d+(\.\d+)?$|^\d+:\d{1,2}(\.\d+)?$|^\d+:\d{1,2}:\d{1,2}(\.\d+)?$/', $value)) {
                    continue;
                }
            } elseif ($key === 'aspect') {
                if (!preg_match('#^(auto|\d{1,4}(\.\d{1,3})?\s*[:/]\s*\d{1,4}(\.\d{1,3})?)$#i', $value)) {
                    continue;
                }
            } elseif ($key === 'end-lead') {
                if (!preg_match('/^\d{1,2}(\.\d)?$/', $value) || (float) $value > 15) {
                    continue;
                }
            } elseif ($key === 'hover-preview') {
                // on / off, or the time the preview starts at: 12, 1:30
                if (!preg_match('/^(on|off|yes|no|true|false|\d+(\.\d+)?|\d+:\d{1,2}(:\d{1,2})?(\.\d+)?)$/i', $value)) {
                    continue;
                }
            } elseif ($key === 'lazy') {
                $value = $value === 'click' ? 'click' : 'off';
            } elseif (\in_array($key, self::IMAGE_ATTRS, true)) {
                if (($value = $this->image($value)) === '') {
                    continue;
                }
            } elseif (\in_array($key, self::TRACK_ATTRS, true)) {
                if (($value = $this->tracks($value)) === '') {
                    continue;
                }
            } elseif (\in_array($key, self::TEXT_ATTRS, true)) {
                // an empty end-button="" is allowed: it clears the site's button for this video
                $value = mb_substr(trim(preg_replace('/\s+/', ' ', $value)), 0, 200);
            } elseif (\in_array($key, self::URL_ATTRS, true)) {
                if ($value === '' || ($value = $this->url($value)) === null) {
                    continue;
                }
            }

            $attrs[$key] = $value;
        }

        return $attrs;
    }

    /**
     * Hook for a future playlist / site-search component: every rendered player is
     * announced as onReelFishyRender, with where it appeared and its files.
     * Nothing listens yet; a listener can index videos and transcripts as pages render.
     */
    private function announce(array $attrs, string $context, ?object $item): void
    {
        try {
            $this->getApplication()->getDispatcher()->dispatch('onReelFishyRender', new Event('onReelFishyRender', [
                'context'    => $context,
                'itemId'     => isset($item->id) ? (int) $item->id : 0,
                'itemTitle'  => isset($item->title) ? (string) $item->title : '',
                'attributes' => $attrs,
            ]));
        } catch (\Throwable $e) {
            // never let a listener break the page
        }
    }

    /**
     * Which YouTube or Vimeo video a link points at (the same rules as the player's
     * ReelFishy.embedOf), or null for anything else.
     *
     * Short TikTok links (vm.tiktok.com) aren't matched; the editor expands them first.
     *
     * @return array{kind: string, id: string, h: string}|null
     */
    private function embed(string $src): ?array
    {
        $parts = parse_url(trim($src));

        if (!$parts || empty($parts['host']) || !\in_array(strtolower($parts['scheme'] ?? 'https'), ['http', 'https'], true)) {
            return null;
        }

        $host = preg_replace('/^(www|m)\./', '', strtolower($parts['host']));
        $path = array_values(array_filter(explode('/', $parts['path'] ?? ''), 'strlen'));
        parse_str($parts['query'] ?? '', $query);
        $id   = '';

        if ($host === 'youtu.be') {
            $id = $path[0] ?? '';
        } elseif ($host === 'youtube.com' || $host === 'youtube-nocookie.com') {
            if (($path[0] ?? '') === 'watch') {
                $id = (string) ($query['v'] ?? '');
            } elseif (\in_array($path[0] ?? '', ['embed', 'shorts', 'live', 'v'], true)) {
                $id = $path[1] ?? '';
            }
        }

        if ($id !== '' && preg_match('/^[\w-]{11}$/', $id)) {
            return ['kind' => 'youtube', 'id' => $id, 'h' => ''];
        }

        if ($host === 'tiktok.com' || $host === 'm.tiktok.com') {
            $at  = array_search('video', $path, true);
            $tid = $at !== false ? ($path[$at + 1] ?? '') : (\in_array($path[0] ?? '', ['embed', 'player'], true) ? (string) end($path) : '');

            if (preg_match('/^\d{8,}$/', $tid)) {
                return ['kind' => 'tiktok', 'id' => $tid, 'h' => ''];
            }
        }

        if ($host === 'vimeo.com' || $host === 'player.vimeo.com') {
            $at = -1;

            foreach ($path as $i => $seg) {
                if (ctype_digit($seg)) {
                    $at = $i;
                }
            }

            if ($at > -1) {
                $h = (string) ($query['h'] ?? (isset($path[$at + 1]) && preg_match('/^[0-9a-f]{6,}$/i', $path[$at + 1]) ? $path[$at + 1] : ''));

                return ['kind' => 'vimeo', 'id' => $path[$at], 'h' => preg_match('/^[0-9a-f]+$/i', $h) ? $h : ''];
            }
        }

        return null;
    }

    /** Whether the site allows YouTube or Vimeo videos. */
    private function allowed(string $kind): bool
    {
        return (int) $this->params->get('allow_' . $kind, 1) === 1;
    }

    /** Checks each file in "en:clip.vtt; es:clip-es.vtt" (or a single file); '' when none is usable. */
    private function tracks(string $value): string
    {
        $out = [];

        foreach (explode(';', $value) as $part) {
            $part = trim($part);
            $lang = '';

            if (preg_match('#^([a-z]{2,3}(?:-[a-z0-9]{2,8})*):(?!//)(.+)$#i', $part, $m)) {
                $lang = $m[1];
                $part = trim($m[2]);
            }

            if ($part === '' || ($url = $this->url($part)) === null) {
                continue;
            }

            $out[] = ($lang !== '' ? $lang . ':' : '') . $url;
        }

        return implode('; ', $out);
    }

    /** The first file of a track attribute, without its language. */
    private function firstTrack(string $value): string
    {
        $first = trim(explode(';', $value)[0]);

        return preg_match('#^[a-z]{2,3}(?:-[a-z0-9]{2,8})*:(?!//)(.+)$#i', $first, $m) ? trim($m[1]) : $first;
    }

    /** Makes site-relative paths absolute to the site root; rejects script URLs; keeps mailto:, tel: and sms: links. */
    private function url(string $value): ?string
    {
        if (preg_match('#^\s*(javascript|vbscript|data):#i', $value)) {
            return null;
        }

        if (preg_match('#^\s*(mailto|tel|sms):#i', $value)) {
            return trim($value);
        }

        if (preg_match('#^(https?:)?//#i', $value) || str_starts_with($value, '/')) {
            return $value;
        }

        return rtrim(Uri::root(true), '/') . '/' . preg_replace('#^\./#', '', $value);
    }

    /** A PNG or SVG path for a mascot image, made site-relative; '' when it isn't one. */
    private function image(string $value): string
    {
        // Media-field values carry a #joomlaImage:// fragment; drop it.
        $value = trim(explode('#', $value, 2)[0]);

        if ($value === '' || !preg_match('/\.(png|svg)(\?.*)?$/i', $value)) {
            return '';
        }

        return $this->url($value) ?? '';
    }

    /** File types the editor popup's browser can show, by field kind. */
    private const BROWSE_TYPES = [
        'video'  => ['mp4', 'm4v', 'webm', 'ogv', 'mov'],
        'image'  => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'],
        'vtt'    => ['vtt', 'srt'],
        'doc'    => ['txt', 'doc', 'docx', 'pdf', 'odt', 'rtf'],
        'mascot' => ['png', 'svg'],
    ];

    /** Most entries one folder listing returns. */
    private const BROWSE_LIMIT = 1000;

    /**
     * Folder listing for the editor button's Browse picker:
     * index.php?option=com_ajax&plugin=reelfishy&format=json&type=video&path=files/demos&<token>=1
     *
     * Only signed-in users who can write content get an answer, only with a valid
     * session token, and only for folders under the roots set in the plugin options.
     */
    public function onAjaxReelfishy(AjaxEvent $event): void
    {
        $app   = $this->getApplication();
        $input = $app->getInput();
        $user  = $app->getIdentity();

        if (!$user || $user->guest || !$this->canBrowse($user)) {
            throw new \RuntimeException(Text::_('JERROR_ALERTNOAUTHOR'), 403);
        }

        if (!Session::checkToken('get')) {
            throw new \RuntimeException(Text::_('JINVALID_TOKEN'), 403);
        }

        // The editor popup expands a short TikTok link into the full one it redirects to.
        if ($input->getCmd('task') === 'resolve') {
            $event->addResult(['url' => $this->expandTikTok((string) $input->getString('url', ''))]);

            return;
        }

        $type  = (string) $input->getCmd('type', 'video');
        $exts  = self::BROWSE_TYPES[$type] ?? self::BROWSE_TYPES['video'];
        $roots = $this->browseRoots();
        $path  = trim(str_replace('\\', '/', (string) $input->getString('path', '')), '/');

        // No path: the configured roots are the top level.
        if ($path === '') {
            $event->addResult([
                'path'    => '',
                'parent'  => null,
                'folders' => array_values($roots),
                'files'   => [],
                'more'    => false,
            ]);

            return;
        }

        $parts = explode('/', $path);

        foreach ($parts as $part) {
            if ($part === '' || $part === '.' || $part === '..' || str_starts_with($part, '.')) {
                throw new \RuntimeException(Text::_('JERROR_ALERTNOAUTHOR'), 403);
            }
        }

        if (!\in_array($parts[0], $roots, true)) {
            throw new \RuntimeException(Text::_('JERROR_ALERTNOAUTHOR'), 403);
        }

        $base = realpath(JPATH_ROOT . '/' . $parts[0]);
        $dir  = realpath(JPATH_ROOT . '/' . $path);

        if ($base === false || $dir === false || !is_dir($dir)
            || ($dir !== $base && !str_starts_with($dir, $base . DIRECTORY_SEPARATOR))) {
            throw new \RuntimeException(Text::_('JERROR_ALERTNOAUTHOR'), 404);
        }

        $folders = [];
        $files   = [];
        $count   = 0;
        $more    = false;

        foreach (scandir($dir) ?: [] as $name) {
            if ($name === '' || $name[0] === '.' || $name === 'index.html') {
                continue;
            }

            if (++$count > self::BROWSE_LIMIT) {
                $more = true;
                break;
            }

            $full = $dir . DIRECTORY_SEPARATOR . $name;

            if (is_dir($full)) {
                // skip links that lead outside the root
                $real = realpath($full);

                if ($real !== false && str_starts_with($real, $base . DIRECTORY_SEPARATOR)) {
                    $folders[] = $name;
                }
            } elseif (\in_array(strtolower(pathinfo($name, PATHINFO_EXTENSION)), $exts, true)) {
                $files[] = ['name' => $name, 'path' => $path . '/' . $name, 'size' => (int) @filesize($full)];
            }
        }

        natcasesort($folders);
        usort($files, static fn (array $a, array $b): int => strnatcasecmp($a['name'], $b['name']));

        $event->addResult([
            'path'    => $path,
            'parent'  => \count($parts) > 1 ? implode('/', \array_slice($parts, 0, -1)) : '',
            'folders' => array_values($folders),
            'files'   => $files,
            'more'    => $more,
        ]);
    }

    /**
     * Follows a short TikTok link (vm.tiktok.com/…, vt.tiktok.com/…, tiktok.com/t/…) to the
     * full video link. Every hop must stay on tiktok.com, over HTTPS. Returns '' when it can't.
     */
    private function expandTikTok(string $url): string
    {
        $parts = parse_url(trim($url));
        $host  = strtolower($parts['host'] ?? '');
        $path  = $parts['path'] ?? '';

        if (!\in_array($host, ['vm.tiktok.com', 'vt.tiktok.com'], true)
            && !(\in_array($host, ['tiktok.com', 'www.tiktok.com'], true) && str_starts_with($path, '/t/'))) {
            throw new \RuntimeException(Text::_('JERROR_ALERTNOAUTHOR'), 400);
        }

        if (!\function_exists('curl_init')) {
            return '';
        }

        $next = 'https://' . $host . $path;

        for ($hop = 0; $hop < 5; $hop++) {
            if (preg_match('#^https://(?:www\.|m\.)?tiktok\.com/(@[\w.-]+)/video/(\d{8,})#', $next, $m)) {
                return 'https://www.tiktok.com/' . $m[1] . '/video/' . $m[2];
            }

            $location = '';
            $ch       = curl_init($next);
            curl_setopt_array($ch, [
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_TIMEOUT        => 8,
                CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; ReelFishy)',
                CURLOPT_HEADERFUNCTION => static function ($c, string $line) use (&$location): int {
                    if (stripos($line, 'location:') === 0) {
                        $location = trim(substr($line, 9));
                    }

                    return \strlen($line);
                },
                // only the headers matter: stop reading the body straight away
                CURLOPT_WRITEFUNCTION  => static fn ($c, string $data): int => 0,
            ]);
            curl_exec($ch);
            curl_close($ch);

            if ($location === '') {
                return '';
            }

            if (str_starts_with($location, '/')) {
                $location = 'https://' . $host . $location;
            }

            $host = strtolower((string) parse_url($location, PHP_URL_HOST));

            if (parse_url($location, PHP_URL_SCHEME) !== 'https' || !preg_match('/(^|\.)tiktok\.com$/', $host)) {
                return '';
            }

            $next = $location;
        }

        return '';
    }

    /** People who can place a video: anyone who can write articles or modules, or manage media. */
    private function canBrowse(object $user): bool
    {
        foreach (['com_content' => ['core.create', 'core.edit', 'core.edit.own'], 'com_modules' => ['core.edit'], 'com_media' => ['core.manage']] as $asset => $actions) {
            foreach ($actions as $action) {
                if ($user->authorise($action, $asset)) {
                    return true;
                }
            }
        }

        return false;
    }

    /** Top-level folders the Browse picker may open, from the plugin options. */
    private function browseRoots(): array
    {
        $roots = [];

        foreach (explode(',', (string) $this->params->get('browse_roots', 'images,files')) as $root) {
            $root = trim($root, " \t\n\r\0\x0B/");

            if ($root !== '' && preg_match('/^[A-Za-z0-9_-]+$/', $root) && is_dir(JPATH_ROOT . '/' . $root)) {
                $roots[$root] = $root;
            }
        }

        return array_values($roots);
    }

    /**
     * Google's VideoObject structured data for each player on the page, with the
     * transcript text and chapters (as Clips that link straight to that moment).
     * A video is left out when there's no date for it, since search engines need one.
     */
    private function structuredData(): array
    {
        $out  = [];
        $page = Uri::getInstance()->toString(['scheme', 'host', 'port', 'path', 'query']);
        $pos  = 0;
        $seen = [];

        foreach ($this->videos as $video) {
            $pos++;
            $a    = $video['attrs'];

            // the same video twice on a page (say, in a playlist too) is described once
            if (isset($seen[$a['src']])) {
                continue;
            }

            $seen[$a['src']] = true;
            $item = $video['item'];
            $date = '';

            foreach (['publish_up', 'created', 'modified'] as $field) {
                if (!empty($item->$field) && !str_starts_with((string) $item->$field, '0000')) {
                    $time = strtotime($item->$field . ' UTC');

                    if ($time) {
                        $date = gmdate('c', $time);
                        break;
                    }
                }
            }

            if ($date === '') {
                continue;
            }

            $embed = $this->embed($a['src']);

            // a YouTube / Vimeo video the site has switched off isn't on the page as a video
            if ($embed && !$this->allowed($embed['kind'])) {
                continue;
            }

            // a short TikTok link can't be played, so it isn't a video on the page either
            if (preg_match('#^https?://(vm\.|vt\.|(www\.)?tiktok\.com/t/)#i', $a['src'])) {
                continue;
            }

            $name = trim((string) ($a['label'] ?? '')) ?: trim((string) ($item->title ?? '')) ?: pathinfo(parse_url($a['src'], PHP_URL_PATH) ?: '', PATHINFO_FILENAME);
            $desc = trim((string) ($item->metadesc ?? ''));

            if ($desc === '') {
                $desc = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string) ($item->introtext ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
            }

            $obj = [
                '@context'    => 'https://schema.org',
                '@type'       => 'VideoObject',
                'name'        => $name,
                'description' => mb_substr($desc !== '' ? $desc : $name, 0, 300),
                'uploadDate'  => $date,
            ];

            // a hosted video is described by its player; a file by the file itself
            if ($embed && $embed['kind'] === 'youtube') {
                $obj['embedUrl'] = 'https://www.youtube.com/embed/' . $embed['id'];
            } elseif ($embed && $embed['kind'] === 'tiktok') {
                $obj['embedUrl'] = 'https://www.tiktok.com/player/v1/' . $embed['id'];
            } elseif ($embed) {
                $obj['embedUrl'] = 'https://player.vimeo.com/video/' . $embed['id'] . ($embed['h'] !== '' ? '?h=' . $embed['h'] : '');
            } else {
                $obj['contentUrl'] = $this->absolute($a['src']);
            }

            if (!empty($a['poster'])) {
                $obj['thumbnailUrl'] = $this->absolute($a['poster']);
            } elseif ($embed && $embed['kind'] === 'youtube') {
                $obj['thumbnailUrl'] = 'https://i.ytimg.com/vi/' . $embed['id'] . '/hqdefault.jpg';
            }

            $text = $this->cueFile($a['transcript'] ?? $this->firstTrack($a['captions'] ?? ''));

            if ($text) {
                $obj['transcript'] = mb_substr(implode(' ', array_column($text, 'text')), 0, 10000);
            }

            $chapters = $this->cueFile($a['chapters'] ?? '');

            if ($chapters) {
                $id    = rawurlencode((string) ($a['video-id'] ?? $pos));
                $parts = [];

                foreach (\array_slice($chapters, 0, 50) as $c) {
                    $parts[] = [
                        '@type'       => 'Clip',
                        'name'        => mb_substr($c['text'], 0, 100),
                        'startOffset' => (int) floor($c['start']),
                        'endOffset'   => (int) ceil($c['end']),
                        'url'         => $page . '#rf=' . $id . '&t=' . (int) floor($c['start']),
                    ];
                }

                $obj['hasPart'] = $parts;
            }

            $out[] = $obj;
        }

        return $out;
    }

    /** A site path or URL as a full URL. */
    private function absolute(string $url): string
    {
        if (preg_match('#^https?://#i', $url)) {
            return $url;
        }

        if (str_starts_with($url, '//')) {
            return Uri::getInstance()->getScheme() . ':' . $url;
        }

        return rtrim(Uri::getInstance()->toString(['scheme', 'host', 'port']), '/') . '/' . ltrim($url, '/');
    }

    /** Cues from a local WebVTT / SRT file: [['start', 'end', 'text'], …]. Remote or large files are skipped. */
    private function cueFile(string $url): array
    {
        if ($url === '' || preg_match('#^(https?:)?//#i', $url)) {
            return [];
        }

        $base = rtrim(Uri::root(true), '/');
        $rel  = ltrim($base !== '' && str_starts_with($url, $base . '/') ? substr($url, \strlen($base)) : $url, '/');
        $root = realpath(JPATH_ROOT);
        $file = realpath(JPATH_ROOT . '/' . explode('?', $rel, 2)[0]);

        if (!$root || !$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file)
            || !preg_match('/\.(vtt|srt)$/i', $file) || filesize($file) > 1048576) {
            return [];
        }

        $raw  = (string) file_get_contents($file);
        $raw  = str_replace(["\r\n", "\r"], "\n", preg_replace('/^\xEF\xBB\xBF/', '', $raw));
        $cues = [];

        foreach (preg_split('/\n{2,}/', $raw) as $block) {
            $lines = explode("\n", trim($block));

            foreach ($lines as $i => $line) {
                if (!str_contains($line, '-->')) {
                    continue;
                }

                [$a, $b] = array_map('trim', explode('-->', $line, 2));
                $text    = trim(html_entity_decode(strip_tags(implode(' ', \array_slice($lines, $i + 1))), ENT_QUOTES | ENT_HTML5, 'UTF-8'));

                if ($text !== '') {
                    $cues[] = ['start' => $this->seconds($a), 'end' => $this->seconds(preg_split('/\s+/', $b)[0]), 'text' => preg_replace('/\s+/', ' ', $text)];
                }

                break;
            }
        }

        return $cues;
    }

    /** '01:02.500', '1:01:02,5' -> seconds. */
    private function seconds(string $t): float
    {
        $total = 0.0;

        foreach (explode(':', str_replace(',', '.', trim($t))) as $part) {
            $total = $total * 60 + (float) $part;
        }

        return $total;
    }

    /** Accent colours from the plugin options, applied to every player. */
    private function accentCss(): string
    {
        $vars = [];
        $map  = [
            '--rf-accent'   => 'accent_1',
            '--rf-accent-2' => 'accent_2',
            '--rf-accent-3' => 'accent_3',
            '--rf-accent-4' => 'accent_4',
        ];

        foreach ($map as $var => $param) {
            $color = trim((string) $this->params->get($param, ''));

            if (preg_match('/^#[0-9a-f]{3,8}$/i', $color)) {
                $vars[] = $var . ':' . strtolower($color);
            }
        }

        return $vars ? 'reel-fishy{' . implode(';', $vars) . '}' : '';
    }
}
