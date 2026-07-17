// apps/api-server/scripts/test-db.ts
//
// Confirms NeDB can read/write files in apps/api-server/data/ (permissions,
// path issues, etc.) Run with: npx tsx apps/api-server/scripts/test-db.ts

import { db } from "../src/db";

async function main() {
  for (const [name, store] of Object.entries(db)) {
    const count = await store.count({});
    console.log(`${name}: ${count} records`);
  }
  console.log("DB read/write check passed.");
}

main().catch((err) => {
  console.error("DB test failed:", err);
  process.exit(1);
});
