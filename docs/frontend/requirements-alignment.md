# Requirements Alignment — full-budget-app

**Status:** Draft
**Date:** 2026-04-21
**Author:** Debraj Paul
**Scope:** Align backend capabilities with product requirements and identify the frontend work stream.

---

## 1. Product One-Liner

A **multi-tenant, serverless budgeting platform** that ingests bank statements, auto-categorises transactions (rules + Bedrock fallback), and exposes a GraphQL API powering dashboards, budgets, forecasts, recurring transactions, savings goals, and sinking funds.

Target user today: retail/personal users (`TenantType.PERSONAL`) with an explicit path toward `CLIENT` tenants — i.e. advisors/SMBs managing multiple clients.

---

## 2. Functional Requirements (extracted from README + ARCHITECTURE.md + SDL)

| # | Capability | Backend evidence |
|---|---|---|
| FR-1 | Register & login with tenant scope | `Mutation.register`, `Mutation.login`; JWT stored client-side, decoded in `context.ts` |
| FR-2 | List tenants available in system | `Query.tenants` (`PERSONAL`, `CLIENT`, `DEFAULT`) |
| FR-3 | Upload bank statement (HDFC / SBI / AXIS / other; SAVINGS / CURRENT / CREDIT_CARD) | `Mutation.uploadStatement(StatementInput!)` — base64 payload → S3 → SQS → `txn-loaders` |
| FR-4 | Auto-ingest & normalise transactions from uploaded statements | `apps/txn-loaders` (SQS-triggered Lambda) + `@parser` |
| FR-5 | Auto-categorise transactions (rule engine → Bedrock fallback) | `apps/tag-loaders` (DynamoDB stream) + `@nlp-tagger` + `BedrockClassifierService` |
| FR-6 | List transactions filtered by year/month/bank/category, cursor-paginated | `Query.transactions(filters, cursor)` → `TransactionsPage` |
| FR-7 | Reclassify a transaction manually | `Mutation.reclassifyTransaction(id, category)` |
| FR-8 | Add/sync transaction category rules for tenant | `Mutation.addTransactionCategory` |
| FR-9 | Annual review: income, expense, net savings, transactions | `Query.annualReview(year)` |
| FR-10 | Monthly review: income, expenses, savings, category breakdown, time series | `Query.monthlyReview(month, year)` |
| FR-11 | Aggregated summary (year, optional month) | `Query.aggregateSummary(year, month)` |
| FR-12 | Category breakdown grouped by category with totals | `Query.categoryBreakdown(month, year)` |
| FR-13 | List categories grouped by base (INCOME / EXPENSES / SAVINGS) | `Query.categoriesByBase` |
| FR-14 | CRUD budgets per category per month | `Mutation.setBudget(period, category, amount)` (no list query yet — see GAP-1) |
| FR-15 | Recurring transactions: list, create, materialise for a month | `Query.recurringTransactions`, `Mutation.createRecurringTransaction`, `Mutation.generateRecurringTransactions` |
| FR-16 | Monthly cash-flow forecast with daily series + alerts | `Query.forecastMonth(year, month, options)` |
| FR-17 | Savings goals with history | `Query.savingsGoals` (no create/update mutations — see GAP-2) |
| FR-18 | Sinking funds with targets, balances, monthly contribution | `Query.sinkingFunds` (no create/update mutations — see GAP-2) |
| FR-19 | Observability: Prometheus `/metrics`, X-Ray, structured logs | `apps/graphql-api/src/utils`, `xray.stack.ts`, `@logger` |

---

## 3. Non-Functional Requirements

