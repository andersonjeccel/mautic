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

    function normalizeLegacyMethod(option) {
        if ('destroy' === option) {
            return 'dispose';
        }

        if ('fixTitle' === option) {
            return null;
        }

        return option;
    }

    function normalizePluginOptions(pluginName, option) {
        if ('object' !== typeof option || null === option) {
            return option;
        }

        if ('popover' === pluginName && undefined === option.html) {
            option.html = true;
        }

        return option;
    }

    function getTabTarget(element) {
        return element.getAttribute('data-bs-target')
            || element.getAttribute('data-target')
            || element.getAttribute('href');
    }

    function syncLegacyTabState(element) {
        var target = getTabTarget(element);

        if (!target || '#' !== target.charAt(0)) {
            return;
        }

        var tabList = element.closest('.nav-tabs, .nav-pills, [role="tablist"]');
        var tabPane = document.querySelector(target);
        var tabContent = tabPane && tabPane.parentElement;

        if (tabList) {
            tabList.querySelectorAll('li').forEach(function (item) {
                item.classList.remove('active');
            });

            tabList.querySelectorAll('a[data-toggle="tab"], a[data-bs-toggle="tab"]').forEach(function (tab) {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            });
        }

        if (tabContent) {
            tabContent.querySelectorAll(':scope > .tab-pane').forEach(function (pane) {
                pane.classList.remove('active', 'in', 'show');
            });
        }

        element.classList.add('active');
        element.setAttribute('aria-selected', 'true');

        if (element.parentElement) {
            element.parentElement.classList.add('active');
        }

        if (tabPane) {
            tabPane.classList.add('active', 'in', 'show');
        }
    }

    function getDropdownParent(element) {
        return element.closest('li.dropdown, .dropdown');
    }

    function setLegacyDropdownState(element, isOpen) {
        var parent = getDropdownParent(element);

        if (!parent) {
            return;
        }

        parent.classList.toggle('open', isOpen);
        parent.classList.toggle('show', isOpen);
    }

    function wrapExistingJQueryPlugin(jQuery, pluginName) {
        var originalPlugin = jQuery && jQuery.fn[pluginName];

        if (!originalPlugin || originalPlugin.mauticBootstrapCompatibility) {
            return Boolean(originalPlugin);
        }

        jQuery.fn[pluginName] = function (option) {
            var args = Array.prototype.slice.call(arguments, 1);

            option = normalizeLegacyMethod(option);

            if (null === option) {
                return this;
            }

            option = normalizePluginOptions(pluginName, option);

            var result = originalPlugin.apply(this, [option].concat(args));

            if ('tab' === pluginName && 'show' === option) {
                this.each(function () {
                    syncLegacyTabState(this);
                });
            }

            return result;
        };

        Object.keys(originalPlugin).forEach(function (key) {
            jQuery.fn[pluginName][key] = originalPlugin[key];
        });

        jQuery.fn[pluginName].Constructor = originalPlugin.Constructor;
        jQuery.fn[pluginName].mauticBootstrapCompatibility = true;

        return true;
    }

    function bridgeJQueryPlugin(jQuery, pluginName, constructorName) {
        if (!jQuery || wrapExistingJQueryPlugin(jQuery, pluginName) || !window.bootstrap || !window.bootstrap[constructorName]) {
            return;
        }

        var BootstrapConstructor = window.bootstrap[constructorName];

        jQuery.fn[pluginName] = function (option) {
            var args = Array.prototype.slice.call(arguments, 1);

            return this.each(function () {
                var instance = BootstrapConstructor.getOrCreateInstance(this, normalizePluginOptions(pluginName, 'object' === typeof option ? option : getBootstrapOptions(this)));

                option = normalizeLegacyMethod(option);

                if (null === option) {
                    return;
                }

                if ('string' === typeof option && 'function' === typeof instance[option]) {
                    instance[option].apply(instance, args);

                    if ('tab' === pluginName && 'show' === option) {
                        syncLegacyTabState(this);
                    }
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

    document.addEventListener('shown.bs.tab', function (event) {
        syncLegacyTabState(event.target);
    });

    document.addEventListener('shown.bs.dropdown', function (event) {
        setLegacyDropdownState(event.target, true);
    });

    document.addEventListener('hidden.bs.dropdown', function (event) {
        setLegacyDropdownState(event.target, false);
    });

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
