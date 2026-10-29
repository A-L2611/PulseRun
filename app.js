const $ = id => document.getElementById(id);
const RUNS_KEY = 'pulserun_runs_v1';
let runs = [], startAt = null, ticker = null, supabaseClient = null, currentUser = null, cloudReady = false;
try { runs = JSON.parse(localStorage.getItem(RUNS_KEY) || '[]'); } catch { runs = []; }
$('todayLabel').textContent = new Intl.DateTimeFormat('de-DE', {weekday:'long', day:'numeric', month:'long'}).format(new Date()).toUpperCase();
function status(message, type='') { const el=$('cloudStatus'); el.textContent=message; el.className='cloud-status'+(type?' '+type:''); }
function save() { localStorage.setItem(RUNS_KEY, JSON.stringify(runs)); render(); if(currentUser && supabaseClient) syncRuns().catch(e=>status('Cloud-Speicherung fehlgeschlagen: '+(e.message||'Bitte Verbindung prüfen.'),'error')); }
function recommendation() {
 if(!runs.length) return {title:'Ruhig und gleichmäßig',text:'Starte locker und in einem Tempo, bei dem du noch sprechen kannst.',next:'Lockerer Dauerlauf',duration:25,effort:'3/10'};
 const last=runs[0];
 if(last.feeling==='tired'||last.rating>=8) return {title:'Erholung hat Vorrang',text:'Dein letzter Lauf war anstrengend. Plane einen Ruhetag und verkürze den nächsten Lauf um etwa 20–30 %.',next:'Regenerativer Lauf',duration:Math.max(15,Math.round(last.minutes*.75)),effort:'2–3/10'};
 if(last.feeling==='good'&&last.rating<=5) return {title:'Vorsichtig weiterentwickeln',text:'Dein letzter Lauf fühlte sich gut an. Wenn du beschwerdefrei bist, kannst du die Dauer leicht erhöhen – höchstens um etwa 5 Minuten.',next:'Lockerer Ausdauerlauf',duration:Math.min(45,last.minutes+5),effort:'3–4/10'};
 return {title:'Konstanz vor Tempo',text:'Wiederhole eine ähnlich lockere Einheit. Steigere Dauer oder Intensität nicht gleichzeitig.',next:'Lockerer Dauerlauf',duration:last.minutes,effort:'3–4/10'};
}
function render() {
 const rec=recommendation(); $('workoutTitle').textContent=rec.next; $('workoutDesc').textContent=rec.text; $('duration').textContent=rec.duration; $('effort').textContent=rec.effort; $('coachTitle').textContent=rec.title; $('coachText').textContent=rec.text; $('feedbackTitle').textContent=rec.title; $('feedbackText').textContent=rec.text; $('runCount').textContent=`${runs.length} ${runs.length===1?'Lauf':'Läufe'}`;
 const h=$('history'); if(!runs.length){h.innerHTML='<p class="muted empty">Noch keine Läufe gespeichert. Starte deinen ersten Lauf!</p>';return;}
 h.innerHTML=runs.slice(0,8).map(r=>`<div class="run-item"><div><b>${esc(r.title)}</b><small>${esc(r.date)} · ${r.minutes} Min. · ${esc(r.feelingLabel)}</small></div><div class="run-score">${r.rating}/10</div></div>`).join('');
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function rowToRun(r){return {id:r.run_id,date:r.run_date,minutes:r.minutes,rating:r.rating,feeling:r.feeling,feelingLabel:r.feeling_label,title:r.title||'Lauftraining'};}
async function syncRuns(){
 if(!currentUser||!supabaseClient)return;
 const payload=runs.map(r=>({user_id:currentUser.id,run_id:String(r.id),run_date:r.date,minutes:r.minutes,rating:r.rating,feeling:r.feeling,feeling_label:r.feelingLabel,title:r.title||'Lauftraining'}));
 if(payload.length){const {error}=await supabaseClient.from('runs').upsert(payload,{onConflict:'user_id,run_id'});if(error)throw error;}
 const {data,error}=await supabaseClient.from('runs').select('run_id,run_date,minutes,rating,feeling,feeling_label,title').order('created_at',{ascending:false}).limit(100);if(error)throw error;
 const merged=new Map(runs.map(r=>[String(r.id),r]));for(const r of(data||[])){const converted=rowToRun(r);if(!merged.has(String(converted.id)))merged.set(String(converted.id),converted);}
 runs=Array.from(merged.values()).sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,100);localStorage.setItem(RUNS_KEY,JSON.stringify(runs));render();status('Verbunden: Deine Läufe sind online gespeichert.','ok');
}
async function refreshAuth(session){currentUser=session?.user||null;$('signOutBtn').classList.toggle('hidden',!currentUser);$('authForm').classList.toggle('hidden',!!currentUser);if(currentUser){status('Angemeldet als '+currentUser.email+' – synchronisiere Läufe …');try{await syncRuns();}catch(e){status('Cloud-Fehler: '+(e.message||'Tabellen- oder Zugriffsrechte prüfen.'),'error');}}else if(cloudReady)status('Bitte anmelden oder ein Konto erstellen, um Läufe online zu speichern.');}
async function authAction(kind){
 if(!supabaseClient){status('Supabase konnte nicht geladen werden. Prüfe deine Internetverbindung und lade die Seite neu.','error');return;}
 const email=$('authEmail').value.trim(),password=$('authPassword').value;if(!email||!password){status('Bitte E-Mail und Passwort eingeben.','error');return;}
 status(kind==='signup'?'Konto wird erstellt …':'Anmeldung läuft …');
 try {const result=kind==='signup'?await supabaseClient.auth.signUp({email,password}):await supabaseClient.auth.signInWithPassword({email,password});if(result.error){status(result.error.message,'error');return;}if(kind==='signup'&&!result.data.session){status('Konto erstellt. Bitte bestätige deine E-Mail über den Link in deinem Postfach, danach kannst du dich anmelden.','ok');return;}await refreshAuth(result.data.session);}catch(e){status('Registrierung/Anmeldung fehlgeschlagen: '+(e.message||'Bitte Internetverbindung prüfen.'),'error');}
}
$('authForm').addEventListener('submit',e=>{e.preventDefault();authAction('signin');});
$('signUpBtn').addEventListener('click',()=>authAction('signup'));
$('signOutBtn').addEventListener('click',async()=>{if(!supabaseClient)return;const {error}=await supabaseClient.auth.signOut();if(error)status(error.message,'error');else{currentUser=null;$('authForm').classList.remove('hidden');$('signOutBtn').classList.add('hidden');status('Abgemeldet. Deine lokalen Läufe bleiben auf diesem Gerät erhalten.');}});
if(window.supabase?.createClient&&window.PULSERUN_SUPABASE_URL&&window.PULSERUN_SUPABASE_KEY){supabaseClient=window.supabase.createClient(window.PULSERUN_SUPABASE_URL,window.PULSERUN_SUPABASE_KEY);cloudReady=true;supabaseClient.auth.getSession().then(({data,error})=>{if(error)status(error.message,'error');else refreshAuth(data.session);}).catch(e=>status('Supabase-Fehler: '+e.message,'error'));supabaseClient.auth.onAuthStateChange((_event,session)=>{if(session?.user?.id!==currentUser?.id)refreshAuth(session);});}else status('Cloud-Verbindung nicht verfügbar. Bitte Internetverbindung und config.js prüfen. Lokale Speicherung ist aktiv.','error');
$('startBtn').addEventListener('click',()=>{const rec=recommendation();$('minutes').value=rec.duration;$('rating').value=4;$('ratingValue').textContent='4/10';$('runDialog').showModal();startAt=Date.now();$('timer').textContent='00:00';clearInterval(ticker);ticker=setInterval(()=>{if(startAt){const sec=Math.floor((Date.now()-startAt)/1000);$('timer').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}},1000);});
$('rating').addEventListener('input',e=>$('ratingValue').textContent=e.target.value+'/10');$('runDialog').addEventListener('close',()=>{startAt=null;clearInterval(ticker);});
$('runForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const rating=Number($('rating').value),feeling=$('feeling').value,minutes=Math.max(1,Math.min(240,Number($('minutes').value)||25));const labels={good:'Gut / erholt',normal:'Normal',tired:'Müde / erschöpft'};runs.unshift({id:Date.now(),date:new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()),minutes,rating,feeling,feelingLabel:labels[feeling],title:'Lauftraining'});runs=runs.slice(0,100);save();$('runDialog').close();});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.target==='plan')$('planDialog').showModal();if(b.dataset.target==='feedback')$('feedbackDialog').showModal();if(b.dataset.target==='home')window.scrollTo({top:0,behavior:'smooth'});}));
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});render();
