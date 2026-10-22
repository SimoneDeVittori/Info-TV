// Update these two values when a new plan is uploaded. The title follows its filename.
export const PLAN_FILE = {name: 'Piano Ottobre.pdf', url: './Piano-Ottobre.pdf', uploadedAt: '2026-10-22T14:27:45+02:00'};
export const NEXT_PLAN_FILE = {name:'Piano Novembre.pdf',url:'./Piano-Novembre.pdf',uploadedAt:'2026-10-20T11:45:18+02:00'};
const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function metadata(file,fallbackYear){
 const month=months.findIndex(value=>file.name.toLowerCase().includes(value));
 const year=Number(file.name.match(/\b20\d{2}\b/)?.[0]||fallbackYear);
 return {month:month+1,year,name:months[month],title:months[month].toUpperCase()+' '+year,updated:file.uploadedAt.slice(8,10)+'.'+file.uploadedAt.slice(5,7)};
}
export const PLAN_METADATA=metadata(PLAN_FILE,PLAN_FILE.uploadedAt.slice(0,4));
export const NEXT_PLAN_METADATA=metadata(NEXT_PLAN_FILE,PLAN_METADATA.year+(PLAN_METADATA.month===12?1:0));
// Release the next month on the first Monday on or after the 15th.
export function nextPlanRelease(year,month){
 const release=new Date(Date.UTC(year,month-1,15));
 const daysUntilMonday=(8-release.getUTCDay())%7;
 release.setUTCDate(15+daysUntilMonday);
 const date=release.toISOString().slice(0,10);
 return {date,label:date.slice(8,10)+'.'+date.slice(5,7)};
}
const initialRelease=nextPlanRelease(PLAN_METADATA.year,PLAN_METADATA.month);
export const NEXT_PLAN_AVAILABLE_DATE=initialRelease.date;
export const NEXT_PLAN_AVAILABLE_LABEL=initialRelease.label;
export function isNextPlanPreview(){
 return typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('anteprima')==='novembre';
}
export function getPlanState(now=new Date()){
 const day=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'});
 const year=Number(day.slice(0,4)),month=Number(day.slice(5,7));
 const followingMonth=month===12?1:month+1,followingYear=year+(month===12?1:0);
 const entries=[
 {file:PLAN_FILE,meta:PLAN_METADATA,renderer:renderWorkPlanPdf,crop:{x:17,y:53,width:1056,height:695,dayStart:156.02,dayStep:29.52,bottom:746.856}},
 {file:NEXT_PLAN_FILE,meta:NEXT_PLAN_METADATA,renderer:renderNextPlanPdf,crop:{x:17,y:53,width:998,height:674,dayStart:151.7,dayStep:28.68,bottom:725.62}}];
 const current=entries.find(p=>p.meta.year===year&&p.meta.month===month);
 const upcoming=entries.find(p=>p.meta.year===followingYear&&p.meta.month===followingMonth);
 const release=nextPlanRelease(year,month);
 const unlocked=day>=release.date;
 return {current,upcoming,currentMonthName:months[month-1],upcomingMonthName:months[followingMonth-1],period:day.slice(0,7),availableDate:release.date,availableLabel:release.label,unlocked,nextAvailable:Boolean(upcoming)&&(unlocked||isNextPlanPreview())};
}
export function isNextPlanAvailable(now=new Date()){
 return getPlanState(now).nextAvailable;
}
// Keep the full-screen wallpaper slot, image sizing and van animation in app.js.
// For a replacement image, update its existing asset and set retireOnPlan to null
// (or to the next plan that should retire it). No layout needs to be rebuilt.
export const VAN_WALLPAPER = {enabled:true,retireOnPlan:{year:2026,month:11}};
export function isVanWallpaperVisible(now=new Date()){
 if(!VAN_WALLPAPER.enabled)return false;
 const target=VAN_WALLPAPER.retireOnPlan;
 if(!target)return true;
 // A plan is released in the previous month, on Monday on/after the 15th.
 const previousMonth=target.month===1?12:target.month-1;
 const previousYear=target.year-(target.month===1?1:0);
 const release=nextPlanRelease(previousYear,previousMonth);
 const day=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'});
 return day<release.date;
}
export function planRotation(now=new Date()){
 const time=now.toLocaleTimeString('en-GB',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 return [0,1,...(isNextPlanAvailable(now)?[4]:[]),...(isVanWallpaperVisible(now)?[2]:[]),...(time>='08:00'&&time<'11:30'?[3]:[])];
}
// The publishing workflow rasterizes PDFs once; TVs only decode a standard PNG.
// Keep the canvas/ref API so the existing layout and day overlay remain unchanged.
function createPlanRenderer(file,crop){
 let imagePromise;
 const rendered=new WeakSet();
 function loadImage(){
  if(!imagePromise)imagePromise=new Promise((resolve,reject)=>{
   const image=new Image();
   image.onload=()=>resolve(image);
   image.onerror=()=>{imagePromise=null;reject(new Error('Plan image unavailable'));};
   image.src=file.url.replace(/\.pdf$/i,'-tv.png')+'?updated='+encodeURIComponent(file.uploadedAt);
  });
  return imagePromise;
 }
 return function renderPlanImage(canvas){
  if(!canvas||rendered.has(canvas))return;
  rendered.add(canvas);
  const surface=canvas.parentElement;
  // React callback refs must return no value, rather than an async Promise.
  loadImage().then(image=>{
   canvas.width=image.naturalWidth;
   canvas.height=image.naturalHeight;
   const context=canvas.getContext('2d');
   if(!context)throw new Error('Canvas unavailable');
   context.drawImage(image,0,0);
   context.fillStyle='#fff';
   context.fillRect((65-crop.x)/crop.width*canvas.width,(55-crop.y)/crop.height*canvas.height,16/crop.width*canvas.width,16/crop.height*canvas.height);
   surface.dataset.status='ready';
  }).catch(error=>{
   rendered.delete(canvas);
   surface.dataset.status='error';
   console.error('Work-plan image loading failed',error);
  });
 };
}
export const renderWorkPlanPdf=createPlanRenderer(PLAN_FILE,{x:17,y:53,width:1056,height:695});
export const renderNextPlanPdf=createPlanRenderer(NEXT_PLAN_FILE,{x:17,y:53,width:998,height:674});
// Medical studio pages are appended dynamically by the dashboard.
