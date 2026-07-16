// apps/api-server/src/calls/index.ts

import { Router } from "express";

interface Call {
  id: string;
  tenantId: string;
  callerNumber: string;
  language: string;
  issueCategory: string;
  status: string;
  createdAt: string;
}

const dummyCalls: Call[] = [
  {
    id: "call-001",
    tenantId: "abc",
    callerNumber: "+91-9876543210",
    language: "ta",
    issueCategory: "fees",
    status: "resolved",
    createdAt: "2026-07-16T09:15:00.000Z",
  },
  {
    id: "call-002",
    tenantId: "abc",
    callerNumber: "+91-8765432109",
    language: "en",
    issueCategory: "admission",
    status: "pending",
    createdAt: "2026-07-16T09:42:00.000Z",
  },
  {
    id: "call-003",
    tenantId: "abc",
    callerNumber: "+91-7654321098",
    language: "hi",
    issueCategory: "hostel",
    status: "escalated",
    createdAt: "2026-07-16T10:05:00.000Z",
  },
  {
    id: "call-004",
    tenantId: "xyz",
    callerNumber: "+91-6543210987",
    language: "te",
    issueCategory: "transport",
    status: "pending",
    createdAt: "2026-07-16T10:30:00.000Z",
  },
  {
    id: "call-005",
    tenantId: "abc",
    callerNumber: "+91-5432109876",
    language: "ml",
    issueCategory: "placements",
    status: "resolved",
    createdAt: "2026-07-16T11:00:00.000Z",
  },
];

export const callsRouter = Router();

callsRouter.get("/", (_req, res) => {
  res.json(dummyCalls);
});
