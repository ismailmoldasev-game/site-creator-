export type PreviewPosition = { y: number; blockId: string; offset: number };
export type EditorPreview = { id: string; position: PreviewPosition };
export const initialPreviewPosition: PreviewPosition = { y: 0, blockId: '', offset: 0 };

export function readPreviewPosition(value: unknown): PreviewPosition | null {
  if (!value || typeof value !== 'object') return null;
  const position = value as PreviewPosition;
  if (
    !Number.isFinite(position.y) ||
    position.y < 0 ||
    typeof position.blockId !== 'string' ||
    position.blockId.length > 100 ||
    !Number.isFinite(position.offset)
  )
    return null;
  return { y: position.y, blockId: position.blockId, offset: position.offset };
}

/** Run inside the sandbox: restore before reporting scroll, and never animate restoration. */
export function editorPreviewScript(preview: EditorPreview) {
  const config = JSON.stringify(preview).replaceAll('<', '\\u003c');
  return `
(function(){
  var preview=${config};
  var restoring=true, interacted=false, frame=0;
  function blocks(){return Array.from(document.querySelectorAll('[data-block]'))}
  function position(){
    var block=blocks().find(function(node){return node.dataset.previewFloating!=='true'&&node.getBoundingClientRect().bottom>0});
    return {y:window.scrollY,blockId:block?block.dataset.block:'',offset:block?block.getBoundingClientRect().top:0};
  }
  function send(kind,extra){parent.postMessage(Object.assign({studio:kind,previewId:preview.id,position:position()},extra||{}),'*')}
  function restore(){
    if(interacted)return;
    var block=blocks().find(function(node){return node.dataset.block===preview.position.blockId});
    var top=block?window.scrollY+block.getBoundingClientRect().top-preview.position.offset:preview.position.y;
    window.scrollTo({left:0,top:Math.max(0,top),behavior:'instant'});
  }
  function report(){if(!restoring&&interacted)send('scroll')}
  function settle(){
    restore();
    requestAnimationFrame(function(){restore();restoring=false;send('ready')});
  }
  function userInteraction(){interacted=true;restoring=false}
  ['wheel','touchstart','pointerdown','keydown'].forEach(function(kind){window.addEventListener(kind,userInteraction,{passive:true})});
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-slideshow-control],[data-header-control]'))return;
    e.preventDefault();
    var block=e.target.closest('[data-block]');
    if(block)send('select',{id:block.dataset.block});
  });
  document.addEventListener('dragover',function(e){e.preventDefault()});
  window.addEventListener('scroll',function(){cancelAnimationFrame(frame);frame=requestAnimationFrame(report)},{passive:true});
  window.addEventListener('message',function(e){
    if(e.source===parent&&e.data?.studio==='select-block'&&e.data.previewId===preview.id)
      blocks().forEach(function(block){block.classList.toggle('is-selected',block.dataset.block===e.data.id)});
  });
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(function(){if(!interacted){restore();report()}}).observe(document.body);
  window.addEventListener('load',function(){if(!interacted)settle()},{once:true});
  restore();settle();
})();`;
}
