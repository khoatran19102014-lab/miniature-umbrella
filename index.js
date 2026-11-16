const http = require('http');
const KEY = "123456";
let accs = {}, clients = [];

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tracker</title>
<style>body{font-family:sans-serif;background:#0f172a;color:#fff;padding:15px;margin:0}h2{text-align:center;color:#38bdf8}#box{max-width:320px;margin:50px auto;background:#1e293b;padding:20px;border-radius:10px;text-align:center}input,button{width:90%;padding:10px;margin:8px 0;border-radius:6px;border:none;font-size:15px}input{background:#0f172a;color:#fff;text-align:center}button{background:#38bdf8;font-weight:bold}.card{background:#1e293b;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #334155}.top{display:flex;justify-content:space-between;border-bottom:1px solid #334155;padding-bottom:6px;margin-bottom:8px}.on{color:#34d399;font-size:12px}.off{color:#f87171;font-size:12px}pre{background:#0f172a;padding:8px;border-radius:5px;white-space:pre-wrap;font-size:13px}.del{background:#ef4444;color:#fff;width:auto;padding:3px 8px;font-size:11px;margin-left:6px}</style></head>
<body><div id="box"><h3>🔒 Nhập Mã</h3><input type="password" id="k" placeholder="123456"><button onclick="go()">Mở</button></div>
<div id="app" style="display:none"><h2>⚡ Live Stats</h2><div id="list">Chờ dữ liệu...</div></div>
<script>
let data=[], sk=localStorage.getItem('k')||'';
if(sk){document.getElementById('k').value=sk;go(1);}
async function go(a){let k=document.getElementById('k').value;let r=await fetch('/c?k='+k);if(r.ok){localStorage.setItem('k',k);document.getElementById('box').style.display='none';document.getElementById('app').style.display='block';run(k);}else if(!a)alert('Sai ma');}
async function del(u){await fetch('/d?k='+sk+'&u='+encodeURIComponent(u));}
function draw(){let l=document.getElementById('list');if(!data.length){l.innerHTML='<p style="text-align:center;color:#94a3b8">Chưa có dữ liệu...</p>';return;}
let n=Date.now();l.innerHTML=data.map(x=>{let on=(n-x.t)<15000;let st=on?'<span class="on">🟢 Live</span>':'<span class="off">🔴 Ngắt</span>';
let bd=x.txt?'<pre>'+x.txt+'</pre>':'<div>Level: <b>'+(x.level||0)+'</b> | Beli: <b style="color:#4ade80">'+Number(x.beli||0).toLocaleString()+'</b></div>';
return '<div class="card"><div class="top"><b style="color:#fbbf24">👤 '+x.u+'</b><div>'+st+'<button class="del" onclick="del(\\''+x.u+'\\')">Xóa</button></div></div>'+bd+'<div style="font-size:11px;color:#64748b;text-align:right;margin-top:5px">'+x.ts+'</div></div>';}).join('');}
function run(k){let es=new EventSource('/s?k='+k);es.onmessage=e=>{data=JSON.parse(e.data);draw();};setInterval(draw,1000);}
</script></body></html>`;

const push = () => { const p = 'data: ' + JSON.stringify(Object.values(accs)) + '\n\n'; clients.forEach(c => c.write(p)); };

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();
  const u = new URL(req.url, 'http://' + req.headers.host), p = u.pathname, k = u.searchParams.get('k');
  if (p === '/') { res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'}); return res.end(html); }
  if (p === '/c') { res.writeHead(k === KEY ? 200 : 401); return res.end(); }
  if (p === '/d' && k === KEY) { delete accs[u.searchParams.get('u')]; push(); return res.end(); }
  if (p === '/s') {
    if (k !== KEY) { res.writeHead(401); return res.end(); }
    res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache'});
    res.write('data: ' + JSON.stringify(Object.values(accs)) + '\n\n');
    clients.push(res); req.on('close', () => clients = clients.filter(c => c !== res)); return;
  }
  if (req.method === 'POST' && (p === '/update' || p === '/webhook/' + KEY)) {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(b);
        if (p !== '/webhook/' + KEY && d.key !== KEY) { res.writeHead(401); return res.end(); }
        const name = d.username || (d.embeds && d.embeds && d.embeds.title) || 'Acc_1';
        let txt = d.content || '';
        if (d.embeds && d.embeds) {
          if (d.embeds.description) txt += d.embeds.description + '\n';
          if (d.embeds.fields) txt += d.embeds.fields.map(f => f.name + ': ' + f.value).join('\n');
        }
        accs[name] = { ...d, u: name, txt: txt.trim(), t: Date.now(), ts: new Date().toLocaleTimeString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}) };
        push(); res.writeHead(200); res.end('OK');
      } catch (e) { res.writeHead(400); res.end('Err'); }
    }); return;
  }
  res.writeHead(404); res.end();
}).listen(process.env.PORT || 3000, () => console.log('OK'));
// HET CODE

