const APP_VERSION=12,COL={CPR:'#ff6b6b',BLS:'#4dabff',MED:'#c792ff',HEP:'#ffc72c'},DEFREPO='m9r1u5/Training-Scheduler',MODS={CPR:'CPR',BLS:'BLS',MED:'Medicals',HEP:'HEP B'};

// Styles shipped inside app.js so "Update" delivers visual fixes without a new APK.
(()=>{const s=document.createElement('style');s.textContent=`
html,body{overflow-x:hidden;max-width:100%}main{max-width:100%}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:1;width:32px;height:32px}
dialog{padding:16px;box-sizing:border-box;max-width:92vw}dialog input,dialog select,dialog textarea{width:100%;max-width:100%}
.row>*{min-width:0}.cal{grid-template-columns:repeat(7,minmax(0,1fr))}.cal div{min-height:54px;padding:6px 0}
.dots i{font-style:normal;font-size:16px;line-height:1;margin:0 1px}header button{min-width:0}
body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}input,textarea{-webkit-user-select:text;user-select:text}.cal div[onclick]{cursor:pointer;outline:2px solid #ffffff33}`;document.head.appendChild(s)})();
const HOL=['2026-01-01','2026-03-21','2026-04-03','2026-04-06','2026-04-27','2026-05-01','2026-06-16','2026-08-10','2026-09-24','2026-12-16','2026-12-25','2026-12-26',
'2027-01-01','2027-03-22','2027-03-26','2027-03-29','2027-04-27','2027-05-01','2027-06-16','2027-08-09','2027-09-24','2027-12-16','2027-12-25','2027-12-27'];
const K='sched_db_v1';let db=JSON.parse(localStorage.getItem(K)||'null')||{seq:1,people:[],events:[],holidays:HOL,country:'South Africa (edit list below)',slot:'09:00-10:00',repo:''};
const persist=()=>{localStorage.setItem(K,JSON.stringify(db));sync()},save=()=>{stamp();persist();syncSoon()};
const $=id=>document.getElementById(id),C=Core,LN=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
const nice=s=>C.parse(s).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>C.iso(new Date());let view='home',tab='CPR',pid=null,cm=null;
function go(v,a){view=v;if(MODS[v]){tab=v;view='list'}if(a)pid=a;render()}
function render(){
 $('nav').innerHTML=Object.entries(MODS).map(([k,v])=>`<button class="${tab===k&&view==='list'?'on':''}" onclick="go('${k}')">${v}</button>`).join('');
 const m=$('m');
 if(view==='home')m.innerHTML=`<h2>Training Scheduler</h2><p class="mut">Version ${APP_VERSION} · pick a tab below.<br><span id="sst">${esc(syncStatus())}</span></p>`+Object.entries(MODS).map(([k,v])=>{const n=db.people.filter(p=>p.mods.includes(k)).length;return `<button class="item p" onclick="go('${k}')">${v} · ${n} people</button>`}).join('')+`<div class="card"><b>Next 7 days</b>${upcoming()}</div>`;
 if(view==='list'){const ps=db.people.filter(p=>p.mods.includes(tab));m.innerHTML=`<h2>${MODS[tab]}</h2>`+(ps.map(p=>`<button class="item" onclick="go('person','${p.id}')">${esc(p.name)} ${esc(p.surname)}${p.paused?' (paused)':''}<br><span class="mut">${nextOf(p,tab)}</span></button>`).join('')||'<p class="mut">Nobody yet.</p>')+`<button class="item p" onclick="addDlg()">+ Add person</button>`}
 if(view==='person')person(m);if(view==='set')settings(m);
}
const nextOf=(p,mod)=>{const e=evs(p.id,mod).find(e=>!e.done&&e.date>=today());return e?'Next: '+nice(e.date):'Nothing scheduled'};
const evs=(id,mod)=>db.events.filter(e=>e.pid===id&&(!mod||e.mod===mod)).sort((a,b)=>a.date.localeCompare(b.date));
function upcoming(){const t=today(),e=C.addDays(t,7);const l=db.events.filter(x=>!x.done&&x.date>=t&&x.date<=e&&!pp(x.pid).paused).sort((a,b)=>a.date.localeCompare(b.date));return l.map(x=>`<div>${nice(x.date)} · ${esc(pp(x.pid).name)} ${esc(pp(x.pid).surname)} · ${x.label}</div>`).join('')||'<div class="mut">Nothing due.</div>'}
const pp=id=>db.people.find(p=>p.id===id);
function dlg(html){const d=$('dlg');if(d.open)d.close();d.innerHTML=html;d.showModal();return d}
const closeDlg=()=>$('dlg').close();
function addDlg(){dlg(`<h3>Add to ${MODS[tab]}</h3><input id="fn" placeholder="Name"><br><br><input id="sn" placeholder="Surname"><br><br><label>First date (tap the calendar icon)</label><input id="fd" type="date" value="${today()}"><div class="row"><button onclick="closeDlg()">Cancel</button><button class="p" onclick="addPerson()">Save</button></div>`)}
function addPerson(){const n=$('fn').value.trim(),s=$('sn').value.trim(),d=$('fd').value;if(!n||!s||!d)return alert('Enter name, surname and a first date.');
 let p=db.people.find(x=>x.name.toLowerCase()===n.toLowerCase()&&x.surname.toLowerCase()===s.toLowerCase());const isNew=!p;
 if(isNew)p={id:'p'+uid(),name:n,surname:s,mods:[],paused:false};
 if(p.mods.includes(tab))return alert('Already on '+MODS[tab]+'.');
 if(!put(p,tab,d,false))return;if(isNew)db.people.push(p);p.mods.push(tab);save();closeDlg();view='list';render()}
