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

    function normalizeLegacyStateClasses(container) {
        var elements = [];

        if (container.matches && container.matches('.collapse.in, .tab-pane.in.active, .modal.in, .dropdown.open, .active > [data-toggle="tab"]')) {
            elements.push(container);
        }
        container.querySelectorAll('.collapse.in, .tab-pane.in.active, .modal.in, .dropdown.open, .active > [data-toggle="tab"]').forEach(function (element) {
            elements.push(element);
        });

        elements.forEach(function (element) {
            if (element.matches('.collapse.in, .tab-pane.in.active, .modal.in')) {
                element.classList.add('show');
            }
            if (element.matches('.active > [data-toggle="tab"]')) {
                element.classList.add('active');
                element.setAttribute('aria-selected', 'true');
            }
            if (element.matches('.dropdown.open')) {
                element.querySelectorAll(':scope > .dropdown-menu').forEach(function (menu) {
                    menu.classList.add('show');
                });
            }
        });
    }

    function mirrorLegacyMarkup(container) {
        if (!container || !container.querySelectorAll) {
            return;
        }

        if (container.matches && container.matches(selector)) {
            mirrorBootstrapAttributes(container);
        }

        container.querySelectorAll(selector).forEach(mirrorBootstrapAttributes);
        normalizeLegacyStateClasses(container);
    }

    function installLegacyStateEvents() {
        document.addEventListener('shown.bs.collapse', function (event) {
            event.target.classList.add('in');
        });
        document.addEventListener('hidden.bs.collapse', function (event) {
            event.target.classList.remove('in');
        });
        document.addEventListener('shown.bs.modal', function (event) {
            event.target.classList.add('in');
        });
        document.addEventListener('hidden.bs.modal', function (event) {
            event.target.classList.remove('in');
        });
        document.addEventListener('shown.bs.dropdown', function (event) {
            event.target.closest('.dropdown')?.classList.add('open');
        });
        document.addEventListener('hidden.bs.dropdown', function (event) {
            event.target.closest('.dropdown')?.classList.remove('open');
        });
        document.addEventListener('show.bs.tab', function (event) {
            var group = event.target.closest('.list-group, .nav, [role="tablist"]');

            group?.querySelectorAll('[data-toggle="tab"].active, [data-bs-toggle="tab"].active').forEach(function (trigger) {
                if (trigger === event.target) {
                    return;
                }

                var selector = getTargetSelector(trigger);
                var panel = selector && document.querySelector(selector);

                trigger.classList.remove('active');
                trigger.parentElement?.classList.remove('active');
                trigger.setAttribute('aria-selected', 'false');
                trigger.setAttribute('aria-expanded', 'false');
                panel?.classList.remove('active', 'in', 'show');
            });
        });
        document.addEventListener('shown.bs.tab', function (event) {
            var currentItem = event.target.parentElement;
            var previousItem = event.relatedTarget && event.relatedTarget.parentElement;
            var currentSelector = getTargetSelector(event.target);
            var currentPanel = currentSelector && document.querySelector(currentSelector);
            var previousSelector = event.relatedTarget && getTargetSelector(event.relatedTarget);
            var previousPanel = previousSelector && document.querySelector(previousSelector);

            currentItem?.classList.add('active');
            previousItem?.classList.remove('active');
            currentPanel?.classList.add('in');
            previousPanel?.classList.remove('in');
            event.target.setAttribute('aria-expanded', 'true');
            event.relatedTarget?.setAttribute('aria-expanded', 'false');
        });
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
    installLegacyStateEvents();
    observeMarkupChanges();

    document.addEventListener('DOMContentLoaded', function () {
        mirrorLegacyMarkup(document);
        compatibility.ready = installJQueryPlugins();
    });
})(window, document);
