const argon2 = require("argon2");
const db = require("../db");

const demoUsers = [
  "admin@cefms.edu",
  "coord.music@cefms.edu",
  "coord.sports@cefms.edu",
  "participant1@cefms.edu",
  "participant2@cefms.edu",
  "participant3@cefms.edu",
  "participant4@cefms.edu",
  "participant5@cefms.edu",
  "participant6@cefms.edu",
  "participant7@cefms.edu",
  "participant8@cefms.edu",
  "participant9@cefms.edu",
  "participant10@cefms.edu",
  "volunteer1@cefms.edu",
  "volunteer2@cefms.edu",
  "volunteer3@cefms.edu"
];

async function main() {
  const password = "correct horse battery staple";

  for (const email of demoUsers) {
    const hash = await argon2.hash(password);

    await db.query(
      `UPDATE "User"
       SET password_hash = $2
       WHERE email = $1`,
      [email, hash]
    );

    console.log(`Updated hash for ${email}`);
  }

  await db.pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await db.pool.end();
  process.exit(1);
});
