# full-budget-app

🏦✨ A modular, multi-tenant budgeting platform that ingests bank statements, enriches transactions, and serves a tenant-aware GraphQL API. The system combines deterministic rules with Amazon Bedrock powered classification and is packaged as a pnpm workspace so each service can evolve independently.

- Built for AWS Lambda, DynamoDB, S3, SQS, and Parameter Store using AWS CDK
- Emphasises reusable domain services (`packages/services`) and infrastructure-safe defaults
- Observability-ready with structured logging, metrics, X-Ray traces, and feature flags for AI-assisted tagging

## What's New
- **DynamoDB stream-driven categorisation**: `apps/tag-loaders` is now triggered directly from the transactions table stream, running rule-engine first and Bedrock fallback when enabled.
- **Expanded parsers**: Added Axis credit card and HDFC credit card parsers alongside HDFC/SBI CSV support.
- **X-Ray + LocalStack parity**: CDK now provisions an X-Ray sampling rule/group, Lambdas ship with tracing, and helper scripts support LocalStack seeding + `cdklocal` deploys.

## System Topology
| Area | Responsibility | Highlights |
| --- | --- | --- |
| `apps/graphql-api` | Public GraphQL + `/metrics` endpoint | Apollo Server + Express, JWT-backed register/login, request context wiring, resolvers compose services, exports schema from `docs/finance-budget.sdl.graphql` |
| `apps/txn-loaders` | SQS-driven statement ingestion | Pulls bank statement jobs from SQS, fetches uploads from S3, normalises transactions with `@parser`, persists via `TransactionStore` |
| `apps/tag-loaders` | Transaction categorisation worker | Triggered by DynamoDB streams on transactions; runs rule engine from `@nlp-tagger`, falls back to Bedrock, persists categories/confidence |
| `packages/services` | Domain orchestrators | Authorization, upload, transaction processing/analytics, categorisation, budgeting, forecasting, recurring transactions, savings goals, Bedrock integration |
| `packages/client` | AWS client helpers | Typed wrappers around S3, SQS, and BedrockRuntime clients with LocalStack-friendly configs |
| `packages/parser` | Bank statement parsers | HDFC, SBI, Axis credit card, and HDFC credit card parsing plus abstractions for adding more banks |
| `packages/nlp-tagger` | Rule-based tagging | Keyword rules, training utilities, entry point for alternative models |
| `packages/common`, `packages/auth`, `packages/db`, `packages/logger` | Shared contracts | DTOs, DynamoDB repositories, JWT helpers, Winston logger configuration |
| `infra/lib` | AWS CDK stacks | Separate stacks for queues, S3 buckets, DynamoDB tables, Lambda workers, SSM parameters, alarms, X-Ray sampling/group, and GraphQL API |
| `docs/` | Architecture notes | `ARCHITECTURE.md` (high-level design) and GraphQL SDL |
| `artifacts/` | Sample data | `training.csv` demo dataset for the tagging pipeline |
| `postman/` | API collection | Ready-made Postman collection & environment for manual testing |
| `data/` | Local datastore | MongoDB/WiredTiger scratch directory used during local experimentation |

## Flow at a Glance
1. **Authenticate & upload** – Tenants register/login via GraphQL, then upload statements. Files land in S3 and an SQS job is emitted.
2. **Ingest** – `txn-loaders` consumes the SQS job, fetches the file, parses rows via `@parser`, and persists transactions through `TransactionStore` (`packages/db`).
3. **Auto-categorise** – The transactions table stream triggers `tag-loaders`, which runs the rule engine first and Bedrock inference when allowed.
4. **Store insights** – Categorised data, budgets, recurring transactions, savings goals, and sinking funds live in their respective DynamoDB tables.
5. **Serve** – `graphql-api` surfaces queries/mutations for dashboards, monthly/annual reviews, forecasts, and budget analytics.
6. **Observe** – Winston logs capture context-rich events; Prometheus metrics are exposed via `/metrics`; X-Ray traces sample Lambda invocations.

## Prerequisites
- Node.js 18+ and pnpm (`pnpm@10.x` is pinned in the workspace)
- AWS credentials with access to S3, SQS, DynamoDB, Lambda, Parameter Store, and optionally `bedrock:InvokeModel`
- Amazon Bedrock access in your AWS region when enabling AI tagging
- Docker + AWS CDK CLI (`npm install -g aws-cdk`) for infrastructure deployments
- Optional: LocalStack + AWS CLI for local emulation (`USE_LOCALSTACK=true`)

## Environment Configuration
Create a `.env` file at the project root (values below are illustrative):
```
PORT=4005
NODE_ENV=dev
LOG_LEVEL=debug

# AWS cred
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-south-1
USE_LOCALSTACK=false
LOCALSTACK_HOST=localhost
LOCALSTACK_EDGE_PORT=4566

# S3 bucket
AWS_S3_BUCKET=full-budget-bank-uploads

# SQS queue
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/bank-statement-jobs

# DynamoDB tables
DYNAMO_USER_TABLE=users
DYNAMO_TRANSACTION_TABLE=transactions
DYNAMO_CATEGORY_RULES_TABLE=categories
DYNAMO_RECURRING_TABLE=recurring-transactions
DYNAMO_BUDGET_TABLE=budgets

# JWT secret
JWT_SECRET=replace-me

# AI tagging controls
AI_TAGGING_ENABLED=false
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AI_CONFIDENCE_THRESHOLD=0.65
```
Set `AI_TAGGING_ENABLED=false` (or omit the Bedrock fields) if you want to rely purely on rule-based classification.

