/* Bootstrap 3 jQuery facade over the installed Bootstrap 5.3.8 runtime. */
(function (global) {
 'use strict';
 let installation;
 function install($, bs) {
  if (installation) return Promise.resolve(installation);
  if (!$ || global.jQuery !== $ || !bs || bs.Modal.VERSION !== '5.3.8') throw new Error('Bootstrap3Compat requires window.jQuery and Bootstrap 5.3.8');
  if (document.body && document.body.hasAttribute('data-bs-no-jquery')) throw new Error('Bootstrap3Compat requires the native Bootstrap jQuery event bridge');
  const records = new WeakMap();
  const allowed={modal:['backdrop','keyboard','show'],tooltip:['animation','html','placement','trigger','container','title','delay'],popover:['animation','html','placement','trigger','container','title','delay','content','sanitize']};
  const methods={modal:['show','hide','toggle','handleUpdate','dispose'],tooltip:['show','hide','toggle','destroy','dispose','fixTitle'],popover:['show','hide','toggle','destroy','dispose']};
  function unsupported(message){throw new TypeError('Bootstrap3Compat: unsupported '+message);}
  function installButtonFacade(){
   function Button(element,options){this.$element=$(element);this.options=$.extend({},Button.DEFAULTS,options);this.isLoading=false;}
   Button.VERSION='3.4.1';Button.DEFAULTS={loadingText:'loading...'};
   Button.prototype.setState=function(state){const disabled='disabled',$element=this.$element,valueMethod=$element.is('input')?'val':'html',data=$element.data();state+='Text';if(data.resetText==null)$element.data('resetText',$element[valueMethod]());setTimeout($.proxy(function(){$element[valueMethod](data[state]==null?this.options[state]:data[state]);if(state==='loadingText'){this.isLoading=true;$element.addClass(disabled).attr(disabled,disabled).prop(disabled,true);}else if(this.isLoading){this.isLoading=false;$element.removeClass(disabled).removeAttr(disabled).prop(disabled,false);}},this),0);};
   Button.prototype.toggle=function(){let changed=true;const $parent=this.$element.closest('[data-toggle="buttons"]');if($parent.length){const $input=this.$element.find('input');if($input.prop('type')==='radio'){if($input.prop('checked'))changed=false;$parent.find('.active').removeClass('active');this.$element.addClass('active');}else if($input.prop('type')==='checkbox'){if($input.prop('checked')!==this.$element.hasClass('active'))changed=false;this.$element.toggleClass('active');}$input.prop('checked',this.$element.hasClass('active'));if(changed)$input.trigger('change');}else{this.$element.attr('aria-pressed',!this.$element.hasClass('active'));this.$element.toggleClass('active');}};
   const previous=$.fn.button;
   $.fn.button=function(option){return this.each(function(){const $element=$(this);let record=$element.data('bs.button');const options=typeof option==='object'&&option;if(!record)$element.data('bs.button',(record=new Button(this,options)));if(option==='toggle')record.toggle();else if(option)record.setState(option);});};
   $.fn.button.Constructor=Button;$.fn.button.noConflict=function(){$.fn.button=previous;return this;};
   $(document).on('click.bootstrap3CompatButton','[data-toggle^="button"]',function(event){const $button=$(event.target).closest('.btn');$.fn.button.call($button,'toggle');if(!$(event.target).is('input[type="radio"], input[type="checkbox"]')){event.preventDefault();if($button.is('input,button'))$button.trigger('focus');else $button.find('input:visible,button:visible').first().trigger('focus');}}).on('focus.bootstrap3CompatButton blur.bootstrap3CompatButton','[data-toggle^="button"]',function(event){$(event.target).closest('.btn').toggleClass('focus',/^focus(in)?$/.test(event.type));});
  }
  function validate(kind,option){
   if(typeof option==='string'){if(!methods[kind].includes(option)) unsupported(kind+' method '+option);return;}
   if(option===undefined) return;
   if(!option || typeof option!=='object' || Array.isArray(option)) unsupported(kind+' argument');
   for(const [key,value] of Object.entries(option)) {
    if(!allowed[kind].includes(key)) unsupported(kind+' option '+key);
    if(['keyboard','show','animation','html','sanitize'].includes(key) && typeof value!=='boolean') unsupported(key+' type');
    if(key==='backdrop' && value!==true && value!==false && value!=='static') unsupported('backdrop value');
    if(key==='placement' && !['top','bottom','left','right'].includes(value)) unsupported('placement value');
    if(key==='trigger' && (typeof value!=='string' || value.split(' ').some(v=>!['manual','hover','focus','click'].includes(v)))) unsupported('trigger value');
   }
  }
  function dataOptions(el,kind){
   for(const key of (kind==='modal'?['remote','focus']:['viewport','template','selector','sanitizeFn','whiteList'])) if(el.hasAttribute('data-'+key) || el.hasAttribute('data-bs-'+key)) unsupported(kind+' data option '+key);
   const data={};
   for(const key of allowed[kind]) {const nativeKey='bs'+key[0].toUpperCase()+key.slice(1);if($(el).data(nativeKey)!==undefined) data[key]=$(el).data(nativeKey);if($(el).data(key)!==undefined) data[key]=$(el).data(key);}
   return data;
  }
  function modalRecord(el, options) {
   let record=records.get(el);
   if (record) return record;
   if(bs.Modal.getInstance(el)) unsupported('existing native modal; initialize via adapter first');
   const opts=Object.assign({backdrop:true,keyboard:true,show:true},dataOptions(el,'modal'),options);validate('modal',opts);
   const native=new bs.Modal(el,{backdrop:opts.backdrop,keyboard:opts.keyboard});
   const syncLegacyClass=()=>el.classList.toggle('in',Boolean(native._isShown));
   const show=e=>{if (!e.defaultPrevented) el.classList.add('in');queueMicrotask(syncLegacyClass);};
   const hide=e=>{if (!e.defaultPrevented) el.classList.remove('in');queueMicrotask(syncLegacyClass);};
   el.addEventListener('show.bs.modal',show);el.addEventListener('hide.bs.modal',hide);
   record={native,showListener:show,hideListener:hide,options:new Proxy(opts,{set(target,key,value){validate('modal',{[key]:value});target[key]=value;return true;}}),get isShown(){return native._isShown;}};
   records.set(el,record);$(el).data('bs.modal',record);return record;
  }
  $.fn.modal=function(option,relatedTarget) {
   validate('modal',option);
   return this.each(function(){
    if(!records.has(this) && bs.Modal.getInstance(this)) unsupported('existing native modal; initialize via adapter first');
    if(option==='dispose' && !records.has(this)) return;
    const record=modalRecord(this,typeof option==='object'?option:{});
    if(option==='dispose'){
     if(record.native._isShown || record.native._isTransitioning) unsupported('dispose shown/transitioning modal; hide and await hidden first');
     record.native.dispose();this.removeEventListener('show.bs.modal',record.showListener);this.removeEventListener('hide.bs.modal',record.hideListener);
     records.delete(this);$(this).removeData('bs.modal');return;
    }
    if(!record.native._isShown && !record.native._isTransitioning) {
     record.native._config.keyboard=record.options.keyboard;
     record.native._config.backdrop=record.options.backdrop;
     record.native._backdrop._config.isVisible=Boolean(record.options.backdrop);
    }
    const wantsShow=option==='show' || (typeof option!=='string' && (option && option.show!==undefined ? option.show : ($(this).data('show') ?? true)));
    if(wantsShow){
     // BS3 emits show before its already-shown guard. BS5 emits nothing here.
     // Preserve the legacy jQuery notification without reopening or duplicating shown.
     if(record.native._isShown) $(this).trigger($.Event('show.bs.modal',{relatedTarget}));
     else record.native.show(relatedTarget);
    } else if(typeof option==='string') record.native[option](relatedTarget);
   });
  };
  const tips=new WeakMap();
  $.fn.tooltip=function(option) {
   validate('tooltip',option);
   return this.each(function(){let record=tips.get(this);
    if(!record && bs.Tooltip.getInstance(this)) unsupported('existing native tooltip; initialize via adapter first');
    if(!record && (option==='destroy' || option==='hide' || option==='dispose')) return;
    if(!record){const opts=Object.assign({animation:true,html:false,placement:'top',trigger:'hover focus',container:false},dataOptions(this,'tooltip'),typeof option==='object'?option:{});validate('tooltip',opts);
     const el=this;
     if(el.getAttribute('title') || !el.hasAttribute('data-original-title')) el.setAttribute('data-original-title',el.getAttribute('title') || '');
     el.setAttribute('title','');
     const native=new bs.Tooltip(el,Object.assign({},opts,{title:function(){return this.getAttribute('data-original-title') || (typeof opts.title==='function'?opts.title.call(this):opts.title) || '';},container:opts.container || el.parentNode}));
     const decorate=()=>{const tip=native.tip || record.lastTip || native._getTipElement();record.lastTip=tip;tip.classList.toggle('in',native._isShown());return $(tip);};
     const showListener=()=>queueMicrotask(decorate);
     const hideListener=e=>{if(!e.defaultPrevented) record.hidePending=true;if(record.lastTip) record.lastTip.classList.remove('in');};
     const hiddenListener=()=>{record.hidePending=false;};
     record={native,options:opts,lastTip:null,tip:decorate,hidePending:false,showListener,hideListener,hiddenListener};tips.set(this,record);$(this).data('bs.tooltip',record);
     el.addEventListener('show.bs.tooltip',showListener);
     el.addEventListener('hide.bs.tooltip',hideListener);
     el.addEventListener('hidden.bs.tooltip',hiddenListener);
    }
    if(option==='destroy' || option==='dispose'){
     if(record.destroyPending) return;
     const el=this;
     const cleanup=()=>{el.removeEventListener('show.bs.tooltip',record.showListener);el.removeEventListener('hide.bs.tooltip',record.hideListener);el.removeEventListener('hidden.bs.tooltip',record.hiddenListener);record.native.dispose();el.removeAttribute('aria-describedby');if(record.lastTip) record.lastTip.remove();tips.delete(el);$(el).removeData('bs.tooltip');};
     if(option==='destroy' && (record.hidePending || record.native._isShown())){
      if(record.destroyPending) return;
      clearTimeout(record.native._timeout);
      record.destroyPending=true;
      const hidden=()=>{record.destroyPending=false;cleanup();};
      el.addEventListener('hidden.bs.tooltip',hidden,{once:true});
      if(!record.hidePending){
       record.native.hide();
       // A cancelled hide must retain its instance, overlay and lifecycle handlers.
       if(record.native._isShown()) {el.removeEventListener('hidden.bs.tooltip',hidden);record.destroyPending=false;}
      }
     } else cleanup();
    }
    else if(option==='fixTitle'){if(this.getAttribute('title') || !this.hasAttribute('data-original-title')) this.setAttribute('data-original-title',this.getAttribute('title') || '');this.setAttribute('title','');}
    else if(typeof option==='string'){record.native[option]();record.tip();}
   });
  };
  const popovers=new WeakMap();
  $.fn.popover=function(option) {
   validate('popover',option);
   return this.each(function(){let record=popovers.get(this);
    if(!record && bs.Popover.getInstance(this)) unsupported('existing native popover; initialize via adapter first');
    if(!record && (option==='destroy' || option==='hide' || option==='dispose')) return;
    if(!record){
     const opts=Object.assign({animation:true,html:false,placement:'right',trigger:'click',container:false,sanitize:true},dataOptions(this,'popover'),typeof option==='object'?option:{});validate('popover',opts);
     const el=this;
     const native=new bs.Popover(el,Object.assign({},opts,{container:opts.container || el.parentNode,template:'<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body popover-content"></div></div>'}));
     const decorate=()=>{const tip=native.tip || record.lastTip || native._getTipElement();record.lastTip=tip;tip.classList.toggle('in',native._isShown());return $(tip);};
     const showListener=()=>queueMicrotask(decorate);
     const hideListener=e=>{if(!e.defaultPrevented) record.hidePending=true;if(record.lastTip) record.lastTip.classList.remove('in');};
     const hiddenListener=()=>{record.hidePending=false;};
     record={native,options:opts,inState:native._activeTrigger,lastTip:null,tip:decorate,hidePending:false,showListener,hideListener,hiddenListener};
     popovers.set(el,record);$(el).data('bs.popover',record);
     el.addEventListener('show.bs.popover',showListener);
     el.addEventListener('hide.bs.popover',hideListener);
     el.addEventListener('hidden.bs.popover',hiddenListener);
    }
    if(option==='destroy' || option==='dispose'){
     if(record.destroyPending) return;
     const el=this;
     const cleanup=()=>{el.removeEventListener('show.bs.popover',record.showListener);el.removeEventListener('hide.bs.popover',record.hideListener);el.removeEventListener('hidden.bs.popover',record.hiddenListener);record.native.dispose();el.removeAttribute('aria-describedby');if(record.lastTip) record.lastTip.remove();popovers.delete(el);$(el).removeData('bs.popover');};
     if(option==='destroy' && (record.hidePending || record.native._isShown())){
      clearTimeout(record.native._timeout);
      record.destroyPending=true;
      const hidden=()=>{record.destroyPending=false;cleanup();};
      el.addEventListener('hidden.bs.popover',hidden,{once:true});
      if(!record.hidePending){
       record.native.hide();
       if(record.native._isShown()) {el.removeEventListener('hidden.bs.popover',hidden);record.destroyPending=false;}
      }
     } else cleanup();
     return;
    }
    if(typeof option==='string'){record.native[option]();record.tip();}
   });
  };
  // Consumers run during parser-time before DOMContentLoaded. Install the
  // facades immediately, then restore them after Bootstrap's delayed native
  // jQuery bridge has had a chance to register itself.
  installButtonFacade();
  const facades={button:$.fn.button,modal:$.fn.modal,tooltip:$.fn.tooltip,popover:$.fn.popover};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>queueMicrotask(()=>Object.assign($.fn,facades)),{once:true});
  // Legacy-only attributes: BS5 owns data-bs-*; never translate attributes or
  // register a second handler for a dual-marked trigger.
  $(document).on('click.bootstrap3Compat','[data-toggle="modal"]:not([data-bs-toggle]), [data-dismiss="modal"]:not([data-bs-dismiss])',function(event){
   event.preventDefault();
   if(this.matches('[data-dismiss="modal"]')) {$(this).closest('.modal').modal('hide');return;}
   if(this.hasAttribute('data-remote') || this.hasAttribute('data-bs-remote')) unsupported('modal trigger remote option');
   const selector=this.getAttribute('data-target') || this.getAttribute('href');
   if(!selector || !selector.startsWith('#')) throw new Error('Bootstrap3Compat: modal requires a local target');
   const target=document.querySelector(selector);if(!target) throw new Error('Bootstrap3Compat: missing modal target');
   const trigger=this,$target=$(target);
   if(!$target.data('bs.modal')) $target.modal(Object.assign({},Object.fromEntries(['backdrop','keyboard'].filter(k=>$(trigger).data(k)!==undefined).map(k=>[k,$(trigger).data(k)])),{show:false}));
   const modalRecord=$target.data('bs.modal');
   if(!modalRecord.native._isShown && !modalRecord.native._isTransitioning) $target.one('show.bs.modal',e=>{if(!e.isDefaultPrevented()) $target.one('hidden.bs.modal',()=>{if($(trigger).is(':visible')) trigger.focus();});});
   $target.modal('toggle',trigger);
  });
  installation={version:'mautic-bootstrap-3-compat'};return Promise.resolve(installation);
 }
 global.Bootstrap3Compat={install};
})(window);

