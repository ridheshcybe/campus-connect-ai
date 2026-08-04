import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("application shell", () => {
  it("exposes a liveness endpoint without database access", async () => {
    const response = await request(createApp()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("uses the standard not-found envelope", async () => {
    const response = await request(createApp()).get("/missing");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });
});
