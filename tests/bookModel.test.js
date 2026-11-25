const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pool } = require('../src/config/database');
const {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} = require('../src/models/bookModel');
const {
  createAuthor,
  getAuthorById,
  deleteAuthor,
} = require('../src/models/authorModel');

async function main() {
  const failures = [];
  let authorId;
  let bookId;
  const marker = randomUUID().replaceAll('-', '').slice(0, 20);
  const initialAuthor = {
    first_name: `Test${marker}`,
    last_name: 'Author',
  };
  const initialBook = {
    title: `  Test Book ${marker}  `,
    isbn: marker,
    inventory_code: `TEST-${marker}`,
    publication_date: '2020-01-15',
    category: 'Test',
  };
  const updatedBook = {
    ...initialBook,
    title: `  Updated Book ${marker}  `,
    category: 'Updated',
  };

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

  try {
    const databaseIsCorrect = await runTest(
      'configuration de la base library_manager',
      async () => {
        assert.equal(process.env.DB_NAME, 'library_manager');
      },
    );

    if (databaseIsCorrect) {
      await runTest('getAllBooks retourne une liste', async () => {
        const books = await getAllBooks();
        assert.ok(Array.isArray(books));
      });

      await runTest('createAuthor crée un auteur de test', async () => {
        authorId = await createAuthor(initialAuthor);
        assert.ok(Number.isInteger(authorId) && authorId > 0);
      });

      await runTest('createBook crée un livre associé à l’auteur', async () => {
        assert.ok(authorId);
        bookId = await createBook({ ...initialBook, id_author: authorId });
        assert.ok(Number.isInteger(bookId) && bookId > 0);
      });

      await runTest('getBookById retrouve le livre', async () => {
        assert.ok(bookId);
        const book = await getBookById(bookId);
        assert.equal(book.title, initialBook.title.trim());
        assert.equal(book.id_author, authorId);
      });

      await runTest('updateBook modifie le livre', async () => {
        assert.ok(bookId);
        assert.equal(
          await updateBook(bookId, { ...updatedBook, id_author: authorId }),
          true,
        );

        const book = await getBookById(bookId);
        assert.equal(book.title, updatedBook.title.trim());
        assert.equal(book.category, updatedBook.category);
      });

      await runTest('deleteBook supprime le livre', async () => {
        assert.ok(bookId);
        assert.equal(await deleteBook(bookId), true);
      });

      await runTest('getBookById retourne null après suppression', async () => {
        assert.ok(bookId);
        assert.equal(await getBookById(bookId), null);
      });

      await runTest('createBook rejette un titre vide', async () => {
        await assert.rejects(
          () =>
            createBook({
              title: '   ',
              id_author: authorId,
            }),
          (error) =>
            error instanceof TypeError && /title/.test(error.message),
        );
      });

      await runTest('createBook rejette un id_author invalide', async () => {
        await assert.rejects(
          () =>
            createBook({
              title: 'Valid test title',
              id_author: 0,
            }),
          (error) =>
            error instanceof TypeError && /id_author/.test(error.message),
        );
      });
    }
  } finally {
    if (bookId !== undefined) {
      try {
        const book = await getBookById(bookId);
        if (book !== null) {
          await deleteBook(bookId);
        }
        console.log('PASS - nettoyage du livre de test');
      } catch (error) {
        failures.push({ name: 'nettoyage du livre de test', error });
        console.error(`FAIL - nettoyage du livre de test: ${error.message}`);
      }
    }

    if (authorId !== undefined) {
      try {
        const author = await getAuthorById(authorId);
        if (author !== null) {
          await deleteAuthor(authorId);
        }
        console.log('PASS - nettoyage de l’auteur de test');
      } catch (error) {
        failures.push({ name: 'nettoyage de l’auteur de test', error });
        console.error(`FAIL - nettoyage de l’auteur de test: ${error.message}`);
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
  console.error(`Échec inattendu du test: ${error.message}`);
  process.exitCode = 1;
});
