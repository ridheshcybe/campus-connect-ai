// apps/api-server/src/db.ts
//
// One NeDB datastore per entity. Each is a plain file on disk under data/ —
// no server process, no config needed. autoload: true reads the file on
// startup automatically.
//
// Note: nedb-promises applies the entity type per-*call*
// (e.g. `db.calls.findOne<Call>(...)`), not on Datastore.create() itself —
// so the interfaces below get used at each call site in the route files.

import Datastore from "nedb-promises";
import path from "path";

// Resolve data/ relative to this file's location (apps/api-server/src/db.ts
// -> apps/api-server/data/), not process.cwd() — the root npm scripts run
// from the repo root, so a plain "data/calls.db" would otherwise create a
// stray data/ folder at the repo root instead of inside api-server.
const dataDir = path.join(__dirname, "..", "data");

export interface Call {
  id: string;
  tenantId: string;
  callerNumber: string;
  language: string;
  issueCategory: string;
  status: string;
  escalated: boolean;
  transcriptText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Faq {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  category: string;
  language: string;
  active: boolean;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  tenantId: string;
  title: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  phoneNumber: string;
  defaultLang: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  role: string;
}

export interface FollowUp {
  id: string;
  callId: string;
  tenantId: string;
  channel: string;
  status: string;
  scheduledAt: string;
}

export const db = {
  calls: Datastore.create({ filename: path.join(dataDir, "calls.db"), autoload: true }),
  faqs: Datastore.create({ filename: path.join(dataDir, "faqs.db"), autoload: true }),
  documents: Datastore.create({ filename: path.join(dataDir, "documents.db"), autoload: true }),
  tenants: Datastore.create({ filename: path.join(dataDir, "tenants.db"), autoload: true }),
  users: Datastore.create({ filename: path.join(dataDir, "users.db"), autoload: true }),
  followups: Datastore.create({ filename: path.join(dataDir, "followups.db"), autoload: true }),
};
