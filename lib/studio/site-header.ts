/** Trusted menu behavior for built-in headers, shared by previews and exported sites. */
export const headerScript = String.raw`
(function(){
  var headers=Array.from(document.querySelectorAll('[data-header-shell]'));
  var mobile=window.matchMedia('(max-width:700px)');
  var fine=window.matchMedia('(hover:hover) and (pointer:fine)');
  var lastY=Math.max(0,window.scrollY),directionY=lastY,frame=0;
  function offsets(){
    var top=0;
    headers.forEach(function(shell){
      if(shell.dataset.headerMode==='fixed'||shell.dataset.headerMode==='reveal'){
        shell.style.setProperty('--header-top',top+'px');
        top+=shell.getBoundingClientRect().height;
      }
    });
    document.documentElement.style.setProperty('--site-header-space',top+'px');
  }
  var menus=headers.map(function(shell){
    var toggle=shell.querySelector('[data-header-control]');
    var panel=shell.querySelector('[data-header-panel]');
    var compact=shell.dataset.headerMode==='compact';
    function setOpen(open){
      shell.classList.toggle('is-menu-open',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
      panel.inert=(compact||mobile.matches)&&!open;
    }
    toggle.addEventListener('click',function(){setOpen(toggle.getAttribute('aria-expanded')!=='true')});
    shell.addEventListener('mouseenter',function(){if(compact&&fine.matches)setOpen(true)});
    shell.addEventListener('mouseleave',function(){if(compact&&!shell.contains(document.activeElement))setOpen(false)});
    shell.addEventListener('focusout',function(event){if(!shell.contains(event.relatedTarget))setOpen(false)});
    shell.addEventListener('keydown',function(event){
      if(event.key==='Escape'){
        event.preventDefault();setOpen(false);toggle.focus();
      }
    });
    panel.addEventListener('click',function(event){if(event.target.closest('a'))setOpen(false)});
    document.addEventListener('pointerdown',function(event){if(!shell.contains(event.target))setOpen(false)});
    setOpen(false);
    return {shell:shell,close:function(){setOpen(false)}};
  });
  function onScroll(){
    frame=0;
    var y=Math.max(0,window.scrollY),delta=y-directionY;
    if(y!==lastY)menus.forEach(function(menu){menu.close()});
    if(Math.abs(delta)>=6||y<=8){
      headers.forEach(function(shell){
        if(shell.dataset.headerMode==='reveal')
          shell.classList.toggle('is-header-hidden',y>8&&delta>0&&!shell.contains(document.activeElement));
      });
      directionY=y;
    }
    lastY=y;
  }
  window.addEventListener('scroll',function(){if(!frame)frame=requestAnimationFrame(onScroll)},{passive:true});
  window.addEventListener('resize',offsets);
  mobile.addEventListener('change',function(){menus.forEach(function(menu){menu.close()});offsets()});
  if(typeof ResizeObserver!=='undefined'){
    var observer=new ResizeObserver(offsets);
    headers.forEach(function(shell){observer.observe(shell)});
  }
  offsets();
})();`;

