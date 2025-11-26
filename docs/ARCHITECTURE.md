# Architecture

## Overview
🧠📊 Full Budget App is a multi-tenant, serverless budgeting platform that ingests raw bank
statements, enriches transactions, and exposes a GraphQL API for dashboards and
automations. The monorepo is managed with pnpm workspaces so application code,
shared services, and infrastructure definitions can evolve together while
staying deployable as independent AWS Lambda functions.

Key principles:
- **Serverless first** – Lambda, DynamoDB, S3, and SQS supply elastic scale without
  maintaining servers.
- **Local-first parity** – All SDK clients can point at LocalStack via
  `USE_LOCALSTACK=true`, and helper scripts/CDK targets create buckets, queues,
  tables, and SSM params locally.
- **Shared domain services** – Business logic (budgets, categorisation, savings,
  recurring transactions) lives in `packages/services` and is imported by any
  runtime needing the functionality.
- **Tenant isolation** – Request context carries tenant metadata so data access
  and logging remain scoped per tenant.
- **AI assist, deterministic core** – Keyword rules classify transactions first;
  Amazon Bedrock is only invoked for unclassified records or when extra signal
  is desired.

## Runtime Services (apps/)
- **`graphql-api`** – Apollo Server running on Lambda (with Express support for
  local dev). Resolves queries/mutations by delegating to service layer modules,
  wires multi-tenant auth context (JWT-backed register/login), enqueues upload
  jobs, and exposes a `/metrics` endpoint for Prometheus scrapers.
- **`txn-loaders`** – SQS-triggered Lambda that reads ingestion jobs, pulls the
  corresponding bank statement from S3, normalises it with parsers from
  `@parser`, and persists canonical transactions through `TransactionStore`.
- **`tag-loaders`** – DynamoDB stream-driven Lambda subscribed to the
  transactions table. Runs the rule engine on inserts/updates, optionally calls
  Bedrock, and writes enriched categories + confidence back to DynamoDB.

Each service bundles with esbuild for fast cold starts and provides a
`dev` script powered by `ts-node-dev` for local iteration.

## Shared Packages (packages/)
- **`services`** – Domain orchestrators such as `AuthorizationService`
  (register/login), `UploadStatementService` (S3 + SQS producer),
  `TransactionService` (ingestion + analytics), `TransactionCategoryService`,
  `BudgetService`, `ForecastService`, `RecurringTransactionService`,
  `SavingsGoalService`, `SinkingFundService`, and the Bedrock integration.
- **`client`** – Thin wrappers around AWS SDK clients (S3, SQS, BedrockRuntime)
  exposing typed helpers used by the services and supporting LocalStack
  endpoints.
- **`parser`** – Parsers for HDFC, SBI, Axis credit cards, and HDFC credit cards
  plus abstractions for introducing new banks or formats.
- **`nlp-tagger`** – Deterministic keyword tagging rules, rule store, and
  utilities for testing or extending the tagging logic.
- **`db`** – DynamoDB repositories that encapsulate table access patterns and
  time-window queries.
- **`auth`, `common`, `logger`** – Shared DTOs, JWT helpers + password hashing,
  error contracts, logging abstractions, and cross-cutting utilities.

Workspaces share TypeScript configuration and leverage path aliases so services
import package code directly (e.g. `import { BudgetService } from "@services"`).

## Infrastructure as Code (infra/)
AWS CDK stacks provision the platform. Key stacks include:
- **Storage & queues** (`storage.stack.ts`, `queue.stack.ts`) – S3 buckets for
  statement uploads and SQS queues for ingestion + categorisation workflows.
- **Tables** (`transactions-table.stack.ts`, `transaction-category-table.stack.ts`,
  `budgets-table.stack.ts`, `recurring-transactions-table.stack.ts`,
  `users-table.stack.ts`) – Tenant-scoped DynamoDB tables with on-demand
  capacity.
- **Functions** (`transaction-loader.stack.ts`,
  `transaction-category-loader.stack.ts`, `graphql-api.stack.ts`) – Lambda
  definitions wired to the deployed bundles, pre-configured with X-Ray tracing.
- **Parameters, alarms, tracing** (`ssm-param.stack.ts`,
  `lambda-alarms-construct.ts`, `xray.stack.ts`) – Stores shared secrets/flags
  (e.g., JWT secret) in SSM Parameter Store, configures CloudWatch alarms, and
  sets up an X-Ray sampling rule/group for trace collection.

