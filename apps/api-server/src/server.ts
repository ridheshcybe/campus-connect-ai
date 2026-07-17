// apps/api-server/src/server.ts

import path from "path";
import dotenv from "dotenv";

// Load apps/api-server/.env explicitly — dotenv's default `import
// "dotenv/config"` only looks in process.cwd(), which is the repo root
// when this is started via the root npm scripts, not this folder.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { app } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  console.log(`CampusConnect AI API server running on http://localhost:${PORT}`);
});