export const headerCSS = `
.header-shell{background:var(--background);color:var(--text);z-index:20}.header-shell .site-nav{position:relative;gap:20px}.site-header-content{display:flex;align-items:center;justify-content:flex-end;gap:24px;min-width:0}.header-shell .wordmark{min-width:0;overflow-wrap:anywhere}.header-shell .site-nav nav{display:flex;flex-wrap:wrap;gap:12px 24px}.site-menu-toggle{display:none;flex:0 0 44px;width:44px;height:44px;border:0;background:transparent;color:var(--text);padding:11px;cursor:pointer;border-radius:var(--radius)}.site-menu-toggle span{display:block;width:22px;height:2px;border-radius:2px;background:currentColor;margin:4px 0;transition:transform .22s,opacity .22s}.site-menu-toggle:focus-visible{outline:2px solid var(--primary);outline-offset:2px}.is-menu-open .site-menu-toggle span:first-child{transform:translateY(6px) rotate(45deg)}.is-menu-open .site-menu-toggle span:nth-child(2){opacity:0}.is-menu-open .site-menu-toggle span:last-child{transform:translateY(-6px) rotate(-45deg)}.studio-block.header-mode-fixed,.studio-block.header-mode-reveal{position:sticky;top:var(--header-top,0px);z-index:40;box-shadow:0 1px 0 #80808022}.header-mode-reveal{transition:transform .22s ease}.header-mode-reveal.is-header-hidden{transform:translateY(calc(-100% - var(--header-top,0px)));pointer-events:none}.studio-block.header-mode-compact{position:fixed;top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));z-index:50;width:58px;max-width:calc(100% - 32px);border-radius:var(--radius);border:1px solid #80808033;box-shadow:0 8px 32px #0002;transition:width .25s ease}.header-mode-compact.is-menu-open{width:380px}.header-mode-compact .site-nav{display:grid;grid-template-columns:minmax(0,1fr) 44px;width:100%;min-height:56px;margin:0;padding:6px;gap:0}.header-mode-compact .wordmark{grid-column:1;grid-row:1;opacity:0;visibility:hidden;white-space:nowrap;overflow:hidden;padding-left:12px;transition:opacity .2s}.header-mode-compact.is-menu-open .wordmark{opacity:1;visibility:visible}.header-mode-compact .site-menu-toggle{display:block;grid-column:2;grid-row:1}.header-mode-compact .site-header-content{grid-column:1/-1;grid-row:2;display:flex;flex-direction:column;align-items:stretch;gap:18px;max-height:0;overflow:hidden;opacity:0;visibility:hidden;transition:max-height .25s ease,opacity .2s,visibility .2s}.header-mode-compact.is-menu-open .site-header-content{max-height:70svh;overflow-y:auto;opacity:1;visibility:visible;padding:12px}.header-mode-compact .site-nav nav{display:flex;flex-direction:column;align-items:stretch;gap:0;font-size:15px;opacity:1}.header-mode-compact nav a{padding:10px 8px;border-radius:var(--radius)}.header-shell nav a:hover,.header-shell nav a:focus-visible{background:var(--accent)}.header-mode-compact .sbtn{width:100%;margin:0}.header-mode-compact .brand-logo{max-height:38px}.studio-block{scroll-margin-top:calc(var(--site-header-space,0px) + 20px)}
@media(max-width:700px){.header-shell .site-nav{min-height:76px;gap:12px}.header-shell .site-menu-toggle{display:block}.header-shell:not(.header-mode-compact) .site-header-content{position:absolute;top:100%;left:0;right:0;display:flex;flex-direction:column;align-items:stretch;gap:16px;max-height:0;overflow:hidden;visibility:hidden;opacity:0;background:var(--background);border-radius:0 0 var(--radius) var(--radius);box-shadow:0 12px 22px #0002;transition:max-height .25s ease,opacity .2s,visibility .2s}.header-shell:not(.header-mode-compact).is-menu-open .site-header-content{max-height:70svh;overflow-y:auto;opacity:1;visibility:visible;padding:16px}.header-shell .site-nav nav{display:flex;flex-direction:column;gap:0;font-size:15px;opacity:1}.header-shell nav a{padding:10px 8px}.header-shell .site-header-content .sbtn{margin:0;font-size:13px}.header-mode-compact .site-nav{min-height:56px;gap:0}.header-mode-compact .site-header-content{position:static}.header-mode-compact .wordmark{font-size:18px}.header-mode-compact .site-header-content .sbtn{margin:0}}@media(prefers-reduced-motion:reduce){.header-shell,.site-header-content,.site-menu-toggle span,.header-shell .wordmark{transition:none!important}}`;

export const fullImageCSS = `
.studio-block.full-image-block{padding:0!important;min-height:0}.full-image{position:relative;width:100%;height:100vh;height:100svh;margin:0;padding:0;overflow:hidden;background:var(--accent)}.full-image>img{position:absolute;inset:0;width:100%;height:100%;display:block;border-radius:0}.full-image-button-area{position:absolute;inset:20px;pointer-events:none}.full-image .full-image-action{position:absolute;margin:0;max-width:100%;max-height:100%;overflow:auto;overflow-wrap:anywhere;text-align:center;pointer-events:auto;box-shadow:0 4px 24px #0002}@media(max-width:700px){.full-image-button-area{inset:16px}.full-image .full-image-action{padding:13px 20px;font-size:13px}}`;
