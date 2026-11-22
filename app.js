const KAT={masuk:['Penjualan','Terima piutang','Pemasukan lain'],keluar:['Bahan baku','Bayar utang','Operasional','Upah','Prive (uang pribadi)','Lainnya']};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const rp=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const esc=s=>{const d=document.createElement('div');d.textContent=s;return d.innerHTML};
let jenis='masuk';

/* Penyimpanan: IndexedDB di perangkat (lokal, bisa offline) */
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('kasumkm',2);
 r.onupgradeneeded=()=>{const d=r.result;['tx','utang'].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:'id',autoIncrement:true})})};
 r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const run=async(mode,f,st='tx')=>{const db=await open();return new Promise((res,rej)=>{
 const t=db.transaction(st,mode),q=f(t.objectStore(st));
 t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)})};
const all=()=>run('readonly',s=>s.getAll());
const add=o=>run('readwrite',s=>s.add(o));
const del=id=>run('readwrite',s=>s.delete(id));

const sum=(a,j,f=()=>true)=>a.filter(x=>x.jenis===j&&f(x)).reduce((s,x)=>s+x.nom,0);
const prive=x=>x.kat.startsWith('Prive');
const fillKat=()=>{$('#kat').innerHTML=KAT[jenis].map(k=>`<option>${esc(k)}</option>`).join('')};

async function render(){
 const a=await all(),t=today();
 $('#hm').textContent=rp(sum(a,'masuk',x=>x.tgl===t));
 $('#hk').textContent=rp(sum(a,'keluar',x=>x.tgl===t&&!prive(x)));
 const L=[...a].sort((x,y)=>y.tgl.localeCompare(x.tgl)||y.id-x.id).slice(0,100);
 $('#list').innerHTML=L.length?L.map(x=>`<li><div><b>${esc(x.kat)}</b><small>${x.tgl}${x.cat?' - '+esc(x.cat):''}</small></div><span class="${x.jenis}">${x.jenis==='masuk'?'+':'-'}${rp(x.nom)}</span><button data-del="${x.id}" aria-label="Hapus catatan">✕</button></li>`).join(''):'<p class="kosong">Belum ada catatan. Mulai dari tab Catat.</p>';
 const M=a.filter(x=>x.tgl.startsWith($('#bln').value));
 const rows=(j,f)=>{const o={};M.filter(x=>x.jenis===j&&f(x)).forEach(x=>o[x.kat]=(o[x.kat]||0)+x.nom);
  return Object.entries(o).map(([n,v])=>`<tr><td>${esc(n)}</td><td>${rp(v)}</td></tr>`).join('')||'<tr><td colspan="2">-</td></tr>'};
 const m=sum(M,'masuk'),k=sum(M,'keluar',x=>!prive(x)),p=sum(M,'keluar',prive),laba=m-k;
 $('#lap').innerHTML=`<table><tr><th colspan="2">Pemasukan</th></tr>${rows('masuk',()=>true)}<tr class="tot"><td>Total pemasukan</td><td>${rp(m)}</td></tr>
 <tr><th colspan="2">Pengeluaran usaha</th></tr>${rows('keluar',x=>!prive(x))}<tr class="tot"><td>Total pengeluaran</td><td>${rp(k)}</td></tr>
 <tr class="tot"><td>${laba>=0?'Laba':'Rugi'} bulan ini</td><td class="${laba>=0?'masuk':'keluar'}">${rp(Math.abs(laba))}</td></tr>
 <tr><td>Uang pribadi yang diambil</td><td>${rp(p)}</td></tr></table>`;

 const lc=lastCad(),hr=lc?Math.floor((new Date(t)-new Date(lc))/864e5):null;
 $('#lastcad').textContent=lc?'Terakhir dicadangkan: '+lc:'Belum pernah dicadangkan.';
 const ing=$('#ingat');ing.hidden=!(a.length&&(hr===null||hr>=7));
 ing.textContent=hr===null?'Data belum pernah dicadangkan. Buka tab Laporan, lalu kirim cadangan.':'Sudah '+hr+' hari sejak cadangan terakhir. Buka tab Laporan untuk mencadangkan.';
}
const safe=async f=>{try{await f()}catch(e){$('#msg').style.color='var(--out)';$('#msg').textContent='Penyimpanan tidak tersedia. Jangan pakai mode penyamaran.'}};

