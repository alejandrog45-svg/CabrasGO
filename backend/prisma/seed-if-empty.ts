// Guards prisma/seed.ts: seed.ts wipes and reseeds every table unconditionally,
// which is correct for the ephemeral SQLite demo but would destroy real trip/user
// data on every container restart once the DB is persistent (Postgres). This
// entrypoint only runs seed.ts on the very first boot, when the DB is empty.
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`DB already has ${userCount} user(s) — skipping seed.`);
    return;
  }
  console.log("DB is empty — running seed...");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
