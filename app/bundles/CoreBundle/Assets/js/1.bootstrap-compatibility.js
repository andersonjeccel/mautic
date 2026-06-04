/**
 * Bootstrap 3/4 compatibility bridge.
 *
 * Keep legacy plugin markup working while Bootstrap 5 expects data-bs-* attrs.
 */
(function (window, document) {
    var bootstrapToggleValues = [
        'collapse',
        'dropdown',
        'modal',
        'offcanvas',
        'popover',
        'tab',
        'tooltip'
    ];

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

    var pluginMap = {
        collapse: 'Collapse',
        dropdown: 'Dropdown',
        modal: 'Modal',
        offcanvas: 'Offcanvas',
        popover: 'Popover',
        tab: 'Tab',
        tooltip: 'Tooltip'
    };

    var selector = bootstrapToggleValues
        .map(function (value) {
            return '[data-toggle="' + value + '"]';
        })
        .concat([
            '[data-dismiss]',
            '.modal[data-backdrop]',
            '.modal[data-keyboard]'
        ])
        .join(',');

    function isBootstrapToggle(value) {
        return bootstrapToggleValues.indexOf(value) !== -1;
    }

    function mirrorBootstrapAttributes(element) {
        var toggle = element.getAttribute('data-toggle');

        if (!isBootstrapToggle(toggle) && !element.hasAttribute('data-dismiss') && !element.classList.contains('modal')) {
            return;
        }

        bootstrapDataAttributes.forEach(function (name) {
            var legacyName = 'data-' + name;
            var bootstrapName = 'data-bs-' + name;

            if (element.hasAttribute(legacyName) && !element.hasAttribute(bootstrapName)) {
                element.setAttribute(bootstrapName, element.getAttribute(legacyName));
            }
        });
    }

    function mirrorLegacyMarkup(container) {
        if (!container || !container.querySelectorAll) {
            return;
        }

        if (container.matches && selector && container.matches(selector)) {
            mirrorBootstrapAttributes(container);
        }

        container.querySelectorAll(selector).forEach(mirrorBootstrapAttributes);
    }

    function getBootstrapOptions(element) {
        var options = {};

        bootstrapDataAttributes.forEach(function (name) {
            var legacyName = 'data-' + name;
            var bootstrapName = 'data-bs-' + name;
            var value = element.getAttribute(bootstrapName);

            if (null === value && element.hasAttribute(legacyName)) {
                value = element.getAttribute(legacyName);
            }

            if (null !== value) {
                options[name] = value;
            }
        });

        return options;
    }

    function bridgeJQueryPlugin(jQuery, pluginName, constructorName) {
        if (!jQuery || jQuery.fn[pluginName] || !window.bootstrap || !window.bootstrap[constructorName]) {
            return;
        }

        var BootstrapConstructor = window.bootstrap[constructorName];

        jQuery.fn[pluginName] = function (option) {
            var args = Array.prototype.slice.call(arguments, 1);

            return this.each(function () {
                var instance = BootstrapConstructor.getOrCreateInstance(this, 'object' === typeof option ? option : getBootstrapOptions(this));

                if ('destroy' === option) {
                    option = 'dispose';
                }

                if ('fixTitle' === option) {
                    return;
                }

                if ('string' === typeof option && 'function' === typeof instance[option]) {
                    instance[option].apply(instance, args);
                }
            });
        };
    }

    function bridgeJQueryPlugins() {
        var jQuery = window.mQuery || window.jQuery;

        Object.keys(pluginMap).forEach(function (pluginName) {
            bridgeJQueryPlugin(jQuery, pluginName, pluginMap[pluginName]);
        });
    }

    function observeMarkupChanges() {
        if (!window.MutationObserver) {
            return;
        }

        new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                Array.prototype.forEach.call(mutation.addedNodes, function (node) {
                    if (Node.ELEMENT_NODE === node.nodeType) {
                        mirrorLegacyMarkup(node);
                    }
                });
            });
        }).observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    window.MauticBootstrapCompatibility = {
        mirrorLegacyMarkup: mirrorLegacyMarkup,
        bridgeJQueryPlugins: bridgeJQueryPlugins
    };

    mirrorLegacyMarkup(document);
    bridgeJQueryPlugins();
    observeMarkupChanges();

    document.addEventListener('DOMContentLoaded', function () {
        mirrorLegacyMarkup(document);
        bridgeJQueryPlugins();
    });
})(window, document);
