# Evaluation Rubric

We grade every submission against the six categories below on a 1–4 scale.

- **4** — Strong (we'd happily ship this)
- **3** — Solid (we'd ship with minor changes)
- **2** — Concerning (significant rework needed)
- **1** — Not there yet

Two engineers score independently and then reconcile.

## Categories

### Architecture & Boundaries — 25%
- **4:** Procedure builders (`customerProcedure`, `adminProcedure`) used; pure status-transition function; schema decisions justified in PR description.
- **1:** Role checks duplicated inline in every resolver; business logic tangled with HTTP handlers; schema choices unexplained.

### Testing — 20%
- **4:** Tests target risky logic (auth, transitions, visibility). Test names describe behavior, not implementation.
- **1:** Happy path only. No auth tests. Chasing coverage rather than signal.

### Product Thinking — 20%
- **4:** Empty states, invalid transitions, and unauthorized access are all handled gracefully; PR description explains trade-offs and what was cut for time.
- **1:** Crashes on bad input; dead-end blank screens; no discussion of decisions.

### Code Quality & TypeScript — 15% *(gate: must be ≥ 2)*
- **4:** No `any`, no `ts-ignore`, strict types, small focused functions, named exports.
- **1:** `any` used, `ts-ignore` present, 200+ line components, unclear types.

### Security & Authorization — 15% *(gate: must be ≥ 2)*
- **4:** Authorization enforced server-side at the tRPC layer; **field-level visibility** for internal comments correct; Zod validates every input.
- **1:** Authorization only hidden in the UI; internal comments leak to customers; unvalidated input reaches the DB.

### UI Craft — 5%
- **4:** Accessible, keyboard-navigable, sensible hierarchy, error states, loading states.
- **1:** Unlabeled buttons, no error states, broken on narrow viewports.

## Gates

Any score below 2 on **Code Quality** or **Security** is an automatic no-hire, regardless of other scores. These are the two skills we can't coach post-hire.

## Deliberate Signal — Internal Notes

A customer viewing their own request detail must **not** see admin `internal` comments. It's easy to hide them in the UI but leave the tRPC response returning everything. Candidates who test the response payload (not the rendered UI) demonstrate the security mindset we're looking for.