// Create events for one module from an anchor date; blocks (returns false) on a CPR/BLS clash.
function put(p,mod,anchor,keepFrom,list=db.events){const g=C.generate(mod,anchor,db.holidays).map(e=>({id:'e'+uid(),pid:p.id,mod,date:e.date,label:e.label,slot:db.slot,done:null}));
 const base=list.filter(e=>e.pid===p.id);if(g.some(a=>base.some(b=>C.clash(a,b)))){alert('Conflict: already scheduled for something else');return false}
 db.events.push(...g);return true}
function reschedule(eid,date,why){const e=db.events.find(x=>x.id===eid),p=pp(e.pid),from=e.date,lbl=e.label,old=db.events.slice();const lg=()=>{(db.log=db.log||[]).push({pid:p.id,label:lbl,from,to:date,why:why||'',ts:new Date().toISOString()})};
 if(e.mod==='HEP'&&e.label!=='HEP B STAT'){const nd=C.nextWorking(date,db.holidays);e.date=nd;lg();save();return true}
 const keep=db.events.filter(x=>!(x.pid===e.pid&&x.mod===e.mod&&!x.done&&x.date>=e.date));db.events=keep;
 if(!put(p,e.mod,date)){db.events=old;return false}lg();save();return true}
function person(m){const p=pp(pid),all=evs(p.id);cm=cm||today().slice(0,7);const [y,mo]=cm.split('-').map(Number),first=new Date(y,mo-1,1),off=(first.getDay()+6)%7,dim=new Date(y,mo,0).getDate();
 let cells='MTWTFSS'.split('').map(c=>`<div class="mut">${c}</div>`).join('')+'<div></div>'.repeat(off);
 for(let d=1;d<=dim;d++){const s=cm+'-'+String(d).padStart(2,'0'),e=all.filter(x=>x.date===s);cells+=`<div${e.length?` onclick="dayOpen('${s}')"`:''}>${d}<br><span class="dots">${e.map(x=>`<i style="color:${COL[x.mod]}">${x.done?'✔':'●'}</i>`).join('')||'&nbsp;'}</span></div>`}
 const shift=n=>{const d=new Date(y,mo-1+n,1);cm=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');render()};window.shift=shift;
 m.innerHTML=`<h2>${esc(p.name)} ${esc(p.surname)}</h2>${p.paused?'<p class="mut">PAUSED – no reminders or new events.</p>':''}
 <div class="row"><button onclick="shift(-1)">◀</button><b style="text-align:center;padding-top:12px">${first.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</b><button onclick="shift(1)">▶</button></div><div class="cal">${cells}</div>
 <p>${Object.keys(MODS).map(k=>`<span style="color:${COL[k]};font-weight:800;margin-right:12px">● ${MODS[k]}</span>`).join('')}</p><p class="mut">● scheduled · ✔ completed</p>`+all.map(e=>`<div class="card" style="border-left:10px solid ${COL[e.mod]}"><b>${e.label}</b> · ${nice(e.date)}${!e.done&&e.date<today()?' <b style="color:var(--bad)">⚠ OVERDUE</b>':''}<br>Slot: ${esc(e.slot)}${e.done?`<br><span style="color:var(--ok)">✔ Completed ${new Date(e.done.ts).toLocaleString('en-GB')}</span><br><img src="${e.done.sig}" style="width:100%;background:#fff;border-radius:8px">`:`<div class="row"><button onclick="editEv('${e.id}')">Missed / reschedule</button><button class="g" ${e.date===today()?'':'disabled style="opacity:.35"'} onclick="sign('${e.id}')">Sign off</button></div>${e.date===today()?'':'<div class="mut">Sign-off opens on '+nice(e.date)+'</div>'}`}<div class="row"><button onclick="slotEv('${e.id}')">Time slot</button><button onclick="share(msgOne('${e.id}'))">Message</button></div></div>`).join('')
 +`<div class="row"><button class="p" onclick="share(msgYear('${p.id}'))">Year ahead message</button><button class="g" onclick="calExport('${p.id}')">Add to phone calendar</button></div>`+((db.log||[]).filter(l=>l.pid===p.id).length?'<div class="card"><b>Reschedule history</b>'+db.log.filter(l=>l.pid===p.id).map(l=>`<div class="mut">${l.label}: ${nice(l.from)} → ${nice(l.to)} (${esc(l.why)})</div>`).join('')+'</div>':'')
 +Object.entries(MODS).filter(([k])=>!p.mods.includes(k)).map(([k,v])=>`<button class="item" onclick="tab='${k}';addTo('${p.id}')">+ Put on ${v}</button>`).join('')
 +`<div class="row">${p.paused?`<button class="g" onclick="resume('${p.id}')">Resume</button>`:`<button class="r" onclick="pause('${p.id}')">Pause</button>`}<button class="r" onclick="delP('${p.id}')">Delete</button></div>`}
function dayOpen(s){const p=pp(pid),l=evs(p.id).filter(e=>e.date===s);if(!l.length)return;
 dlg(`<h3>${esc(p.name)} ${esc(p.surname)}</h3><div class="mut">${nice(s)}</div>`+l.map(e=>`<div class="card" style="border-left:10px solid ${COL[e.mod]}"><b>${e.label}</b> · ${MODS[e.mod]}<br>Slot: ${esc(e.slot)}<br>${e.done?'<span style="color:var(--ok)">✔ Completed '+new Date(e.done.ts).toLocaleString('en-GB')+'</span>':'Status: scheduled'}${e.done?'':`<div class="row"><button onclick="editEv('${e.id}')">Missed / reschedule</button><button class="g" ${e.date===today()?'':'disabled style="opacity:.35"'} onclick="sign('${e.id}')">Sign off</button></div>`}<div class="row"><button onclick="slotEv('${e.id}')">Time slot</button><button onclick="share(msgOne('${e.id}'))">Message</button></div></div>`).join('')+`<button class="item p" onclick="closeDlg()">Close</button>`)}
function addTo(id){dlg(`<h3>First date for ${MODS[tab]}</h3><input id="fd" type="date" value="${today()}"><div class="row"><button onclick="closeDlg()">Cancel</button><button class="p" onclick="addMod('${id}')">Save</button></div>`)}
function addMod(id){const p=pp(id),d=$('fd').value;if(!d||!put(p,tab,d))return;p.mods.push(tab);save();closeDlg();render()}
function editEv(id){const e=db.events.find(x=>x.id===id);dlg(`<h3>New date for ${e.label}</h3><p class="mut">Later events of this type are re-planned from the new date at the normal frequency, 10 years ahead.</p><select id="rs" style="width:100%"><option>Did not attend</option><option>On leave</option><option>Ill</option><option>Other</option></select><br><br><input id="nd" type="date" value="${e.date}"><div class="row"><button onclick="closeDlg()">Cancel</button><button class="p" onclick="if($('nd').value&&reschedule('${id}',$('nd').value,$('rs').value)){closeDlg();render()}">Save</button></div>`)}
function slotEv(id){const e=db.events.find(x=>x.id===id);dlg(`<h3>Time slot</h3><input id="sl" value="${esc(e.slot)}"><div class="row"><button onclick="closeDlg()">Cancel</button><button class="p" onclick="db.events.find(x=>x.id==='${id}').slot=$('sl').value;save();closeDlg();render()">Save</button></div>`)}
function pause(id){if(!confirm('Pause? Future events are removed. History and signatures are kept.'))return;const p=pp(id);p.paused=true;db.events=db.events.filter(e=>!(e.pid===id&&!e.done&&e.date>=today()));save();render()}
function resume(id){dlg(`<h3>Resume from</h3><input id="fd" type="date" value="${today()}"><div class="row"><button onclick="closeDlg()">Cancel</button><button class="p" onclick="doResume('${id}')">Resume</button></div>`)}
function doResume(id){const p=pp(id),d=$('fd').value;if(!d)return;p.paused=false;for(const mo of p.mods)if(!put(p,mo,d)){p.paused=true;return}save();closeDlg();render()}
function delP(id){if(!confirm('Delete this person AND all their signed records?'))return;db.people=db.people.filter(p=>p.id!==id);db.events=db.events.filter(e=>e.pid!==id);save();go('home')}
// Signature
function sign(id){const ev=db.events.find(v=>v.id===id);if(!ev||ev.date!==today())return alert('Sign-off is only possible on the day of the training or injection ('+(ev?nice(ev.date):'')+').');const d=dlg(`<h3>Candidate signs here</h3><canvas id="cv" width="600" height="260"></canvas><div class="row"><button onclick="closeDlg()">Cancel</button><button onclick="clr()">Clear</button><button class="g" onclick="saveSig('${id}')">Save</button></div>`);
 const c=$('cv'),x=c.getContext('2d');x.lineWidth=4;x.lineCap='round';window.inked=false;let dn=false;const pt=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.onpointerdown=e=>{dn=true;const[a,b]=pt(e);x.beginPath();x.moveTo(a,b);c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!dn)return;const[a,b]=pt(e);x.lineTo(a,b);x.stroke();window.inked=true};c.onpointerup=()=>dn=false;window.clr=()=>{x.clearRect(0,0,c.width,c.height);window.inked=false}}
