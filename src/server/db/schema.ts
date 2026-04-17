import { pgTable, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;


// 1. Enums
export const requestType = pgEnum("request_type", ["outage", "billing", "start_service", "stop_service", "other"]);
export const requestPriority = pgEnum("request_priority", ["low", "medium", "high"]);
export const requestStatus = pgEnum("request_status", ["submitted", "in_progress", "resolved", "rejected", "closed"]);
export const commentVisibility = pgEnum("comment_visibility", ["public", "internal"]);

// 2. Service Requests table
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: text("reference").notNull().unique(),       // e.g. "SR-0001"
  customerId: uuid("customer_id").notNull().references(() => users.id),
  type: requestType("type").notNull(),
  priority: requestPriority("priority").notNull(),
  description: text("description").notNull(),
  status: requestStatus("status").notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. Status history (append-only log)
export const serviceRequestEvents = pgTable("service_request_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => serviceRequests.id),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  fromStatus: requestStatus("from_status"),              // null on creation
  toStatus: requestStatus("to_status").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. Comments (public or internal)
export const serviceRequestComments = pgTable("service_request_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => serviceRequests.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  visibility: commentVisibility("visibility").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Inferred types
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type ServiceRequestEvent = typeof serviceRequestEvents.$inferSelect;
export type ServiceRequestComment = typeof serviceRequestComments.$inferSelect;