$$('#catat .seg button').forEach(b=>b.onclick=()=>{jenis=b.dataset.j;$$('#catat .seg button').forEach(x=>x.classList.toggle('on',x===b));fillKat()});
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.classList.toggle('on',x===b));$$('.tab').forEach(s=>s.classList.toggle('on',s.id===b.dataset.t));$('#msg').textContent='';$('#umsg').textContent=''});
$('#simpan').onclick=()=>safe(async()=>{
 const nom=Math.round(+$('#nom').value),tgl=$('#tgl').value;
 if(!(nom>0)||!tgl){$('#msg').style.color='var(--out)';$('#msg').textContent='Isi jumlah dan tanggal dulu.';return}
 await add({jenis,nom,kat:$('#kat').value,cat:$('#cat').value.trim(),tgl});
 $('#nom').value='';$('#cat').value='';$('#msg').style.color='var(--in)';$('#msg').textContent='Tersimpan.';await render()});
$('#list').onclick=e=>{const id=e.target.dataset.del;if(id&&confirm('Hapus catatan ini?'))safe(async()=>{await del(+id);await render()})};
$('#bln').onchange=()=>safe(render);
/* Cadangan & pemulihan (berbasis berkas, tanpa server) */
const lastCad=()=>{try{return localStorage.getItem('lastcad')}catch{return null}};
const markCad=()=>{try{localStorage.setItem('lastcad',today())}catch{}};
const toCsv=(a,u)=>{const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
 const rows=[...a.map(x=>[x.tgl,x.jenis,x.kat,x.cat,x.nom,'']),...u.map(x=>[x.tgl,x.tipe,x.nama,x.cat,x.nom,x.lunas?'lunas':'belum'])];
 return ['tanggal,jenis,kategori,catatan,nominal,status',...rows.map(r=>r.map(q).join(','))].join('\n')};
const fname=()=>'kas-umkm-'+today()+'.csv';
function parseCsv(t){const r=[];let row=[],f='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
  else if(c=='"')q=true;
  else if(c==','){row.push(f);f=''}
  else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);r.push(row);row=[];f=''}
  else f+=c}
 if(f||row.length){row.push(f);r.push(row)}return r}
const info=(t,ok=true,el='#msg')=>{$(el).style.color=ok?'var(--in)':'var(--out)';$(el).textContent=t};
function unduh(csv){const l=document.createElement('a');l.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv'}));l.download=fname();l.click()}

$('#csv').onclick=()=>safe(async()=>{unduh(toCsv(await all(),await allU()));markCad();await render()});
$('#bagi').onclick=()=>safe(async()=>{
 const csv=toCsv(await all(),await allU()),file=new File([csv],fname(),{type:'text/csv'});
 if(navigator.canShare&&navigator.canShare({files:[file]})){
  try{await navigator.share({files:[file],title:'Cadangan Kas UMKM'})}catch(e){if(e.name==='AbortError')return;throw e}
 }else unduh(csv);
 markCad();await render()});
$('#imp').onclick=()=>$('#file').click();
$('#file').onchange=e=>safe(async()=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;
 const rows=parseCsv((await f.text()).replace(/^\uFEFF/,'')).slice(1);
 const key=x=>[x.tgl,x.jenis||x.tipe,x.kat||x.nama,x.cat,x.nom,x.lunas?1:0].join('|'),have={};
 const cnt=x=>have[key(x)]=(have[key(x)]||0)+1;
 (await all()).forEach(cnt);(await allU()).forEach(cnt);
 const bt=[],bu=[];let lewat=0;
 for(const [tgl,j,kat,cat,nm,st] of rows){
  const nom=Math.round(+nm),isU=j==='piutang'||j==='utang';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(tgl||'')||!kat||!(nom>0)||(!isU&&j!=='masuk'&&j!=='keluar')){lewat++;continue}
  const o=isU?{tgl,tipe:j,nama:kat,cat:cat||'',nom,lunas:st==='lunas'}:{tgl,jenis:j,kat,cat:cat||'',nom};
  if(have[key(o)]>0){have[key(o)]--;lewat++;continue}
  (isU?bu:bt).push(o)}
 if(bt.length)await run('readwrite',s=>{bt.forEach(o=>s.add(o))});
 if(bu.length)await U('readwrite',s=>{bu.forEach(o=>s.add(o))});
 $('#bln').value=today().slice(0,7);await render();await renderU();
 const n=bt.length+bu.length;
 info(`${n} catatan dipulihkan, ${lewat} dilewati (sudah ada atau tidak valid).`,n>0||!lewat)});

