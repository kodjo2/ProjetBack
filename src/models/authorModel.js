const { pool } = require('../config/database');

function validateAuthorNames(author) {
  if (
    !author ||
    typeof author.first_name !== 'string' ||
    author.first_name.trim() === '' ||
    typeof author.last_name !== 'string' ||
    author.last_name.trim() === ''
  ) {
    throw new TypeError(
      'first_name et last_name doivent être des chaînes non vides.',
    );
  }
}

async function getAllAuthors() {
  const [rows] = await pool.execute('SELECT * FROM AUTHOR');
  return rows;
}

async function getAuthorById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM AUTHOR WHERE id_author = ?',
    [id],
  );
  return rows[0] ?? null;
}

async function createAuthor(author) {
  validateAuthorNames(author);

  const [result] = await pool.execute(
    `INSERT INTO AUTHOR (first_name, last_name, date_of_birth, nationality)
     VALUES (?, ?, ?, ?)`,
    [
      author.first_name,
      author.last_name,
      author.date_of_birth ?? null,
      author.nationality ?? null,
    ],
  );
  return result.insertId;
}

async function updateAuthor(id, author) {
  validateAuthorNames(author);

  const [result] = await pool.execute(
    `UPDATE AUTHOR
     SET first_name = ?, last_name = ?, date_of_birth = ?, nationality = ?
     WHERE id_author = ?`,
    [
      author.first_name,
      author.last_name,
      author.date_of_birth ?? null,
      author.nationality ?? null,
      id,
    ],
  );
  return result.affectedRows > 0;
}

async function deleteAuthor(id) {
  const [result] = await pool.execute(
    'DELETE FROM AUTHOR WHERE id_author = ?',
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
};
