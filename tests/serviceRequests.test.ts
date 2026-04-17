import { vi } from "vitest";

// next-auth can't load in Vitest — mock auth() so the tRPC context import works
vi.mock("~/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

import { canTransition } from "~/lib/transitions";
import { db } from "~/server/db";
import { users, serviceRequests, serviceRequestEvents, serviceRequestComments } from "~/server/db/schema";
import { serviceRequestsRouter } from "~/server/trpc/routers/serviceRequests";
import { createTRPCContext } from "~/server/trpc/trpc";
import { truncateAllTables } from "./setup";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal tRPC caller with a faked session */
function makeCaller(role: "customer" | "admin", userId: string) {
  const ctx = {
    db,
    session: {
      user: { id: userId, role, email: `${role}@test.com`, name: role },
      expires: new Date(Date.now() + 86400_000).toISOString(),
    },
  };
  return serviceRequestsRouter.createCaller(ctx as Awaited<ReturnType<typeof createTRPCContext>>);
}

/** Insert a bare-bones user row and return its id */
async function seedUser(email: string, role: "customer" | "admin"): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ email, name: role, role })
    .returning({ id: users.id });
  return u!.id;
}

/** Insert a service request and its creation event, return the request */
async function seedRequest(customerId: string, overrides: Partial<typeof serviceRequests.$inferInsert> = {}) {
  const [req] = await db
    .insert(serviceRequests)
    .values({
      reference: `SR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      customerId,
      type: "outage",
      priority: "medium",
      description: "Something is broken right now",
      status: "submitted",
      ...overrides,
    })
    .returning();

  await db.insert(serviceRequestEvents).values({
    requestId: req!.id,
    actorId: customerId,
    fromStatus: null,
    toStatus: req!.status,
  });

  return req!;
}

// ─── canTransition unit tests ─────────────────────────────────────────────────

describe("canTransition", () => {
  // ✅ Allowed
  it("allows submitted → in_progress", () => expect(canTransition("submitted", "in_progress")).toBe(true));
  it("allows submitted → rejected",    () => expect(canTransition("submitted", "rejected")).toBe(true));
  it("allows in_progress → resolved",  () => expect(canTransition("in_progress", "resolved")).toBe(true));
  it("allows in_progress → rejected",  () => expect(canTransition("in_progress", "rejected")).toBe(true));
  it("allows resolved → closed",       () => expect(canTransition("resolved", "closed")).toBe(true));

  // ❌ Disallowed
  it("blocks submitted → resolved",    () => expect(canTransition("submitted", "resolved")).toBe(false));
  it("blocks submitted → closed",      () => expect(canTransition("submitted", "closed")).toBe(false));
  it("blocks in_progress → submitted", () => expect(canTransition("in_progress", "submitted")).toBe(false));
  it("blocks resolved → in_progress",  () => expect(canTransition("resolved", "in_progress")).toBe(false));
  it("blocks resolved → submitted",    () => expect(canTransition("resolved", "submitted")).toBe(false));
  it("blocks closed → anything",       () => expect(canTransition("closed", "submitted")).toBe(false));
  it("blocks closed → in_progress",    () => expect(canTransition("closed", "in_progress")).toBe(false));
  it("blocks rejected → anything",     () => expect(canTransition("rejected", "in_progress")).toBe(false));
  it("blocks rejected → resolved",     () => expect(canTransition("rejected", "resolved")).toBe(false));
  it("handles unknown from-state",     () => expect(canTransition("nonexistent", "submitted")).toBe(false));
});

// ─── Integration tests ────────────────────────────────────────────────────────

describe("serviceRequests procedures", () => {
  let customerId: string;
  let otherCustomerId: string;
  let adminId: string;

  beforeEach(async () => {
    await truncateAllTables();
    customerId = await seedUser("customer@test.com", "customer");
    otherCustomerId = await seedUser("other@test.com", "customer");
    adminId = await seedUser("admin@test.com", "admin");
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a request and writes a creation event", async () => {
      const caller = makeCaller("customer", customerId);

      const result = await caller.create({
        type: "billing",
        priority: "high",
        description: "I was overcharged this month",
      });

      expect(result).toMatchObject({
        customerId,
        type: "billing",
        priority: "high",
        status: "submitted",
      });

      // Event row must exist
      const events = await db
        .select()
        .from(serviceRequestEvents)
        .where(
          (await import("drizzle-orm")).eq(serviceRequestEvents.requestId, result!.id)
        );

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        fromStatus: null,
        toStatus: "submitted",
        actorId: customerId,
      });
    });

    it("rejects description shorter than 10 characters", async () => {
      const caller = makeCaller("customer", customerId);
      await expect(
        caller.create({ type: "other", priority: "low", description: "short" })
      ).rejects.toThrow();
    });

    it("blocks an admin from calling create (FORBIDDEN)", async () => {
      const caller = makeCaller("admin", adminId);
      await expect(
        caller.create({ type: "outage", priority: "low", description: "admin trying customer route" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  // ── getMine ───────────────────────────────────────────────────────────────

  describe("getMine", () => {
    it("returns the customer's own request", async () => {
      const req = await seedRequest(customerId);
      const caller = makeCaller("customer", customerId);
      const result = await caller.getMine({ id: req.id });
      expect(result.id).toBe(req.id);
    });

    it("throws NOT_FOUND when accessing another customer's request", async () => {
      const req = await seedRequest(otherCustomerId);
      const caller = makeCaller("customer", customerId);
      await expect(caller.getMine({ id: req.id })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("strips internal comments — customer never sees them", async () => {
      const req = await seedRequest(customerId);

      // Insert one public and one internal comment
      await db.insert(serviceRequestComments).values([
        {
          requestId: req.id,
          authorId: adminId,
          visibility: "public",
          body: "We are looking into this.",
        },
        {
          requestId: req.id,
          authorId: adminId,
          visibility: "internal",
          body: "Internal note: customer is on free tier.",
        },
      ]);

      const caller = makeCaller("customer", customerId);
      const result = await caller.getMine({ id: req.id });

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]!.visibility).toBe("public");
      expect(result.comments.every((c) => c.visibility !== "internal")).toBe(true);
    });
  });

  // ── Authorization: customer cannot call admin procedures ──────────────────

  describe("authorization", () => {
    it("blocks a customer from calling listAll (FORBIDDEN)", async () => {
      const caller = makeCaller("customer", customerId);
      await expect(caller.listAll({ sort: "desc" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("blocks a customer from calling getOne (FORBIDDEN)", async () => {
      const req = await seedRequest(customerId);
      const caller = makeCaller("customer", customerId);
      await expect(caller.getOne({ id: req.id })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("blocks a customer from calling updateStatus (FORBIDDEN)", async () => {
      const req = await seedRequest(customerId);
      const caller = makeCaller("customer", customerId);
      await expect(
        caller.updateStatus({ id: req.id, toStatus: "in_progress" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("blocks a customer from calling addComment (FORBIDDEN)", async () => {
      const req = await seedRequest(customerId);
      const caller = makeCaller("customer", customerId);
      await expect(
        caller.addComment({ id: req.id, body: "sneaky comment", visibility: "public" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  describe("updateStatus", () => {
    it("transitions status and writes an event row", async () => {
      const req = await seedRequest(customerId);
      const caller = makeCaller("admin", adminId);

      const updated = await caller.updateStatus({ id: req.id, toStatus: "in_progress" });
      expect(updated!.status).toBe("in_progress");

      const { eq } = await import("drizzle-orm");
      const events = await db
        .select()
        .from(serviceRequestEvents)
        .where(eq(serviceRequestEvents.requestId, req.id));

      // Should have creation event + transition event
      expect(events).toHaveLength(2);
      const transitionEvent = events.find((e) => e.fromStatus !== null);
      expect(transitionEvent).toMatchObject({
        fromStatus: "submitted",
        toStatus: "in_progress",
        actorId: adminId,
      });
    });

    it("rejects a disallowed backward transition", async () => {
      const req = await seedRequest(customerId, { status: "resolved" });
      const caller = makeCaller("admin", adminId);

      await expect(
        caller.updateStatus({ id: req.id, toStatus: "in_progress" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects transition from closed (terminal state)", async () => {
      const req = await seedRequest(customerId, { status: "closed" });
      const caller = makeCaller("admin", adminId);

      await expect(
        caller.updateStatus({ id: req.id, toStatus: "in_progress" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects transition from rejected (terminal state)", async () => {
      const req = await seedRequest(customerId, { status: "rejected" });
      const caller = makeCaller("admin", adminId);

      await expect(
        caller.updateStatus({ id: req.id, toStatus: "in_progress" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ── addComment ────────────────────────────────────────────────────────────

  describe("addComment", () => {
    it("admin can post a public comment", async () => {
      const req = await seedRequest(customerId);
      const caller = makeCaller("admin", adminId);

      const comment = await caller.addComment({
        id: req.id,
        body: "We are working on your request.",
        visibility: "public",
      });

      expect(comment).toMatchObject({ visibility: "public", authorId: adminId });
    });

    it("admin can post an internal note", async () => {
      const req = await seedRequest(customerId);
      const caller = makeCaller("admin", adminId);

      const comment = await caller.addComment({
        id: req.id,
        body: "Customer is flagged in billing system.",
        visibility: "internal",
      });

      expect(comment).toMatchObject({ visibility: "internal" });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe("listAll", () => {
    it("admin sees requests from all customers", async () => {
      await seedRequest(customerId);
      await seedRequest(otherCustomerId);

      const caller = makeCaller("admin", adminId);
      const results = await caller.listAll({ sort: "desc" });

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("filters by status", async () => {
      await seedRequest(customerId, { status: "submitted" });
      await seedRequest(customerId, { status: "resolved" });

      const caller = makeCaller("admin", adminId);
      const results = await caller.listAll({ status: "submitted", sort: "desc" });

      expect(results.every((r) => r.status === "submitted")).toBe(true);
    });

    it("filters by priority", async () => {
      await seedRequest(customerId, { priority: "high" });
      await seedRequest(customerId, { priority: "low" });

      const caller = makeCaller("admin", adminId);
      const results = await caller.listAll({ priority: "high", sort: "desc" });

      expect(results.every((r) => r.priority === "high")).toBe(true);
    });
  });
});