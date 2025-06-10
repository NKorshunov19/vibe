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

async function deleteListItem(id) {
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute('DELETE FROM items WHERE id = ?', [id]);
  await connection.end();
}

async function updateListItem(id, text) {
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute('UPDATE items SET text = ? WHERE id = ?', [text, id]);
  await connection.end();
}

// Показывает строки со ссылкой на редактирование
async function getHtmlRows(editId = null, editText = '') {
  const items = await retrieveListItems();
  return items.map(item => {
    if (editId && item.id === Number(editId)) {
      // Форма редактирования
      return `
                <tr>
                    <td>${item.id}</td>
                    <td>
                        <form method="POST" action="/edit" style="display:inline;">
                            <input type="hidden" name="id" value="${item.id}">
                            <input type="text" name="text" value="${editText || item.text}" required style="width:80%">
                            <button type="submit">Сохранить</button>
                            <a href="/">Отмена</a>
                        </form>
                    </td>
                    <td>
                        <form method="POST" action="/delete" style="display:inline;">
                            <input type="hidden" name="id" value="${item.id}">
                            <button type="submit" onclick="return confirm('Удалить задачу?')">Удалить</button>
                        </form>
                    </td>
                </tr>
            `;
    }
    // Обычная строка
    return `
            <tr>
                <td>${item.id}</td>
                <td>${item.text}</td>
                <td>
                    <form method="POST" action="/delete" style="display:inline;">
                        <input type="hidden" name="id" value="${item.id}">
                        <button type="submit" onclick="return confirm('Удалить задачу?')">Удалить</button>
                    </form>
                    <form method="GET" action="/edit" style="display:inline;">
                        <input type="hidden" name="id" value="${item.id}">
                        <button type="submit">Редактировать</button>
                    </form>
                </td>
            </tr>
        `;
  }).join('');
}

async function handleRequest(req, res) {
  // Парсим query string для GET /edit?id=xxx
  function parseUrlQuery(url) {
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return {};
    return Object.fromEntries(new URLSearchParams(url.slice(qIdx + 1)));
  }

  if ((req.url === '/' || req.url.startsWith('/?')) && req.method === 'GET') {
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

  // Получить main.js
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

  // Добавить
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

  // Удалить
  if (req.url === '/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      const { id } = parse(body);
      if (id && !isNaN(Number(id))) {
        await deleteListItem(Number(id));
        res.writeHead(302, { Location: '/' });
        res.end();
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Некорректный id');
      }
    });
    return;
  }

  // Редактировать — показать форму
  if (req.url.startsWith('/edit') && req.method === 'GET') {
    const { id } = parseUrlQuery(req.url);
    if (!id || isNaN(Number(id))) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Некорректный id');
      return;
    }
    try {
      const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
      const processedHtml = html.replace('{{rows}}', await getHtmlRows(id));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(processedHtml);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Ошибка сервера');
    }
    return;
  }

  // Редактировать — сохранить изменения
  if (req.url === '/edit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      const { id, text } = parse(body);
      if (id && !isNaN(Number(id)) && text && text.trim()) {
        await updateListItem(Number(id), text.trim());
        res.writeHead(302, { Location: '/' });
        res.end();
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Некорректные данные');
      }
    });
    return;
  }

  // 404 для остальных маршрутов
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route not found');
}

http.createServer(handleRequest).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
