/* Opt-in spike: Bootstrap 3 jQuery facade over the installed Bootstrap 5.3.8. */
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
  const facades={modal:$.fn.modal,tooltip:$.fn.tooltip,popover:$.fn.popover};
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
  installation={version:'spike-1'};return Promise.resolve(installation);
 }
 global.Bootstrap3Compat={install};
})(window);