function saveSig(id){const ev=db.events.find(v=>v.id===id);if(!ev||ev.date!==today()){closeDlg();return alert('Sign-off is only possible on the day of the event.')}if(!window.inked)return alert('No signature – the event cannot be marked as completed.');const c=$('cv'),o=document.createElement('canvas');o.width=600;o.height=300;const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,300);x.drawImage(c,0,0);
 const ts=new Date(),e=db.events.find(v=>v.id===id);x.fillStyle='#000';x.font='20px sans-serif';x.fillText(pp(e.pid).name+' '+pp(e.pid).surname+' · '+e.label+' · '+ts.toLocaleString('en-GB'),10,285);
 e.done={sig:o.toDataURL('image/png'),ts:ts.toISOString()};save();closeDlg();render()}
// Messages
const first=p=>p.name;
const msgOne=id=>{const e=db.events.find(x=>x.id===id),p=pp(e.pid);return `Hi ${first(p)}, you are scheduled for ${e.label} on ${nice(e.date)}, time slot ${e.slot}. Please confirm.`};
const msgYear=id=>{const p=pp(id);return `Hi ${first(p)}, your schedule for the year ahead:\n`+evs(id).filter(e=>!e.done&&e.date>=today()).map(e=>`• ${nice(e.date)} – ${e.label} (${e.slot})`).join('\n')};
async function share(text){const S=window.Capacitor&&Capacitor.Plugins.Share;try{if(S)await S.share({text,dialogTitle:'Send message'});else if(navigator.share)await navigator.share({text});else{await navigator.clipboard.writeText(text);alert('Copied to clipboard.')}}catch(e){}}
// Notifications: day before (previous working day) 09:00. Everything is rebuilt on each save.
async function sync(){const L=LN();if(!L)return;try{await L.registerActionTypes({types:[{id:'REMIND',actions:[{id:'accept',title:'Accept'},{id:'snooze',title:'Snooze 2h'}]}]});
 const pend=await L.getPending();if(pend.notifications.length)await L.cancel({notifications:pend.notifications.filter(n=>n.id<1e9).map(n=>({id:n.id}))});
 const now=Date.now(),list=[];for(const e of db.events){const p=pp(e.pid);if(e.done||!p||p.paused)continue;const r=C.reminderDay(e.date,db.holidays),at=new Date(r+'T09:00:00');if(at<=now)continue;
  list.push({id:hash32(e.id)%1e9,title:'Tomorrow: '+e.label,body:`${p.name} ${p.surname} · ${nice(e.date)} · ${e.slot}`,schedule:{at,allowWhileIdle:true},actionTypeId:'REMIND',extra:{}});}
 list.sort((a,b)=>a.schedule.at-b.schedule.at);if(list.length)await L.schedule({notifications:list.slice(0,400)})}catch(e){console.log(e)}}
