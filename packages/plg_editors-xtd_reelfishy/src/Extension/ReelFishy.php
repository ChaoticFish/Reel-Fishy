<?php

/**
 * @package     Reel Fishy
 * @subpackage  plg_editors-xtd_reelfishy
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace ChaoticFishDesign\Plugin\EditorsXtd\ReelFishy\Extension;

use Joomla\CMS\Editor\Button\Button;
use Joomla\CMS\Event\Editor\EditorButtonsSetupEvent;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Component\ComponentHelper;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Session\Session;
use Joomla\CMS\Uri\Uri;
use Joomla\Event\SubscriberInterface;
use Joomla\Registry\Registry;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * "Reel Fishy" editor button: opens a popup that builds a {reelfishy} tag,
 * starting from the site's Reel Fishy settings.
 */
final class ReelFishy extends CMSPlugin implements SubscriberInterface
{
    /** Popup strings sent to the browser. */
    private const STRINGS = [
        'TITLE', 'NOT_ENABLED', 'EDITING', 'INSERT', 'UPDATE', 'CANCEL', 'RESET', 'CHANGED', 'TAG',
        'GROUP_FILES', 'GROUP_LOOK', 'GROUP_BEHAVIOR', 'GROUP_ADVANCED', 'GROUP_HINT',
        'SRC', 'SRC_HINT', 'SRC_REQUIRED', 'POSTER', 'CAPTIONS', 'CHAPTERS', 'TRANSCRIPT', 'TRANSCRIPT_HINT', 'LABEL', 'LABEL_HINT',
        'ICONS', 'ICONS_FISHY', 'ICONS_CLASSIC', 'ICONS_MINIMAL', 'SPARKLES',
        'LOADER', 'LOADER_AUTO', 'LOADER_FISH', 'LOADER_RING', 'PLAY_IMAGE', 'LOADER_IMAGE', 'IMAGE_HINT',
        'TRANSCRIPT_OPEN', 'CAPTIONS_ON', 'RESUME', 'MINI', 'DOCK', 'DOCK_RIGHT', 'DOCK_LEFT',
        'CARRY', 'CARRY_OFF_SITE', 'PIP',
        'START', 'START_HINT', 'SPEEDS', 'SEARCH_OFFSET',
        'CLOSE', 'BROWSE', 'BROWSE_TITLE', 'BROWSE_BACK', 'BROWSE_UP', 'BROWSE_ROOT', 'BROWSE_LOADING',
        'BROWSE_EMPTY', 'BROWSE_ERROR', 'BROWSE_MORE', 'BROWSE_PICK',
        'TRANSCRIPT_FILE', 'TRANSCRIPT_FILE_HINT', 'VIDEO_ID', 'VIDEO_ID_HINT',
        'LOOP', 'LAZY', 'END', 'END_HINT',
        'SELECT', 'SIMPLE_PICKER', 'MM_NOTHING',
        'YOUTUBE_ON', 'YOUTUBE_OFF', 'VIMEO_ON', 'VIMEO_OFF', 'TIKTOK_ON', 'TIKTOK_OFF',
        'TIKTOK_SHORT', 'TIKTOK_EXPANDING', 'TIKTOK_SHORT_FAIL',
        'ASPECT', 'ASPECT_AUTO', 'ASPECT_WIDE', 'ASPECT_TALL', 'ASPECT_43', 'ASPECT_SQUARE', 'ASPECT_HINT',
        'CAPTIONS_HINT', 'DESCRIPTIONS', 'DESCRIPTIONS_HINT', 'DESCRIPTIONS_ON',
        'END_SCREEN', 'END_MESSAGE', 'END_HINT', 'END_BUTTON', 'END_URL', 'END_BUTTON_2', 'END_URL_2', 'XX_HINT',
        'PL_ON', 'PL_TITLE', 'PL_TITLE_HINT', 'PL_EMPTY', 'PL_ADD', 'PL_SAVE', 'PL_NEW', 'PL_UP', 'PL_DOWN', 'PL_EDIT', 'PL_REMOVE', 'PL_INSERT', 'PL_UPDATE',
        'THUMBNAILS', 'THUMBNAILS_HINT', 'HOTSPOTS', 'HOTSPOTS_HINT', 'GLOW', 'CONFETTI', 'THEATER', 'PREVIEWS', 'HOVER_PREVIEW', 'FRAME_TOOLS', 'END_URL_HINT', 'END_LEAD', 'END_LEAD_HINT',
    ];

    public static function getSubscribedEvents(): array
    {
        return ['onEditorButtonsSetup' => 'onEditorButtonsSetup'];
    }

    public function onEditorButtonsSetup(EditorButtonsSetupEvent $event): void
    {
        if (\in_array($this->_name, $event->getDisabledButtons(), true)) {
            return;
        }

        $doc = $this->getApplication()->getDocument();
        $wa  = $doc->getWebAssetManager();

        // The button layout loads the asset named "editor-button.<button name>".
        if (!$wa->assetExists('script', 'editor-button.' . $this->_name)) {
            $wa->registerScript(
                'editor-button.' . $this->_name,
                'plg_editors-xtd_reelfishy/insert.js',
                ['version' => 'auto'],
                ['type' => 'module'],
                ['editors', 'joomla.dialog']
            );
        }

        $this->loadLanguage();

        foreach (self::STRINGS as $key) {
            Text::script('PLG_EDITORS_XTD_REELFISHY_' . $key);
        }

        $doc->addScriptOptions('plg_editors-xtd_reelfishy', $this->siteDefaults());

        $event->getButtonsRegistry()->add(new Button(
            $this->_name,
            [
                'action'  => 'insert-reelfishy',
                'text'    => Text::_('PLG_EDITORS_XTD_REELFISHY_BUTTON'),
                'icon'    => 'video',
                'iconSVG' => '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2 7.5l4.5 4.5L2 16.5zM7 12c2.2-4 6-6 9.5-6C19.5 6 22 8.7 22 12s-2.5 6-5.5 6C13 18 9.2 16 7 12z"/></svg>',
                'name'    => $this->_type . '_' . $this->_name,
            ]
        ));
    }

