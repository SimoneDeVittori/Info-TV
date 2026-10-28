// Client-side entry gate for a static GitHub Pages site.
// This does not protect public repository files or direct asset URLs.
const USERNAME="logistica";
const SALT="025df18a3a043c6a837fe011f848f3f6";
const VERIFIER="7b60320243f44f4b2568105187204841ee01445f76534939f0f89156a45d154d";
const ITERATIONS=120000;
const ACCESS_KEY="unilabs-manno-tv-access-v1";
const APP_SOURCE="./app.js?v=20261028-clinic-address-change";
const bytesFromHex=value=>Uint8Array.from(value.match(/../g),pair=>parseInt(pair,16));

export async function verifyCredentials(username,password){
 if(String(username).trim().toLowerCase()!==USERNAME)return false;
 if(!globalThis.crypto?.subtle)throw new Error("unsupported-browser");
 const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 const derived=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:bytesFromHex(SALT),iterations:ITERATIONS},material,256));
 const expected=bytesFromHex(VERIFIER);let difference=0;
 for(let i=0;i<expected.length;i++)difference|=expected[i]^derived[i];
 return difference===0;
}

function hasAccess(){
 for(const name of ["sessionStorage","localStorage"]){
  try{const record=JSON.parse(window[name].getItem(ACCESS_KEY)||"null");
   if(record?.user===USERNAME&&record.version===VERIFIER&&record.expires>Date.now())return true;
   window[name].removeItem(ACCESS_KEY);
  }catch{}
 }
 return false;
}
function rememberAccess(persistent){
 clearAccess();
 try{window[persistent?"localStorage":"sessionStorage"].setItem(ACCESS_KEY,JSON.stringify({user:USERNAME,version:VERIFIER,expires:Date.now()+(persistent?30*24:24)*60*60*1000}));}catch{}
}
function clearAccess(){
 for(const name of ["sessionStorage","localStorage"])try{window[name].removeItem(ACCESS_KEY)}catch{}
}

async function openDashboard(){
 document.title="Info-TV";
 document.documentElement.classList.remove("auth-pending");
 document.getElementById("root").replaceChildren();
 try{
  await import(APP_SOURCE);
  const signout=document.createElement("button");
  signout.type="button";signout.className="site-signout";signout.textContent="Esci";
  signout.setAttribute("aria-label","Esci dall'area riservata");
  signout.addEventListener("click",()=>{clearAccess();window.location.reload()});
  document.body.append(signout);
  let timer;
  const show=()=>{document.body.classList.add("auth-tools-visible");clearTimeout(timer);timer=setTimeout(()=>document.body.classList.remove("auth-tools-visible"),3500)};
  document.addEventListener("pointermove",show,{passive:true});
  document.addEventListener("keydown",event=>{if(event.key==="Tab")show()});
 }catch{
  document.getElementById("root").innerHTML='<div class="auth-screen"><div class="auth-card"><h1>Caricamento non riuscito</h1><p>Ricarica la pagina per riprovare.</p><button class="auth-submit" type="button" id="auth-reload">Ricarica</button></div></div>';
  document.getElementById("auth-reload").addEventListener("click",()=>window.location.reload());
 }
}

function showLogin(){
 document.title="Accesso riservato";
 document.documentElement.classList.add("auth-pending");
 document.getElementById("root").innerHTML=`
  <div class="auth-screen"><form class="auth-card" id="auth-form">
   <h1>Accesso riservato</h1><p>Inserisci le tue credenziali per continuare.</p>
   <label for="auth-user">Utente</label>
   <input id="auth-user" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus>
   <label for="auth-password">Password</label>
   <div class="auth-password-wrap"><input id="auth-password" name="password" type="password" autocomplete="current-password" required><button id="auth-toggle" class="auth-toggle" type="button" aria-pressed="false" aria-label="Mostra password">Mostra</button></div>
   <label class="auth-remember"><input id="auth-remember" type="checkbox">Ricorda su questo dispositivo</label>
   <p class="auth-message" id="auth-message" role="status" aria-live="polite"></p>
   <button class="auth-submit" id="auth-submit" type="submit">Accedi</button>
  </form></div>`;
 const form=document.getElementById("auth-form"),user=document.getElementById("auth-user"),password=document.getElementById("auth-password"),button=document.getElementById("auth-submit"),message=document.getElementById("auth-message"),toggle=document.getElementById("auth-toggle");
 toggle.addEventListener("click",()=>{const visible=password.type==="password";password.type=visible?"text":"password";toggle.textContent=visible?"Nascondi":"Mostra";toggle.setAttribute("aria-pressed",String(visible));toggle.setAttribute("aria-label",visible?"Nascondi password":"Mostra password")});
 let pending=false;
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(pending)return;pending=true;
  button.disabled=true;button.textContent="Accesso in corso…";message.textContent="";
  try{
   if(await verifyCredentials(user.value,password.value)){
    rememberAccess(document.getElementById("auth-remember").checked);
    password.value="";await openDashboard();return;
   }
   message.textContent="Utente o password non corretti.";password.value="";password.focus();
  }catch{
   message.textContent="Questo browser non supporta l'accesso. Prova con un browser aggiornato.";
  }finally{
   pending=false;if(button.isConnected){button.disabled=false;button.textContent="Accedi"}
  }
 });
}
if(typeof document!=="undefined"){
 if(hasAccess())openDashboard();else showLogin();
}

