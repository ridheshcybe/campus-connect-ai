// apps/api-server/src/auth/index.ts
//
// POST /auth/login  — verifies email+password against db.users, returns a JWT
// POST /auth/register — dev-only helper to create a User so login can be
//   tested locally (no admin invite flow exists yet — see docs/api-spec.md
//   TODO). Remove or lock this down before anything resembling production.

import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db, User } from "../db";
import { newId } from "../utils/ids";
import { AppError } from "../utils/errors";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const SALT_ROUNDS = 10;

const registerSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "staff"]).default("staff"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register  (dev-only, see note above)
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }
  const { tenantId, email, password, role } = parsed.data;

  const existing = await db.users.findOne<User>({ email });
  if (existing) {
    throw new AppError(409, "A user with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: newId(),
    tenantId,
    email,
    passwordHash,
    role,
  };

  const created = await db.users.insert<User>(user);
  res.status(201).json({ id: created.id, email: created.email, role: created.role });
});

// POST /auth/login
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }
  const { email, password } = parsed.data;

  const user = await db.users.findOne<User>({ email });
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token });
});
