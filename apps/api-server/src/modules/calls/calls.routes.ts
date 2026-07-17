// apps/api-server/src/modules/calls/calls.routes.ts
import { Router } from "express";
import * as controller from "./calls.controller";

export const callsRouter = Router();

callsRouter.get("/", controller.list);
callsRouter.get("/:id", controller.getById);
