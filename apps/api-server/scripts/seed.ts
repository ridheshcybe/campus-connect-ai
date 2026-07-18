// apps/api-server/scripts/seed.ts
// Seeds the database with two test tenants, users, and sample call data.
// Run: npx tsx scripts/seed.ts
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Tenants ──────────────────────────────────────────────
  const abc = await db.tenants.upsert({
    where: { slug: "abc" },
    update: {},
    create: { slug: "abc", name: "ABC College" },
  });

  const xyz = await db.tenants.upsert({
    where: { slug: "xyz" },
    update: {},
    create: { slug: "xyz", name: "XYZ University" },
  });

  console.log(`✅ Tenants: ${abc.name}, ${xyz.name}`);

  // ── Settings ──────────────────────────────────────────────
  for (const tenant of [abc, xyz]) {
    await db.settings.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        greetingText: `Welcome to ${tenant.name} help desk.`,
        escalationEmail: `helpdesk@${tenant.slug}.edu`,
        defaultLanguage: "en",
      },
    });
  }

  // ── Admin Users ───────────────────────────────────────────
  const adminHash = await argon2.hash("Admin@1234", { type: argon2.argon2id });

  const abcAdmin = await db.users.upsert({
    where: { tenantId_email: { tenantId: abc.id, email: "admin@abc.edu" } },
    update: {},
    create: {
      tenantId: abc.id,
      email: "admin@abc.edu",
      passwordHash: adminHash,
      name: "ABC Admin",
      role: "admin",
    },
  });

  const xyzAdmin = await db.users.upsert({
    where: { tenantId_email: { tenantId: xyz.id, email: "admin@xyz.edu" } },
    update: {},
    create: {
      tenantId: xyz.id,
      email: "admin@xyz.edu",
      passwordHash: adminHash,
      name: "XYZ Admin",
      role: "admin",
    },
  });

  console.log(`✅ Users: ${abcAdmin.email}, ${xyzAdmin.email}`);

  // ── Sample Calls ──────────────────────────────────────────
  const statuses = ["active", "completed", "escalated", "missed"] as const;
  const categories = ["fees", "admission", "hostel", "exams", "general"] as const;
  const languages = ["en", "ta", "hi"] as const;

  for (const tenant of [abc, xyz]) {
    for (let i = 0; i < 5; i++) {
      const status = statuses[i % statuses.length]!;
      const call = await db.calls.create({
        data: {
          tenantId: tenant.id,
          callerNumber: `+9190000${tenant.slug === "abc" ? "1" : "2"}000${i}`,
          channel: "voice",
          language: languages[i % languages.length]!,
          status,
          issueCategory: categories[i % categories.length],
          confidenceScore: status === "escalated" ? 0.42 : 0.87,
          durationSeconds: 60 + i * 30,
          summary: `Caller asked about ${categories[i % categories.length]} — resolved.`,
        },
      });

      // Transcript turns
      await db.transcriptTurns.createMany({
        data: [
          { tenantId: tenant.id, callId: call.id, turnIndex: 0, role: "ai", text: "Hello, how can I help you?" },
          { tenantId: tenant.id, callId: call.id, turnIndex: 1, role: "caller", text: `Question about ${categories[i % categories.length]}` },
          { tenantId: tenant.id, callId: call.id, turnIndex: 2, role: "ai", text: "Let me look that up for you." },
        ],
      });

      // AI response
      await db.aiResponses.create({
        data: {
          tenantId: tenant.id,
          callId: call.id,
          turnIndex: 2,
          answerText: "Here is the information you requested.",
          confidenceScore: status === "escalated" ? 0.42 : 0.87,
          issueCategory: categories[i % categories.length],
          shouldEscalate: status === "escalated",
          language: languages[i % languages.length]!,
        },
      });

      // Escalation record if needed
      if (status === "escalated") {
        await db.escalations.create({
          data: {
            tenantId: tenant.id,
            callId: call.id,
            reason: "Low AI confidence score",
          },
        });
      }
    }
  }

  console.log("✅ Sample calls, turns, AI responses, and escalations seeded.");
  console.log("\n🎉 Seed complete!");
  console.log("   Tenant 'abc' admin: admin@abc.edu / Admin@1234");
  console.log("   Tenant 'xyz' admin: admin@xyz.edu / Admin@1234");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
