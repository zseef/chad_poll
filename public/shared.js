const $=s=>document.querySelector(s);
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const rid=()=>Math.random().toString(36).slice(2,10).padEnd(8,'0');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function fmt(d){const x=new Date(d+'T12:00:00');return{
  mo:x.toLocaleDateString('hu-HU',{month:'short'}).replace('.',''),day:x.getDate(),
  wd:x.toLocaleDateString('hu-HU',{weekday:'short'}).replace('.',''),
  long:x.toLocaleDateString('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'long'})}}
const tile=d=>{const f=fmt(d);return `<div class="tile"><i>${f.mo}</i><b>${f.day}</b><span>${f.wd}</span></div>`};
function note(t,err){$('#note').innerHTML=t?`<div class="msg${err?' err':''}" role="status">${t}</div>`:''}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}

// Szervezői munkamenet: a jelszó csak a böngészőablak bezárásáig marad meg
const adm={get(){try{return JSON.parse(sessionStorage.getItem('adm'))}catch(e){return null}},
  set(v){try{sessionStorage.setItem('adm',JSON.stringify(v))}catch(e){}},
  clear(){try{sessionStorage.removeItem('adm')}catch(e){}}};
async function call(body){
  const a=adm.get();
  const r=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,key:a&&a.key})});
  const j=await r.json();
  if(j&&j.error==='auth'){adm.clear();throw new Error('auth')}
  return j}
const aget=call,apost=call;
const fillLink=p=>location.origin+'/kitoltes.html#'+p.id;

// Belépő képernyő: csak a jelszó ismerője nyithatja meg a szervezői oldalakat
function gate(onOk){
  const g=$('#gate'),m=$('#main');
  g.innerHTML=`<section><h2>Szervezői belépés</h2>
    <p class="mute">Ezt az oldalt csak a kérdőív készítője használhatja. Add meg a Netlify-ban beállított szervezői jelszót (ADMIN_KEY).</p>
    <div class="field"><label for="gkey">Szervezői jelszó</label><input type="password" id="gkey" autocomplete="current-password"></div>
    <p id="gerr" class="mute" role="alert" style="color:var(--bad)"></p>
    <button class="b" id="glogin">Belépés</button></section>`;
  const open=()=>{g.classList.add('hide');m.classList.remove('hide');onOk()};
  const show=msg=>{g.classList.remove('hide');m.classList.add('hide');$('#gerr').textContent=msg||''};
  $('#glogin').onclick=async()=>{
    const key=$('#gkey').value;
    if(!key)return show('Add meg a jelszót.');
    adm.set({key});
    try{await call({action:'check'});open()}
    catch(e){adm.clear();show(e.message==='auth'?'Hibás jelszó, vagy az ADMIN_KEY még nincs beállítva a Netlify-ban.':'Nem érem el a szervert. Az oldalnak a Netlify-on kell futnia, nem a saját gépedről megnyitva.')}};
  $('#gkey').onkeydown=e=>{if(e.key==='Enter')$('#glogin').click()};
  if(adm.get())call({action:'check'}).then(open).catch(()=>show()); else show();
}
