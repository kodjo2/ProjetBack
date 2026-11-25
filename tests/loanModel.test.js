const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pool } = require('../src/config/database');
const authors = require('../src/models/authorModel');
const books = require('../src/models/bookModel');
const members = require('../src/models/memberModel');
const {
  getAllLoans,
  getLoanById,
  createLoan,
  updateLoan,
  returnLoan,
  deleteLoan,
} = require('../src/models/loanModel');

function formatSqlDate(value) {
  if (value instanceof Date) {
    const pad = (part) => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

async function main() {
  const failures = [];
  let authorId;
  let bookId;
  let memberId;
  let userId;
  let loanId;
  const marker = randomUUID().replaceAll('-', '').slice(0, 20);

  async function runTest(name, action) {
    try {
      await action();
      console.log(`PASS - ${name}`);
      return true;
    } catch (error) {
      failures.push({ name, error });
      console.error(`FAIL - ${name}: ${error.message}`);
      return false;
    }
  }

  function makeValidLoan() {
    assert.ok(Number.isInteger(memberId) && memberId > 0);
    assert.ok(Number.isInteger(bookId) && bookId > 0);
    assert.ok(Number.isInteger(userId) && userId > 0);
    return {
      loan_date: '2024-02-20',
      status: ' Borrowed ',
      id_member: memberId,
      id_book: bookId,
      id_user: userId,
    };
  }

  try {
    const databaseIsCorrect = await runTest(
      'configuration de la base library_manager',
      async () => {
        assert.equal(process.env.DB_NAME, 'library_manager');
      },
    );

    if (databaseIsCorrect) {
      await runTest('getAllLoans retourne une liste', async () => {
        const loans = await getAllLoans();
        assert.ok(Array.isArray(loans));
      });

      await runTest('création de l’auteur de référence', async () => {
        authorId = await authors.createAuthor({
          first_name: `Loan${marker}`,
          last_name: 'Test',
        });
        assert.ok(Number.isInteger(authorId) && authorId > 0);
      });

      await runTest('création du livre de référence', async () => {
        assert.ok(authorId);
        bookId = await books.createBook({
          title: `Loan test ${marker}`,
          isbn: marker,
          inventory_code: `LOAN-${marker}`,
          id_author: authorId,
        });
        assert.ok(Number.isInteger(bookId) && bookId > 0);
      });

      await runTest('création du membre de référence', async () => {
        memberId = await members.createMember({
          first_name: `Loan${marker}`,
          last_name: 'Test',
          email: `loan.${marker}@example.com`,
          registration_date: '2024-01-01',
          status: 'Active',
        });
        assert.ok(Number.isInteger(memberId) && memberId > 0);
      });

      await runTest('création de l’utilisateur de référence', async () => {
        const [result] = await pool.execute(
          `INSERT INTO \`USER\` (first_name, last_name, email, password_hash, role, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `Loan${marker}`,
            'Test',
            `loan.user.${marker}@example.com`,
            `test-hash-${marker}`,
            'Test',
            'Active',
          ],
        );
        userId = result.insertId;
        assert.ok(Number.isInteger(userId) && userId > 0);
      });

      await runTest('createLoan calcule due_date à 14 jours', async () => {
        loanId = await createLoan(makeValidLoan());
        assert.ok(Number.isInteger(loanId) && loanId > 0);

        const loan = await getLoanById(loanId);
        assert.equal(formatSqlDate(loan.loan_date), '2024-02-20');
        assert.equal(formatSqlDate(loan.due_date), '2024-03-05');
        assert.equal(loan.status, 'Borrowed');
        assert.equal(loan.return_date, null);
      });

      await runTest('getLoanById retrouve l’emprunt créé', async () => {
        assert.ok(loanId);
        const loan = await getLoanById(loanId);
        assert.equal(loan.id_loan, loanId);
        assert.equal(loan.id_member, memberId);
        assert.equal(loan.id_book, bookId);
        assert.equal(loan.id_user, userId);
      });

      await runTest('updateLoan modifie l’emprunt et recalcule due_date', async () => {
        assert.ok(loanId);
        assert.equal(
          await updateLoan(loanId, {
            ...makeValidLoan(),
            loan_date: '2024-03-20',
            status: 'Renewed',
          }),
          true,
        );

        const loan = await getLoanById(loanId);
        assert.equal(formatSqlDate(loan.due_date), '2024-04-03');
        assert.equal(loan.status, 'Renewed');
      });

      await runTest('returnLoan renseigne la date et le statut', async () => {
        assert.ok(loanId);
        assert.equal(await returnLoan(loanId), true);

        const loan = await getLoanById(loanId);
        const [rows] = await pool.execute(
          'SELECT CURRENT_DATE AS today',
        );
        assert.equal(formatSqlDate(loan.return_date), formatSqlDate(rows[0].today));
        assert.equal(loan.status, 'Returned');
      });

      await runTest('deleteLoan supprime l’emprunt', async () => {
        assert.ok(loanId);
        assert.equal(await deleteLoan(loanId), true);
      });

      await runTest('getLoanById retourne null après suppression', async () => {
        assert.ok(loanId);
        assert.equal(await getLoanById(loanId), null);
      });

      await runTest('createLoan rejette une date calendaire invalide', async () => {
        await assert.rejects(
          () => createLoan({ ...makeValidLoan(), loan_date: '2026-02-30' }),
          (error) =>
            error instanceof TypeError && /loan_date/.test(error.message),
        );
      });

      await runTest('createLoan rejette un format de date invalide', async () => {
        await assert.rejects(
          () => createLoan({ ...makeValidLoan(), loan_date: '2026/02/28' }),
          (error) =>
            error instanceof TypeError && /loan_date/.test(error.message),
        );
      });

      await runTest('createLoan rejette un id_member invalide', async () => {
        await assert.rejects(
          () => createLoan({ ...makeValidLoan(), id_member: 0 }),
          (error) =>
            error instanceof TypeError && /id_member/.test(error.message),
        );
      });

      await runTest('createLoan rejette un id_book invalide', async () => {
        await assert.rejects(
          () => createLoan({ ...makeValidLoan(), id_book: 1.5 }),
          (error) =>
            error instanceof TypeError && /id_book/.test(error.message),
        );
      });

      await runTest('createLoan rejette un id_user invalide', async () => {
        await assert.rejects(
          () => createLoan({ ...makeValidLoan(), id_user: '1' }),
          (error) =>
            error instanceof TypeError && /id_user/.test(error.message),
        );
      });

      await runTest('createLoan rejette un statut vide', async () => {
        await assert.rejects(
          () => createLoan({ ...makeValidLoan(), status: '   ' }),
          (error) =>
            error instanceof TypeError && /status/.test(error.message),
        );
      });
    }
  } finally {
    if (loanId !== undefined) {
      try {
        const loan = await getLoanById(loanId);
        if (loan !== null) {
          await deleteLoan(loanId);
        }
        console.log('PASS - nettoyage de l’emprunt de test');
      } catch (error) {
        failures.push({ name: 'nettoyage de l’emprunt de test', error });
        console.error(`FAIL - nettoyage de l’emprunt de test: ${error.message}`);
      }
    }

    if (memberId !== undefined) {
      try {
        const member = await members.getMemberById(memberId);
        if (member !== null) {
          await members.deleteMember(memberId);
        }
        console.log('PASS - nettoyage du membre de test');
      } catch (error) {
        failures.push({ name: 'nettoyage du membre de test', error });
        console.error(`FAIL - nettoyage du membre de test: ${error.message}`);
      }
    }

    if (bookId !== undefined) {
      try {
        const book = await books.getBookById(bookId);
        if (book !== null) {
          await books.deleteBook(bookId);
        }
        console.log('PASS - nettoyage du livre de test');
      } catch (error) {
        failures.push({ name: 'nettoyage du livre de test', error });
        console.error(`FAIL - nettoyage du livre de test: ${error.message}`);
      }
    }

    if (authorId !== undefined) {
      try {
        const author = await authors.getAuthorById(authorId);
        if (author !== null) {
          await authors.deleteAuthor(authorId);
        }
        console.log('PASS - nettoyage de l’auteur de test');
      } catch (error) {
        failures.push({ name: 'nettoyage de l’auteur de test', error });
        console.error(`FAIL - nettoyage de l’auteur de test: ${error.message}`);
      }
    }

    if (userId !== undefined) {
      try {
        await pool.execute('DELETE FROM `USER` WHERE id_user = ?', [userId]);
        console.log('PASS - nettoyage de l’utilisateur de test');
      } catch (error) {
        failures.push({ name: 'nettoyage de l’utilisateur de test', error });
        console.error(`FAIL - nettoyage de l’utilisateur de test: ${error.message}`);
      }
    }

    try {
      await pool.end();
    } catch (error) {
      failures.push({ name: 'fermeture du pool MySQL', error });
      console.error(`FAIL - fermeture du pool MySQL: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} test(s) en échec.`);
    process.exitCode = 1;
  } else {
    console.log('\nTous les tests ont réussi.');
  }
}

main().catch((error) => {
  console.error(`Échec inattendu des tests: ${error.message}`);
  process.exitCode = 1;
});
