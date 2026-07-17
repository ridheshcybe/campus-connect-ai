// apps/api-server/src/server.ts
import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ CampusConnect AI API server running on http://localhost:${env.PORT}`);
  console.log(`   Health:    http://localhost:${env.PORT}/health`);
  console.log(`   Calls:     http://localhost:${env.PORT}/api/v1/calls`);
  console.log(`   Dashboard: http://localhost:${env.PORT}/api/v1/dashboard/stats`);
});
