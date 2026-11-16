const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Web da chay thanh cong!');
});
server.listen(process.env.PORT || 3000);