// Calendar file (.ics): the phone's own Calendar app then fires the reminder (09:00 on the working day before), even when this app is closed.
async function saveFile(name,text,type){const P=window.Capacitor&&Capacitor.Plugins;if(P&&P.Filesystem&&P.Share){const r=await P.Filesystem.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});await P.Share.share({title:name,files:[r.uri]})}else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove()}}
function calExport(id){const z=n=>String(n).padStart(2,'0'),esc2=t=>String(t).replace(/[\\,;]/g,'\\$&').replace(/\n/g,'\\n'),now=new Date(),stamp=now.toISOString().replace(/[-:]|\.\d{3}/g,'');
 const st=sl=>{const m=(sl||'').match(/(\d{1,2}):(\d\d)\s*[-–to ]+\s*(\d{1,2}):(\d\d)/);return m?[z(m[1])+':'+m[2],z(m[3])+':'+m[4]]:['09:00','10:00']},dt=(s,t)=>s.replace(/-/g,'')+'T'+t.replace(':','')+'00';
 const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Training Scheduler//EN','CALSCALE:GREGORIAN'];let n=0;
 for(const e of db.events){const p=pp(e.pid);if(!p||p.paused||e.done||e.date<today()||(id&&e.pid!==id))continue;const [a,b]=st(e.slot),start=new Date(e.date+'T'+a+':00'),rem=new Date(C.reminderDay(e.date,db.holidays)+'T09:00:00'),mins=Math.max(1,Math.round((start-rem)/60000));
  L.push('BEGIN:VEVENT','UID:'+e.id+'@training-scheduler','DTSTAMP:'+stamp,'DTSTART:'+dt(e.date,a),'DTEND:'+dt(e.date,b),'SUMMARY:'+esc2(e.label+' - '+p.name+' '+p.surname),'DESCRIPTION:'+esc2('Time slot '+e.slot),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc2('Tomorrow: '+e.label+' - '+p.name+' '+p.surname),'TRIGGER:-PT'+mins+'M','END:VALARM','END:VEVENT');n++}
 L.push('END:VCALENDAR');if(!n)return alert('Nothing to add: no upcoming events.');
 saveFile('training-schedule.ics',L.join('\r\n'),'text/calendar').then(()=>alert(n+' events saved. Tap the "Download complete" notification (or open the file) and choose Calendar > Add. Your Calendar app will remind you at 09:00 on the working day before each event.')).catch(e=>alert('Could not save: '+e))}
