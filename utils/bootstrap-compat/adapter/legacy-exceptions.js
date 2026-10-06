(function (window) {
    'use strict';

    var buttonStates = new WeakMap();
    var remoteLoads = new WeakMap();

    function buttonState(jQuery, collection, option, configuration) {
        collection.each(function () {
            var element = jQuery(this);
            var state = buttonStates.get(this);
            var accessor = element.is('input') ? 'val' : 'html';

            if (!state) {
                state = {options: Object.assign({loadingText: 'loading...'}, window.bootstrap.Button.DEFAULTS, configuration || {}), isLoading: false};
                buttonStates.set(this, state);
            }
            var native = window.bootstrap.Button.getOrCreateInstance(this);
            var facade = element.data('bs.button') || {native: native};
            facade.options = state.options;
            facade.$element = element;
            facade.setState = function (nextState) {
                buttonState(jQuery, element, nextState);
            };
            facade.toggle = function () {
                if (!buttonGroup(jQuery, element[0], native)) {
                    native.toggle();
                }
            };
            if (!Object.getOwnPropertyDescriptor(facade, 'isLoading')) {
                Object.defineProperty(facade, 'isLoading', {get: function () { return state.isLoading; }});
            }
            element.data('bs.button', facade);
            if (undefined === option) {
                return;
            }
            var data = element.data();
            if (null == data.resetText) {
                element.data('resetText', element[accessor]());
            }
            window.setTimeout(function () {
                var value = element.data(option + 'Text');
                element[accessor](null == value ? state.options[option + 'Text'] : value);
                if ('loading' === option) {
                    state.isLoading = true;
                    element.addClass('disabled').attr('disabled', 'disabled').prop('disabled', true);
                } else if (state.isLoading) {
                    state.isLoading = false;
                    element.removeClass('disabled').removeAttr('disabled').prop('disabled', false);
                }
            }, 0);
        });
        return collection;
    }

    function buttonGroup(jQuery, element, nativeInstance) {
        var button = jQuery(element);
        var group = button.closest('[data-toggle="buttons"]');
        var input = button.find('input');
        if (!group.length || !input.length) {
            return false;
        }
        var changed = true;
        if ('radio' === input.prop('type')) {
            changed = !input.prop('checked');
            group.find('.btn.active').each(function () {
                if (this !== element) {
                    window.bootstrap.Button.getOrCreateInstance(this).toggle();
                }
            });
            if (!button.hasClass('active')) {
                nativeInstance.toggle();
            }
        } else if ('checkbox' === input.prop('type')) {
            changed = input.prop('checked') === button.hasClass('active');
            nativeInstance.toggle();
        }
        input.prop('checked', button.hasClass('active'));
        if (changed) {
            input.trigger('change');
        }
        return true;
    }

    function loadRemote(jQuery, element, options) {
        var remote = options && options.remote || jQuery(element).data('remote');
        if (!remote || remoteLoads.has(element)) {
            return;
        }
        remoteLoads.set(element, true);
        jQuery(element).find('.modal-content').load(remote, function () {
            jQuery(element).trigger('loaded.bs.modal');
        });
    }

    function translateTemplate(template, pluginName) {
        if ('string' !== typeof template) {
            return template;
        }
        var replacements = 'popover' === pluginName
            ? {arrow: 'popover-arrow', 'popover-title': 'popover-header', 'popover-content': 'popover-body'}
            : {arrow: 'tooltip-arrow'};
        return template.replace(/class\s*=\s*(["'])(.*?)\1/g, function (attribute, quote, classes) {
            return 'class=' + quote + classes.split(/\s+/).map(function (name) {
                return replacements[name] || name;
            }).join(' ') + quote;
        });
    }

    function destroyTip(jQuery, collection, pluginName, BootstrapConstructor) {
        return collection.each(function () {
            var element = jQuery(this);
            var instance = BootstrapConstructor.getInstance(this);
            if (!instance) {
                return;
            }
            var hidden = 'hidden.bs.' + pluginName;
            var dispose = function () {
                instance.dispose();
                element.removeData('bs.' + pluginName);
            };
            if (instance.tip && instance.tip.classList.contains('show')) {
                element.one(hidden, dispose);
                instance.hide();
            } else {
                var event = jQuery.Event('hide.bs.' + pluginName);
                element.trigger(event);
                if (!event.isDefaultPrevented()) {
                    element.trigger(hidden);
                    dispose();
                }
            }
        });
    }

    function prepareMarkup(container) {
        if (!container.querySelectorAll) {
            return;
        }
        var elements = Array.from(container.querySelectorAll('.collapse.in, .modal.in, .carousel-inner > .item'));
        if (container.matches && container.matches('.collapse.in, .modal.in, .carousel-inner > .item')) {
            elements.push(container);
        }
        elements.forEach(function (element) {
            if (element.classList.contains('item')) {
                element.classList.add('carousel-item');
            } else {
                element.classList.add('show');
            }
        });
    }

    function scrollspy(jQuery, collection, option, BootstrapConstructor) {
        return collection.each(function () {
            var element = this;
            var legacy = jQuery(element).data('bs.scrollspy');
            if (!legacy || !legacy.native) {
                var options = Object.assign({offset: 10}, BootstrapConstructor.DEFAULTS, jQuery(element).data(), 'object' === typeof option ? option : {});
                var native = BootstrapConstructor.getOrCreateInstance(element, {target: options.target || document.body});
                native._observer.disconnect();
                var scrollElement = jQuery(element).is(document.body) ? jQuery(window) : jQuery(element);
                legacy = {native: native, options: options, offsets: [], targets: [], activeTarget: null};
                legacy.getScrollHeight = function () {
                    return scrollElement[0].scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
                };
                legacy.refresh = function () {
                    legacy.offsets = [];
                    legacy.targets = [];
                    legacy.scrollHeight = legacy.getScrollHeight();
                    var windowScroll = scrollElement[0] === window;
                    var base = windowScroll ? 0 : scrollElement.scrollTop();
                    var targets = [];
                    jQuery((options.target || '') + ' .nav li > a').each(function () {
                        var href = jQuery(this).data('target') || this.getAttribute('href');
                        var section = /^#./.test(href) && jQuery(href);
                        if (section && section.length && section.is(':visible')) {
                            targets.push({offset: section[windowScroll ? 'offset' : 'position']().top + base, href: href, link: this});
                        }
                    });
                    targets.sort(function (first, second) { return first.offset - second.offset; });
                    targets.forEach(function (target) {
                        legacy.offsets.push(target.offset);
                        legacy.targets.push(target.href);
                    });
                };
                legacy.clear = function () {
                    native._clearActiveClass(native._config.target);
                    jQuery((options.target || '') + ' .nav li > a').parentsUntil(options.target, '.active').removeClass('active');
                };
                legacy.activate = function (target) {
                    if (!target) {
                        return;
                    }
                    legacy.activeTarget = target;
                    legacy.clear();
                    var links = jQuery((options.target || '') + ' .nav li > a').filter(function () {
                        return this.getAttribute('href') === target || jQuery(this).data('target') === target;
                    });
                    var parents = links.parents('li').addClass('active');
                    native._activeTarget = null;
                    var originalElement = native._element;
                    try {
                        native._element = parents[0] || originalElement;
                        native._process(links[0]);
                    } finally {
                        native._element = originalElement;
                    }
                };
                legacy.process = function () {
                    var top = scrollElement.scrollTop() + options.offset;
                    var height = legacy.getScrollHeight();
                    if (height !== legacy.scrollHeight) {
                        legacy.refresh();
                    }
                    if (top >= options.offset + height - scrollElement.height()) {
                        var last = legacy.targets[legacy.targets.length - 1];
                        if (legacy.activeTarget !== last) {
                            legacy.activate(last);
                        }
                        return;
                    }
                    if (legacy.activeTarget && top < legacy.offsets[0]) {
                        legacy.activeTarget = null;
                        legacy.clear();
                        return;
                    }
                    for (var index = legacy.offsets.length - 1; index >= 0; index--) {
                        if (top >= legacy.offsets[index] && (undefined === legacy.offsets[index + 1] || top < legacy.offsets[index + 1])) {
                            if (legacy.activeTarget !== legacy.targets[index]) {
                                legacy.activate(legacy.targets[index]);
                            }
                            break;
                        }
                    }
                };
                jQuery(element).data('bs.scrollspy', legacy);
                scrollElement.on('scroll.mautic.legacyScrollspy', legacy.process);
                legacy.refresh();
                legacy.process();
            }
            if ('string' === typeof option) {
                legacy[option]();
            }
        });
    }

    var installed = new WeakSet();

    function adaptTip(instance, pluginName) {
        var tip = instance.tip || instance._getTipElement();
        var selectors = 'popover' === pluginName
            ? {'.popover-arrow': 'arrow', '.popover-header': 'popover-title', '.popover-body': 'popover-content'}
            : {'.tooltip-arrow': 'arrow'};
        Object.keys(selectors).forEach(function (selector) {
            var element = tip.querySelector(selector);
            if (element) {
                element.classList.add(selectors[selector]);
            }
        });
        return tip;
    }

    function install(jQuery) {
        if (installed.has(jQuery)) {
            return;
        }
        installed.add(jQuery);
        window.MauticInstallLegacyTransition(jQuery);
        window.MauticInstallLegacyAffix(jQuery);
        var tabChildren = window.bootstrap.Tab.prototype._getChildren;
        window.bootstrap.Tab.prototype._getChildren = function () {
            var children = tabChildren.call(this);
            if (this._element.hasAttribute('data-toggle')) {
                return children.filter(function (child) {
                    return !child.matches('li') || !child.querySelector('[data-toggle="tab"], [data-toggle="pill"]');
                });
            }
            return children;
        };
        jQuery(document).on('shown.bs.collapse hidden.bs.collapse shown.bs.modal hidden.bs.modal', function (event) {
            jQuery(event.target).toggleClass('in', 'shown' === event.type);
        });
        jQuery(document).on('shown.bs.tab', function (event) {
            jQuery(event.relatedTarget).parent('li').removeClass('active');
            jQuery(event.target).parent('li').addClass('active');
        });
        ['tooltip', 'popover'].forEach(function (pluginName) {
            var BootstrapConstructor = window.bootstrap['popover' === pluginName ? 'Popover' : 'Tooltip'];
            var nativeShow = BootstrapConstructor.prototype.show;
            BootstrapConstructor.prototype.show = function () {
                if (this._config.mauticLegacyInput) {
                    window.MauticBootstrapCompatibility.exposeLegacyInstance(jQuery, pluginName, BootstrapConstructor, this._element);
                }
                return nativeShow.apply(this, arguments);
            };
            jQuery(document).on('inserted.bs.' + pluginName + ' shown.bs.' + pluginName + ' hide.bs.' + pluginName, function (event) {
                var instance = BootstrapConstructor.getInstance(event.target);
                if (instance && instance.tip) {
                    var tip = adaptTip(instance, pluginName);
                    jQuery(tip).toggleClass('in', 'shown' === event.type);
                }
            });
        });
        jQuery(document).on('click.mautic.legacyRemote', '[data-toggle="modal"]', function () {
            var trigger = jQuery(this);
            var href = trigger.attr('href');
            var target = trigger.attr('data-target') || href && href.replace(/.*(?=#[^\s]+$)/, '');
            if (target && /^#/.test(target)) {
                jQuery(target).each(function () {
                    loadRemote(jQuery, this, {remote: trigger.data('remote') || href && !/#/.test(href) && href});
                });
            }
        });
        jQuery(window).on('load.mautic.legacyScrollspy', function () {
            jQuery('[data-spy="scroll"]').scrollspy();
        });
        jQuery(document).on('click.mautic.legacyButtons', '[data-toggle="buttons"] .btn', function (event) {
            jQuery(this).button('toggle');
            if (!jQuery(event.target).is('input[type="radio"], input[type="checkbox"]')) {
                event.preventDefault();
                jQuery(this).find('input:visible,button:visible').first().trigger('focus');
            }
        });
    }

    window.MauticBootstrapLegacyExceptions = Object.freeze({
        install: install,
        scrollspy: scrollspy,
        adaptTip: adaptTip,
        prepareMarkup: prepareMarkup,
        destroyTip: destroyTip,
        buttonState: buttonState,
        buttonGroup: buttonGroup,
        loadRemote: loadRemote,
        translateTemplate: translateTemplate
    });
})(window);
