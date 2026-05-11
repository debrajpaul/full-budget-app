# full-budget-app

A modular, multi-tenant budgeting platform that ingests bank statements, enriches transactions, and serves a tenant-aware GraphQL API. The system combines deterministic rules with Amazon Bedrock-powered classification and is packaged as a pnpm workspace so each service can evolve independently.

- Built for AWS Lambda, DynamoDB, S3, SQS, and Parameter Store using AWS CDK
- Emphasises reusable domain services (`packages/services`) and infrastructure-safe defaults
- Observability-ready with structured logging, Prometheus metrics, X-Ray traces, and feature flags for AI-assisted tagging

## What's New

- **Refresh-token rotation** – `Mutation.refreshToken` issues a new short-lived access token and a rotated refresh token. Tokens are SHA-256-hashed before storage; reuse of an already-consumed token triggers full family revocation to defend against theft.
- **Two-step upload flow** – `Mutation.createUploadUrl` issues a signed S3 URL; `Mutation.notifyUploadComplete` confirms receipt and returns a rich `StatementUploadResult` (jobId, bucket, key, fileSizeBytes, warnings). The legacy `uploadStatement` mutation is deprecated.
- **Savings goals & sinking funds** – Full CRUD + contribution tracking for both goal types, each backed by a dedicated DynamoDB table and ownership-guarded store.
- **Paginated annual review** – `Query.annualReview` now returns `transactions: TransactionsPage!` with cursor-based pagination instead of an unbounded array.
- **Budget queries** – `Query.budgets(period)` and `Mutation.deleteBudget` complete the budget CRUD surface.
- **Custom `scalar Date`** – ISO-8601 calendar strings (`YYYY-MM-DD`) are validated with a V8-safe round-trip check across the whole schema.
- **`TransactionType` enum** – `RecurringTransaction.type: TransactionType!` (`CREDIT` / `DEBIT`) with a utility `inferTransactionType()` for automatic derivation.
- **`EForecastAlertType` enum** – `ForecastAlert.type` promoted from a free string to a first-class enum (`OVER_BUDGET`, `UNUSUAL_SPIKE`, `SAVING_TARGET_RISK`, `HIGH_DISCRETIONARY`, `INCOME_DROP`).
- **Node.js 24** – Runtime target upgraded to Node 24; `.nvmrc`, `engines` field, and all esbuild targets updated.
- **Dependency consolidation** – All `devDependencies` centralised at the workspace root; AWS SDK aligned to `^3.873.0` across all packages; `pnpm.overrides` trimmed to `@smithy/*` conflict resolution only.
- **DynamoDB stream-driven categorisation** – `apps/tag-loaders` is triggered directly from the transactions table stream, running the rule engine first and Bedrock fallback when enabled.
- **Expanded parsers** – Added Axis credit card and HDFC credit card parsers alongside existing HDFC/SBI CSV support.

## System Topology