| NFR | Target | Backend status | FE impact |
|---|---|---|---|
| Multi-tenant isolation | Every query/mutation scoped by `tenantId` + `userId` in JWT | ✅ Enforced in `context.ts` + resolvers | FE must store and attach `Authorization: Bearer <jwt>` on every request |
| Auth | JWT-based, secret in SSM | ✅ `@auth` package, `verifyToken` | FE: secure token storage (httpOnly cookie via Next.js route handlers preferred over `localStorage`) |
| API style | GraphQL over HTTPS | ✅ Apollo Server | FE: Apollo Client + GraphQL Code Generator |
| File uploads | Bank statements (CSV/PDF) | ⚠️ Base64 over GraphQL — works but payload-heavy and 10 MB Apollo default | FE: show size warning; roadmap → presigned S3 URL (see GAP-3) |
| Cold-start latency | Lambda behind API Gateway; esbuild bundles | ✅ Optimised, provisioned concurrency configurable | FE: show optimistic UI + skeletons on first call after idle |
| Observability | Logs + metrics + traces per tenant | ✅ | FE: propagate `x-request-id`, `x-correlation-id` headers |
| Security | JWT, IAM per Lambda, Bedrock opt-in | ✅ | FE: CSP, HTTPS-only cookies, refresh token flow (see GAP-4) |
| i18n / currency | INR default (`ap-south-1` region, HDFC/SBI/Axis parsers) | ⚠️ `TransactionItem.currency` exists; no conversion logic | FE: currency-aware formatters; future multi-currency support |
| Mobile-first | Personal finance is mobile-heavy | Not in scope of BE | FE: responsive from day 1 |

---

## 4. Gap Analysis (Backend-side gaps that the FE work will surface)

