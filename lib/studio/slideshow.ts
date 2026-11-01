/** Trusted application code only. Custom block HTML cannot supply scripts. */
export const slideshowScript = String.raw`
document.querySelectorAll('[data-slideshow]').forEach(function(root){
  var track=root.querySelector('[data-slide-track]');
  var slides=Array.from(track.children);
  var dots=Array.from(root.querySelectorAll('[data-slide-index]'));
  var status=root.querySelector('[data-slide-status]');
  var toggle=root.querySelector('[data-slide-toggle]');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  var current=0, timer=null, hovered=false, focused=false, visible=true;
  var playing=root.dataset.autoplay==='true'&&!reduced.matches;
  function update(){
    dots.forEach(function(dot,i){dot.setAttribute('aria-current',i===current?'true':'false')});
    status.textContent='Слайд '+(current+1)+' из '+slides.length;
    status.setAttribute('aria-live',playing?'off':'polite');
    if(toggle){toggle.textContent=playing?'Пауза':'Воспроизвести';toggle.setAttribute('aria-label',playing?'Приостановить слайдшоу':'Включить слайдшоу')}
  }
  function go(index){
    current=(index+slides.length)%slides.length;
    track.scrollTo({left:current*track.clientWidth,behavior:reduced.matches?'auto':'smooth'});
    update();
  }
  function schedule(){
    clearInterval(timer);
    if(playing&&!hovered&&!focused&&visible&&!document.hidden&&slides.length>1)
      timer=setInterval(function(){go(current+1)},Number(root.dataset.interval)*1000);
  }
  root.addEventListener('click',function(event){
    var button=event.target.closest('[data-slideshow-control]');
    if(!button)return;
    if(button.hasAttribute('data-slide-toggle')){playing=!playing;update();schedule();return}
    playing=false;
    go(button.hasAttribute('data-slide-index')?Number(button.dataset.slideIndex):current+Number(button.dataset.slideDirection));
    schedule();
  });
  root.addEventListener('keydown',function(event){
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();playing=false;go(current+(event.key==='ArrowLeft'?-1:1));schedule();
  });
  var frame=0;
  track.addEventListener('scroll',function(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(function(){
      var index=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/track.clientWidth)));
      if(current!==index){current=index;update()}
    });
  },{passive:true});
  track.addEventListener('pointerdown',function(){playing=false;update();schedule()},{passive:true});
  root.addEventListener('mouseenter',function(){hovered=true;schedule()});
  root.addEventListener('mouseleave',function(){hovered=false;schedule()});
  root.addEventListener('focusin',function(){focused=true;schedule()});
  root.addEventListener('focusout',function(event){focused=root.contains(event.relatedTarget);schedule()});
  document.addEventListener('visibilitychange',schedule);
  window.addEventListener('resize',function(){track.scrollTo({left:current*track.clientWidth,behavior:'instant'})});
  reduced.addEventListener('change',function(){if(reduced.matches){playing=false;update();schedule()}});
  if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;schedule()}).observe(root);
  update();schedule();
});`;

export const slideshowCSS = `
.slideshow{padding-block:60px}.slideshow>h2{margin-bottom:30px}.slide-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin;overscroll-behavior-x:contain;border-radius:var(--radius);gap:0}.slide{flex:0 0 100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always}.slide-media{position:relative;aspect-ratio:16/9;background:var(--accent);overflow:hidden;border-radius:var(--radius)}.slide-media img{width:100%;height:100%;display:block}.slide-placeholder{height:100%;min-height:180px;display:grid;place-items:center;padding:30px;font-size:14px;color:var(--primary)}.slide-caption{padding:22px 0 10px}.slide-caption h3{font-family:var(--heading-font);font-size:28px}.slide-caption p{opacity:.75;max-width:760px}.slide-caption:empty{display:none}.slide-controls{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:20px;flex-wrap:wrap}.slide-controls button{font:inherit;cursor:pointer;border:1px solid color-mix(in srgb,var(--text) 20%,transparent);background:transparent;color:var(--text);min-width:44px;min-height:44px;border-radius:var(--radius);padding:8px 12px}.slide-controls button:hover,.slide-controls button:focus-visible{background:var(--accent)}.slide-dots{display:flex;justify-content:center;flex-wrap:wrap;gap:2px}.slide-dots button{min-width:30px;min-height:44px;padding:10px 4px;border:0}.slide-dots button:after{content:'';display:block;width:8px;height:8px;margin:auto;border-radius:50%;background:var(--text);opacity:.25}.slide-dots button[aria-current=true]:after{opacity:1;background:var(--primary)}.slide-status{font-size:12px;opacity:.7}.slide-track:focus-visible{outline:2px solid var(--primary);outline-offset:4px}@media(max-width:700px){.slideshow{padding-block:40px}.slide-caption h3{font-size:24px}.slide-controls{gap:8px}.slide-dots{max-width:100%}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