| Area | Responsibility | Highlights |
|------|----------------|------------|
| `apps/graphql-api` | Public GraphQL + `/metrics` endpoint | Apollo Server 5 + Express, multi-tenant JWT auth, refresh-token rotation, resolver-thin design delegating to `@services`, exports schema from `docs/finance-budget.sdl.graphql` |
| `apps/txn-loaders` | SQS-driven statement ingestion | Pulls bank statement jobs from SQS, fetches uploads from S3, normalises transactions with `@parser`, persists via `TransactionStore` |
| `apps/tag-loaders` | Transaction categorisation worker | Triggered by DynamoDB streams on transactions; runs rule engine from `@nlp-tagger`, falls back to Bedrock, persists categories/confidence |
| `packages/services` | Domain orchestrators | AuthorizationService (register/login/refresh), UploadUrlService, UploadStatementService, TransactionService, BudgetService, ForecastService, RecurringTransactionService, SavingsGoalService, SinkingFundService, BedrockClassifierService |
| `packages/client` | AWS client helpers | Typed wrappers around S3 (incl. signed upload URLs), SQS, and BedrockRuntime with LocalStack-friendly configs |
| `packages/parser` | Bank statement parsers | HDFC, SBI, Axis credit card, HDFC credit card — plus abstractions for adding more banks |
| `packages/nlp-tagger` | Rule-based tagging | Keyword rules, training utilities, entry point for alternative models |
| `packages/auth` | Auth primitives | JWT sign/verify, bcrypt hashing, refresh token generation (`randomUUID`), SHA-256 hashing |
| `packages/common` | Shared contracts | DTOs, domain enums (`ETransactionType`, `EForecastAlertType`), store interfaces (`IRefreshTokenStore`, `IUploadUrlService`), `inferTransactionType()` |
| `packages/db` | DynamoDB repositories | `TransactionStore`, `UserStore`, `RefreshTokenStore` (FamilyIndex GSI), `SavingsGoalStore`, `SinkingFundStore`, `BudgetStore`, `RecurringTransactionStore`, `CategoryRulesStore` |
| `packages/logger` | Logging | Winston-based structured logger injected into all services |
| `infra/lib` | AWS CDK stacks | Queues, S3, DynamoDB tables (incl. refresh-tokens, savings-goals, sinking-funds), Lambda functions, SSM, alarms, X-Ray |
| `docs/` | Design docs & schema | `ARCHITECTURE.md` and `docs/finance-budget.sdl.graphql` (SDL source of truth) |

## GraphQL API Surface

### Queries

| Operation | Description |
|-----------|-------------|
| `annualReview(year, cursor)` | Paginated annual summary with `TransactionsPage` (cursor-based) |
| `monthlyReview(month, year)` | Monthly income/expense breakdown |
| `aggregateSummary(year, month?)` | Aggregate totals across a period |
| `categoryBreakdown(month, year)` | Per-category spending groups |
| `transactions(filters, cursor)` | Filtered, paginated transaction list |
| `forecastMonth(...)` | Cash-flow forecast with typed `ForecastAlert` entries |
| `budgets(period)` | All budgets for a given month/year period |

### Mutations

| Operation | Description |
|-----------|-------------|
| `register(input)` | Create a new tenant user |
| `login(input)` | Authenticate, returns `token + refreshToken` |
| `refreshToken(refreshToken)` | Rotate refresh token, returns new `LoginResponse` |
| `createUploadUrl(input)` | Issue a signed S3 upload URL (two-step upload) |
| `notifyUploadComplete(jobId)` | Confirm upload, enqueue ingestion, return `StatementUploadResult` |
| `uploadStatement(input)` | **Deprecated** — use `createUploadUrl` + `notifyUploadComplete` |
| `addTransactionCategory(input)` | Add or update a category rule |
| `reclassifyTransaction(...)` | Manually override a transaction category |
| `setBudget(period, category, amount)` | Create or update a budget entry |
| `deleteBudget(id)` | Remove a budget entry |
| `createRecurringTransaction(...)` | Define a recurring transaction template |
| `generateRecurringTransactions(month, year)` | Materialize recurring entries for a period |
| `createSavingsGoal(input)` | Create a savings goal with history seeding |
| `updateSavingsGoal(id, input)` | Update goal target or name |
| `deleteSavingsGoal(id)` | Remove a savings goal |
| `contributeSavingsGoal(input)` | Add a contribution to a savings goal |
| `createSinkingFund(input)` | Create a sinking fund |
| `updateSinkingFund(id, input)` | Update sinking fund details |
| `deleteSinkingFund(id)` | Remove a sinking fund |
| `contributeSinkingFund(input)` | Add a contribution to a sinking fund |

## Flow at a Glance

1. **Authenticate & scope** – Tenants register/login via GraphQL; `refreshToken` rotates short-lived tokens. JWT secrets come from SSM.
2. **Upload** – `createUploadUrl` issues a pre-signed S3 PUT URL. The client uploads directly to S3. `notifyUploadComplete` confirms and enqueues the ingestion job, returning a `StatementUploadResult`.
3. **Ingest** – `txn-loaders` consumes the SQS job, fetches the file, parses rows via `@parser`, and persists canonical transactions via `TransactionStore`.
4. **Auto-categorise** – The transactions table DynamoDB stream triggers `tag-loaders`, which runs keyword rules first, then optionally calls Bedrock, and writes category/confidence back.
5. **Store insights** – Budgets, recurring transactions, savings goals, and sinking funds live in their respective DynamoDB tables.
6. **Serve** – `graphql-api` surfaces queries/mutations for dashboards, paginated reviews, forecasts, and budget analytics.
7. **Observe** – Winston logs capture context-rich events; `/metrics` exposes Prometheus data; X-Ray traces sample Lambda invocations.

