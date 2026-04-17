# Service Requests — Take-Home Assignment

Welcome, and thank you for your time. This take-home is our main technical signal for the mid-level full-stack engineer role. Please read this README in full before starting.

**Target effort: ~6 hours. Hard cap: 8 hours.** Partial submissions are welcome — a polished slice beats a sprawling incomplete attempt.

---

## The Problem

You are building a "Service Requests" feature for a customer platform. Customers submit requests (e.g., report an outage, start service). Admins triage them, change status, and reply.

### Roles

- **Customer** — submits requests and tracks their own.
- **Admin** — sees all requests, changes status, replies publicly, and records internal notes.

Two seed users are created for you:

| Email                      | Role     |
|----------------------------|----------|
| `customer@example.com`     | customer |
| `admin@example.com`        | admin    |

(The login page accepts any password. This is a deliberate simplification.)

### Functional Requirements

#### Portal (`/portal`) — customer

1. **Submit a service request.**
   - `type`: one of `outage`, `billing`, `start_service`, `stop_service`, `other`.
   - `priority`: one of `low`, `medium`, `high`.
   - `description`: 10–2000 characters.
   - Created with status `submitted`, owned by the signed-in customer.

2. **My requests list** (`/portal/requests`) — newest first. Columns: reference, type, priority, status, created at.

3. **Request detail** (`/portal/requests/[id]`) — show request fields, status history, and **public** admin comments. **Internal admin notes must not be visible or fetchable by customers.** A customer must not be able to access another customer's request.

#### Admin (`/admin`) — staff

1. **Queue** (`/admin/requests`) — all requests, filterable by status and priority (server-side), sortable by created date.

2. **Request detail** (`/admin/requests/[id]`) — all fields + customer identity.
   - Change status. The allowed transitions are:
     ```
     submitted   → in_progress, rejected
     in_progress → resolved, rejected
     resolved    → closed
     ```
     Backward transitions are not allowed.
   - Post a **public** comment (visible to customer).
   - Post an **internal** note (admins only).
   - See full history with visibility labels.

### Cross-Cutting Requirements

- Authorization must be enforced at the **tRPC layer**, not just in the UI. UI-only hiding will fail review.
- **Field-level visibility**: customers must not receive `internal` comments in API responses, even on requests they own.
- Zod validates every input at the procedure boundary.
- Empty states and basic error states for both apps.

### Explicit Non-Goals

You do **not** need to build: signup, profile editing, password reset, email/notifications, file uploads, pagination beyond a simple limit, admin assignment, SLA timers, audit export, i18n, dark mode, or mobile-specific layouts.

---

## What You Have (The Starter)

- **Next.js 15** (App Router) with TypeScript strict mode.
- **tRPC v11** — server set up at `src/server/trpc/`, React client at `src/trpc/`.
- **Drizzle + Postgres** — `users` table is provided; add your own tables.
- **NextAuth v5 Credentials** — email-only, role read from the user row, session includes `id` and `role`.
- **Vitest** — configured; a `truncateAllTables()` helper is in `tests/setup.ts`.
- **Tailwind + two UI primitives** (`Button`, `Input`) — add more if you need them.

Nothing feature-specific is pre-written. No sample procedure, no sample table, no sample component beyond the primitives above. Design it yourself.

## Suggested (Not Required) Shape

You may vary these — justify your choice in the PR description.

**Data model:**

```
service_requests        id, reference, customer_id, type, priority, description, status, created_at, updated_at
service_request_events  id, request_id, actor_id, from_status, to_status, at         (append-only)
service_request_comments id, request_id, author_id, visibility ('public'|'internal'), body, created_at
```

**tRPC surface:**

```
serviceRequests.create          (customer)
serviceRequests.listMine        (customer)
serviceRequests.getMine         (customer)   strips internal comments
serviceRequests.listAll         (admin)      input { status?, priority?, sort? }
serviceRequests.getOne          (admin)      full detail including internal comments
serviceRequests.updateStatus    (admin)
serviceRequests.addComment      (admin)      input includes visibility
```

