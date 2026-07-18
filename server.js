const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');

app.use(express.json());
app.use(express.static(__dirname));

function initDB() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_photos (
      category TEXT NOT NULL,
      filename TEXT NOT NULL,
      PRIMARY KEY (category, filename)
    );
    CREATE TABLE IF NOT EXISTS other_config (
      id INTEGER PRIMARY KEY,
      config_data TEXT
    );
  `);
  const hasData = db.prepare('SELECT COUNT(*) AS cnt FROM category_photos').get().cnt > 0;
  if (!hasData) {
    const defaults = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
    const ins = db.prepare('INSERT INTO category_photos (category, filename) VALUES (?, ?)');
    const trx = db.transaction(function(photos) {
      for (var cat in photos) {
        for (var i = 0; i < photos[cat].length; i++) {
          ins.run(cat, photos[cat][i]);
        }
      }
    });
    trx(defaults.photos);
    db.prepare('REPLACE INTO other_config (id, config_data) VALUES (1, ?)').run(JSON.stringify({
      tagline: defaults.tagline,
      nav: defaults.nav,
      slideInterval: defaults.slideInterval,
      siteTitle: defaults.siteTitle,
    }));
  }
  db.close();
}

app.get('/api/config', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const photos = {};
    const rows = db.prepare('SELECT category, filename FROM category_photos ORDER BY category, filename').all();
    rows.forEach(function(r) {
      if (!photos[r.category]) photos[r.category] = [];
      photos[r.category].push(r.filename);
    });
    const other = db.prepare('SELECT config_data FROM other_config WHERE id = 1').get();
    db.close();
    const config = other ? JSON.parse(other.config_data) : {};
    config.photos = photos;
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const del = db.prepare('DELETE FROM category_photos WHERE category = ?');
    const ins = db.prepare('INSERT INTO category_photos (category, filename) VALUES (?, ?)');
    const trx = db.transaction(function(photos) {
      for (var category in photos) {
        del.run(category);
        var files = photos[category];
        for (var i = 0; i < files.length; i++) {
          ins.run(category, files[i]);
        }
      }
    });
    trx(req.body.photos || {});
    var other = {};
    if (req.body.tagline) other.tagline = req.body.tagline;
    if (req.body.nav) other.nav = req.body.nav;
    if (req.body.slideInterval != null) other.slideInterval = req.body.slideInterval;
    if (req.body.siteTitle) other.siteTitle = req.body.siteTitle;
    db.prepare('REPLACE INTO other_config (id, config_data) VALUES (1, ?)').run(JSON.stringify(other));
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/config', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.exec('DELETE FROM category_photos; DELETE FROM other_config;');
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
