const APP_VERSION=6,COL={CPR:'#ff6b6b',BLS:'#4dabff',MED:'#c792ff',HEP:'#ffc72c'},DEFREPO='m9r1u5/Training-Scheduler',MODS={CPR:'CPR',BLS:'BLS',MED:'Medicals',HEP:'HEP B'};

// Styles shipped inside app.js so "Update" delivers visual fixes without a new APK.
(()=>{const s=document.createElement('style');s.textContent=`
html,body{overflow-x:hidden;max-width:100%}main{max-width:100%}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:1;width:32px;height:32px}
dialog{padding:16px;box-sizing:border-box;max-width:92vw}dialog input,dialog select,dialog textarea{width:100%;max-width:100%}
.row>*{min-width:0}.cal{grid-template-columns:repeat(7,minmax(0,1fr))}.cal div{min-height:54px;padding:6px 0}
.dots i{font-style:normal;font-size:16px;line-height:1;margin:0 1px}header button{min-width:0}`;document.head.appendChild(s)})();
const HOL=['2026-01-01','2026-03-21','2026-04-03','2026-04-06','2026-04-27','2026-05-01','2026-06-16','2026-08-10','2026-09-24','2026-12-16','2026-12-25','2026-12-26',
'2027-01-01','2027-03-22','2027-03-26','2027-03-29','2027-04-27','2027-05-01','2027-06-16','2027-08-09','2027-09-24','2027-12-16','2027-12-25','2027-12-27'];
const K='sched_db_v1';let db=JSON.parse(localStorage.getItem(K)||'null')||{seq:1,people:[],events:[],holidays:HOL,country:'South Africa (edit list below)',slot:'09:00-10:00',repo:''};
const save=()=>{localStorage.setItem(K,JSON.stringify(db));sync()};
const $=id=>document.getElementById(id),C=Core,LN=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
const nice=s=>C.parse(s).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>C.iso(new Date());let view='home',tab='CPR',pid=null,cm=null;
function go(v,a){view=v;if(MODS[v]){tab=v;view='list'}if(a)pid=a;render()}
function render(){
 $('nav').innerHTML=Object.entries(MODS).map(([k,v])=>`<button class="${tab===k&&view==='list'?'on':''}" onclick="go('${k}')">${v}</button>`).join('');
 const m=$('m');
 if(view==='home')m.innerHTML=`<h2>Training Scheduler</h2><p class="mut">Version ${APP_VERSION} · pick a tab below.</p>`+Object.entries(MODS).map(([k,v])=>{const n=db.people.filter(p=>p.mods.includes(k)).length;return `<button class="item p" onclick="go('${k}')">${v} · ${n} people</button>`}).join('')+`<div class="card"><b>Next 7 days</b>${upcoming()}</div>`;
 if(view==='list'){const ps=db.people.filter(p=>p.mods.includes(tab));m.innerHTML=`<h2>${MODS[tab]}</h2>`+(ps.map(p=>`<button class="item" onclick="go('person','${p.id}')">${esc(p.name)} ${esc(p.surname)}${p.paused?' (paused)':''}<br><span class="mut">${nextOf(p,tab)}</span></button>`).join('')||'<p class="mut">Nobody yet.</p>')+`<button class="item p" onclick="addDlg()">+ Add person</button>`}
 if(view==='person')person(m);if(view==='set')settings(m);
}
const nextOf=(p,mod)=>{const e=evs(p.id,mod).find(e=>!e.done&&e.date>=today());return e?'Next: '+nice(e.date):'Nothing scheduled'};
const evs=(id,mod)=>db.events.filter(e=>e.pid===id&&(!mod||e.mod===mod)).sort((a,b)=>a.date.localeCompare(b.date));
function upcoming(){const t=today(),e=C.addDays(t,7);const l=db.events.filter(x=>!x.done&&x.date>=t&&x.date<=e&&!pp(x.pid).paused).sort((a,b)=>a.date.localeCompare(b.date));return l.map(x=>`<div>${nice(x.date)} · ${esc(pp(x.pid).name)} ${esc(pp(x.pid).surname)} · ${x.label}</div>`).join('')||'<div class="mut">Nothing due.</div>'}
const pp=id=>db.people.find(p=>p.id===id);
function dlg(html){const d=$('dlg');d.innerHTML=html;d.showModal();return d}
const close=()=>$('dlg').close();
function addDlg(){dlg(`<h3>Add to ${MODS[tab]}</h3><input id="fn" placeholder="Name"><br><br><input id="sn" placeholder="Surname"><br><br><label>First date (tap the calendar icon)</label><input id="fd" type="date" value="${today()}"><div class="row"><button onclick="close()">Cancel</button><button class="p" onclick="addPerson()">Save</button></div>`)}
function addPerson(){const n=$('fn').value.trim(),s=$('sn').value.trim(),d=$('fd').value;if(!n||!s||!d)return alert('Enter name, surname and a first date.');
 let p=db.people.find(x=>x.name.toLowerCase()===n.toLowerCase()&&x.surname.toLowerCase()===s.toLowerCase());const isNew=!p;
 if(isNew)p={id:'p'+db.seq++,name:n,surname:s,mods:[],paused:false};
 if(p.mods.includes(tab))return alert('Already on '+MODS[tab]+'.');
 if(!put(p,tab,d,false))return;if(isNew)db.people.push(p);p.mods.push(tab);save();close();view='list';render()}
