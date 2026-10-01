const express=require('express');
const fs=require('fs'); const path=require('path');
const app=express(); const PORT=process.env.PORT||3000;
const DATA=path.join(__dirname,'data.json');
const empty={cinemas:[],films:[],showtimes:[],prices:[]};
function load(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch(e){fs.writeFileSync(DATA,JSON.stringify(empty,null,2));return empty}}
app.get('/api/health',(q,r)=>r.json({ok:true,service:'izmir-sinema',time:new Date().toISOString()}));
app.get('/api/cinemas',(q,r)=>{let d=load().cinemas;if(q.query.district)d=d.filter(x=>x.district.toLowerCase()===q.query.district.toLowerCase());r.json(d)});
app.get('/api/films',(q,r)=>r.json(load().films));
app.get('/api/showtimes',(q,r)=>{let d=load().showtimes;if(q.query.date)d=d.filter(x=>x.date===q.query.date);if(q.query.filmId)d=d.filter(x=>String(x.filmId)===String(q.query.filmId));if(q.query.cinemaId)d=d.filter(x=>String(x.cinemaId)===String(q.query.cinemaId));r.json(d)});
app.get('/api/prices',(q,r)=>{let d=load().prices;if(q.query.cinemaId)d=d.filter(x=>String(x.cinemaId)===String(q.query.cinemaId));r.json(d)});
app.get('/api/compare',(q,r)=>{const d=load(), cinemas=new Map(d.cinemas.map(x=>[String(x.id),x])),films=new Map(d.films.map(x=>[String(x.id),x]));let s=d.showtimes;if(q.query.filmId)s=s.filter(x=>String(x.filmId)===String(q.query.filmId));if(q.query.date)s=s.filter(x=>x.date===q.query.date);if(q.query.district)s=s.filter(x=>{const c=cinemas.get(String(x.cinemaId));return c&&c.district.toLowerCase()===q.query.district.toLowerCase()});r.json(s.map(x=>({...x,cinema:cinemas.get(String(x.cinemaId)),film:films.get(String(x.filmId)),prices:d.prices.filter(p=>String(p.cinemaId)===String(x.cinemaId))})))});
app.get('/',(q,r)=>r.send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>İzmir Sinema</title><style>body{font-family:-apple-system,sans-serif;background:#f5f5f7;margin:0;color:#111}header{background:#111;color:#fff;padding:24px}main{max-width:800px;margin:auto;padding:18px}.card{background:#fff;padding:18px;border-radius:16px;margin:12px 0}a{color:#06c}</style><header><h1>İzmir Sinema</h1><div>Seans ve fiyat karşılaştırma servisi</div></header><main><div class="card"><h2>Servis çalışıyor ✅</h2><p>Karşıyaka · Konak · Balçova · Bornova</p></div><div class="card"><b>API:</b><p><a href="/api/health">Health</a> · <a href="/api/cinemas">Cinemas</a> · <a href="/api/films">Films</a> · <a href="/api/showtimes">Showtimes</a> · <a href="/api/prices">Prices</a> · <a href="/api/compare">Compare</a></p></div></main>`));
app.listen(PORT,()=>console.log('İzmir Sinema running on '+PORT));
