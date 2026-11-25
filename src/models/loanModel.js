const { pool } = require('../config/database');

function getLoanDates(loanDate) {
  if (
    typeof loanDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(loanDate)
  ) {
    throw new TypeError('loan_date doit être une date valide au format YYYY-MM-DD.');
  }

  const parsedDate = new Date(`${loanDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== loanDate
  ) {
    throw new TypeError('loan_date doit être une date valide au format YYYY-MM-DD.');
  }

  const dueDate = new Date(parsedDate.getTime());
  dueDate.setUTCDate(dueDate.getUTCDate() + 14);
  if (dueDate.getUTCFullYear() > 9999) {
    throw new TypeError('due_date calculée est hors de la plage autorisée.');
  }

  return {
    loanDate: parsedDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
  };
}

function validateLoan(loan) {
  if (!loan || typeof loan !== 'object') {
    throw new TypeError('loan doit être un objet valide.');
  }

  const dates = getLoanDates(loan.loan_date);

  for (const field of ['id_member', 'id_book', 'id_user']) {
    if (!Number.isInteger(loan[field]) || loan[field] <= 0) {
      throw new TypeError(`${field} doit être un entier positif.`);
    }
  }

  if (typeof loan.status !== 'string' || loan.status.trim() === '') {
    throw new TypeError('status doit être une chaîne non vide.');
  }

  return dates;
}

async function getAllLoans() {
  const [rows] = await pool.execute('SELECT * FROM LOAN');
  return rows;
}

async function getLoanById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM LOAN WHERE id_loan = ?',
    [id],
  );
  return rows[0] ?? null;
}

async function createLoan(loan) {
  const { loanDate, dueDate } = validateLoan(loan);

  const [result] = await pool.execute(
    `INSERT INTO LOAN (loan_date, due_date, return_date, status, id_member, id_book, id_user)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      loanDate,
      dueDate,
      null,
      loan.status.trim(),
      loan.id_member,
      loan.id_book,
      loan.id_user,
    ],
  );
  return result.insertId;
}

async function updateLoan(id, loan) {
  const { loanDate, dueDate } = validateLoan(loan);

  const [result] = await pool.execute(
    `UPDATE LOAN
     SET loan_date = ?, due_date = ?, return_date = ?, status = ?, id_member = ?, id_book = ?, id_user = ?
     WHERE id_loan = ?`,
    [
      loanDate,
      dueDate,
      loan.return_date ?? null,
      loan.status.trim(),
      loan.id_member,
      loan.id_book,
      loan.id_user,
      id,
    ],
  );
  return result.affectedRows > 0;
}

async function returnLoan(id) {
  const [result] = await pool.execute(
    'UPDATE LOAN SET return_date = CURRENT_DATE, status = ? WHERE id_loan = ?',
    ['Returned', id],
  );
  return result.affectedRows > 0;
}

async function deleteLoan(id) {
  const [result] = await pool.execute(
    'DELETE FROM LOAN WHERE id_loan = ?',
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllLoans,
  getLoanById,
  createLoan,
  updateLoan,
  returnLoan,
  deleteLoan,
};
