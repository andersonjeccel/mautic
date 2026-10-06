(function (window, document) {
    'use strict';

    var pluginMap = {
        alert: 'Alert',
        button: 'Button',
        carousel: 'Carousel',
        collapse: 'Collapse',
        dropdown: 'Dropdown',
        modal: 'Modal',
        offcanvas: 'Offcanvas',
        popover: 'Popover',
        scrollspy: 'ScrollSpy',
        tab: 'Tab',
        toast: 'Toast',
        tooltip: 'Tooltip'
    };

    var dataAttributes = [
        'animation',
        'backdrop',
        'boundary',
        'container',
        'content',
        'custom-class',
        'delay',
        'dismiss',
        'display',
        'fallback-placements',
        'html',
        'interval',
        'keyboard',
        'offset',
        'parent',
        'pause',
        'placement',
        'popper-config',
        'reference',
        'ride',
        'sanitize',
        'selector',
        'show',
        'slide',
        'slide-to',
        'spy',
        'target',
        'template',
        'title',
        'toggle',
        'touch',
        'trigger',
        'viewport',
        'wrap'
    ];

    var selector = dataAttributes
        .map(function (name) {
            return '[data-' + name + ']';
        })
        .concat(['[data-original-title]'])
        .join(',');

    function mirrorAttribute(element, legacyName, bootstrapName) {
        if (element.hasAttribute(legacyName) && !element.hasAttribute(bootstrapName)) {
            element.setAttribute(bootstrapName, element.getAttribute(legacyName));
        }
    }

    function mirrorBootstrapAttributes(element) {
        dataAttributes.forEach(function (name) {
            mirrorAttribute(element, 'data-' + name, 'data-bs-' + name);
        });
        mirrorAttribute(element, 'data-original-title', 'data-bs-title');
    }

    function mirrorLegacyMarkup(container) {
        if (!container || Node.ELEMENT_NODE !== container.nodeType && Node.DOCUMENT_NODE !== container.nodeType) {
            return;
        }

        if (Node.ELEMENT_NODE === container.nodeType && container.matches(selector)) {
            mirrorBootstrapAttributes(container);
        }

        container.querySelectorAll(selector).forEach(mirrorBootstrapAttributes);
    }

    function normalizeMethod(method) {
        return 'destroy' === method ? 'dispose' : method;
    }

    function normalizeOptions(pluginName, options) {
        if ('object' !== typeof options || null === options) {
            return options;
        }

        var normalized = Object.assign({}, options);

        if (('tooltip' === pluginName || 'popover' === pluginName) && undefined !== normalized.viewport) {
            if (undefined === normalized.boundary) {
                normalized.boundary = normalized.viewport;
            }
            delete normalized.viewport;
        }

        if ('modal' === pluginName) {
            delete normalized.show;
            delete normalized.remote;
        }

        return normalized;
    }

    function getTipElement(instance) {
        if (instance.tip && Node.ELEMENT_NODE === instance.tip.nodeType) {
            return instance.tip;
        }

        return 'function' === typeof instance._getTipElement ? instance._getTipElement() : null;
    }


    function exposeLegacyInstance(jQuery, pluginName, BootstrapConstructor, element) {
        var key = 'bs.' + pluginName;
        var instance = BootstrapConstructor.getInstance(element);

        if (!instance) {
            jQuery(element).removeData(key);
            return;
        }

        var current = jQuery(element).data(key);
        if (current && current.native === instance) {
            return;
        }

        var facade = {
            native: instance,
            options: instance._config
        };

        if ('tooltip' === pluginName || 'popover' === pluginName) {
            facade.tip = function () {
                return jQuery(getTipElement(instance));
            };
            facade.inState = instance._activeTrigger;
        }

        if ('modal' === pluginName) {
            Object.defineProperty(facade, 'isShown', {
                get: function () {
                    return instance._isShown;
                }
            });
        }

        jQuery(element).data(key, facade);
    }

    function routeFixTitle(jQuery, BootstrapConstructor, collection) {
        collection.each(function () {
            var title = this.getAttribute('data-original-title') || this.getAttribute('title');
            var instance = BootstrapConstructor.getInstance(this);

            if (null !== title) {
                this.setAttribute('data-bs-title', title);
            }

            if (instance) {
                instance.dispose();
            }

            jQuery(this).removeData('bs.tooltip');
        });

        return collection;
    }

    function createJQueryRouter(jQuery, pluginName, BootstrapConstructor) {
        var nativeInterface = BootstrapConstructor.jQueryInterface;

        var router = function (option) {
            var args = Array.prototype.slice.call(arguments, 1);
            var normalizedMethod = normalizeMethod(option);

            mirrorLegacyMarkup(document);

            if ('tooltip' === pluginName && 'fixTitle' === normalizedMethod) {
                return routeFixTitle(jQuery, BootstrapConstructor, this);
            }

            var shouldShowModal = 'modal' === pluginName
                && (undefined === option || 'object' === typeof option && false !== option.show);
            var normalizedOption = normalizeOptions(pluginName, normalizedMethod);
            var result = nativeInterface.apply(this, [normalizedOption].concat(args));

            this.each(function () {
                var instance = BootstrapConstructor.getInstance(this);

                if (shouldShowModal && instance && !instance._isShown) {
                    instance.show(args[0]);
                }

                exposeLegacyInstance(jQuery, pluginName, BootstrapConstructor, this);
            });

            return result;
        };

        Object.keys(nativeInterface).forEach(function (key) {
            router[key] = nativeInterface[key];
        });
        router.Constructor = BootstrapConstructor;
        router.mauticBootstrapCompatibility = true;

        return router;
    }

    function bridgeJQueryPlugins() {
        var jQuery = window.mQuery || window.jQuery;

        if (!jQuery || !window.bootstrap) {
            return;
        }

        Object.keys(pluginMap).forEach(function (pluginName) {
            var BootstrapConstructor = window.bootstrap[pluginMap[pluginName]];

            if (BootstrapConstructor && 'function' === typeof BootstrapConstructor.jQueryInterface) {
                jQuery.fn[pluginName] = createJQueryRouter(jQuery, pluginName, BootstrapConstructor);
            }
        });
    }

    function prepareLegacyTabs(container) {
        if (!window.bootstrap || !window.bootstrap.Tab || !container.querySelectorAll) {
            return;
        }

        container.querySelectorAll(
            'li.active > [data-toggle="tab"], li.active > [data-toggle="pill"], li.active > [data-toggle="list"]'
        ).forEach(function (trigger) {
            if (!trigger.matches('.active')) {
                window.bootstrap.Tab.getOrCreateInstance(trigger).show();
            }
        });
    }

    function observeLegacyAttributes() {
        if (!window.MutationObserver) {
            return;
        }

        new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if ('attributes' === mutation.type) {
                    mirrorBootstrapAttributes(mutation.target);
                    return;
                }

                mutation.addedNodes.forEach(function (node) {
                    if (Node.ELEMENT_NODE === node.nodeType) {
                        mirrorLegacyMarkup(node);
                        prepareLegacyTabs(node);
                    }
                });
            });
        }).observe(document.documentElement, {
            attributeFilter: dataAttributes.map(function (name) {
                return 'data-' + name;
            }).concat(['data-original-title']),
            attributes: true,
            childList: true,
            subtree: true
        });
    }

    window.MauticBootstrapCompatibility = Object.freeze({
        bridgeJQueryPlugins: bridgeJQueryPlugins,
        mirrorLegacyMarkup: mirrorLegacyMarkup,
        plugins: Object.freeze(Object.keys(pluginMap)),
        ready: Promise.resolve(),
        version: '5.3.8-router'
    });

    mirrorLegacyMarkup(document);
    bridgeJQueryPlugins();
    prepareLegacyTabs(document);
    observeLegacyAttributes();

    document.addEventListener('DOMContentLoaded', function () {
        mirrorLegacyMarkup(document);
        bridgeJQueryPlugins();
        prepareLegacyTabs(document);
    });
})(window, document);
