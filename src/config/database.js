require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    console.log('Connexion à MySQL réussie.');
  } catch (error) {
    const errorCode = error?.code;
    const safeError = new Error('Échec du test de connexion MySQL.');

    if (typeof errorCode === 'string') {
      safeError.code = errorCode;
      console.error(`Échec du test de connexion MySQL (code : ${errorCode}).`);
    } else {
      console.error('Échec du test de connexion MySQL.');
    }

    throw safeError;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { pool, testConnection };
