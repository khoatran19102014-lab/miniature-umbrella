const http = require('http');
const https = require('https');

const KEY = "trackstatvip";
let trackedUsers = {};

// SỬ DỤNG RO-PROXY ĐỂ TRÁNH BỊ ROBLOX CHẶN IP TRÊN CLOUD
function getRobloxUser(username, cb) {
  const data = JSON.stringify({ usernames: [username], excludeBannedUsers: false });
  const req = https.request({
    hostname: 'users.roproxy.com', path: '/v1/usernames/users', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, res => {
    let b = ''; res.on('data', c => b += c);
    res.on('end', () => {
      try { const j = JSON.parse(b); cb(j.data && j.data[0] ? j.data[0] : null); } catch (e) { cb(null); }
    });
  });
  req.on('error', () => cb(null)); req.write(data); req.end();
}

function checkPresence(ids, cb) {
  if (!ids.length) return cb([]);
  const data = JSON.stringify({ userIds: ids });
  const req = https.request({
    hostname: 'presence.roproxy.com', path: '/v1/presence/users', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, res => {
    let b = ''; res.on('data', c => b += c);
    res.on('end', () => {
      try { const j = JSON.parse(b); cb(j.userPresences || []); } catch (e) { cb([]); }
    });
  });
  req.on('error', () => cb([])); req.write(data); req.end();
}

const html = [
'<!DOCTYPE html>',
'<html lang="vi">',
'<head>',
'    <meta charset="utf-8">',
'    <meta name="viewport" content="width=device-width,initial-scale=1">',
'    <title>All Games Dashboard</title>',
'    <style>',
'        :root { --bg-main: #0b0f19; --bg-card: #111827; --border: #1f2937; --text-mute: #9ca3af; --accent: #38bdf8; --green: #10b981; --red: #f43f5e; }',
'        body { font-family: -apple-system, BlinkMacSystemFont, \\"Segoe UI\\", Roboto, sans-serif; background: var(--bg-main); color: #fff; padding: 0; margin: 0; display: flex; min-height: 100vh; }',
'        .sidebar { width: 240px; background: var(--bg-card); border-right: 1px solid var(--border); padding: 20px 15px; display: flex; flex-direction: column; gap: 20px; }',
'        .logo { font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }',
'        .menu-title { font-size: 11px; font-weight: 600; color: var(--text-mute); text-transform: uppercase; letter-spacing: 0.05em; padding-left: 5px; }',
'        .menu-item { padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: var(--text-mute); display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; }',
'        .menu-item.active, .menu-item:hover { background: #1e293b; color: #fff; }',
'        .main-content { flex: 1; padding: 25px; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }',
'        .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid var(--border); padding-bottom: 15px; }',
'        .header-title { font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 10px; }',
'        .live-tag { background: rgba(16,185,129,0.1); color: var(--green); border: 1px solid var(--green); font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }',
'        .widgets-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px; }',
'        .widget { background: var(--bg-card); border: 1px solid var(--border); padding: 16px; border-radius: 12px; }',
'        .widget-title { font-size: 11px; color: var(--text-mute); font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }',
'        .widget-value { font-size: 26px; font-weight: 700; }',
'        .widget-sub { font-size: 12px; color: var(--green); margin-top: 5px; font-weight: 500; }',
'        .add-account-bar { background: var(--bg-card); border: 1px solid var(--border); padding: 15px; border-radius: 12px; margin-bottom: 25px; display: flex; gap: 10px; align-items: center; justify-content: space-between; }',
'        .input-group { display: flex; gap: 10px; flex: 1; max-width: 500px; }',
'        input { background: var(--bg-main); border: 1px solid var(--border); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 14px; flex: 1; outline: none; }',
'        button { background: var(--accent); color: #000; font-weight: 600; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }',
'        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }',
'        th { background: #131c2e; padding: 14px 20px; font-weight: 600; font-size: 12px; color: var(--text-mute); text-transform: uppercase; border-bottom: 1px solid var(--border); }',
'        td { padding: 16px 20px; border-bottom: 1px solid var(--border); color: #e5e7eb; vertical-align: middle; }',
'        tr:last-child td { border-bottom: none; }',
'        .acc-name { font-weight: 600; color: #fbbf24; font-size: 15px; }',
'        .acc-id { font-size: 11px; color: var(--text-mute); margin-top: 3px; }',
'        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }',
'        .status-badge.online { background: rgba(16,185,129,0.1); color: var(--green); border: 1px solid rgba(16,185,129,0.2); }',
'        .status-badge.offline { background: rgba(244,63,94,0.1); color: var(--red); border: 1px solid rgba(244,63,94,0.2); }',
'        .game-badge { background: #1e293b; padding: 4px 8px; border-radius: 6px; font-size: 12px; color: #cbd5e1; border: 1px solid var(--border); font-family: monospace; }',
'        .btn-delete { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; }',
'        #login-box { position: fixed; inset: 0; background: var(--bg-main); display: flex; align-items: center; justify-content: center; z-index: 9999; }',
'        .login-card { background: var(--bg-card); border: 1px solid var(--border); padding: 30px; border-radius: 16px; text-align: center; width: 100%; max-width: 340px; }',
'        .login-card input { width: 85%; margin: 15px 0; text-align: center; }',
'        .login-card button { width: 95%; }',
'        @media (max-width: 768px) { body { flex-direction: column; } .sidebar { width: 100%; box-sizing: border-box; } th, td { padding: 10px; font-size: 13px; } .widgets-grid { grid-template-columns: repeat(2, 1fr); } }',
'    </style>',
'</head>',
'<body>',
'    <div id=\"login-box\">',
'        <div class=\"login-card\">',
'            <h3 style=\"margin:0 0 10px 0; color:var(--accent);\">🔒 NHẬP MÃ TRUY CẬP</h3>',
'            <p style=\"font-size:12px; color:var(--text-mute); margin:0;\">Vui lòng nhập mật mã bảo vệ hệ thống Dashboard</p>',
'            <input type=\"password\" id=\"key-input\" placeholder=\"Mật mã (123456)...\">',
'            <button onclick=\"unlock()\">Mở Bảng Điều Khiển</button>',
'            <p id=\"err-msg\" style=\"color:var(--red); font-size:12px; display:none; margin:10px 0 0 0;\">Sai mật mã!</p>',
'        </div>',
'    </div>',
'    <div class=\"sidebar\">',
'        <div class=\"logo\">📊 <span>All Games</span></div>',
'        <div class=\"menu-title\">Games</div>',
'        <div class=\"menu-item active\">📱 All games</div>',
'        <div class=\"menu-item\">⚔️ Slayers 2</div>',
'        <div class=\"menu-item\">🍈 Blox Fruits</div>',
'        <div class=\"menu-item\">🔪 Murder Mystery 2</div>',
'        <div class=\"menu-title\">Workspace</div>',
'        <div class=\"menu-item\">🛠️ Manage accounts</div>',
'    </div>',
'    <div class=\"main-content\">',
'        <div class=\"header-bar\">',
'            <div class=\"header-title\">All games <span class=\"live-tag\">Live sync</span></div>',
'            <div style=\"font-size: 13px; color: var(--text-mute);\" id=\"last-update\">Cập nhật: Đang tải...</div>',
'        </div>',
'        <div class=\"widgets-grid\">',
'            <div class=\"widget\">',
'                <div class=\"widget-title\">🟢 Online / Total</div>',
'                <div class=\"widget-value\" id=\"wd-online\">0/0</div>',
'                <div class=\"widget-sub\" id=\"wd-percent\">100% online</div>',
'            </div>',
'            <div class=\"widget\">',
'                <div class=\"widget-title\">🎮 Active Games</div>',
'                <div class=\"widget-value\" id=\"wd-active-games\">0</div>',
'                <div class=\"widget-sub\" style=\"color:var(--accent)\" id=\"wd-active-name\">Chưa rõ</div>',
'            </div>',
'            <div class=\"widget\">',
'                <div class=\"widget-title\">📦 Inventory Items</div>',
'                <div class=\"widget-value\" style=\"color:var(--accent)\">0</div>',
'                <div class=\"widget-sub\" style=\"color:var(--text-mute)\">Theo dõi kho đồ</div>',
'            </div>',
'            <div class=\"widget\">',
'                <div class=\"widget-title\">💎 Rare Finds</div>',
'                <div class=\"widget-value\" style=\"color:#c084fc\">0</div>',
'                <div class=\"widget-sub\" style=\"color:var(--text-mute)\">Vật phẩm hiếm</div>',
'            </div>',
'        </div>',
'        <div class=\"add-account-bar\">',
'            <div class=\"input-group\">',
'                <input type=\"text\" id=\"uname\" placeholder=\"Nhập tên tài khoản để theo dõi...\">',
'                <button onclick=\"addAcc()\">Thêm Tài Khoản</button>',
'            </div>',
'            <div id=\"msg\" style=\"font-size:13px; color:#fbbf24; font-weight:500;\"></div>',
'        </div>',
'        <table>',
'            <thead>',
'                <tr>',
