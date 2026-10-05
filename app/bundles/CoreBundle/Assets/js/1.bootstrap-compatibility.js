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

        if ('modal' === toggle || 'modal' === element.getAttribute('data-dismiss') || element.classList.contains('modal')) {
            return;
        }

        if ('collapse' === toggle) {
            element.setAttribute('data-mautic-bootstrap-legacy-collapse', '');
        }

        bootstrapDataAttributes.forEach(function (name) {
            var legacyName = 'data-' + name;
            var bootstrapName = 'data-bs-' + name;

            if (element.hasAttribute(legacyName) && !element.hasAttribute(bootstrapName)) {
                element.setAttribute(bootstrapName, element.getAttribute(legacyName));
            }
        });

        if ('tab' === toggle) {
            prepareLegacyTabState(element);
        }
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

    function getAuthoredPixelWidth(element) {
        var width = 0;

        function inspectRules(rules) {
            Array.prototype.forEach.call(rules, function (rule) {
                if (rule.selectorText) {
                    try {
                        if (rule.style && /^\d+(?:\.\d+)?px$/.test(rule.style.width) && element.matches(rule.selectorText)) {
                            width = parseFloat(rule.style.width);
                        }
                    } catch (error) {
                        // Ignore selectors unsupported by Element.matches().
                    }
                } else if (rule.cssRules) {
                    inspectRules(rule.cssRules);
                }
            });
        }

        Array.prototype.forEach.call(document.styleSheets, function (styleSheet) {
            try {
                inspectRules(styleSheet.cssRules);
            } catch (error) {
                // Cross-origin font stylesheets intentionally hide their rules.
            }
        });

        return width;
    }

    function normalizeLegacyListTables(container) {
        if (!container || !container.querySelectorAll) {
            return;
        }

        var tables = [];

        if (container.matches && container.matches('table.table')) {
            tables.push(container);
        }

        Array.prototype.push.apply(tables, container.querySelectorAll('table.table'));

        tables.forEach(function (table) {
            var headerRow = table.querySelector(':scope > thead > tr:first-child');
            var actionHeader = headerRow && headerRow.querySelector(':scope > th.col-actions:first-child');

            if (!actionHeader) {
                return;
            }

            var group = table.querySelector(':scope > colgroup[data-mautic-bootstrap-compat]');

            if (!group) {
                group = document.createElement('colgroup');
                group.setAttribute('data-mautic-bootstrap-compat', '');
                table.insertBefore(group, table.querySelector(':scope > thead'));
            }

            Array.prototype.forEach.call(headerRow.children, function (header, index) {
                var column = group.children[index] || document.createElement('col');
                var authoredWidth = getAuthoredPixelWidth(header);

                if (0 === index) {
                    var minimumWidth = parseFloat(window.getComputedStyle(actionHeader).minWidth) || 0;
                    authoredWidth = Math.max(100, minimumWidth, authoredWidth);
                }

                column.style.width = authoredWidth ? authoredWidth + 'px' : '';

                if (!column.parentNode) {
                    group.appendChild(column);
                }
            });
        });
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

    function normalizeLegacyCollapse(element) {
        if (!element || !element.classList || !element.classList.contains('collapse')) {
            return;
        }

        element.setAttribute('data-mautic-bootstrap-legacy-collapse', '');

        if (element.classList.contains('in')) {
            element.classList.add('show');
        } else if (element.classList.contains('show')) {
            element.classList.add('in');
        }
    }

    function normalizeLegacyCollapses(container) {
        if (!container || !container.querySelectorAll) {
            return;
        }

        var triggers = [];

        if (container.matches && container.matches('[data-mautic-bootstrap-legacy-collapse]')) {
            triggers.push(container);
        }

        Array.prototype.push.apply(triggers, container.querySelectorAll('[data-mautic-bootstrap-legacy-collapse]'));

        triggers.forEach(function (trigger) {
            if (trigger.classList.contains('collapse')) {
                normalizeLegacyCollapse(trigger);
                return;
            }

            var target = trigger.getAttribute('data-target') || trigger.getAttribute('href');
            var parent = trigger.getAttribute('data-parent');

            if (!target) {
                return;
            }

            document.querySelectorAll(target).forEach(function (collapse) {
                normalizeLegacyCollapse(collapse);

                if (parent) {
                    collapse.setAttribute('data-bs-parent', parent);
                }
            });
        });
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

    function prepareLegacyTabState(element) {
        var tabList = element.closest('.nav-tabs, .nav-pills, [role="tablist"]');

        if (!tabList) {
            return;
        }

        tabList.querySelectorAll('a[data-toggle="tab"], a[data-bs-toggle="tab"]').forEach(function (tab) {
            var isActive = tab.classList.contains('active')
                || (tab.parentElement && tab.parentElement.classList.contains('active'));

            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });
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
                tab.setAttribute('aria-expanded', 'false');
            });
        }

        if (tabContent) {
            tabContent.querySelectorAll(':scope > .tab-pane').forEach(function (pane) {
                pane.classList.remove('active', 'in', 'show');
            });
        }

        element.classList.add('active');
        element.setAttribute('aria-selected', 'true');
        element.setAttribute('aria-expanded', 'true');

        if (element.parentElement) {
            element.parentElement.classList.add('active');
        }

        if (tabPane) {
            tabPane.classList.add('active');
            tabPane.classList.remove('show');
            tabPane.classList.toggle('in', tabPane.classList.contains('fade'));
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

            if ('tab' === pluginName && 'show' === option) {
                this.each(function () {
                    prepareLegacyTabState(this);
                });
            }

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
                if ('collapse' === pluginName) {
                    normalizeLegacyCollapse(this);
                }

                if ('tab' === pluginName && 'show' === option) {
                    prepareLegacyTabState(this);
                }

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
            if ('modal' === pluginName || 'tooltip' === pluginName) {
                return;
            }

            bridgeJQueryPlugin(jQuery, pluginName, pluginMap[pluginName]);
        });

        if (window.Bootstrap3Compat && jQuery && window.bootstrap) {
            return window.Bootstrap3Compat.install(jQuery, window.bootstrap);
        }

        return Promise.resolve();
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
                        normalizeLegacyListTables(node);
                        normalizeLegacyCollapses(node);
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

    document.addEventListener('click', function (event) {
        var tab = event.target.closest && event.target.closest('a[data-toggle="tab"], a[data-toggle="pill"]');

        if (tab) {
            prepareLegacyTabState(tab);
        }
    }, true);

    document.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('[data-toggle="buttons"] .btn');

        if (!button || button.classList.contains('disabled')) {
            return;
        }

        var input = button.querySelector('input:not([type="hidden"])');

        if (!input || input.disabled) {
            return;
        }

        var changed = true;

        if ('radio' === input.type) {
            if (input.checked && button.classList.contains('active')) {
                changed = false;
            } else {
                var group = button.closest('[data-toggle="buttons"]');
                group.querySelectorAll('.btn.active').forEach(function (activeButton) {
                    activeButton.classList.remove('active');
                    activeButton.setAttribute('aria-pressed', 'false');
                });
            }

            input.checked = true;
        } else if ('checkbox' === input.type) {
            input.checked = !button.classList.contains('active');
        }

        button.classList.toggle('active', input.checked);
        button.setAttribute('aria-pressed', input.checked ? 'true' : 'false');

        if (changed) {
            input.dispatchEvent(new Event('change', {bubbles: true}));
        }

        input.focus();
        event.preventDefault();
    });

    document.addEventListener('show.bs.collapse', function (event) {
        if (event.target.hasAttribute('data-mautic-bootstrap-legacy-collapse')) {
            event.target.classList.add('in');
        }
    });

    document.addEventListener('hide.bs.collapse', function (event) {
        if (event.target.hasAttribute('data-mautic-bootstrap-legacy-collapse')) {
            event.target.classList.remove('in');
        }
    });

    document.addEventListener('shown.bs.collapse', function (event) {
        if (event.target.hasAttribute('data-mautic-bootstrap-legacy-collapse')) {
            event.target.classList.add('in', 'show');
        }
    });

    document.addEventListener('hidden.bs.collapse', function (event) {
        if (event.target.hasAttribute('data-mautic-bootstrap-legacy-collapse')) {
            event.target.classList.remove('in', 'show');
        }
    });

    document.addEventListener('shown.bs.dropdown', function (event) {
        setLegacyDropdownState(event.target, true);
    });

    document.addEventListener('hidden.bs.dropdown', function (event) {
        setLegacyDropdownState(event.target, false);
    });

    var ready = bridgeJQueryPlugins();

    window.MauticBootstrapCompatibility = {
        mirrorLegacyMarkup: mirrorLegacyMarkup,
        normalizeLegacyListTables: normalizeLegacyListTables,
        normalizeLegacyCollapses: normalizeLegacyCollapses,
        bridgeJQueryPlugins: bridgeJQueryPlugins,
        ready: ready
    };

    mirrorLegacyMarkup(document);
    normalizeLegacyListTables(document);
    normalizeLegacyCollapses(document);
    observeMarkupChanges();

    document.addEventListener('DOMContentLoaded', function () {
        mirrorLegacyMarkup(document);
        normalizeLegacyListTables(document);
        normalizeLegacyCollapses(document);
        window.MauticBootstrapCompatibility.ready = bridgeJQueryPlugins();
    });
})(window, document);