/* Utang-piutang */
let tipeU='piutang';
const U=(m,f)=>run(m,f,'utang'),allU=()=>U('readonly',s=>s.getAll());
async function lunasi(id){const db=await open();return new Promise((res,rej)=>{
 const t=db.transaction(['tx','utang'],'readwrite'),us=t.objectStore('utang'),g=us.get(id);
 g.onsuccess=()=>{const u=g.result;if(!u||u.lunas)return;u.lunas=true;u.tglLunas=today();us.put(u);
  t.objectStore('tx').add({jenis:u.tipe==='piutang'?'masuk':'keluar',nom:u.nom,kat:u.tipe==='piutang'?'Terima piutang':'Bayar utang',cat:u.nama,tgl:today()})};
 t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function renderU(){
 const u=(await allU()).filter(x=>!x.lunas).sort((x,y)=>x.tgl.localeCompare(y.tgl));
 const tot=t=>u.filter(x=>x.tipe===t).reduce((s,x)=>s+x.nom,0);
 $('#tp').textContent=rp(tot('piutang'));$('#tu').textContent=rp(tot('utang'));
 $('#ulist').innerHTML=u.length?u.map(x=>`<li><div><b>${esc(x.nama)}</b><small>${x.tipe==='piutang'?'Belum bayar ke saya':'Saya belum bayar'} - sejak ${x.tgl}${x.cat?' - '+esc(x.cat):''}</small></div><span class="${x.tipe==='piutang'?'masuk':'keluar'}">${rp(x.nom)}</span><div class="aksi"><button data-lunas="${x.id}">Lunas</button><button data-udel="${x.id}" aria-label="Hapus">✕</button></div></li>`).join(''):'<p class="kosong">Tidak ada utang atau piutang yang belum lunas.</p>'}
$$('#utipe button').forEach(b=>b.onclick=()=>{tipeU=b.dataset.t;$$('#utipe button').forEach(x=>x.classList.toggle('on',x===b))});
$('#usimpan').onclick=()=>safe(async()=>{
 const nama=$('#unama').value.trim(),nom=Math.round(+$('#unom').value),tgl=$('#utgl').value;
 if(!nama||!(nom>0)||!tgl){info('Isi nama, jumlah, dan tanggal dulu.',false,'#umsg');return}
 await U('readwrite',s=>s.add({tipe:tipeU,nama,nom,tgl,cat:$('#ucat').value.trim(),lunas:false}));
 ['#unama','#unom','#ucat'].forEach(i=>$(i).value='');info('Tersimpan.',true,'#umsg');await renderU()});
$('#ulist').onclick=e=>{const d=e.target.dataset;
 if(d.lunas&&confirm('Tandai lunas? Uangnya otomatis dicatat di catatan hari ini.'))safe(async()=>{await lunasi(+d.lunas);await renderU();await render()});
 if(d.udel&&confirm('Hapus catatan ini?'))safe(async()=>{await U('readwrite',s=>s.delete(+d.udel));await renderU()})};

/* Kalkulator HPP */
const num=id=>Math.max(0,+$(id).value||0);
function hitung(){const bahan=num('#hb'),lain=num('#hl'),n=num('#hj'),mg=num('#hu'),jual=num('#hs'),o=$('#hasil');
 if(!(n>0)||!(bahan+lain>0)){o.innerHTML='<p class="kosong">Isi biaya dan jumlah produk untuk melihat hasilnya.</p>';return}
 const hpp=(bahan+lain)/n,saran=Math.ceil(hpp*(1+mg/100)/500)*500;
 o.innerHTML=`<table><tr><td>Modal per produk (HPP)</td><td>${rp(hpp)}</td></tr><tr><td>Harga jual yang disarankan</td><td>${rp(saran)}</td></tr><tr><td>Untung per produk</td><td>${rp(saran-hpp)}</td></tr>${jual?`<tr class="tot"><td>Harga jual Anda sekarang</td><td>${rp(jual)}</td></tr><tr><td>${jual>=hpp?'Untung':'Rugi'} per produk</td><td class="${jual>=hpp?'masuk':'keluar'}">${rp(Math.abs(jual-hpp))} (${Math.round(Math.abs(jual-hpp)/hpp*100)}%)</td></tr>`:''}</table>`}
['#hb','#hl','#hj','#hu','#hs'].forEach(i=>$(i).oninput=hitung);

$('#hari').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
$('#tgl').value=today();$('#bln').value=today().slice(0,7);fillKat();safe(render);$('#utgl').value=today();safe(renderU);hitung();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
