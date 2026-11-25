const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pool } = require('../src/config/database');
const {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} = require('../src/models/authorModel');

async function main() {
  const failures = [];
  let authorId;
  const marker = randomUUID().replaceAll('-', '').slice(0, 20);
  const initialAuthor = {
    first_name: `Test${marker}`,
    last_name: 'Author',
    date_of_birth: '1990-01-15',
    nationality: 'Test',
  };
  const updatedAuthor = {
    first_name: `Updated${marker}`,
    last_name: 'Author',
    date_of_birth: '1991-02-16',
    nationality: 'Updated',
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
      await runTest('getAllAuthors retourne une liste', async () => {
        const authors = await getAllAuthors();
        assert.ok(Array.isArray(authors));
      });

      await runTest('createAuthor crée un auteur de test', async () => {
        authorId = await createAuthor(initialAuthor);
        assert.ok(Number.isInteger(authorId) && authorId > 0);
      });

      await runTest('getAuthorById retrouve l’auteur créé', async () => {
        assert.ok(authorId);
        const author = await getAuthorById(authorId);
        assert.equal(author.first_name, initialAuthor.first_name);
        assert.equal(author.last_name, initialAuthor.last_name);
      });

      await runTest('updateAuthor modifie l’auteur', async () => {
        assert.ok(authorId);
        assert.equal(await updateAuthor(authorId, updatedAuthor), true);

        const author = await getAuthorById(authorId);
        assert.equal(author.first_name, updatedAuthor.first_name);
        assert.equal(author.last_name, updatedAuthor.last_name);
        assert.equal(author.nationality, updatedAuthor.nationality);
      });

      await runTest('deleteAuthor supprime l’auteur', async () => {
        assert.ok(authorId);
        assert.equal(await deleteAuthor(authorId), true);
      });

      await runTest('getAuthorById retourne null après suppression', async () => {
        assert.ok(authorId);
        assert.equal(await getAuthorById(authorId), null);
      });
    }
  } finally {
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