`pnpm --filter ./infra cdk:deploy:all` deploys every stack after a monorepo
build, while `pnpm synth` produces the CloudFormation templates for review.

## Data Flow
1. **Authenticate & scope** – Users register/login via GraphQL; JWT secrets are
   sourced from SSM and decoded in the request context to attach `tenantId`,
   `userId`, and `email` to every operation.
2. **Upload & queue** – `uploadStatement` writes the file to S3 and pushes an
   SQS message describing the bank/tenant/user to kick off ingestion.
3. **Ingest** – `txn-loaders` is triggered by SQS, fetches the file, parses rows
   into canonical transactions, and persists them to the transactions table.
4. **Auto-categorise** – The transactions table stream triggers `tag-loaders`,
   which runs keyword rules first, then Bedrock when enabled, and writes the
   category/confidence back to DynamoDB (plus per-tenant category rules).
5. **Persist insights** – Budgets, recurring transactions, savings goals, and
   sinking funds live in dedicated DynamoDB tables via stores in `@db`.
6. **Serve API** – `graphql-api` combines data from the stores and domain
   services to power dashboards (reviews, forecasts, budgeting tools).
7. **Observe** – Structured logs flow through the shared logger, metrics are
   exposed via `/metrics`, and traces are sampled by X-Ray.

## AI-Assisted Categorisation
- **Rule engine first** – `TransactionCategoryService` executes deterministic
  keyword/tagging rules from `@nlp-tagger`. This keeps behaviour explainable and
  avoids unnecessary AI calls.
- **Bedrock fallback** – When a transaction remains `UNCLASSIFIED`,
  `BedrockClassifierService` invokes the Anthropic Claude model (or whichever ID
  is set in `BEDROCK_MODEL_ID`) via the wrapper in `@client`.
- **Confidence hints** – Responses include a suggested category, reasoning, and
  score. Downstream consumers can enforce thresholds through
  `AI_CONFIDENCE_THRESHOLD`.
- **Feature flag** – `AI_TAGGING_ENABLED` and the presence of Bedrock
  credentials determine whether the AI step runs in each environment.

## Observability & Operations
- **Logging** – `@logger` provides a Winston-based logger injected into every
  service. Logs include tenant, request, and correlation metadata.
- **Metrics** – The GraphQL service exports Prometheus metrics; extend collectors
  under `apps/graphql-api/src/utils` to expose new counters or histograms.
- **Tracing** – Lambdas ship with active X-Ray tracing and a default sampling
  rule via `xray.stack.ts` plus `AWSXRayWriteOnlyAccess` on each role.
- **Alarms** – CDK constructs create CloudWatch alarms for key Lambdas. DLQ and
  retry policies can be tuned per queue.
- **Configuration** – Runtime configuration comes from environment variables,
  SSM parameters, and feature flags injected during deployment.

## Local Development Workflow
- Run `pnpm install` once to hydrate workspace dependencies.
- Use `pnpm dev` to build packages in watch mode; individual apps can be started
  with `pnpm --filter @app/<service> dev`.
- Tests live alongside their packages (`*.spec.ts`); execute
  `pnpm test`, `pnpm lint`, and `pnpm typecheck` before shipping changes.
- Postman collections (`postman/`) and sample data (`artifacts/training.csv`)
  support manual verification.
- For LocalStack, export `USE_LOCALSTACK=true` (and `LOCALSTACK_HOST`,
  `LOCALSTACK_EDGE_PORT`), run `./create_localstack_resources.sh` to seed S3/SQS
  tables/SSM locally, and use `pnpm --filter ./infra cdklocal:deploy:all` to
  deploy CDK stacks against the emulator. Use `destroy_localstack_resources.sh`
  to clean up the local emulated resources.

## Extending the Platform
- **Add a new bank parser** by implementing it in `packages/parser` and exporting
  it from the package index. Update `txn-loaders` to recognise the new bank code.
- **Launch additional metrics** by declaring collectors in `graphql-api` and
  wiring them into the Express handler.
- **Introduce new budgeting logic** within `packages/services` so both API and
  workers can reuse it.
- **Expand infrastructure** by authoring a new construct/stack under `infra/lib`
  and wiring it into the composed `cdk:deploy:all` command.

Refer to `README.md` for environment setup, deployment commands, and contribution
guidelines.