    /**
     * The system plugin's settings, keyed by tag attribute, so the popup starts
     * from what the site already does and only writes the differences.
     */
    private function siteDefaults(): array
    {
        $plugin  = PluginHelper::getPlugin('system', 'reelfishy');
        $enabled = \is_object($plugin);
        $p       = new Registry($enabled ? ($plugin->params ?? '{}') : '{}');
        $on      = static fn (string $key, int $default): bool => (int) $p->get($key, $default) === 1;
        $loader  = (string) $p->get('loader', 'auto');

        return [
            'enabled'  => $enabled,
            // The Browse picker asks the system plugin, so it's only offered when that plugin is on.
            'browse'   => $enabled ? [
                'url'   => rtrim(Uri::base(true), '/') . '/index.php?option=com_ajax&plugin=reelfishy&format=json',
                'token' => Session::getFormToken(),
            ] : null,
            'media'    => $this->mediaManager(),
            'embeds'   => ['youtube' => $on('allow_youtube', 1), 'vimeo' => $on('allow_vimeo', 1), 'tiktok' => $on('allow_tiktok', 1)],
            'defaults' => [
                'icons'           => (string) $p->get('icons', 'fishy'),
                'sparkles'        => $on('sparkles', 1),
                'loader'          => \in_array($loader, ['fish', 'ring'], true) ? $loader : 'auto',
                'play-image'      => explode('#', (string) $p->get('play_image', ''), 2)[0],
                'loader-image'    => explode('#', (string) $p->get('loader_image', ''), 2)[0],
                'transcript-open' => $on('transcript_open', 0),
                'captions-on'     => $on('captions_on', 0),
                'resume'          => $on('resume', 1),
                'mini'            => $on('mini', 1),
                'dock'            => $p->get('dock_position', 'right') === 'left' ? 'left' : 'right',
                'carry-over'      => $on('carry', 1),
                'pip'             => $on('pip', 1),
                'speeds'          => (string) $p->get('speeds', '0.5,0.75,1,1.25,1.5,2'),
                'search-offset'   => (float) $p->get('search_offset', 3),
                'loop'            => $on('loop', 0),
                'lazy'            => $p->get('lazy', 'off') === 'click',
                'aspect'          => 'auto',
                'descriptions-on' => $on('descriptions_on', 0),
                'glow'            => $on('glow', 1),
                'confetti'        => $on('confetti', 1),
                'theater'         => $on('theater', 1),
                'previews'        => $on('previews', 1),
                'hover-preview'   => $on('hover_preview', 1),
                'frame-tools'     => $on('frame_tools', 1),
                'end-lead'        => (float) $p->get('end_lead', 2),
                'end-screen'      => true,
                'end-message'     => (string) $p->get('end_message', ''),
                'end-button'      => (string) $p->get('end_button_1', ''),
                'end-url'         => (string) $p->get('end_url_1', ''),
                'end-button-2'    => (string) $p->get('end_button_2', ''),
                'end-url-2'       => (string) $p->get('end_url_2', ''),
            ],
        ];
    }

    /**
     * What the popup needs to open Joomla's own Media Manager, the same way Joomla's
     * media field does. Administrator only, for people who can manage media; anyone
     * else gets the built-in picker.
     */
    private function mediaManager(): ?array
    {
        $app  = $this->getApplication();
        $user = $app->getIdentity();

        if (!$app->isClient('administrator') || !$user || !$user->authorise('core.manage', 'com_media')) {
            return null;
        }

        $media = ComponentHelper::getParams('com_media');
        $list  = static fn (string $key, string $default): array => array_values(array_filter(
            array_map(static fn ($e) => strtolower(trim($e)), explode(',', (string) $media->get($key, $default)))
        ));

        // Folders the Filesystem - Local plugin shows (the Media Manager's top level).
        $dirs  = [];
        $local = PluginHelper::getPlugin('filesystem', 'local');

        if (\is_object($local)) {
            $lp      = new Registry($local->params ?? '{}');
            $entries = $lp->get('directories', [(object) ['directory' => 'images']]);

            if (\is_string($entries)) {
                $entries = json_decode($entries) ?: [];
            }

            foreach ((array) $entries as $entry) {
                $dir = \is_object($entry) ? ($entry->directory ?? '') : (\is_array($entry) ? ($entry['directory'] ?? '') : '');
                $dir = trim((string) $dir, '/');

                if ($dir !== '') {
                    $dirs[] = $dir;
                }
            }
        }

        return [
            'url'   => Route::_('index.php?option=com_media&view=media&tmpl=component&asset=com_content&author=' . (int) $user->id, false),
            'api'   => rtrim(Uri::base(true), '/') . '/index.php?option=com_media&format=json',
            'root'  => Uri::root(),
            'token' => Session::getFormToken(),
            'dirs'  => $dirs,
            // The Media Manager lists a file when its extension is in that type's list
            // (com_media ApiModel::isMediaFile). Uploading also needs the allowed list.
            'ext'   => [
                'image' => $list('image_extensions', 'bmp,gif,jpg,jpeg,png,webp,avif'),
                'video' => $list('video_extensions', 'mp4,mp4v,mpeg,mov,webm'),
                'doc'   => $list('doc_extensions', 'doc,odg,odp,ods,odt,pdf,ppt,txt,xcf,xls,csv'),
            ],
        ];
    }
}