// ===== Sync between devices through a PRIVATE GitHub repo (data.json). Per-record merge: the newest change wins. =====
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function hash32(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0}
const recHash=r=>{const o=Object.assign({},r);delete o.u;return hash32(JSON.stringify(o))};
const scfg=()=>{try{return JSON.parse(localStorage.getItem('sync_cfg')||'{}')}catch(e){return {}}},setScfg=o=>{localStorage.setItem('sync_cfg',JSON.stringify(Object.assign(scfg(),o)));setSM()};
let syncMsg='',syncBusy=false,syncTimer=null;
function syncStatus(){const c=scfg();if(!c.repo||!c.token)return 'Sync is off';return syncMsg||(c.last?'Last sync: '+new Date(c.last).toLocaleString('en-GB'):'Not synced yet')}
function setSM(m){if(m!==undefined)syncMsg=m;const el=document.getElementById('sst');if(el)el.textContent=syncStatus()}
// Give every changed record a new timestamp; record deletions as tombstones.
function stamp(){const now=Date.now(),sn=db.snap=db.snap||{},seen={};
 for(const [t,arr] of [['p',db.people],['e',db.events]])for(const r of arr){const k=t+r.id;seen[k]=1;const x=recHash(r);if(sn[k]!==x){r.u=now;sn[k]=x}else if(!r.u)r.u=now}
 const sv=hash32(JSON.stringify([db.slot,db.holidays,db.country]));seen.s=1;if(sn.s!==sv){db.su=now;sn.s=sv}
 db.del=db.del||[];for(const k in sn)if(!seen[k]){db.del.push({k,u:now});delete sn[k]}
 db.del=db.del.filter(d=>now-d.u<15552e6)}
const localDoc=()=>({v:1,people:db.people,events:db.events,holidays:db.holidays,country:db.country,slot:db.slot,su:db.su||0,del:db.del||[],log:db.log||[]});
function canon(d){const s=(a,f)=>(a||[]).slice().sort((x,y)=>String(f(x)).localeCompare(String(f(y))));return JSON.stringify([s(d.people,r=>r.id),s(d.events,r=>r.id),d.holidays,d.country,d.slot,d.su||0,s(d.del,r=>r.k),s(d.log,r=>r.pid+r.ts+r.label)])}
function mergeDocs(A,B){const tomb={};for(const d of[...(A.del||[]),...(B.del||[])])if(!(tomb[d.k]>=d.u))tomb[d.k]=d.u;
 const pick=(t,a,b)=>{const m=new Map();for(const r of[...(a||[]),...(b||[])]){const o=m.get(r.id);if(!o||(r.u||0)>(o.u||0))m.set(r.id,r)}return[...m.values()].filter(r=>!(tomb[t+r.id]>=(r.u||0)))};
 const people=pick('p',A.people,B.people),ids=new Set(people.map(p=>p.id)),events=pick('e',A.events,B.events).filter(e=>ids.has(e.pid));
 const S=(B.su||0)>(A.su||0)?B:A,lg=new Map();for(const l of[...(A.log||[]),...(B.log||[])])lg.set(l.pid+'|'+l.ts+'|'+l.label,l);
 return{v:1,people,events,holidays:S.holidays,country:S.country,slot:S.slot,su:Math.max(A.su||0,B.su||0),del:Object.entries(tomb).map(([k,u])=>({k,u})),log:[...lg.values()]}}