## Prerequisites

- Node.js 24+ and pnpm (`pnpm@10.x` is pinned via `packageManager` in `package.json`)
- AWS credentials with access to S3, SQS, DynamoDB, Lambda, Parameter Store, and optionally `bedrock:InvokeModel`
- Amazon Bedrock access in your AWS region when enabling AI tagging
- Docker + AWS CDK CLI (`npm install -g aws-cdk`) for infrastructure deployments
- Optional: LocalStack + AWS CLI for local emulation (`USE_LOCALSTACK=true`)

## Environment Configuration

Create a `.env` file at the project root:

```
PORT=4005
NODE_ENV=dev
LOG_LEVEL=debug

# AWS credentials
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-south-1
USE_LOCALSTACK=false
LOCALSTACK_HOST=localhost
LOCALSTACK_EDGE_PORT=4566

# S3
AWS_S3_BUCKET=full-budget-bank-uploads

# SQS
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/bank-statement-jobs

# DynamoDB tables
DYNAMO_USER_TABLE=users
DYNAMO_TRANSACTION_TABLE=transactions
DYNAMO_CATEGORY_RULES_TABLE=categories
DYNAMO_RECURRING_TABLE=recurring-transactions
DYNAMO_BUDGET_TABLE=budgets
DYNAMO_REFRESH_TOKENS_TABLE=refresh-tokens
DYNAMO_SAVINGS_GOAL_TABLE=savings-goals
DYNAMO_SINKING_FUND_TABLE=sinking-funds

# Auth
JWT_SECRET=replace-me

# AI tagging
AI_TAGGING_ENABLED=false
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AI_CONFIDENCE_THRESHOLD=0.65
```

### Environment variables reference

| Variable | Purpose |
|----------|---------|
| `USE_LOCALSTACK` | Toggle AWS SDK clients to point at LocalStack |
| `LOCALSTACK_HOST`, `LOCALSTACK_EDGE_PORT` | Host/port for LocalStack endpoints |
| `JWT_SECRET` | Secret used for signing/verifying access tokens |
| `DYNAMO_REFRESH_TOKENS_TABLE` | DynamoDB table backing refresh-token rotation |
| `DYNAMO_SAVINGS_GOAL_TABLE` | DynamoDB table for savings goals |
| `DYNAMO_SINKING_FUND_TABLE` | DynamoDB table for sinking funds |
| `BEDROCK_MODEL_ID` | Bedrock model ARN/ID passed to `BedrockClassifierService` |
| `AI_TAGGING_ENABLED` | Enable/disable AI-assisted transaction categorisation |
| `AI_CONFIDENCE_THRESHOLD` | Minimum Bedrock score for accepting AI suggestions |
| `SQS_QUEUE_URL` | Source queue for statement ingestion jobs |
| `AWS_S3_BUCKET` | Bucket that stores uploaded statements |
| `LOG_LEVEL` | Controls Winston log level across services |

## Local Development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Build everything:
   ```bash
   pnpm build
   ```
3. Start watch builds:
   ```bash
   pnpm dev
   ```
4. Run individual services:
   ```bash
   pnpm --filter @app/graphql-api dev   # GraphQL API at http://localhost:4005/graphql
   pnpm --filter @app/tag-loaders dev   # Categorisation worker
   pnpm --filter @app/txn-loaders dev   # Statement ingestion worker
   ```
5. LocalStack setup:
   ```bash
   USE_LOCALSTACK=true ./scripts/create_localstack_resources.sh
   pnpm --filter ./infra cdklocal:deploy:all
   ```

### Testing & Quality Gates