// Create events for one module from an anchor date; blocks (returns false) on a CPR/BLS clash.
function put(p,mod,anchor,keepFrom,list=db.events){const g=C.generate(mod,anchor,db.holidays).map(e=>({id:'e'+db.seq++,pid:p.id,mod,date:e.date,label:e.label,slot:db.slot,done:null}));
 const base=list.filter(e=>e.pid===p.id);if(g.some(a=>base.some(b=>C.clash(a,b)))){alert('Conflict: already scheduled for something else');return false}
 db.events.push(...g);return true}
function reschedule(eid,date,why){const e=db.events.find(x=>x.id===eid),p=pp(e.pid),from=e.date,lbl=e.label,old=db.events.slice();const lg=()=>{(db.log=db.log||[]).push({pid:p.id,label:lbl,from,to:date,why:why||'',ts:new Date().toISOString()})};
 if(e.mod==='HEP'&&e.label!=='HEP B STAT'){const nd=C.nextWorking(date,db.holidays);e.date=nd;lg();save();return true}
 const keep=db.events.filter(x=>!(x.pid===e.pid&&x.mod===e.mod&&!x.done&&x.date>=e.date));db.events=keep;
 if(!put(p,e.mod,date)){db.events=old;return false}lg();save();return true}
function person(m){const p=pp(pid),all=evs(p.id);cm=cm||today().slice(0,7);const [y,mo]=cm.split('-').map(Number),first=new Date(y,mo-1,1),off=(first.getDay()+6)%7,dim=new Date(y,mo,0).getDate();
 let cells='MTWTFSS'.split('').map(c=>`<div class="mut">${c}</div>`).join('')+'<div></div>'.repeat(off);
 for(let d=1;d<=dim;d++){const s=cm+'-'+String(d).padStart(2,'0'),e=all.filter(x=>x.date===s);cells+=`<div>${d}<br><span class="dots">${e.map(x=>`<i style="color:${COL[x.mod]}">${x.done?'✔':'●'}</i>`).join('')||'&nbsp;'}</span></div>`}
 const shift=n=>{const d=new Date(y,mo-1+n,1);cm=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');render()};window.shift=shift;
 m.innerHTML=`<h2>${esc(p.name)} ${esc(p.surname)}</h2>${p.paused?'<p class="mut">PAUSED – no reminders or new events.</p>':''}
 <div class="row"><button onclick="shift(-1)">◀</button><b style="text-align:center;padding-top:12px">${first.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</b><button onclick="shift(1)">▶</button></div><div class="cal">${cells}</div>
 <p>${Object.keys(MODS).map(k=>`<span style="color:${COL[k]};font-weight:800;margin-right:12px">● ${MODS[k]}</span>`).join('')}</p><p class="mut">● scheduled · ✔ completed</p>`+all.map(e=>`<div class="card" style="border-left:10px solid ${COL[e.mod]}"><b>${e.label}</b> · ${nice(e.date)}${!e.done&&e.date<today()?' <b style="color:var(--bad)">⚠ OVERDUE</b>':''}<br>Slot: ${esc(e.slot)}${e.done?`<br><span style="color:var(--ok)">✔ Completed ${new Date(e.done.ts).toLocaleString('en-GB')}</span><br><img src="${e.done.sig}" style="width:100%;background:#fff;border-radius:8px">`:`<div class="row"><button onclick="editEv('${e.id}')">Missed / reschedule</button><button class="g" ${e.date===today()?'':'disabled style="opacity:.35"'} onclick="sign('${e.id}')">Sign off</button></div>${e.date===today()?'':'<div class="mut">Sign-off opens on '+nice(e.date)+'</div>'}`}<div class="row"><button onclick="slotEv('${e.id}')">Time slot</button><button onclick="share(msgOne('${e.id}'))">Message</button></div></div>`).join('')
 +`<div class="row"><button class="p" onclick="share(msgYear('${p.id}'))">Year ahead message</button></div>`+((db.log||[]).filter(l=>l.pid===p.id).length?'<div class="card"><b>Reschedule history</b>'+db.log.filter(l=>l.pid===p.id).map(l=>`<div class="mut">${l.label}: ${nice(l.from)} → ${nice(l.to)} (${esc(l.why)})</div>`).join('')+'</div>':'')
 +Object.entries(MODS).filter(([k])=>!p.mods.includes(k)).map(([k,v])=>`<button class="item" onclick="tab='${k}';addTo('${p.id}')">+ Put on ${v}</button>`).join('')
 +`<div class="row">${p.paused?`<button class="g" onclick="resume('${p.id}')">Resume</button>`:`<button class="r" onclick="pause('${p.id}')">Pause</button>`}<button class="r" onclick="delP('${p.id}')">Delete</button></div>`}
function addTo(id){dlg(`<h3>First date for ${MODS[tab]}</h3><input id="fd" type="date" value="${today()}"><div class="row"><button onclick="close()">Cancel</button><button class="p" onclick="addMod('${id}')">Save</button></div>`)}
function addMod(id){const p=pp(id),d=$('fd').value;if(!d||!put(p,tab,d))return;p.mods.push(tab);save();close();render()}
function editEv(id){const e=db.events.find(x=>x.id===id);dlg(`<h3>New date for ${e.label}</h3><p class="mut">Later events of this type are re-planned from the new date at the normal frequency, 10 years ahead.</p><select id="rs" style="width:100%"><option>Did not attend</option><option>On leave</option><option>Ill</option><option>Other</option></select><br><br><input id="nd" type="date" value="${e.date}"><div class="row"><button onclick="close()">Cancel</button><button class="p" onclick="if($('nd').value&&reschedule('${id}',$('nd').value,$('rs').value)){close();render()}">Save</button></div>`)}
function slotEv(id){const e=db.events.find(x=>x.id===id);dlg(`<h3>Time slot</h3><input id="sl" value="${esc(e.slot)}"><div class="row"><button onclick="close()">Cancel</button><button class="p" onclick="db.events.find(x=>x.id==='${id}').slot=$('sl').value;save();close();render()">Save</button></div>`)}
function pause(id){if(!confirm('Pause? Future events are removed. History and signatures are kept.'))return;const p=pp(id);p.paused=true;db.events=db.events.filter(e=>!(e.pid===id&&!e.done&&e.date>=today()));save();render()}
function resume(id){dlg(`<h3>Resume from</h3><input id="fd" type="date" value="${today()}"><div class="row"><button onclick="close()">Cancel</button><button class="p" onclick="doResume('${id}')">Resume</button></div>`)}
function doResume(id){const p=pp(id),d=$('fd').value;if(!d)return;p.paused=false;for(const mo of p.mods)if(!put(p,mo,d)){p.paused=true;return}save();close();render()}
function delP(id){if(!confirm('Delete this person AND all their signed records?'))return;db.people=db.people.filter(p=>p.id!==id);db.events=db.events.filter(e=>e.pid!==id);save();go('home')}
// Signature
function sign(id){const ev=db.events.find(v=>v.id===id);if(!ev||ev.date!==today())return alert('Sign-off is only possible on the day of the training or injection ('+(ev?nice(ev.date):'')+').');const d=dlg(`<h3>Candidate signs here</h3><canvas id="cv" width="600" height="260"></canvas><div class="row"><button onclick="close()">Cancel</button><button onclick="clr()">Clear</button><button class="g" onclick="saveSig('${id}')">Save</button></div>`);
 const c=$('cv'),x=c.getContext('2d');x.lineWidth=4;x.lineCap='round';window.inked=false;let dn=false;const pt=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.onpointerdown=e=>{dn=true;const[a,b]=pt(e);x.beginPath();x.moveTo(a,b);c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!dn)return;const[a,b]=pt(e);x.lineTo(a,b);x.stroke();window.inked=true};c.onpointerup=()=>dn=false;window.clr=()=>{x.clearRect(0,0,c.width,c.height);window.inked=false}}
