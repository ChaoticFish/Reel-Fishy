<?php

/**
 * @package     Reel Fishy
 * @subpackage  plg_system_reelfishy
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

\defined('_JEXEC') or die;

use ChaoticFishDesign\Plugin\System\ReelFishy\Extension\ReelFishy;
use Joomla\CMS\Extension\PluginInterface;
use Joomla\CMS\Factory;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;
use Joomla\Event\DispatcherInterface;

return new class () implements ServiceProviderInterface {
    public function register(Container $container): void
    {
        $container->set(
            PluginInterface::class,
            function (Container $container) {
                $config = (array) PluginHelper::getPlugin('system', 'reelfishy');

                // Joomla 5.3+ and 6.x take the config only; 5.0-5.2 still need the dispatcher first.
                $plugin = version_compare(JVERSION, '5.3', '>=')
                    ? new ReelFishy($config)
                    : new ReelFishy($container->get(DispatcherInterface::class), $config);

                $plugin->setApplication(Factory::getApplication());

                return $plugin;
            }
        );
    }
};
