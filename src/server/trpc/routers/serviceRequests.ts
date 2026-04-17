import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, customerProcedure, adminProcedure } from "../trpc";
import {
  serviceRequests,
  serviceRequestEvents,
  serviceRequestComments,
  users,
} from "~/server/db/schema";
import { canTransition } from "~/lib/transitions";

// ── Input schemas ─────────────────────────────────────────────────────────────

const createInput = z.object({
  type: z.enum(["outage", "billing", "start_service", "stop_service", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  description: z.string().min(10).max(2000),
});

const listAllInput = z.object({
  status: z
    .enum(["submitted", "in_progress", "resolved", "rejected", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
});

const updateStatusInput = z.object({
  id: z.string().uuid(),
  toStatus: z.enum(["in_progress", "resolved", "rejected", "closed"]),
});

const addCommentInput = z.object({
  id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  visibility: z.enum(["public", "internal"]),
});

// ── Reference generator ───────────────────────────────────────────────────────

async function generateReference(db: typeof import("~/server/db").db): Promise<string> {
  const count = await db.$count(serviceRequests);
  return `SR-${String(count + 1).padStart(4, "0")}`;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const serviceRequestsRouter = createTRPCRouter({
  // Customer: submit a new request
  create: customerProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const reference = await generateReference(ctx.db);
    const [request] = await ctx.db
      .insert(serviceRequests)
      .values({
        reference,
        customerId: ctx.session.user.id,
        type: input.type,
        priority: input.priority,
        description: input.description,
        status: "submitted",
      })
      .returning();

    await ctx.db.insert(serviceRequestEvents).values({
      requestId: request!.id,
      actorId: ctx.session.user.id,
      fromStatus: null,
      toStatus: "submitted",
    });

    return request;
  }),

  // Customer: list their own requests
  listMine: customerProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.customerId, ctx.session.user.id))
      .orderBy(desc(serviceRequests.createdAt));
  }),

  // Customer: get one of their own requests (strips internal comments)
  getMine: customerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [request] = await ctx.db
        .select()
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.id, input.id),
            eq(serviceRequests.customerId, ctx.session.user.id)
          )
        );

      if (!request) throw new TRPCError({ code: "NOT_FOUND" });

      const comments = await ctx.db
        .select()
        .from(serviceRequestComments)
        .where(
          and(
            eq(serviceRequestComments.requestId, input.id),
            eq(serviceRequestComments.visibility, "public")
          )
        )
        .orderBy(desc(serviceRequestComments.createdAt));

      const events = await ctx.db
        .select()
        .from(serviceRequestEvents)
        .where(eq(serviceRequestEvents.requestId, input.id))
        .orderBy(desc(serviceRequestEvents.at));

      return { ...request, comments, events };
    }),

  // Admin: list all requests with filters
  listAll: adminProcedure.input(listAllInput).query(async ({ ctx, input }) => {
    const conditions = [];
    if (input.status) conditions.push(eq(serviceRequests.status, input.status));
    if (input.priority) conditions.push(eq(serviceRequests.priority, input.priority));

    return ctx.db
      .select()
      .from(serviceRequests)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        input.sort === "asc"
          ? serviceRequests.createdAt
          : desc(serviceRequests.createdAt)
      );
  }),

  // Admin: get full request detail including internal comments
  getOne: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [request] = await ctx.db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, input.id));

      if (!request) throw new TRPCError({ code: "NOT_FOUND" });

      const [customer] = await ctx.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, request.customerId));

      const comments = await ctx.db
        .select()
        .from(serviceRequestComments)
        .where(eq(serviceRequestComments.requestId, input.id))
        .orderBy(desc(serviceRequestComments.createdAt));

      const events = await ctx.db
        .select()
        .from(serviceRequestEvents)
        .where(eq(serviceRequestEvents.requestId, input.id))
        .orderBy(desc(serviceRequestEvents.at));

      return { ...request, customerEmail: customer?.email ?? "Unknown", comments, events };
    }),

  // Admin: change request status
  updateStatus: adminProcedure
    .input(updateStatusInput)
    .mutation(async ({ ctx, input }) => {
      const [request] = await ctx.db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, input.id));

      if (!request) throw new TRPCError({ code: "NOT_FOUND" });

      if (!canTransition(request.status, input.toStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${request.status} to ${input.toStatus}`,
        });
      }

      const [updated] = await ctx.db
        .update(serviceRequests)
        .set({ status: input.toStatus, updatedAt: new Date() })
        .where(eq(serviceRequests.id, input.id))
        .returning();

      await ctx.db.insert(serviceRequestEvents).values({
        requestId: input.id,
        actorId: ctx.session.user.id,
        fromStatus: request.status,
        toStatus: input.toStatus,
      });

      return updated;
    }),

  // Admin: post a comment (public or internal)
  addComment: adminProcedure
    .input(addCommentInput)
    .mutation(async ({ ctx, input }) => {
      const [request] = await ctx.db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, input.id));

      if (!request) throw new TRPCError({ code: "NOT_FOUND" });

      const [comment] = await ctx.db
        .insert(serviceRequestComments)
        .values({
          requestId: input.id,
          authorId: ctx.session.user.id,
          visibility: input.visibility,
          body: input.body,
        })
        .returning();

      return comment;
    }),
});