function saveSig(id){const ev=db.events.find(v=>v.id===id);if(!ev||ev.date!==today()){close();return alert('Sign-off is only possible on the day of the event.')}if(!window.inked)return alert('No signature – the event cannot be marked as completed.');const c=$('cv'),o=document.createElement('canvas');o.width=600;o.height=300;const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,300);x.drawImage(c,0,0);
 const ts=new Date(),e=db.events.find(v=>v.id===id);x.fillStyle='#000';x.font='20px sans-serif';x.fillText(pp(e.pid).name+' '+pp(e.pid).surname+' · '+e.label+' · '+ts.toLocaleString('en-GB'),10,285);
 e.done={sig:o.toDataURL('image/png'),ts:ts.toISOString()};save();close();render()}
// Messages
const first=p=>p.name;
const msgOne=id=>{const e=db.events.find(x=>x.id===id),p=pp(e.pid);return `Hi ${first(p)}, you are scheduled for ${e.label} on ${nice(e.date)}, time slot ${e.slot}. Please confirm.`};
const msgYear=id=>{const p=pp(id);return `Hi ${first(p)}, your schedule for the year ahead:\n`+evs(id).filter(e=>!e.done&&e.date>=today()).map(e=>`• ${nice(e.date)} – ${e.label} (${e.slot})`).join('\n')};
async function share(text){const S=window.Capacitor&&Capacitor.Plugins.Share;try{if(S)await S.share({text,dialogTitle:'Send message'});else if(navigator.share)await navigator.share({text});else{await navigator.clipboard.writeText(text);alert('Copied to clipboard.')}}catch(e){}}
// Notifications: day before (previous working day) 09:00. Everything is rebuilt on each save.
async function sync(){const L=LN();if(!L)return;try{await L.registerActionTypes({types:[{id:'REMIND',actions:[{id:'accept',title:'Accept'},{id:'snooze',title:'Snooze 2h'}]}]});
 const pend=await L.getPending();if(pend.notifications.length)await L.cancel({notifications:pend.notifications.filter(n=>n.id<1e9).map(n=>({id:n.id}))});
 const now=Date.now(),list=[];for(const e of db.events){const p=pp(e.pid);if(e.done||!p||p.paused)continue;const r=C.reminderDay(e.date,db.holidays),at=new Date(r+'T09:00:00');if(at<=now)continue;
  list.push({id:Number(e.id.slice(1)),title:'Tomorrow: '+e.label,body:`${p.name} ${p.surname} · ${nice(e.date)} · ${e.slot}`,schedule:{at,allowWhileIdle:true},actionTypeId:'REMIND',extra:{}});}
 list.sort((a,b)=>a.schedule.at-b.schedule.at);if(list.length)await L.schedule({notifications:list.slice(0,400)})}catch(e){console.log(e)}}
