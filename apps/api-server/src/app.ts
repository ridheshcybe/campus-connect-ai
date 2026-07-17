// apps/api-server/src/app.ts
//
// Builds the Express app: middleware + all routers + error handler.
// Kept separate from server.ts (which just calls app.listen) so the app
// can be imported and tested without binding a real port.

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { callsRouter } from "./calls/index";
import { faqsRouter } from "./faqs/index";
import { documentsRouter } from "./documents/index";
import { telephonyRouter } from "./telephony/index";
import { notificationsRouter } from "./notifications/index";
import { aiRouter } from "./ai/index";
import { authRouter } from "./auth/index";
import { tenantsRouter } from "./tenants/index";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/tenants", tenantsRouter);
app.use("/calls", callsRouter);
app.use("/faqs", faqsRouter);
app.use("/documents", documentsRouter);
app.use("/telephony", telephonyRouter);
app.use("/notifications", notificationsRouter);
app.use("/ai", aiRouter);

// Must be mounted last — Express only treats a 4-arg middleware as an
// error handler if it comes after every other app.use()/route.
app.use(errorHandler);