function applyDoc(M){db.people=M.people||[];db.events=M.events||[];db.holidays=M.holidays||db.holidays;db.country=M.country||db.country;db.slot=M.slot||db.slot;db.su=M.su||0;db.del=M.del||[];db.log=M.log||[];
 db.snap={s:hash32(JSON.stringify([db.slot,db.holidays,db.country]))};for(const r of db.people)db.snap['p'+r.id]=recHash(r);for(const r of db.events)db.snap['e'+r.id]=recHash(r);
 persist();if(!$('dlg').open)render()}
function b64e(s){const b=new TextEncoder().encode(s);let o='';for(let i=0;i<b.length;i+=0x8000)o+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(o)}
function b64d(s){const o=atob(s.replace(/\s/g,'')),b=new Uint8Array(o.length);for(let i=0;i<o.length;i++)b[i]=o.charCodeAt(i);return new TextDecoder().decode(b)}
async function ghFile(o={}){const c=scfg();return fetch('https://api.github.com/repos/'+c.repo+'/contents/data.json',{method:o.method||'GET',cache:'no-store',headers:{Authorization:'Bearer '+c.token,Accept:o.raw?'application/vnd.github.raw+json':'application/vnd.github+json'},body:o.body})}
async function getRemote(){const r=await ghFile();if(r.status===404)return{doc:null,sha:null};if(r.status===401||r.status===403)throw new Error('GitHub refused the token ('+r.status+')');if(!r.ok)throw new Error('GitHub error '+r.status);
 const j=await r.json();let t;if(j.encoding==='base64'&&j.content)t=b64d(j.content);else{const r2=await ghFile({raw:1});if(!r2.ok)throw new Error('GitHub error '+r2.status);t=await r2.text()}return{doc:JSON.parse(t),sha:j.sha}}
function choose(){return new Promise(res=>{window._c=v=>{res(v);closeDlg()};dlg(`<h3>The cloud already has data</h3><p>Which copy should this device use?</p><button class="item p" onclick="_c('cloud')">Use the cloud data (replaces this device)</button><button class="item" onclick="_c('local')">Keep this device's data (replaces the cloud)</button><button class="item" onclick="_c('merge')">Merge both (only if both came from the same backup)</button><button class="item r" onclick="_c(null)">Cancel</button>`);$('dlg').addEventListener('close',()=>res(null),{once:true})})}
async function syncNow(manual){const c=scfg();if(!c.repo||!c.token){if(manual)alert('Enter the sync repo and token in Settings first.');return}
 if(syncBusy)return;syncBusy=true;setSM('Syncing…');let choice=null;
 try{for(let n=0;n<3;n++){stamp();const{doc,sha}=await getRemote(),L=localDoc();let M=L;
   if(doc){if(!choice&&!scfg().last&&L.people.length&&(doc.people||[]).length){choice=await choose();if(!choice){setSM('Sync cancelled');return}}
    M=choice==='cloud'?doc:choice==='local'?L:mergeDocs(L,doc)}
   if(canon(M)!==canon(L))applyDoc(M);
   if(!doc||canon(M)!==canon(doc)){const r=await ghFile({method:'PUT',body:JSON.stringify({message:'sync',content:b64e(JSON.stringify(Object.assign({saved:Date.now()},M))),sha:sha||undefined})});
    if(r.status===409||r.status===422)continue;if(!r.ok)throw new Error(r.status===404?'Repo not found, or the token has no access to it':'GitHub error '+r.status)}
   setScfg({last:Date.now()});setSM('');return}
  throw new Error('The cloud copy kept changing, try again')}
 catch(e){setSM('Sync failed: '+e.message);if(manual)alert('Sync failed: '+e.message)}finally{syncBusy=false;setSM()}}