### Common environment flags
| Variable | Purpose |
| --- | --- |
| `USE_LOCALSTACK` | Toggle AWS SDK clients to point at LocalStack |
| `LOCALSTACK_HOST`, `LOCALSTACK_EDGE_PORT` | Host/port for LocalStack endpoints |
| `BEDROCK_MODEL_ID` | Bedrock model ARN/ID passed to `BedrockClassifierService` |
| `AI_CONFIDENCE_THRESHOLD` | Minimum score for accepting AI suggestions |
| `SQS_QUEUE_URL` | Source for statement ingestion jobs |
| `AWS_S3_BUCKET` | Bucket that stores uploaded statements |
| `LOG_LEVEL` | Controls Winston log level across services |

## Local Development
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Build everything (optional before watch mode):
   ```bash
   pnpm build
   ```
3. Start watch builds for packages:
   ```bash
   pnpm dev
   ```
4. Run individual services as needed:
   ```bash
   pnpm --filter @app/graphql-api dev   # GraphQL API at http://localhost:4005/graphql
   pnpm --filter @app/tag-loaders dev   # Categorisation worker (triggered by Dynamo stream)
   pnpm --filter @app/txn-loaders dev   # Statement ingestion worker
   ```
5. For LocalStack, set `USE_LOCALSTACK=true`, run `./create_localstack_resources.sh` to seed S3/SQS/Dynamo/SSM, and deploy CDK locally with:
   ```bash
   pnpm --filter ./infra cdklocal:deploy:all
   ```

### Testing & Quality Gates
- Unit and integration tests: `pnpm test` (recursively runs `pnpm --filter <pkg> test`)
- Linting: `pnpm lint`
- Formatting: `pnpm format`
- Type-checking: `pnpm typecheck`
- Husky + commitlint enforce Conventional Commits on staged changes

### Observability
- Structured logging is provided by `@logger` and enabled everywhere via dependency injection.
- `apps/graphql-api` exposes `/metrics` for Prometheus-compatible scraping; extend collectors under `apps/graphql-api/src/utils`.
- Alarm constructs live in `infra/lib/lambda-alarms-construct.ts` and can be tailored per environment.
- X-Ray tracing is enabled on Lambdas; `infra/lib/xray.stack.ts` provisions a sampling rule/group.

## Deployment
1. Bootstrap your AWS environment once:
   ```bash
   cdk bootstrap aws://<account-id>/<region>
   ```
2. Build the monorepo:
   ```bash
   pnpm build
   ```
3. Deploy all stacks (queues, tables, functions, parameters):
   ```bash
   pnpm --filter ./infra cdk:deploy:all
   ```
4. Adjust stack parameters or related SSM parameters to enable Bedrock in non-local environments (defaults ship with `AI_TAGGING_ENABLED=false`).
5. For LocalStack-based deployment, use:
   ```bash
   pnpm --filter ./infra cdklocal:deploy:all
   ```

CDK helper scripts:
- `pnpm synth` – synthesize CloudFormation templates
- `pnpm deploy:all` – convenience wrapper for full deployment
- `pnpm destroy:all` – tear down deployed stacks

## Directory Reference
- `apps/` – Runtime Lambdas (`graphql-api`, `txn-loaders`, `tag-loaders`)
- `packages/` – Shared libraries for auth, logging, parsing, NLP, AWS clients, and domain services
- `infra/` – CDK application defining S3/SQS/DynamoDB/Lambda/SSM resources
- `scripts/` – Reserved for ad-hoc tooling (currently empty)
- `artifacts/` – Sample training data and exports
- `docs/` – Design docs and schema definitions
- `postman/` – Postman collection and environment for manual API exploration
- `data/` – Local MongoDB data directory (handy for experimentation; safe to delete if unused)

## Troubleshooting
- **No SQS messages processed** – confirm `SQS_QUEUE_URL` matches the environment you seeded jobs into and that credentials allow `sqs:ReceiveMessage`.
- **Categories not updating** – ensure the transactions table stream is enabled and mapped to `tag-loaders`, and that Bedrock access/feature flags are set when AI fallback is desired.
- **Bedrock calls fail** – ensure the IAM role or user has `bedrock:InvokeModel` and that Bedrock is enabled in the region.
- **Schema drift** – update `docs/finance-budget.sdl.graphql` and re-export within `apps/graphql-api/src/schemas`.
- **Cold start performance** – pre-bundle via `pnpm build` and enable provisioned concurrency on latency-sensitive Lambdas.

## Additional Resources
- `docs/ARCHITECTURE.md` – deep dive into data flow, training loop, and workspace layout
- `docs/finance-budget.sdl.graphql` – canonical GraphQL schema served by the API
- `packages/services/src/**/*.spec.ts` – reference tests demonstrating service usage
- `postman/collection.finance-budget.json` – API playground for manual workflows

## Contributing
See `CONTRIBUTING.md` for the full contribution guide and pull request checklist.

## Contact
Debraj Paul  
Email: pauldebraj7@gmail.com  
LinkedIn: https://www.linkedin.com/in/debraj-paul

## License
Apache License 2.0