/**
 * Bootstrap 3 attribute and jQuery API bridge for Bootstrap 5.
 */
(function (window, document) {
    'use strict';

    var pluginMap = {
        collapse: 'Collapse',
        dropdown: 'Dropdown',
        offcanvas: 'Offcanvas',
        tab: 'Tab'
    };
    var legacyTogglePlugins = ['collapse', 'dropdown', 'modal', 'offcanvas', 'popover', 'tab', 'tooltip'];
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
    var selector = legacyTogglePlugins
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
        var dismiss = element.getAttribute('data-dismiss');

        if (toggle && !legacyTogglePlugins.includes(toggle)) {
            return;
        }

        if ('modal' === toggle || 'modal' === dismiss || element.classList.contains('modal')) {
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

    function invokePlugin(element, pluginName, Constructor, option, args) {
        mirrorBootstrapAttributes(element);

        var config = option && 'object' === typeof option ? option : undefined;
        var instance = Constructor.getOrCreateInstance(element, config);

        if ('string' === typeof option) {
            if ('function' !== typeof instance[option]) {
                throw new TypeError('No method named "' + option + '"');
            }

            instance[option].apply(instance, args);
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

        return window.Bootstrap3Compat.install(jQuery, window.bootstrap).then(function (installation) {
            Object.keys(pluginMap).forEach(function (pluginName) {
                var Constructor = window.bootstrap[pluginMap[pluginName]];

                if (Constructor) {
                    installJQueryPlugin(jQuery, pluginName, Constructor);
                }
            });

            return installation;
        });
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