const syncSoon=(ms=4000)=>{clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(false),ms)};
// CSV exports (open in Excel / Google Sheets). Year ahead = today until 12 months from today.
function exportPlan(id){const t=today(),end=C.addMonths(t,12),q=s=>'"'+String(s).replace(/"/g,'""')+'"';
 const l=db.events.filter(e=>(!id||e.pid===id)&&e.date>=t&&e.date<=end&&pp(e.pid)).sort((a,b)=>a.date.localeCompare(b.date)||pp(a.pid).surname.localeCompare(pp(b.pid).surname));
 if(!l.length)return alert('Nothing scheduled in the next 12 months.');
 const rows=[['Date','Day','Name','Surname','Module','Event','Time slot','Status']].concat(l.map(e=>{const p=pp(e.pid);return [e.date,C.parse(e.date).toLocaleDateString('en-GB',{weekday:'long'}),p.name,p.surname,MODS[e.mod],e.label,e.slot,e.done?'Completed':'Scheduled']}));
 const p=id&&pp(id),name=id?'year-ahead-'+(p.name+'-'+p.surname).replace(/[^A-Za-z0-9]+/g,'-'):'year-planner-'+t;
 saveFile(name+'.csv','\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv').then(()=>alert(l.length+' events exported. Open the downloaded file with Excel or Google Sheets, or share it.')).catch(e=>alert('Could not save: '+e))}
function exportPersonDlg(){if(!db.people.length)return alert('No people yet.');
 dlg(`<h3>Export year ahead for</h3><select id="xp" style="width:100%">${db.people.slice().sort((a,b)=>a.surname.localeCompare(b.surname)).map(p=>`<option value="${p.id}">${esc(p.name)} ${esc(p.surname)}</option>`).join('')}</select><div class="row"><button onclick="closeDlg()">Cancel</button><button class="p" onclick="const i=$('xp').value;closeDlg();exportPlan(i)">Export</button></div>`)}
async function testReminder(){const L=LN();if(!L){try{if(await Notification.requestPermission()!=='granted')return alert('Allow notifications for this site first.');const reg=await navigator.serviceWorker.ready,p=db.people[0];
  await reg.showNotification('Tomorrow: CPR (TEST)',{body:(p?p.name+' '+p.surname:'Sample Person')+' · '+nice(C.addDays(today(),1))+' · '+db.slot,actions:[{action:'accept',title:'Accept'},{action:'snooze',title:'Snooze 2h'}],requireInteraction:true});
  alert('This is how a reminder looks. In the web version it can only appear while the app is open. For reminders that always fire, use "Add reminders to phone calendar".')}catch(e){alert('Could not show a notification: '+e.message)}return}
 try{const r=await L.requestPermissions();if(r.display!=='granted')return alert('Notifications are not allowed. Tap "Allow notifications and exact alarms" first.');
  await L.registerActionTypes({types:[{id:'REMIND',actions:[{id:'accept',title:'Accept'},{id:'snooze',title:'Snooze 2h'}]}]});
  const p=db.people[0];await L.schedule({notifications:[{id:2000000000,title:'Tomorrow: CPR (TEST)',body:(p?p.name+' '+p.surname:'Sample Person')+' · '+nice(C.addDays(today(),1))+' · '+db.slot,schedule:{at:new Date(Date.now()+60000),allowWhileIdle:true},actionTypeId:'REMIND'}]});
  alert('Test reminder set for 1 minute from now. Lock the phone or close the app, then wait.')}catch(e){alert('Could not schedule: '+e.message)}}
async function perms(){const L=LN();if(!L)return alert('Notifications only work in the installed Android app.');const r=await L.requestPermissions();let ex='n/a';try{ex=(await L.checkExactNotificationSetting()).exact_alarm}catch(e){}
 if(ex!=='granted'&&confirm('Exact alarms are off. Open the setting? Turn on "Alarms & reminders" for this app.'))await L.changeExactNotificationSetting();
 alert('Notifications: '+r.display+'\nExact alarms: '+ex);sync()}
(()=>{const L=LN();if(L)L.addListener('localNotificationActionPerformed',async a=>{if(a.actionId==='snooze')await L.schedule({notifications:[{id:1e9+Math.floor(Math.random()*1e8),title:a.notification.title,body:a.notification.body,schedule:{at:new Date(Date.now()+72e5),allowWhileIdle:true},actionTypeId:'REMIND'}]})})})();
// Settings, backup, update
function settings(m){m.innerHTML=`<h2>Settings</h2><div class="card"><b>Default time slot</b><input id="s1" value="${esc(db.slot)}" onchange="db.slot=this.value;save()"></div>
<div class="card"><b>Country / public holidays</b> (one date per line, YYYY-MM-DD)<input id="s0" value="${esc(db.country)}" onchange="db.country=this.value;save()"><br><br><textarea id="s2" rows="8" style="width:100%" onchange="hol(this.value)">${db.holidays.join('\n')}</textarea><p class="mut">Changing holidays does not move existing events; change a date to re-plan.</p></div>
<div class="card"><b>GitHub repo for updates</b> (owner/name)<input id="s3" value="${esc(db.repo||DEFREPO)}" onchange="db.repo=this.value;save()"></div>
<div class="card"><b>Sync between devices</b><p class="mut">Uses a PRIVATE GitHub repo that you create. Use the same repo and token on every device.</p><input placeholder="owner/private-repo" value="${esc(scfg().repo||'')}" onchange="setScfg({repo:this.value.trim()})"><br><br><input type="password" placeholder="Access token" value="${esc(scfg().token||'')}" onchange="setScfg({token:this.value.trim()})"><p id="sst" class="mut">${esc(syncStatus())}</p><div class="row"><button class="g" onclick="syncNow(true)">Sync now</button><button class="r" onclick="setScfg({repo:'',token:'',last:0});render()">Disconnect</button></div></div><button class="item p" onclick="perms()">Allow notifications and exact alarms</button><button class="item g" onclick="testReminder()">Send test reminder (in 1 minute)</button><button class="item p" onclick="calExport()">Add reminders to phone calendar (everyone)</button><button class="item" onclick="exportPlan()">Export full year planner (everyone)</button><button class="item" onclick="exportPersonDlg()">Export a person's year ahead</button><button class="item" onclick="backup()">Back up all data</button>
<label class="item"><button class="item" onclick="$('rf').click()">Restore from backup</button></label><input id="rf" type="file" accept=".json,application/json" hidden onchange="restore(this.files[0])">
<p class="mut">If reminders are late: Settings › Apps › Training Scheduler › Battery › Unrestricted.</p>`}
function hol(v){db.holidays=v.split(/\s+/).filter(s=>/^\d{4}-\d\d-\d\d$/.test(s)).sort();save()}
async function backup(){const txt=JSON.stringify(db),name='scheduler-backup-'+today()+'.json',P=window.Capacitor&&Capacitor.Plugins;try{if(P&&P.Filesystem){const r=await P.Filesystem.writeFile({path:name,data:txt,directory:'CACHE',encoding:'utf8'});await P.Share.share({title:name,files:[r.uri]})}else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt]));a.download=name;a.click()}}catch(e){alert('Backup failed: '+e)}}
function restore(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.people||!d.events)throw 0;if(!confirm('Replace ALL current data with this backup?'))return;db=d;save();go('home')}catch(e){alert('Not a valid backup file.')}};r.readAsText(f)}
function shareApp(){const repo=db.repo||DEFREPO;share('Training Scheduler (Android app). Download the APK here:\nhttps://github.com/'+repo+'/releases/latest')}
let ip=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();ip=e});
async function doInstall(){if(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())return alert('Already installed as an app (version '+APP_VERSION+').');
 if(ip){ip.prompt();return}alert('To install: open this page in Chrome › menu › Add to Home screen. Or install the APK from the GitHub Releases page.')}
