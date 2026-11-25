const { pool } = require("../config/database");

function validateMember(member) {
  if (
    !member ||
    typeof member.first_name !== "string" ||
    member.first_name.trim() === "" ||
    typeof member.last_name !== "string" ||
    member.last_name.trim() === ""
  ) {
    throw new TypeError(
      "first_name et last_name doivent être des chaînes non vides.",
    );
  }

  const email = typeof member.email === "string" ? member.email.trim() : "";
  if (!email.includes("@") || !email.split("@")[1].includes(".")) {
    throw new TypeError("email doit être une adresse e-mail valide.");
  }

  if (
    member.registration_date === undefined ||
    member.registration_date === null ||
    (typeof member.registration_date === "string" &&
      member.registration_date.trim() === "")
  ) {
    throw new TypeError("registration_date est obligatoire.");
  }

  if (typeof member.status !== "string" || member.status.trim() === "") {
    throw new TypeError("status doit être une chaîne non vide.");
  }
}

async function getAllMembers() {
  const [rows] = await pool.execute("SELECT * FROM MEMBER");
  return rows;
}

async function getMemberById(id) {
  const [rows] = await pool.execute(
    "SELECT * FROM MEMBER WHERE id_member = ?",
    [id],
  );
  return rows[0] ?? null;
}

async function createMember(member) {
  validateMember(member);

  const [result] = await pool.execute(
    `INSERT INTO MEMBER (first_name, last_name, email, phone, registration_date, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      member.first_name.trim(),
      member.last_name.trim(),
      member.email.trim(),
      member.phone ?? null,
      typeof member.registration_date === "string"
        ? member.registration_date.trim()
        : member.registration_date,
      member.status.trim(),
    ],
  );
  return result.insertId;
}

async function updateMember(id, member) {
  validateMember(member);

  const [result] = await pool.execute(
    `UPDATE MEMBER
     SET first_name = ?, last_name = ?, email = ?, phone = ?, registration_date = ?, status = ?
     WHERE id_member = ?`,
    [
      member.first_name.trim(),
      member.last_name.trim(),
      member.email.trim(),
      member.phone ?? null,
      typeof member.registration_date === "string"
        ? member.registration_date.trim()
        : member.registration_date,
      member.status.trim(),
      id,
    ],
  );
  return result.affectedRows > 0;
}

async function deleteMember(id) {
  const [result] = await pool.execute(
    "DELETE FROM MEMBER WHERE id_member = ?",
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
};
