import "dotenv/config";
import { db } from "./index";
import { users } from "./schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Seeding users...");
  await db.execute(sql`TRUNCATE TABLE ${users} RESTART IDENTITY CASCADE`);

  await db.insert(users).values([
    {
      email: "customer@example.com",
      name: "Casey Customer",
      role: "customer",
    },
    {
      email: "admin@example.com",
      name: "Avery Admin",
      role: "admin",
    },
  ]);

  console.log("Done. You can now log in as customer@example.com or admin@example.com.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