async function doUpdate(){const repo=db.repo||DEFREPO,cb='?t='+Date.now(),raw=b=>'https://raw.githubusercontent.com/'+repo+'/'+b+'/';
 // On the GitHub Pages site, update from the same site; in the APK, update from the repo.
 const bases=/github\.io$/.test(location.hostname)?[new URL('./',location.href).href]:[raw('main'),raw('master')];
 let c,a,err;
 try{for(const b of bases){try{[c,a]=await Promise.all(['core.js','app.js'].map(f=>fetch(b+f+cb,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(f+' '+r.status);return r.text()})));break}catch(e){err=e}}
  if(!a)throw err;
  const v=+((a.match(/APP_VERSION\s*=\s*(\d+)/)||[])[1]||0);if(!v||a.length<2000)throw new Error('Not a valid app file');
  if(v<=APP_VERSION)return alert('You are up to date (version '+APP_VERSION+').');
  localStorage.setItem('upd',JSON.stringify({v,files:{'core.js':c,'app.js':a}}));alert('Updated from version '+APP_VERSION+' to '+v+'. Restarting. Your data is kept.');location.reload()}
 catch(e){alert('Could not update: '+e.message+'\nCheck internet. In the APK the repo must be public ('+repo+', branch main). New files can take 1-2 minutes to appear on GitHub.')}}
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js');
render();sync();syncSoon(1500);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSoon(1000)});addEventListener('online',()=>syncSoon(1000));setInterval(()=>{if(!document.hidden)syncNow(false)},3e5);
