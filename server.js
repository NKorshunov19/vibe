const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { parse } = require('querystring');

const PORT = 3000;

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Dara2005',
  database: 'todolist',
  port: 3306
};

async function retrieveListItems() {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT id, text FROM items');
  await connection.end();
  return rows;
}

async function addListItem(text) {
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute('INSERT INTO items (text) VALUES (?)', [text]);
  await connection.end();
}

async function getHtmlRows() {
  const items = await retrieveListItems();
  return items.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
  if (req.url === '/' && req.method === 'GET') {
    try {
      const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
      const processedHtml = html.replace('{{rows}}', await getHtmlRows());
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(processedHtml);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Ошибка сервера');
    }
    return;
  }
  if (req.url === '/main.js' && req.method === 'GET') {
    fs.readFile(path.join(__dirname, 'main.js'), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(data);
      }
    });
    return;
  }
  if (req.url === '/add' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      const { text } = parse(body);
      if (text && text.trim()) {
        await addListItem(text.trim());
        res.writeHead(302, { Location: '/' });
        res.end();
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Требуется текст');
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route not found');
}

http.createServer(handleRequest).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
