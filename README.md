# full-budget-app

🏦✨ A modular, multi-tenant budgeting platform that ingests bank statements, enriches transactions, and serves a tenant-aware GraphQL API. The system combines deterministic rules with Amazon Bedrock powered classification and is packaged as a pnpm workspace so each service can evolve independently.

- Built for AWS Lambda, DynamoDB, S3, SQS, and Parameter Store using AWS CDK
- Emphasises reusable domain services (`packages/services`) and infrastructure-safe defaults
- Observability-ready with structured logging, metrics, and feature flags for AI-assisted tagging

## What's New
- **Amazon Bedrock fallback for transaction classification**: `TransactionCategoryService` now calls `BedrockClassifierService` when the rule engine returns `UNCLASSIFIED`, enabling AI-assisted tagging routed through `packages/services/src/transaction-category-service.ts`.
- **Configurable feature flag and confidence hints**: toggle the integration with `AI_TAGGING_ENABLED=true`, supply a model via `BEDROCK_MODEL_ID` (for example `anthropic.claude-3-haiku-20240307-v1:0`), and surface an optional `AI_CONFIDENCE_THRESHOLD` for consumers that want to enforce a minimum LLM score.
- **Bedrock client package**: `packages/client/src/bedrock-client.ts` wraps the AWS SDK `BedrockRuntimeClient`, constructing prompts that mirror the platform's base/sub-category taxonomy so Bedrock responses map directly to the domain model.

## System Topology
| Area | Responsibility | Highlights |
| --- | --- | --- |
| `apps/graphql-api` | Public GraphQL + `/metrics` endpoint | Apollo Server + Express, request context wiring, resolvers compose services, exports schema from `docs/finance-budget.sdl.graphql` |
| `apps/txn-loaders` | SQS-driven statement ingestion | Pulls bank statement jobs from SQS, fetches uploads from S3, normalises transactions with `@parser`, persists via `TransactionStore` |
| `apps/tag-loaders` | Transaction categorisation worker | Consumes categorisation jobs, runs rule engine from `@nlp-tagger`, falls back to Bedrock, persists categories |
| `packages/services` | Domain orchestrators | Budgeting, forecasting, recurring transactions, savings goals, transaction processing, Bedrock integration |
| `packages/client` | AWS client helpers | Typed wrappers around S3, SQS, and BedrockRuntime clients |
| `packages/parser` | Bank statement parsers | HDFC and SBI CSV parsing plus abstractions for adding more banks |
| `packages/nlp-tagger` | Rule-based tagging | Keyword rules, training utilities, entry point for alternative models |
| `packages/common`, `packages/auth`, `packages/db`, `packages/logger` | Shared contracts | DTOs, DynamoDB repositories, JWT helpers, Winston logger configuration |
| `infra/lib` | AWS CDK stacks | Separate stacks for queues, S3 buckets, DynamoDB tables, SNS alarms, Lambda workers, and SSM parameters |
| `docs/` | Architecture notes | `ARCHITECTURE.md` (high-level design) and GraphQL SDL |
| `artifacts/` | Sample data | `training.csv` demo dataset for the tagging pipeline |
| `postman/` | API collection | Ready-made Postman collection & environment for manual testing |
| `data/` | Local datastore | MongoDB/WiredTiger scratch directory used during local experimentation |

## Flow at a Glance
1. **Upload** – A tenant uploads a bank statement to S3; the `txn-loaders` Lambda receives an SQS job and parses the file via `@parser`.
2. **Persist** – Normalised transactions land in DynamoDB through `TransactionStore` (`packages/db`).
3. **Categorise** – SQS jobs trigger `tag-loaders`, executing rule-based tagging first and Bedrock inference when allowed.
4. **Store insights** – Categorised data, budgets, recurring transactions, and savings goals live in their respective DynamoDB tables.
5. **Serve** – `graphql-api` surfaces queries/mutations for dashboards, monthly or annual reviews, and budget analytics.
6. **Observe** – Winston logs capture context-rich events and Prometheus metrics are exposed via `/metrics` for dashboards and alarms.

## Prerequisites
- Node.js 18+ and pnpm (`pnpm@10.x` is pinned in the workspace)
- AWS credentials with access to S3, SQS, DynamoDB, Lambda, Parameter Store, and optionally `bedrock:InvokeModel`
- Amazon Bedrock access in your AWS region when enabling AI tagging
- Docker + AWS CDK CLI (`npm install -g aws-cdk`) for infrastructure deployments

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

# S3 bucket
AWS_S3_BUCKET=full-budget-bank-uploads

# SQS queue
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/bank-statement-jobs

# DynamoDB tables
DYNAMO_USER_TABLE=users
DYNAMO_TRANSACTION_TABLE=transactions
DYNAMO_CATEGORY_RULES_TABLE=transaction-categories
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
   pnpm --filter @app/tag-loaders dev   # Categorisation worker (polls configured queues)
   pnpm --filter @app/txn-loaders dev   # Statement ingestion worker
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
- **Bedrock calls fail** – ensure the IAM role or user has `bedrock:InvokeModel` and that Bedrock is enabled in the region.
- **Schema drift** – update `docs/finance-budget.sdl.graphql` and re-export within `apps/graphql-api/src/schemas`.
- **Cold start performance** – pre-bundle via `pnpm build` and enable provisioned concurrency on latency-sensitive Lambdas.

## Additional Resources
- `docs/ARCHITECTURE.md` – deep dive into data flow, training loop, and workspace layout
- `docs/finance-budget.sdl.graphql` – canonical GraphQL schema served by the API
- `packages/services/src/**/*.spec.ts` – reference tests demonstrating service usage
- `postman/collection.finance-budget.json` – API playground for manual workflows

## How to Contribute
1. Fork `debrajpaul/full-budget-app`, then clone your fork:
   ```bash
   git clone https://github.com/<your-user>/full-budget-app.git
   cd full-budget-app
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feat/<short-description>
   ```
4. Make your changes with matching tests where possible (`apps/*` or `packages/*`).
5. Run `pnpm lint`, `pnpm test`, and optionally `pnpm build` before committing.
6. Commit using Conventional Commits and open a pull request describing behaviour changes and any setup steps.

Minor improvements can be made directly from the GitHub web editor—open the file, click the pencil icon, and submit a pull request with your edits.

## Contact
Debraj Paul  
Email: pauldebraj7@gmail.com  
LinkedIn: https://www.linkedin.com/in/debraj-paul

## License
Apache License 2.0