| ID | Gap | Impact on FE | Recommendation |
|---|---|---|---|
| GAP-1 | No `Query.budgets(period)` or `Mutation.deleteBudget` | FE budget page can't list what's been set | Add `budgets(period: PeriodInput!): [Budget!]!` and `deleteBudget(id: String!): Boolean!` |
| GAP-2 | No create/update/delete for `savingsGoals` and `sinkingFunds` | FE can only show read-only data | Add full CRUD mutations; write-heavy UX without them is pointless |
| GAP-3 | Base64 upload is fragile (10 MB default Apollo body limit; base64 inflates ~33%) | Large statements fail silently | Add `Mutation.createUploadUrl(fileName, bankName, bankType): UploadUrl!` returning presigned S3 PUT URL + notify endpoint |
| GAP-4 | No refresh-token flow; only access token from `login` | FE must re-login on expiry or keep long-lived tokens | Add `refreshToken(refreshToken: String!): LoginResponse!` or migrate to httpOnly cookie session with server-side rotation |
| GAP-5 | `Mutation.addTransactionCategory` takes no args (per SDL) | FE can't send custom rules | Tighten schema: `addTransactionCategory(input: CategoryRuleInput!)` |
| GAP-6 | `RecurringTransaction.amount` is a single `Float` (can't distinguish income vs expense cleanly) | FE must infer from `category` → brittle | Add `type: TransactionType!` (INCOME / EXPENSE) |
| GAP-7 | Forecast alerts use strings for `type` | FE can't exhaustively handle alert UI | Promote to enum: `ForecastAlertType` |
| GAP-8 | `TransactionItem.date` and `Transaction.txnDate` are `String!` (not `ISO8601`/`Date` scalar) | FE must parse defensively; TZ bugs likely | Add `Date` / `DateTime` custom scalar; server returns ISO-8601 UTC |
| GAP-9 | No pagination on `annualReview.transactions` | 12 months of txns could be huge | Return a cursor-paginated edge list instead of a flat array |
| GAP-10 | No file-format validation returned synchronously | FE can't surface "unsupported CSV layout" | Add `uploadStatement` return type richer than `Boolean` — return `StatementUploadResult { jobId, accepted, warnings }` |

GAPs 1–4 are **blocking** for a functional v1 FE. GAPs 5–10 can ship in parallel during FE weeks 2–4.

---

## 5. Frontend Work Stream (what needs to be built)

Grouped by epic; each epic maps to pages + components + GraphQL operations.

### Epic A — Auth & Tenant
- Pages: `/login`, `/register`, `/tenant-select` (if post-login tenant switcher needed)
- Flow: POST via GraphQL → store JWT → hydrate user + tenant context → redirect to `/dashboard`
- Ops: `login`, `register`, `tenants`
- Notes: Prefer Next.js Route Handlers + httpOnly cookie over `localStorage`.

### Epic B — Dashboard
- Page: `/dashboard` (default month = current)
- Widgets: KPI cards (income, expense, savings), category donut, budget-vs-actual line chart, recent txns, alerts from forecast
- Ops: `monthlyReview`, `aggregateSummary`, `forecastMonth`, `transactions` (first page)
- Charts: Recharts (already in frontend-plan stack)

### Epic C — Transactions
- Pages: `/transactions` (filters: month/year/bank/category), `/transactions/[id]` (drawer/sheet for reclassify)
- Features: server-side filter, cursor pagination, inline reclassify, CSV export (client-side)
- Ops: `transactions`, `categoriesByBase`, `reclassifyTransaction`

### Epic D — Upload Statement
- Page: `/upload`
- Flow v1 (today): File picker → base64 encode → `uploadStatement` mutation → toast with job status
- Flow v2 (after GAP-3): Presigned URL → `PUT` directly to S3 → notify mutation
- Validation: file type, size (<8 MB guard for base64), bank/type selector
- Ops: `uploadStatement`

### Epic E — Budgets
- Page: `/budgets`
- Features: list by month (needs GAP-1), create/edit inline, per-category editor, progress bar vs actual
- Ops: `setBudget`, `categoriesByBase`, `monthlyReview` (for actuals), new `budgets(period)` once GAP-1 lands

### Epic F — Forecast
- Page: `/forecast`
- Features: month picker, starting-balance + threshold inputs, daily line chart, alerts list (severity-coloured)
- Ops: `forecastMonth`

### Epic G — Recurring Transactions
- Page: `/recurring`
- Features: list, create (form with frequency / dayOfMonth / dayOfWeek), generate-for-month action
- Ops: `recurringTransactions`, `createRecurringTransaction`, `generateRecurringTransactions`

### Epic H — Savings Goals & Sinking Funds
- Pages: `/goals`, `/sinking-funds`
- Features: v1 read-only cards with progress + history sparkline; v2 CRUD after GAP-2
- Ops: `savingsGoals`, `sinkingFunds`

### Epic I — Settings & Profile
- Page: `/settings`
- Features: profile, tenant info, theme toggle, API key (future), feature flags (AI tagging opt-in when BE exposes it)
- Ops: none today — exposes an opportunity for new queries

### Epic J — System
- Global: layout, auth-gated routes, error boundary, toast system, skeletons, loading states
- DX: GraphQL Code Generator on CI, Storybook, Playwright E2E, Jest/Vitest unit

---

## 6. Sequencing (recommended)

**Week 1 — Foundations**
- Scaffold Next.js app in `apps/web`
- Auth (Epic A), global layout, Apollo Client + codegen pipeline, CI hookup

**Week 2 — Core reads**
- Dashboard (Epic B)
- Transactions list with filters + pagination (Epic C read)

**Week 3 — Core writes**
- Upload flow v1 (Epic D)
- Reclassify (Epic C write)
- Recurring transactions (Epic G)

**Week 4 — Planning features**
- Budgets (Epic E) — requires GAP-1
- Forecast (Epic F)

**Week 5 — Goals & polish**
- Savings / Sinking funds read (Epic H v1)
- Settings (Epic I), E2E tests, mobile polish

**Week 6 — v2**
- Upload via presigned URL (GAP-3)
- Goals/funds write (GAP-2)
- Refresh token flow (GAP-4)

---

## 7. Open Questions for Product

1. **Tenant switching UX** — can a single user belong to multiple tenants today, or is `tenantId` fixed per user on register?
2. **Multi-currency** — is INR the only currency for v1, or should we surface `currency` from the API even in v1?
3. **Mobile target** — responsive web only, or is a React Native shell (Expo) in the 6-month roadmap?
4. **Statement formats** — do we need PDF parsing or CSV only for v1 FE? (Parser supports CSV today.)
5. **Collaboration** — within a `CLIENT` tenant, do advisors share data? Needs role model beyond `userId`.
6. **Data export** — should FE export transactions/reports as CSV/PDF/Excel? Impacts deps (e.g., `@react-pdf/renderer`).

---

## 8. Acceptance Criteria for "FE v1 shipped"

- Authenticated user can register, log in, log out
- Upload one statement (≤ 8 MB) and see transactions appear within 60s
- Reclassify a transaction from the UI
- View monthly and annual reviews with charts
- Set a budget for a category and see progress vs actual
- View forecast for current month with alerts
- All pages responsive down to 375 px; Lighthouse perf ≥ 85 (desktop)
- Playwright E2E covers: register → upload → list → reclassify → budget

---

## Next Steps

1. Confirm GAP-1..4 priority with yourself (self-review as the sole engineer) and open issues in GitHub
2. Approve ADR-001 (separate doc)
3. Kick off Week 1 from `frontend-kickoff-plan.md`
