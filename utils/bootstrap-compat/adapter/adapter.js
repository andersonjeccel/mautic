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

    var mirroredAttributes = new WeakMap();

    function mirrorAttribute(element, legacyName, bootstrapName) {
        var owned = mirroredAttributes.get(element) || {};
        var legacyValue = element.getAttribute(legacyName);
        var currentValue = element.getAttribute(bootstrapName);

        if (null === currentValue || owned[bootstrapName] === currentValue) {
            if (null === legacyValue) {
                element.removeAttribute(bootstrapName);
                delete owned[bootstrapName];
            } else {
                element.setAttribute(bootstrapName, legacyValue);
                owned[bootstrapName] = legacyValue;
            }
            mirroredAttributes.set(element, owned);
        }
    }

    function mirrorBootstrapAttributes(element) {
        dataAttributes.forEach(function (name) {
            mirrorAttribute(element, 'data-' + name, 'data-bs-' + name);
        });
        if (element.hasAttribute('data-template')) {
            var pluginName = element.getAttribute('data-toggle');
            if ('tooltip' === pluginName || 'popover' === pluginName) {
                var template = window.MauticBootstrapLegacyExceptions.translateTemplate(element.getAttribute('data-template'), pluginName);
                var owned = mirroredAttributes.get(element);
                if (owned && owned['data-bs-template'] === element.getAttribute('data-bs-template')) {
                    element.setAttribute('data-bs-template', template);
                    owned['data-bs-template'] = template;
                }
            }
        }
        if (!element.hasAttribute('data-title')) {
            mirrorAttribute(element, 'data-original-title', 'data-bs-title');
        }
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

    function normalizeOptions(pluginName, options, element) {
        if ('object' !== typeof options || null === options) {
            return options;
        }

        var normalized = Object.assign({}, options);
        if ('tooltip' === pluginName || 'popover' === pluginName) {
            normalized.mauticLegacyInput = true;
        }

        if (('tooltip' === pluginName || 'popover' === pluginName) && normalized.whiteList) {
            normalized.allowList = normalized.whiteList;
            delete normalized.whiteList;
        }

        if (('tooltip' === pluginName || 'popover' === pluginName) && normalized.template) {
            normalized.template = window.MauticBootstrapLegacyExceptions.translateTemplate(normalized.template, pluginName);
        }

        if (('tooltip' === pluginName || 'popover' === pluginName) && 'string' === typeof normalized.placement && /^auto(?:\s|$)/.test(normalized.placement)) {
            normalized.placement = normalized.placement.replace(/^auto\s*/, '') || 'top';
            normalized.fallbackPlacements = ['top', 'right', 'bottom', 'left'];
        }

        if (('tooltip' === pluginName || 'popover' === pluginName) && undefined !== normalized.viewport) {
            if ('function' === typeof normalized.viewport) {
                var collection = (window.mQuery || window.jQuery)(element);
                normalized.viewport = normalized.viewport.call({$element: collection, options: normalized}, collection);
            }
            if (undefined === normalized.boundary) {
                normalized.boundary = normalized.viewport;
                if (normalized.viewport && normalized.viewport.jquery) {
                    normalized.boundary = normalized.viewport[0] === window ? 'window' : normalized.viewport[0];
                }
                if (false === normalized.viewport) {
                    normalized.boundary = 'clippingParents';
                    normalized.popperConfig = {modifiers: [{name: 'preventOverflow', enabled: false}, {name: 'flip', enabled: false}]};
                }
                if (normalized.viewport && 'object' === typeof normalized.viewport && normalized.viewport.selector) {
                    normalized.boundary = document.querySelector(normalized.viewport.selector) || 'clippingParents';
                    var padding = normalized.viewport.padding || 0;
                    var popperConfig = normalized.popperConfig;
                    normalized.popperConfig = function (configuration) {
                        var custom = 'function' === typeof popperConfig ? popperConfig(configuration) : popperConfig;
                        var merged = Object.assign({}, configuration, custom || {});
                        merged.modifiers = (merged.modifiers || []).concat([{name: 'preventOverflow', options: {padding: padding}}]);
                        return merged;
                    };
                }
            }
            delete normalized.viewport;
        }

        if ('modal' === pluginName) {
            delete normalized.show;
            delete normalized.remote;
        }

        return normalized;
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

        ['show', 'hide', 'toggle', 'enable', 'disable', 'toggleEnabled', 'handleUpdate', 'next', 'prev', 'pause', 'cycle', 'to', 'refresh'].forEach(function (method) {
            if ('function' === typeof instance[method]) {
                facade[method] = instance[method].bind(instance);
            }
        });
        facade.$element = jQuery(element);

        if ('tooltip' === pluginName || 'popover' === pluginName) {
            facade.tip = function () {
                return jQuery(window.MauticBootstrapLegacyExceptions.adaptTip(instance, pluginName));
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
        var previousInterface = jQuery.fn[pluginName];
        if (!BootstrapConstructor.DEFAULTS) {
            BootstrapConstructor.DEFAULTS = Object.assign({}, BootstrapConstructor.Default);
            if ('modal' === pluginName) {
                BootstrapConstructor.DEFAULTS.show = true;
            }
            if ('button' === pluginName) {
                BootstrapConstructor.DEFAULTS.loadingText = 'loading...';
            }
            if ('scrollspy' === pluginName) {
                BootstrapConstructor.DEFAULTS.offset = 10;
            }
            if ('tooltip' === pluginName || 'popover' === pluginName) {
                BootstrapConstructor.DEFAULTS.whiteList = BootstrapConstructor.Default.allowList;
            }
        }
        var originalDefaults = Object.assign({}, BootstrapConstructor.DEFAULTS);

        var router = function (option) {
            var args = Array.prototype.slice.call(arguments, 1);
            var normalizedMethod = normalizeMethod(option);

            mirrorLegacyMarkup(document);
            window.MauticBootstrapLegacyExceptions.prepareMarkup(document);

            if ('scrollspy' === pluginName) {
                return window.MauticBootstrapLegacyExceptions.scrollspy(jQuery, this, option, BootstrapConstructor);
            }

            if ('button' === pluginName && 'string' === typeof option && 'toggle' !== option && 'dispose' !== normalizedMethod) {
                return window.MauticBootstrapLegacyExceptions.buttonState(jQuery, this, option);
            }

            if ('button' === pluginName && 'object' === typeof option) {
                return window.MauticBootstrapLegacyExceptions.buttonState(jQuery, this, undefined, option);
            }
            if ('button' === pluginName && undefined === option) {
                return window.MauticBootstrapLegacyExceptions.buttonState(jQuery, this);
            }

            if ('button' === pluginName && 'toggle' === option) {
                return this.each(function () {
                    var nativeButton = BootstrapConstructor.getOrCreateInstance(this);
                    exposeLegacyInstance(jQuery, pluginName, BootstrapConstructor, this);
                    if (!window.MauticBootstrapLegacyExceptions.buttonGroup(jQuery, this, nativeButton)) {
                        nativeButton.toggle();
                    }
                    exposeLegacyInstance(jQuery, pluginName, BootstrapConstructor, this);
                });
            }

            if ('modal' === pluginName) {
                this.each(function () {
                    window.MauticBootstrapLegacyExceptions.loadRemote(jQuery, this, 'object' === typeof option ? option : null);
                });
            }

            if ('tooltip' === pluginName && 'fixTitle' === normalizedMethod) {
                return routeFixTitle(jQuery, BootstrapConstructor, this);
            }

            if (('tooltip' === pluginName || 'popover' === pluginName) && 'destroy' === option) {
                return window.MauticBootstrapLegacyExceptions.destroyTip(jQuery, this, pluginName, BootstrapConstructor);
            }

            return this.each(function () {
                var elementOptions = Object.assign({}, jQuery(this).data());
                if ('tooltip' === pluginName || 'popover' === pluginName) {
                    delete elementOptions.sanitize;
                    delete elementOptions.sanitizeFn;
                    delete elementOptions.whiteList;
                    delete elementOptions.allowList;
                }
                var defaultOverrides = {};
                Object.keys(BootstrapConstructor.DEFAULTS).forEach(function (name) {
                    if (BootstrapConstructor.DEFAULTS[name] !== originalDefaults[name]) {
                        defaultOverrides[name] = BootstrapConstructor.DEFAULTS[name];
                    }
                });
                var legacyOptions = Object.assign({}, defaultOverrides, elementOptions, option && 'object' === typeof option ? option : {});
                var shouldShowModal = 'modal' === pluginName
                    && (undefined === option || option && 'object' === typeof option) && false !== legacyOptions.show;
                var normalizedOption = normalizeOptions(pluginName, 'string' === typeof normalizedMethod || 'number' === typeof normalizedMethod ? normalizedMethod : legacyOptions, this);
                var instance = BootstrapConstructor.getInstance(this);
                if (!instance && ('tooltip' === pluginName || 'popover' === pluginName) && 'hide' === option) {
                    return;
                }
                var toggleCollapse = !instance && 'collapse' === pluginName && 'string' !== typeof option && false !== legacyOptions.toggle;
                var constructorOptions = normalizedOption && 'object' === typeof normalizedOption ? normalizedOption : normalizeOptions(pluginName, legacyOptions, this);
                if ('collapse' === pluginName) {
                    constructorOptions.toggle = false;
                }
                instance = instance || BootstrapConstructor.getOrCreateInstance(this, constructorOptions);
                exposeLegacyInstance(jQuery, pluginName, BootstrapConstructor, this);
                nativeInterface.apply(jQuery(this), [normalizedOption].concat(args));
                if (toggleCollapse) {
                    instance.toggle();
                }

                if (shouldShowModal && instance && !instance._isShown) {
                    instance.show(args[0]);
                }

                exposeLegacyInstance(jQuery, pluginName, BootstrapConstructor, this);
            });
        };

        Object.keys(nativeInterface).forEach(function (key) {
            router[key] = nativeInterface[key];
        });
        router.Constructor = BootstrapConstructor;
        router.mauticBootstrapCompatibility = true;
        router.noConflict = function () {
            jQuery.fn[pluginName] = previousInterface;
            return router;
        };

        return router;
    }

    function bridgeJQueryPlugins() {
        var jQuery = window.mQuery || window.jQuery;

        if (!jQuery || !window.bootstrap) {
            return;
        }

        window.MauticBootstrapLegacyExceptions.install(jQuery);

        Object.keys(pluginMap).forEach(function (pluginName) {
            var BootstrapConstructor = window.bootstrap[pluginMap[pluginName]];

            if (BootstrapConstructor && 'function' === typeof BootstrapConstructor.jQueryInterface && !(jQuery.fn[pluginName] && jQuery.fn[pluginName].mauticBootstrapCompatibility)) {
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
                        window.MauticBootstrapLegacyExceptions.prepareMarkup(node);
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
        exposeLegacyInstance: exposeLegacyInstance,
        mirrorLegacyMarkup: mirrorLegacyMarkup,
        plugins: Object.freeze(Object.keys(pluginMap)),
        ready: Promise.resolve(),
        version: '5.3.8-router'
    });

    mirrorLegacyMarkup(document);
    bridgeJQueryPlugins();
    window.MauticBootstrapLegacyExceptions.prepareMarkup(document);
    prepareLegacyTabs(document);
    observeLegacyAttributes();

    document.addEventListener('DOMContentLoaded', function () {
        mirrorLegacyMarkup(document);
        bridgeJQueryPlugins();
        window.MauticBootstrapLegacyExceptions.prepareMarkup(document);
        prepareLegacyTabs(document);
    });
})(window, document);
