const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');

app.use(express.json());
app.use(express.static(__dirname));

function initDB() {
  const db = new Database(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY,
    config_data TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.close();
}

app.get('/api/config', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const row = db.prepare('SELECT config_data FROM site_config WHERE id = 1').get();
    db.close();
    res.json(row ? JSON.parse(row.config_data) : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('REPLACE INTO site_config (id, config_data, updated_at) VALUES (1, ?, datetime(\'now\'))').run(JSON.stringify(req.body));
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/config', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('DELETE FROM site_config WHERE id = 1').run();
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDB();
app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
