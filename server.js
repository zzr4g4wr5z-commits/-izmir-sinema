'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data.json');
const collector = require('./collector');
function load() { return collector.readStore(); }
const same = (a,b) => String(a) === String(b);
const districtMatches = (a,b) => String(a || '').toLocaleLowerCase('tr-TR') === String(b || '').toLocaleLowerCase('tr-TR');
function priceMatches(p,s) {
  const age=Date.now()-Date.parse(p.checkedAt);
  return p.provider === 'paribu' && age >= -300000 && age <= 24*60*60*1000 && p.verified === true && same(p.cinemaId,s.cinemaId) && same(p.filmId,s.filmId) &&
    p.date === s.date && p.format === s.format && (!p.showtimeId || same(p.showtimeId,s.id)) &&
    (!p.time || p.time === s.time) && typeof p.amount === 'number' && Number.isFinite(p.amount) && p.amount > 0 &&
    p.currency === 'TRY' && /^https?:\/\//i.test(p.sourceUrl || '') && Number.isFinite(Date.parse(p.checkedAt));
}
app.disable('x-powered-by');
app.use((q,r,next) => { r.set('Cache-Control','no-store'); next(); });
app.get('/api/health',(q,r) => { load(); r.json({ok:true,service:'izmir-sinema',version:'fiyat-1',time:new Date().toISOString()}); });
app.get('/api/cinemas',(q,r) => { let d=load().cinemas; if(q.query.district)d=d.filter(x=>districtMatches(x.district,q.query.district)); r.json(d); });
app.get('/api/films',(q,r) => r.json(load().films));
app.get('/api/showtimes',(q,r) => { let d=load().showtimes; for(const k of ['date','filmId','cinemaId'])if(q.query[k])d=d.filter(x=>same(x[k],q.query[k])); r.json(d); });
app.get('/api/prices',(q,r) => { let d=load().prices; for(const k of ['date','filmId','cinemaId'])if(q.query[k])d=d.filter(x=>same(x[k],q.query[k])); r.json(d); });
app.get('/api/compare',(q,r) => {
  const d=load(), cinemas=new Map(d.cinemas.map(x=>[String(x.id),x])), films=new Map(d.films.map(x=>[String(x.id),x]));
  let s=d.showtimes;
  for(const k of ['date','filmId','cinemaId'])if(q.query[k])s=s.filter(x=>same(x[k],q.query[k]));
  s=s.filter(x=>{const c=cinemas.get(String(x.cinemaId)); return c && c.status !== 'Temporarily Closed' && films.has(String(x.filmId)) && (!q.query.district || districtMatches(c.district,q.query.district));});
  r.json(s.map(x=>({...x,cinema:cinemas.get(String(x.cinemaId)),film:films.get(String(x.filmId)),prices:d.prices.filter(p=>priceMatches(p,x) && (!q.query.ticketType || p.ticketType===q.query.ticketType))})).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)));
});
app.get('/api/sources',(q,r)=>{const d=load();r.json({...collector.status(),sources:d.sources||[],updates:d.updates||[]});});
app.get('/api/updates',(q,r)=>r.json(load().updates||[]));
app.post('/api/refresh',(q,r)=>{const state=collector.status();if(!state.running && state.lastAttempt && Date.now()-Date.parse(state.lastAttempt)<30*60*1000)return r.status(429).json({error:'Son kontrolden sonra 30 dakika bekle. Kayıtlı sonuçlar gösteriliyor.'});collector.collect().catch(e=>console.error(e.message));r.status(202).json({accepted:true,...collector.status()});});
app.get('/',(q,r)=>r.type('html').send(HTML));
app.use((err,q,r,next)=>{console.error(err.message); r.status(500).json({error:'Veriler okunamadı. Lütfen daha sonra tekrar deneyin.'});});
const HTML = String.raw`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#122a28"><title>İzmir Sinema · Seansları karşılaştır</title>
<style>
:root{color-scheme:light;--ink:#16312e;--muted:#5e706b;--line:#dbe4dc;--green:#196952}*{box-sizing:border-box}body{margin:0;background:#f4f5ef;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.5}header{background:#122a28;color:#fff;padding:28px 20px 38px}header>div,main{max-width:1000px;margin:auto}.brand{font-weight:700;letter-spacing:.08em;font-size:14px;color:#c3d9ab}h1{font-size:clamp(30px,5vw,48px);line-height:1.13;letter-spacing:-.04em;margin:18px 0 12px}header p{color:#cedad3;margin:0;max-width:560px}main{padding:0 18px 40px}.filters{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px;margin-top:-18px;box-shadow:0 8px 24px #122a2808}.fields{display:grid;grid-template-columns:2fr 1fr 1.1fr;gap:14px}.fields>div,.secondary>div{min-width:0}input[type=date]{appearance:none;-webkit-appearance:none;max-width:100%;min-width:0;line-height:1.2}label{display:block;font-size:13px;font-weight:650;margin-bottom:6px}select,input,button{font:inherit}select,input{width:100%;height:48px;padding:8px 12px;background:#fff;color:var(--ink);border:1px solid #cdd9cf;border-radius:10px;min-width:0}select:focus,input:focus,button:focus-visible,a:focus-visible{outline:3px solid #8ab883;outline-offset:2px}.secondary{display:grid;grid-template-columns:1fr 1fr auto;gap:14px;margin-top:14px;align-items:end}button{border:0;background:var(--green);color:#fff;padding:12px 20px;border-radius:10px;min-height:48px;cursor:pointer;font-weight:600}.notice{padding:12px 0;font-size:13px;color:var(--muted)}.toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:20px 0 12px}h2{font-size:21px;margin:0}.count{color:var(--muted);font-size:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}.card h3{font-size:20px;margin:6px 0 8px;line-height:1.3}.district{font-size:12px;color:var(--green);font-weight:700}.film{font-weight:650;font-size:15px;margin:0 0 4px}.meta{font-size:13px;color:var(--muted)}.times{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.time{background:#f0f4ea;border-radius:8px;padding:6px 10px;font-weight:650}.pricebox{border-top:1px solid var(--line);padding-top:12px}.price{font-size:23px;font-weight:700;color:var(--green)}.missing{font-size:15px;font-weight:600;color:#806039}.source{font-size:13px;display:block;margin-top:6px;color:var(--green)}.note{font-size:12px;color:var(--muted);margin:5px 0}.empty{grid-column:1/-1;padding:28px;background:#fff;border:1px dashed #bdcbbd;border-radius:16px;text-align:center}.empty p{color:var(--muted)}details{margin-top:28px}summary{cursor:pointer;font-weight:650;padding:12px 0}.cinemas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cinema{padding:15px;background:#e9ede3;border-radius:12px}.cinema strong{display:block;font-size:14px}.cinema p{font-size:12px;color:var(--muted);margin:5px 0}footer{margin-top:24px;font-size:12px;color:var(--muted)}a{color:var(--green)}#feedback{margin:0 0 10px;color:#8e3838;font-size:14px} @media(max-width:600px){.fields{grid-template-columns:1fr 1fr}.fields>div:first-child{grid-column:1/-1}.secondary{grid-template-columns:1fr 1fr}.secondary button{grid-column:1/-1}.grid,.cinemas{grid-template-columns:1fr}header{padding-top:24px}.filters{padding:16px}.toolbar{align-items:flex-start;flex-direction:column}.card{padding:18px}h1{max-width:320px}} 
</style></head><body>
<header><div><div class="brand">İZMİR SİNEMA</div><h1>Bir film seç.<br>Seansları karşılaştır.</h1><p>Karşıyaka, Konak, Balçova ve Bornova için kayıtlı seanslar ve kaynaklı bilet fiyatları.</p></div></header>
<main><form class="filters" id="filters"><div class="fields"><div><label for="film">Film</label><select id="film"><option value="">Tüm filmler</option></select></div><div><label for="district">İlçe</label><select id="district"><option value="">Tüm ilçeler</option><option>Karşıyaka</option><option>Konak</option><option>Balçova</option><option>Bornova</option></select></div><div><label for="date">Tarih</label><input id="date" type="date" required></div></div><div class="secondary"><div><label for="ticket">Bilet türü</label><select id="ticket"><option value="full">Tam</option><option value="student">Öğrenci</option></select></div><div><label for="sort">Sıralama</label><select id="sort"><option value="time">Seans saatine göre</option><option value="price">Fiyata göre</option></select></div><button type="submit">Seansları göster</button></div></form>
<div class="notice">Fiyatlar resmî bilet seçimi sayfalarından seans bazında okunur. Son 24 saatte kontrol edilemeyen fiyatlar karşılaştırmaya alınmaz. Nihai tutarı bilet almadan önce kaynakta kontrol et.</div><p id="feedback" role="alert"></p><div class="toolbar"><h2>Seanslar</h2><div class="count" id="count" aria-live="polite">Veriler yükleniyor…</div></div><div id="results" class="grid" aria-live="polite"></div>
<details open><summary>Kaynakların durumu</summary><button id="refreshSources" type="button">Kaynakları yenile</button><p id="sourceStatus" class="meta" aria-live="polite">Kaynaklar kontrol ediliyor…</p><div id="sourceList" class="cinemas"></div></details><details><summary>Takip edilen sinemalar</summary><div class="cinemas" id="cinemas"></div></details><footer>İzmir Sinema · Fiyat sürümü 1 · Fiyatlar koltuk ve kampanya koşullarına göre değişebilir.</footer></main>
<script>
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value == null ? '' : value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?esc(u.href):'';}catch{return '';}};
const stamp=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'Kontrol zamanı yok';};
const money=value=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(value);
let request=0;
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Veriler alınamadı');const d=await r.json();if(!Array.isArray(d))throw new Error('Beklenmeyen veri');return d;}
function empty(title,message){$('results').innerHTML='<div class="empty"><strong>'+esc(title)+'</strong><p>'+esc(message)+'</p></div>';}
async function render(){
 const token=++request;
 $('feedback').textContent='';$('count').textContent='Seanslar yükleniyor…';$('results').innerHTML='';
 const query=new URLSearchParams({date:$('date').value,ticketType:$('ticket').value});
 if($('film').value)query.set('filmId',$('film').value);if($('district').value)query.set('district',$('district').value);
 try{
 const rows=await json('/api/compare?'+query);if(token!==request)return;
 const groups=new Map();for(const s of rows){const key=JSON.stringify([s.cinemaId,s.filmId,s.date,s.format,s.prices.map(p=>p.id)]);if(!groups.has(key))groups.set(key,{...s,times:[]});groups.get(key).times.push(s.time);}
 const min=g=>g.prices.length?Math.min(...g.prices.map(p=>p.amount)):Infinity;
 const cards=[...groups.values()];cards.forEach(g=>g.times.sort());cards.sort((a,b)=>$('sort').value==='price'?(min(a)-min(b)||a.times[0].localeCompare(b.times[0])):a.times[0].localeCompare(b.times[0]));
 $('count').textContent=rows.length+' seans · '+new Set(rows.map(s=>s.cinemaId)).size+' sinema · '+rows.filter(s=>s.prices.length).length+' fiyatlı seans';
 if(!rows.length){empty('Bu seçim için kayıtlı seans yok.','Filmi veya ilçeyi değiştirebilirsin. Seans bulunmaması, sinemada gösterim olmadığı anlamına gelmez.');return;}
 $('results').innerHTML=cards.map(g=>{
 const prices=g.prices.map(p=>'<div class="pricebox"><div class="price">'+money(p.amount)+'</div><div class="meta">'+($('ticket').value==='student'?'Öğrenci':'Tam')+' · Resmî seans fiyatı</div><a class="source" target="_blank" rel="noopener noreferrer" href="'+link(p.sourceUrl)+'">Fiyat kaynağını aç ↗</a><p class="note">Fiyat kontrolü: '+esc(stamp(p.checkedAt))+'</p>'+(p.note?'<p class="note">'+esc(p.note)+'</p>':'')+'</div>').join('');
 const source=link(g.sourceUrl||g.cinema.sourceUrl);
 return '<article class="card"><span class="district">'+esc(g.cinema.district)+'</span><h3>'+esc(g.cinema.name)+'</h3><p class="film">'+esc(g.film.title)+'</p><div class="meta">'+esc(g.date)+' · '+esc(g.format)+'</div><div class="times">'+g.times.map(t=>'<span class="time">'+esc(t)+'</span>').join('')+'</div>'+(prices||'<div class="pricebox"><div class="missing">Fiyat henüz doğrulanmadı</div><p class="note">Bu seans için seçilen bilet türünün fiyatı son 24 saatte kaynaktan okunamadı.</p></div>')+'<p class="note">Seans kaydındaki kontrol zamanı: '+esc(stamp(g.sourceCheckedAt))+'</p>'+(source?'<a class="source" target="_blank" rel="noopener noreferrer" href="'+source+'">Sinema sayfasını aç ↗</a>':'')+'</article>';
 }).join('');
 }catch(e){if(token!==request)return;$('count').textContent='';empty('Veriler yüklenemedi.','Seansları göster düğmesine dokunarak tekrar deneyebilirsin.');}
}
async function init(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=t=>parts.find(p=>p.type===t).value;$('date').value=get('year')+'-'+get('month')+'-'+get('day');
 try{const [films,cinemas]=await Promise.all([json('/api/films'),json('/api/cinemas')]);
 $('film').innerHTML='<option value="">Tüm filmler</option>';for(const f of films){const o=document.createElement('option');o.value=f.id;o.textContent=f.title;$('film').append(o);}
 $('cinemas').innerHTML=cinemas.map(c=>{const u=link(c.sourceUrl);return '<div class="cinema"><strong>'+esc(c.name)+'</strong><p>'+esc(c.district)+' · '+esc(c.address)+'</p>'+(c.status==='Temporarily Closed'?'<p>Kayıtta geçici kapalı olarak işaretli.</p>':'')+(u?'<a class="source" target="_blank" rel="noopener noreferrer" href="'+u+'">Kaynak sayfası ↗</a>':'<p>Kaynak bağlantısı henüz eklenmedi.</p>')+'</div>';}).join('');
 }catch(e){$('feedback').textContent='Film ve sinema listeleri alınamadı. Sayfayı yenileyerek tekrar dene.';}
 await render();
}
$('filters').addEventListener('submit',e=>{e.preventDefault();render();});
for(const id of ['film','district','date','ticket','sort'])$(id).addEventListener('change',()=>{if($('date').value)render();});
let wasRunning=false;
async function sourceStatus(){
 try{const r=await fetch('/api/sources',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();
 $('refreshSources').disabled=data.running;
 $('sourceStatus').textContent=data.running?'Resmî sayfalar taranıyor. Bu işlem birkaç dakika sürebilir.':(data.updates.length?'Son tarama: '+stamp(data.updates[0].at)+' · '+data.updates[0].priceCount+' fiyat okundu.':'İlk tarama henüz tamamlanmadı.');
 const names={ok:'Tamamlandı',partial:'Kısmen tamamlandı',no_prices:'Seanslar okundu; fiyatlar okunamadı',error:'Kaynağa erişilemedi'};
 $('sourceList').innerHTML=data.sources.map(s=>'<div class="cinema"><strong>'+esc(s.name)+'</strong><p>'+esc(names[s.status]||s.status)+' · '+s.showtimeCount+' seans · '+s.priceCount+' fiyat</p><p>'+esc(stamp(s.attemptedAt))+'</p>'+(s.error?'<p>'+esc(s.error)+'</p>':'')+'</div>').join('')+'<div class="cinema"><strong>Agora, Renk, Karaca ve Cinehouse</strong><p>Bu sinemalar için otomatik fiyat bağlantısı henüz eklenmedi.</p></div>';
 if(wasRunning&&!data.running){const films=await json('/api/films');const selected=$('film').value;$('film').innerHTML='<option value="">Tüm filmler</option>';for(const f of films){const o=document.createElement('option');o.value=f.id;o.textContent=f.title;$('film').append(o);}$('film').value=selected;await render();}
 wasRunning=data.running;
 }catch{$('sourceStatus').textContent='Kaynak durumu alınamadı. Sayfayı yenileyebilirsin.';}
}
$('refreshSources').addEventListener('click',async()=>{try{const r=await fetch('/api/refresh',{method:'POST'});const data=await r.json();if(!r.ok){$('sourceStatus').textContent=data.error||'Tarama başlatılamadı.';return;}await sourceStatus();}catch{$('sourceStatus').textContent='Tarama başlatılamadı.';}});
init();sourceStatus();setInterval(sourceStatus,15000);
</script></body></html>`;
if (require.main === module) app.listen(PORT,()=>{console.log('İzmir Sinema running on '+PORT);collector.startScheduler();});
module.exports = {app, priceMatches};