async function perms(){const L=LN();if(!L)return alert('Notifications only work in the installed Android app.');const r=await L.requestPermissions();let ex='n/a';try{ex=(await L.checkExactNotificationSetting()).exact_alarm}catch(e){}
 if(ex!=='granted'&&confirm('Exact alarms are off. Open the setting? Turn on "Alarms & reminders" for this app.'))await L.changeExactNotificationSetting();
 alert('Notifications: '+r.display+'\nExact alarms: '+ex);sync()}
(()=>{const L=LN();if(L)L.addListener('localNotificationActionPerformed',async a=>{if(a.actionId==='snooze')await L.schedule({notifications:[{id:1e9+Math.floor(Math.random()*1e8),title:a.notification.title,body:a.notification.body,schedule:{at:new Date(Date.now()+72e5),allowWhileIdle:true},actionTypeId:'REMIND'}]})})})();
// Settings, backup, update
function settings(m){m.innerHTML=`<h2>Settings</h2><div class="card"><b>Default time slot</b><input id="s1" value="${esc(db.slot)}" onchange="db.slot=this.value;save()"></div>
<div class="card"><b>Country / public holidays</b> (one date per line, YYYY-MM-DD)<input id="s0" value="${esc(db.country)}" onchange="db.country=this.value;save()"><br><br><textarea id="s2" rows="8" style="width:100%" onchange="hol(this.value)">${db.holidays.join('\n')}</textarea><p class="mut">Changing holidays does not move existing events; change a date to re-plan.</p></div>
<div class="card"><b>GitHub repo for updates</b> (owner/name)<input id="s3" value="${esc(db.repo||DEFREPO)}" onchange="db.repo=this.value;save()"></div>
<button class="item p" onclick="perms()">Allow notifications and exact alarms</button><button class="item" onclick="backup()">Back up all data</button>
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
render();sync();
