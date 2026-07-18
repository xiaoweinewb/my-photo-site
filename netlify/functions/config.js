const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE || 'test',
  ssl: { rejectUnauthorized: true },
});

async function getConnection() {
  const conn = await mysql.createConnection(DB_CONFIG);
  await conn.execute(`CREATE TABLE IF NOT EXISTS site_config (
    id INT PRIMARY KEY,
    config_data JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  return conn;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }

  let conn;
  try {
    conn = await getConnection();

    if (event.httpMethod === 'GET') {
      const [rows] = await conn.execute('SELECT config_data FROM site_config WHERE id = 1');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: rows.length > 0 ? JSON.stringify(rows[0].config_data) : '{}',
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      await conn.execute(
        'REPLACE INTO site_config (id, config_data, updated_at) VALUES (1, ?, NOW())',
        [JSON.stringify(data)]
      );
      return { statusCode: 200, body: 'OK' };
    }

    if (event.httpMethod === 'DELETE') {
      await conn.execute('DELETE FROM site_config WHERE id = 1');
      return { statusCode: 200, body: 'OK' };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    if (conn) await conn.end();
  }
};
