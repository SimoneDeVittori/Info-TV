import {getDocument, GlobalWorkerOptions} from './pdf.min.mjs';

GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.mjs', import.meta.url).href;

// Update these two values when a new plan is uploaded. The title follows its filename.
export const PLAN_FILE = {name: 'Piano Ottobre.pdf', url: './Piano-Ottobre.pdf', uploadedAt: '2026-10-11T00:18:45+02:00'};
export const NEXT_PLAN_FILE = {name:'Piano Novembre.pdf',url:'./Piano-Novembre.pdf',uploadedAt:'2026-10-11T00:46:46+02:00'};
const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function metadata(file,fallbackYear){
 const month=months.findIndex(value=>file.name.toLowerCase().includes(value));
 const year=Number(file.name.match(/\b20\d{2}\b/)?.[0]||fallbackYear);
 return {month:month+1,year,name:months[month],title:months[month].toUpperCase()+' '+year,updated:file.uploadedAt.slice(8,10)+'.'+file.uploadedAt.slice(5,7)};
}
export const PLAN_METADATA=metadata(PLAN_FILE,PLAN_FILE.uploadedAt.slice(0,4));
export const NEXT_PLAN_METADATA=metadata(NEXT_PLAN_FILE,PLAN_METADATA.year+(PLAN_METADATA.month===12?1:0));
export const NEXT_PLAN_AVAILABLE_DATE=String(PLAN_METADATA.year)+'-'+String(PLAN_METADATA.month).padStart(2,'0')+'-15';
export const NEXT_PLAN_AVAILABLE_LABEL='15.'+String(PLAN_METADATA.month).padStart(2,'0');
export function isNextPlanPreview(){
 return typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('anteprima')==='novembre';
}
export function isNextPlanAvailable(now=new Date()){
 return isNextPlanPreview()||now.toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'})>=NEXT_PLAN_AVAILABLE_DATE;
}
export function planRotation(now=new Date()){
 const time=now.toLocaleTimeString('en-GB',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 return [0,1,...(isNextPlanAvailable(now)?[4]:[]),2,...(time>='08:00'&&time<'11:30'?[3]:[])];
}
function createPlanRenderer(file,crop){
let documentPromise;
const rendered = new WeakSet();
return async function renderPdf(canvas) {
  if (!canvas || rendered.has(canvas)) return;
  rendered.add(canvas);
  const surface = canvas.parentElement;
  try {
    documentPromise ||= getDocument({url: file.url + '?updated=' + encodeURIComponent(file.uploadedAt), isEvalSupported: false}).promise;
    const pdf = await documentPromise;
    const page = await pdf.getPage(1);
    const scale = 2.5;
    const viewport = page.getViewport({scale});
    const fullPage = document.createElement('canvas');
    fullPage.width = Math.ceil(viewport.width);
    fullPage.height = Math.ceil(viewport.height);
    await page.render({canvasContext: fullPage.getContext('2d'), viewport}).promise;
    // Crop only the PDF's blank margins and signature; keep the complete work table.
    canvas.width = 2800;
    canvas.height = 1844;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(fullPage,crop.x*scale,crop.y*scale,crop.width*scale,crop.height*scale,0,0,canvas.width,canvas.height);
    // Cover only the small SE label in the PDF's upper-left blank area.
    context.fillStyle = '#fff';
    context.fillRect((65-crop.x)/crop.width*canvas.width,(55-crop.y)/crop.height*canvas.height,16/crop.width*canvas.width,16/crop.height*canvas.height);
    fullPage.width = fullPage.height = 0;
    surface.dataset.status = 'ready';
  } catch (error) {
    rendered.delete(canvas);
    surface.dataset.status = 'error';
    console.error('Work-plan PDF rendering failed', error);
  }
}
}
export const renderWorkPlanPdf=createPlanRenderer(PLAN_FILE,{x:17,y:53,width:1056,height:695});
export const renderNextPlanPdf=createPlanRenderer(NEXT_PLAN_FILE,{x:17,y:53,width:998,height:674});