```bash
pnpm test        # all workspace tests (Jest, *.spec.ts)
pnpm lint        # ESLint across all packages
pnpm format      # Prettier
pnpm typecheck   # tsc --noEmit from root
```

Husky + commitlint enforce Conventional Commits on every staged change.

### Observability

- Structured logging via `@logger` (Winston), injected into every service via DI.
- `apps/graphql-api` exposes `/metrics` for Prometheus-compatible scraping.
- CloudWatch alarms defined in `infra/lib/lambda-alarms-construct.ts`.
- X-Ray tracing enabled on all Lambdas; `infra/lib/xray.stack.ts` provisions sampling rule/group.

## Deployment

1. Bootstrap AWS environment (once):
   ```bash
   cdk bootstrap aws://<account-id>/<region>
   ```
2. Build monorepo:
   ```bash
   pnpm build
   ```
3. Deploy all stacks:
   ```bash
   pnpm --filter ./infra cdk:deploy:all
   ```
4. For LocalStack:
   ```bash
   pnpm --filter ./infra cdklocal:deploy:all
   ```

CDK helper aliases (from root):

| Command | Action |
|---------|--------|
| `pnpm synth` | Synthesize CloudFormation templates |
| `pnpm deploy:all` | Build + deploy all stacks |
| `pnpm destroy:all` | Tear down all deployed stacks |
| `pnpm local:deploy:all` | Build + deploy to LocalStack |
| `pnpm local:destroy:all` | Tear down LocalStack stacks |

## Directory Reference

```
apps/
  graphql-api/     Apollo Server Lambda — auth, resolvers, schema
  txn-loaders/     SQS-triggered ingestion Lambda
  tag-loaders/     DynamoDB stream-triggered categorisation Lambda

packages/
  auth/            JWT, bcrypt, refresh-token generation + hashing
  client/          S3 (signed URLs), SQS, Bedrock AWS SDK wrappers
  common/          DTOs, domain enums, store interfaces, utilities
  db/              DynamoDB store implementations
  logger/          Winston-based structured logger
  nlp-tagger/      Keyword tagging rules and rule store
  parser/          Bank statement parsers (HDFC, SBI, Axis, HDFC CC)
  services/        Domain service orchestrators

infra/
  lib/             CDK constructs and stacks
  bin/             CDK app entry point

docs/
  ARCHITECTURE.md              High-level design doc
  finance-budget.sdl.graphql   Canonical GraphQL schema (SDL source of truth)
  postman/                     Postman collection & environment

scripts/           LocalStack seed/teardown helpers
artifacts/         Sample training data
```

## Troubleshooting

- **Refresh token rejected** – Tokens are single-use. If a refresh fails with `REFRESH_TOKEN_REUSED`, the token family has been revoked; the user must log in again.
- **Upload URL expired** – Pre-signed S3 URLs expire (default 15 min). Call `createUploadUrl` again to get a fresh URL.
- **No SQS messages processed** – Confirm `SQS_QUEUE_URL` matches the environment and credentials permit `sqs:ReceiveMessage`.
- **Categories not updating** – Ensure the transactions table stream is enabled and mapped to `tag-loaders`; check Bedrock access when AI fallback is required.
- **Bedrock calls fail** – Confirm IAM role has `bedrock:InvokeModel` and Bedrock is available in the region.
- **Schema drift** – Update `docs/finance-budget.sdl.graphql` first, then `typeDefs`, then resolvers, then services (SDL is source of truth).
- **Cold start performance** – Pre-bundle via `pnpm build` and enable provisioned concurrency on latency-sensitive Lambdas.

## Additional Resources

- `docs/ARCHITECTURE.md` — deep dive into data flow, security model, and workspace layout
- `docs/finance-budget.sdl.graphql` — canonical GraphQL schema
- `packages/services/src/**/*.spec.ts` — reference tests demonstrating service usage
- `docs/postman/collection.finance-budget.json` — API playground for manual workflows

## Contributing

See `CONTRIBUTING.md` for the full contribution guide and pull request checklist.

## Contact

Debraj Paul  
Email: pauldebraj7@gmail.com  
LinkedIn: https://www.linkedin.com/in/debraj-paul

## License

Apache License 2.0
