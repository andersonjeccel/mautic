/**
 * Bootstrap 3 attribute and jQuery API bridge for Bootstrap 5.
 */
(function (window, document) {
    'use strict';

    var pluginMap = {
        collapse: 'Collapse',
        dropdown: 'Dropdown',
        modal: 'Modal',
        offcanvas: 'Offcanvas',
        popover: 'Popover',
        tab: 'Tab',
        tooltip: 'Tooltip'
    };
    var bootstrapDataAttributes = [
        'backdrop',
        'container',
        'content',
        'delay',
        'dismiss',
        'html',
        'keyboard',
        'offset',
        'parent',
        'placement',
        'target',
        'title',
        'toggle',
        'trigger'
    ];
    var methodAliases = {
        destroy: 'dispose',
        fixTitle: '_fixTitle'
    };
    var selector = Object.keys(pluginMap)
        .map(function (plugin) {
            return '[data-toggle="' + plugin + '"]';
        })
        .concat(['[data-dismiss]', '.modal[data-backdrop]', '.modal[data-keyboard]'])
        .join(',');

    function copyLegacyDataAttribute(element, name) {
        var legacyName = 'data-' + name;
        var bootstrapName = 'data-bs-' + name;

        if (element.hasAttribute(legacyName) && !element.hasAttribute(bootstrapName)) {
            element.setAttribute(bootstrapName, element.getAttribute(legacyName));
        }
    }

    function getTargetSelector(element) {
        var target = element.getAttribute('data-bs-target')
            || element.getAttribute('data-target')
            || element.getAttribute('href');

        if (!target) {
            return null;
        }

        if ('#' === target.charAt(0) || '.' === target.charAt(0)) {
            return target;
        }

        try {
            return new URL(target, document.baseURI).hash || null;
        } catch (error) {
            return null;
        }
    }

    function copyCollapseParent(element) {
        if ('collapse' !== element.getAttribute('data-toggle')) {
            return;
        }

        var parent = element.getAttribute('data-bs-parent') || element.getAttribute('data-parent');
        var target = getTargetSelector(element);

        if (!parent || !target) {
            return;
        }

        try {
            document.querySelectorAll(target).forEach(function (collapse) {
                if (!collapse.hasAttribute('data-bs-parent')) {
                    collapse.setAttribute('data-bs-parent', parent);
                }
            });
        } catch (error) {
            // Invalid legacy selectors remain untouched for the caller to handle.
        }
    }

    function mirrorBootstrapAttributes(element) {
        if (!element || !element.getAttribute) {
            return;
        }

        var toggle = element.getAttribute('data-toggle');

        if (toggle && !Object.prototype.hasOwnProperty.call(pluginMap, toggle)) {
            return;
        }

        bootstrapDataAttributes.forEach(function (name) {
            copyLegacyDataAttribute(element, name);
        });
        copyCollapseParent(element);
    }

    function mirrorLegacyMarkup(container) {
        if (!container || !container.querySelectorAll) {
            return;
        }

        if (container.matches && container.matches(selector)) {
            mirrorBootstrapAttributes(container);
        }

        container.querySelectorAll(selector).forEach(mirrorBootstrapAttributes);
    }

    function disposeOverlayWhenHidden(element, instance, pluginName) {
        if (!element.hasAttribute('aria-describedby')) {
            instance.dispose();
            return;
        }

        element.addEventListener('hidden.bs.' + pluginName, function () {
            instance.dispose();
        }, {once: true});
        instance.hide();
    }

    function invokePlugin(element, pluginName, Constructor, option, args) {
        mirrorBootstrapAttributes(element);

        var config = option && 'object' === typeof option ? option : undefined;
        var instance = Constructor.getOrCreateInstance(element, config);

        if ('string' === typeof option) {
            var method = methodAliases[option] || option;

            if ('dispose' === method && ('tooltip' === pluginName || 'popover' === pluginName)) {
                disposeOverlayWhenHidden(element, instance, pluginName);
                return;
            }

            if ('function' !== typeof instance[method]) {
                throw new TypeError('No method named "' + option + '"');
            }

            instance[method].apply(instance, args);
            return;
        }

        if ('modal' === pluginName && (!option || false !== option.show)) {
            instance.show(args[0]);
        }
    }

    function installJQueryPlugin(jQuery, pluginName, Constructor) {
        var previous = jQuery.fn[pluginName];

        jQuery.fn[pluginName] = function (option) {
            var args = Array.prototype.slice.call(arguments, 1);

            return this.each(function () {
                invokePlugin(this, pluginName, Constructor, option, args);
            });
        };
        jQuery.fn[pluginName].Constructor = Constructor;
        jQuery.fn[pluginName].mauticBootstrapCompatibility = true;
        jQuery.fn[pluginName].noConflict = function () {
            jQuery.fn[pluginName] = previous;
            return this;
        };
    }

    function installJQueryPlugins() {
        var jQuery = window.mQuery || window.jQuery;

        if (!jQuery || !window.bootstrap) {
            return Promise.resolve(false);
        }

        Object.keys(pluginMap).forEach(function (pluginName) {
            var Constructor = window.bootstrap[pluginMap[pluginName]];

            if (Constructor) {
                installJQueryPlugin(jQuery, pluginName, Constructor);
            }
        });

        return Promise.resolve(true);
    }

    function observeMarkupChanges() {
        if (!window.MutationObserver) {
            return;
        }

        new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (Node.ELEMENT_NODE === node.nodeType) {
                        mirrorLegacyMarkup(node);
                    }
                });
            });
        }).observe(document.documentElement, {childList: true, subtree: true});
    }

    var compatibility = {
        mirrorLegacyMarkup: mirrorLegacyMarkup,
        installJQueryPlugins: installJQueryPlugins,
        ready: installJQueryPlugins()
    };

    window.MauticBootstrapCompatibility = compatibility;
    mirrorLegacyMarkup(document);
    observeMarkupChanges();

    document.addEventListener('DOMContentLoaded', function () {
        mirrorLegacyMarkup(document);
        compatibility.ready = installJQueryPlugins();
    });
})(window, document);