We'll look specifically for:

1. **Procedure builders** — a `customerProcedure` and an `adminProcedure`, built on top of the `protectedProcedure` already in the starter. Don't repeat role checks inline.
2. **Centralized transition logic** — a pure function `canTransition(from, to): boolean` consumed by `updateStatus`. Easy to unit-test; readable.

## Testing Expectations

**Required:**
- Every allowed and every disallowed transition of `canTransition`.
- Authorization:
  - A customer cannot read another customer's request.
  - A customer cannot call admin procedures.
  - `getMine` strips `internal` comments from the response (test the procedure output, not the rendered UI).
- `create` and `updateStatus` write a `service_request_events` row.

**Recommended:** at least one component/integration test for the submission form.

**Not required:** 100% coverage. Coverage % is not a rubric item.

---

## Prerequisites

You need installed locally:

- **Node.js 22** or newer (`.nvmrc` pins to 22 — `nvm use` works if you use `nvm`).
- **pnpm 10.33** or newer (or just run `corepack enable` and pnpm will auto-resolve from `package.json`).
- **Docker Desktop** running (for the Postgres container).

If any of these is missing, install it first. Running `pnpm install` without Node 22 will produce confusing errors.

## How to Run

```bash
# 1. Install
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Configure env
cp .env.example .env

# 4. Create tables and seed
pnpm db:push
pnpm db:seed

# 5. Run the app
pnpm dev

# 6. Run tests
pnpm test

# 7. Typecheck and lint
pnpm typecheck
pnpm lint
```

Then open [http://localhost:3000](http://localhost:3000).

### Troubleshooting

- **`role "postgres" does not exist` when running `pnpm db:seed`.** Another Postgres is already listening on port 5432 — commonly Homebrew on macOS. Check with `lsof -iTCP:5432 -sTCP:LISTEN`. Either stop it (`brew services stop postgresql@15` or whichever version is running), or change the host port in `docker-compose.yml` from `"5432:5432"` to e.g. `"55432:5432"` and update `DATABASE_URL` in `.env` to match.
- **Port 3000 already in use.** Next.js auto-picks the next free port — check the dev server output for the actual URL.
- **`pnpm db:push` prompts you to confirm a destructive change.** Pass `--force` to skip. Only do this against an empty local DB.

## How to Submit

1. Click **"Use this template"** at the top of this repo to create your own copy on your GitHub account.
2. Clone your new repo locally and work on a feature branch (e.g. `feature/service-requests`).
3. When done, open one pull request from your feature branch into `main` on your own repo. Don't merge it — we review the open PR.
4. Fill in the PR description using the template below.
5. Reply to your invitation email with a link to the PR. Keep the repo public, or share read access with the reviewer named in the email.

### PR Description Template

```markdown
## Approach
2–3 sentences on how you modeled the problem.

## Trade-offs
What you considered and didn't do, and why.

## What I'd do next with more time
3–5 bullets.

## How to run
(Defaults from the README, edit if you changed anything.)

## Time spent
~X hours.
```

---

## AI / LLM Policy

You may use AI tools — Copilot, Cursor, ChatGPT, Claude, anything. We do.

We will ask about your work in the follow-up interview. Be ready to defend any decision in your PR: why this schema shape, why this transition rule, why this test, why you skipped that test. If you can't explain code you shipped, that is the signal we read. You're not on trial — we just want to see how you think.

## What Happens Next

1. Two engineers review your submission independently and score using the published [`RUBRIC.md`](./RUBRIC.md).
2. If it clears the gates, we schedule a 45-minute follow-up interview:
   - ~10 min: you walk us through your PR.
   - ~20 min: we ask "why this and not X?" on a few decisions.
   - ~15 min: a small live extension — e.g., "add a `priority` filter to the admin queue."
3. If it's a fit, we make an offer.

## Questions

If anything is genuinely unclear or blocking you, email the address in your invitation. We won't answer "what should I do?" questions — those are the assignment — but we'll answer anything about the starter or setup.

Good luck, and have fun with it.
