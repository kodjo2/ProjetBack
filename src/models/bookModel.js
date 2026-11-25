const { pool } = require('../config/database');

function validateBook(book) {
  if (!book || typeof book.title !== 'string' || book.title.trim() === '') {
    throw new TypeError('title doit être une chaîne de caractères non vide.');
  }

  if (!Number.isInteger(book.id_author) || book.id_author <= 0) {
    throw new TypeError('id_author doit être un entier positif.');
  }
}

async function getAllBooks() {
  const [rows] = await pool.execute('SELECT * FROM BOOK');
  return rows;
}

async function getBookById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM BOOK WHERE id_book = ?',
    [id],
  );
  return rows[0] ?? null;
}

async function createBook(book) {
  validateBook(book);

  const [result] = await pool.execute(
    `INSERT INTO BOOK (title, isbn, inventory_code, publication_date, category, id_author)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      book.title.trim(),
      book.isbn ?? null,
      book.inventory_code ?? null,
      book.publication_date ?? null,
      book.category ?? null,
      book.id_author,
    ],
  );
  return result.insertId;
}

async function updateBook(id, book) {
  validateBook(book);

  const [result] = await pool.execute(
    `UPDATE BOOK
     SET title = ?, isbn = ?, inventory_code = ?, publication_date = ?, category = ?, id_author = ?
     WHERE id_book = ?`,
    [
      book.title.trim(),
      book.isbn ?? null,
      book.inventory_code ?? null,
      book.publication_date ?? null,
      book.category ?? null,
      book.id_author,
      id,
    ],
  );
  return result.affectedRows > 0;
}

async function deleteBook(id) {
  const [result] = await pool.execute(
    'DELETE FROM BOOK WHERE id_book = ?',
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
};
