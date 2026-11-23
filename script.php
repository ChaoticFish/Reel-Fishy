<?php

/**
 * Reel Fishy package installer script.
 *
 * Checks PHP 8.2+ and Joomla 5+ before anything is installed, and switches on
 * both plugins the first time they're installed. A plugin that was already on
 * the site keeps its on/off state, so an admin who switched one off isn't overruled.
 *
 * Reel Fishy used to be called Bioluminescence (up to 1.0.1). When the old
 * plugins are still on the site, a first install copies their settings into
 * the new ones, switches the old ones off (so tags aren't turned into players
 * twice) and says to uninstall the old package.
 *
 * Written without newer PHP syntax (no constructor promotion, no typed
 * properties) so an old server can still read it and say why it stops.
 *
 * @copyright  (C) 2026 Chaotic Fish Design
 * @license    GNU General Public License version 2 or later; see LICENSE.txt
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Application\AdministratorApplication;
use Joomla\CMS\Factory;
use Joomla\CMS\Installer\InstallerAdapter;
use Joomla\CMS\Installer\InstallerScriptInterface;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;

return new class () implements ServiceProviderInterface {
    public function register(Container $container)
    {
        $container->set(
            InstallerScriptInterface::class,
            new class ($container->get(AdministratorApplication::class)) implements InstallerScriptInterface {
                /** @var string */
                private $minimumPhp = '8.2.0';

                /** @var string */
                private $minimumJoomla = '5.0.0';

                /** The package's plugins, as [folder, element]. */
                private $plugins = [['system', 'reelfishy'], ['editors-xtd', 'reelfishy']];

                /** Plugins already on the site before this install, keyed "folder/element". */
                private $existing = [];

                /** The same plugins under their old name (Bioluminescence, up to 1.0.1). */
                private $oldElement = 'bioluminescence';

                /** Old plugins found before this install: "folder" => [id, params]. */
                private $old = [];

                /** @var AdministratorApplication */
                private $app;

                public function __construct($app)
                {
                    $this->app = $app;
                }

                public function install(InstallerAdapter $adapter): bool
                {
                    return true;
                }

                public function update(InstallerAdapter $adapter): bool
                {
                    return true;
                }

                public function uninstall(InstallerAdapter $adapter): bool
                {
                    return true;
                }

                public function preflight(string $type, InstallerAdapter $adapter): bool
                {
                    if ($type === 'uninstall') {
                        return true;
                    }

                    if (version_compare(PHP_VERSION, $this->minimumPhp, '<')) {
                        $this->app->enqueueMessage(
                            sprintf('Reel Fishy needs PHP %s or newer. This site runs PHP %s.', $this->minimumPhp, PHP_VERSION),
                            'error'
                        );

                        return false;
                    }

                    if (version_compare(JVERSION, $this->minimumJoomla, '<')) {
                        $this->app->enqueueMessage(
                            sprintf('Reel Fishy needs Joomla %s or newer. This site runs Joomla %s.', $this->minimumJoomla, JVERSION),
                            'error'
                        );

                        return false;
                    }

                    // Remember which plugins are already here, before the package installs them.
                    foreach ($this->plugins as $plugin) {
                        if ($this->pluginId($plugin[0], $plugin[1])) {
                            $this->existing[$plugin[0] . '/' . $plugin[1]] = true;
                        }

                        // and whether the old-named plugin is still around
                        $oldId = $this->pluginId($plugin[0], $this->oldElement);

                        if ($oldId) {
                            $this->old[$plugin[0]] = [$oldId, $this->pluginParams($oldId)];
                        }
                    }

                    return true;
                }

                public function postflight(string $type, InstallerAdapter $adapter): bool
                {
                    if ($type !== 'install' && $type !== 'discover_install') {
                        return true;
                    }

                    $moved = false;

                    foreach ($this->plugins as $plugin) {
                        if (isset($this->existing[$plugin[0] . '/' . $plugin[1]])) {
                            continue;
                        }

                        $id = $this->pluginId($plugin[0], $plugin[1]);

                        if (!$id) {
                            continue;
                        }

                        // Moving from the old name: bring its settings across, then switch it off.
                        if (isset($this->old[$plugin[0]])) {
                            list($oldId, $params) = $this->old[$plugin[0]];

                            if ($params !== '' && $params !== '{}' && $params !== '[]') {
                                $this->setColumn($id, 'params', $params);
                            }

                            $this->setColumn($oldId, 'enabled', 0);
                            $moved = true;
                        }

                        $this->setColumn($id, 'enabled', 1);
                    }

                    if ($moved) {
                        $this->app->enqueueMessage(
                            'Reel Fishy used to be called Bioluminescence. Your Bioluminescence settings were copied into Reel Fishy, and the old '
                            . 'Bioluminescence plugins were switched off. To finish, uninstall the old package: System → Manage → Extensions, '
                            . 'search for "Bioluminescence" and uninstall the package (it removes both old plugins).',
                            'warning'
                        );
                    }

                    return true;
                }

                /** Sets one column of an #__extensions row. */
                private function setColumn(int $id, string $column, $value): void
                {
                    $db    = Factory::getContainer()->get('DatabaseDriver');
                    $query = $db->getQuery(true)
                        ->update($db->quoteName('#__extensions'))
                        ->set($db->quoteName($column) . ' = :value')
                        ->where($db->quoteName('extension_id') . ' = :id')
                        ->bind(':id', $id, \Joomla\Database\ParameterType::INTEGER);

                    if (\is_int($value)) {
                        $query->bind(':value', $value, \Joomla\Database\ParameterType::INTEGER);
                    } else {
                        $query->bind(':value', $value);
                    }

                    $db->setQuery($query)->execute();
                }

                /** A plugin's saved settings (JSON), or '' when it has none. */
                private function pluginParams(int $id): string
                {
                    $db    = Factory::getContainer()->get('DatabaseDriver');
                    $query = $db->getQuery(true)
                        ->select($db->quoteName('params'))
                        ->from($db->quoteName('#__extensions'))
                        ->where($db->quoteName('extension_id') . ' = :id')
                        ->bind(':id', $id, \Joomla\Database\ParameterType::INTEGER);

                    return (string) $db->setQuery($query)->loadResult();
                }

                /** The extension ID of a plugin, or 0 when it isn't installed. */
                private function pluginId(string $folder, string $element): int
                {
                    $db    = Factory::getContainer()->get('DatabaseDriver');
                    $query = $db->getQuery(true)
                        ->select($db->quoteName('extension_id'))
                        ->from($db->quoteName('#__extensions'))
                        ->where($db->quoteName('type') . ' = ' . $db->quote('plugin'))
                        ->where($db->quoteName('folder') . ' = :folder')
                        ->where($db->quoteName('element') . ' = :element')
                        ->bind(':folder', $folder)
                        ->bind(':element', $element);

                    return (int) $db->setQuery($query)->loadResult();
                }
            }
        );
    }
};
