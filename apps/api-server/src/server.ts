// apps/api-server/src/server.ts

import express from "express";
import { callsRouter } from "./calls/index";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/calls", callsRouter);

app.listen(PORT, () => {
  console.log(`CampusConnect AI API server running on http://localhost:${PORT}`);
});
