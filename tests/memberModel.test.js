const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pool } = require('../src/config/database');
const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} = require('../src/models/memberModel');

async function main() {
  const failures = [];
  let memberId;
  const marker = randomUUID().replaceAll('-', '').slice(0, 20);
  const initialMember = {
    first_name: `Test${marker}`,
    last_name: 'Member',
    email: `test.${marker}@example.com`,
    registration_date: '2025-01-15',
    status: 'Active',
  };
  const updatedMember = {
    first_name: `Updated${marker}`,
    last_name: 'Member',
    email: `updated.${marker}@example.com`,
    registration_date: '2025-02-16',
    status: 'Inactive',
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
      await runTest('getAllMembers retourne une liste', async () => {
        const members = await getAllMembers();
        assert.ok(Array.isArray(members));
      });

      await runTest('createMember crée un membre de test', async () => {
        memberId = await createMember(initialMember);
        assert.ok(Number.isInteger(memberId) && memberId > 0);
      });

      await runTest('getMemberById retrouve le membre', async () => {
        assert.ok(memberId);
        const member = await getMemberById(memberId);
        assert.equal(member.first_name, initialMember.first_name);
        assert.equal(member.last_name, initialMember.last_name);
        assert.equal(member.email, initialMember.email);
      });

      await runTest('updateMember modifie le membre', async () => {
        assert.ok(memberId);
        assert.equal(await updateMember(memberId, updatedMember), true);

        const member = await getMemberById(memberId);
        assert.equal(member.first_name, updatedMember.first_name);
        assert.equal(member.last_name, updatedMember.last_name);
        assert.equal(member.email, updatedMember.email);
        assert.equal(member.status, updatedMember.status);
      });

      await runTest('deleteMember supprime le membre', async () => {
        assert.ok(memberId);
        assert.equal(await deleteMember(memberId), true);
      });

      await runTest('getMemberById retourne null après suppression', async () => {
        assert.ok(memberId);
        assert.equal(await getMemberById(memberId), null);
      });

      await runTest('createMember rejette un prénom vide', async () => {
        await assert.rejects(
          () =>
            createMember({
              ...initialMember,
              first_name: '   ',
            }),
          TypeError,
        );
      });

      await runTest('createMember rejette un nom vide', async () => {
        await assert.rejects(
          () =>
            createMember({
              ...initialMember,
              last_name: '',
            }),
          TypeError,
        );
      });

      await runTest('createMember rejette un e-mail invalide', async () => {
        await assert.rejects(
          () =>
            createMember({
              ...initialMember,
              email: 'invalid-email',
            }),
          TypeError,
        );
      });

      await runTest(
        'createMember rejette une date d’inscription manquante',
        async () => {
          await assert.rejects(
            () =>
              createMember({
                ...initialMember,
                registration_date: undefined,
              }),
            TypeError,
          );
        },
      );

      await runTest('createMember rejette un statut vide', async () => {
        await assert.rejects(
          () =>
            createMember({
              ...initialMember,
              status: '   ',
            }),
          TypeError,
        );
      });
    }
  } finally {
    if (memberId !== undefined) {
      try {
        const member = await getMemberById(memberId);
        if (member !== null) {
          await deleteMember(memberId);
        }
        console.log('PASS - nettoyage du membre de test');
      } catch (error) {
        failures.push({ name: 'nettoyage du membre de test', error });
        console.error(`FAIL - nettoyage du membre de test: ${error.message}`);
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
