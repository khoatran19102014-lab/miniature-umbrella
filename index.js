const http = require('http');

// Mật mã mở trang web của bạn:
const SECRET_KEY = "123456"; 

let accounts = {};
let clients = [];

const htmlPage = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bảng Theo Dõi Trực Tiếp</title>
    <style>
        body { font-family: sans-serif; background: #0f172a; color: white; padding: 15px; margin: 0; }
        h2 { text-align: center; color: #38bdf8; margin-bottom: 5px; }
        #login-box { max-width: 350px; margin: 60px auto; background: #1e293b; padding: 25px; border-radius: 12px; border: 1px solid #334155; text-align: center; }
        input { width: 85%; padding: 12px; margin: 15px 0; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: white; font-size: 16px; text-align: center; }
        button { width: 92%; padding: 12px; background: #38bdf8; color: #0f172a; font-weight: bold; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
        #dashboard { display: none; max-width: 800px; margin: 0 auto; }
        .live-dot { text-align: center; font-size: 12px; color: #34d399; margin-bottom: 15px; }
        .card { background: #1e293b; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #334155; position: relative; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 10px; }
        .name { font-size: 18px; font-weight: bold; color: #fbbf24; }
        .badge { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
        .online { background: #065f46; color: #34d399; }
        .offline { background: #7f1d1d; color: #f87171; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14px; }
        .label { color: #94a3b8; }
        .raw-content { background: #0f172a; padding: 10px; border-radius: 6px; font-size: 13px; color: #e2e8f0; white-space: pre-wrap; margin-top: 8px; }
        .time { font-size: 12px; color: #64748b; text-align: right; margin-top: 10px; }
        .del-btn { background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; width: auto; margin-left: 8px; }
    </style>
</head>
<body>
    <div id="login-box">
        <h3 style="margin-top:0; color:#38bdf8;">🔒 Nhập Mã Theo Dõi</h3>
        <input type="password" id="key-input" placeholder="Nhập mã bí mật (123456)...">
        <button onclick="unlock()">Mở Bảng Chỉ Số</button>
        <p id="err-msg" style="color:#f87171; font-size:13px; display:none;">Sai mã bí mật!</p>
    </div>

    <div id="dashboard">
        <h2>⚡ Bảng Chỉ Số Trực Tiếp</h2>
        <div class="live-dot">● Đang kết nối trực tiếp (Real-time)</div>
        <div id="list">Đang chờ dữ liệu gửi về...</div>
    </div>

    <script>
        let currentData = [];
        let savedKey = localStorage.getItem('tracker_key') || '';

        if (savedKey) {
            document.getElementById('key-input').value = savedKey;
            unlock(true);
        }

        async function unlock(isAuto = false) {
            const key = document.getElementById('key-input').value;
            const res = await fetch('/check-key?key=' + encodeURIComponent(key));
            if (res.ok) {
                localStorage.setItem('tracker_key', key);
                document.getElementById('login-box').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                startStream(key);
            } else if (!isAuto) {
                document.getElementById('err-msg').style.display = 'block';
            }
        }

        async function deleteAcc(username) {
            await fetch('/delete?key=' + encodeURIComponent(savedKey) + '&user=' + encodeURIComponent(username));
        }

        function render() {
            const list = document.getElementById('list');
            if (currentData.length === 0) {
                list.innerHTML = '<p style="text-align:center; color:#94a3b8;">Chưa có dữ liệu nào được gửi về...</p>';
                return;
            }

            const now = Date.now();
            const timeoutLimit = 15 * 1000; 

            list.innerHTML = currentData.map(acc => {
                const diffSeconds = Math.floor((now - acc.timestamp) / 1000);
                const isOnline = (now - acc.timestamp) < timeoutLimit;
                const statusBadge = isOnline 
                    ? '<span class="badge online">🟢 Đang chạy</span>' 
                    : \`<span class="badge offline">🔴 Ngắt (\${diffSeconds}s trước)</span>\`;

                let detailsHtml = '';
                if (acc.content) {
                    detailsHtml = \`<div class="raw-content">\${acc.content}</div>\`;
                } else {
                    detailsHtml = \`
                        <div class="row"><span class="label">Level:</span> <b>\${acc.level || 'N/A'}</b></div>
                        <div class="row"><span class="label">Beli ($):</span> <b style="color:#4ade80">\${Number(acc.beli || 0).toLocaleString()}</b></div>
                        <div class="row"><span class="label">Fragments:</span> <b style="color:#c084fc">\${Number(acc.fragments || 0).toLocaleString()}</b></div>
                        <div class="row"><span class="label">Trái Ác Quỷ:</span> <b>\${acc.fruit || 'Không có'}</b></div>
                        <div class="row"><span class="label">Tộc:</span> <b>\${acc.race || 'Human'}</b></div>
                        <div class="row"><span class="label">Vật phẩm:</span> <b>\${acc.items ? (Array.isArray(acc.items) ? acc.items.join(', ') : acc.items) : 'Không'}</b></div>
                    \`;
                }

                return \`
                <div class="card">
                    <div class="header">
                        <span class="name">👤 \${acc.username}</span>
                        <div>
                            \${statusBadge}
                            <button class="del-btn" onclick="deleteAcc('\${acc.username}')">Xóa</button>
                        </div>
                    </div>
                    \${detailsHtml}
                    <div class="time">Cập nhật: \${acc.timeStr}</div>
                </div>
                \`;
            }).join('');
        }

        function startStream(key) {
            const eventSource = new EventSource('/stream?key=' + encodeURIComponent(key));
            eventSource.onmessage = function(event) {
                currentData = JSON.parse(event.data);
                render();
            };
            setInterval(render, 1000);
        }
    </script>
</body>
</html>
`;

function broadcastData() {
    const payload = `data: ${JSON.stringify(Object.values(accounts))}\n\n`;
    clients.forEach(res => res.write(payload));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname;
    const keyParam = urlObj.searchParams.get('key');

    if (req.method === 'GET' && pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage);
    } 
    else if (req.method === 'GET' && pathname === '/check-key') {
        res.writeHead(keyParam === SECRET_KEY ? 200 : 401);
        res.end(keyParam === SECRET_KEY ? 'OK' : 'Unauthorized');
    }
    else if (req.method === 'GET' && pathname === '/delete') {
        if (keyParam === SECRET_KEY) {
            const user = urlObj.searchParams.get('user');
            delete accounts[user];
            broadcastData();
        }
        res.writeHead(200);
        res.end('OK');
    }
    else if (req.method === 'GET' && pathname === '/stream') {
        if (keyParam !== SECRET_KEY) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write(`data: ${JSON.stringify(Object.values(accounts))}\n\n`);
        clients.push(res);
        req.on('close', () => { clients = clients.filter(c => c !== res); });
    } 
    else if (req.method === 'POST' && (pathname === '/update' || pathname === `/webhook/${SECRET_KEY}`)) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const info = JSON.parse(body);
                const isValidWebhook = (pathname === `/webhook/${SECRET_KEY}`);
                
                if (!isValidWebhook && info.key !== SECRET_KEY) {
                    res.writeHead(401);
                    return res.end('Sai Secret Key');
                }

                const accName = info.username || (info.embeds && info.embeds[0] && info.embeds[0].title) || 'Tài Khoản Mặc Định';
                
                let textContent = info.content || '';
                if (info.embeds && info.embeds[0]) {
                    const emb = info.embeds[0];
                    if (emb.description) textContent += emb.description + '\n';
                    if (emb.fields) {
                        textContent += emb.fields.map(f => `${f.name}: ${f.value}`).join('\n');
                    }
                }

                delete info.key;
                accounts[accName] = {
                    ...info,
                    username: accName,
                    content: textContent.trim() || null,
