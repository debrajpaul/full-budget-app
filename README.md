# full-budget-app

A modular, scalable microservice architecture for managing transactions, budgets, and reviews on AWS. The platform ingests statements, enriches transactions, and serves a tenant-aware GraphQL API. The latest update introduces an Amazon Bedrock powered fallback so the system can auto-classify transactions when local rules cannot find a match.

## Core Capabilities
- GraphQL Apollo API with schema-first design and observability hooks
- Serverless background processing through S3, SQS, Lambda, and DynamoDB
- Transaction categorization pipeline combining deterministic rules with Amazon Bedrock LLM inference
- Shared pnpm workspace for reusable auth, client, NLP, and service packages
- Multi-tenant safeguards across logging, data isolation, and billing workflows

## What's New
- **Amazon Bedrock fallback for transaction classification**: `TransactionCategoryService` now calls `BedrockClassifierService` when the rule engine returns `UNCLASSIFIED`, enabling AI-assisted tagging routed through `packages/services/src/transaction-category-service.ts`.
- **Configurable feature flag and confidence hints**: toggle the integration with `AI_TAGGING_ENABLED=true`, supply a model via `BEDROCK_MODEL_ID` (for example `anthropic.claude-3-haiku-20240307-v1:0`), and surface an optional `AI_CONFIDENCE_THRESHOLD` for consumers that want to enforce a minimum LLM score.
- **Bedrock client package**: `packages/client/src/bedrock-client.ts` wraps the AWS SDK `BedrockRuntimeClient`, constructing prompts that mirror the platform's base/sub-category taxonomy so Bedrock responses map directly to the domain model.

## Architecture Highlights
- **Monorepo (pnpm workspaces)** keeps packages modular while sharing typed DTOs, logging, and utilities
- **AWS CDK** provisions S3, SQS, DynamoDB tables, and Lambda functions with repeatable infrastructure-as-code
- **Parameter Store (SSM)** stores shared secrets (JWT, API keys) for runtime environments
- **Rule Engine + AI Tagging** first applies keyword rules, then consults Bedrock when permitted to maximize accuracy without sacrificing determinism
- **Observability** standardizes Winston logging and exposes `/metrics` for dashboards

## Repository Layout
```
.
├── apps/
│   ├── graphql-api/           # GraphQL API (DynamoDB reads/writes, Bedrock wiring)
│   ├── txn-loaders/           # Processes uploaded statements and writes transactions
│   └── tag-loaders/           # Applies rule engine + Bedrock fallbacks via SQS workers
├── infra/                     # AWS CDK stacks
├── packages/
│   ├── client/                # S3/SQS helpers + Bedrock client wrapper
│   ├── commons/               # Shared types, configs, logging contracts
│   ├── db/                    # DynamoDB repositories
│   ├── nlp-tagger/            # Rule engine, keyword maps
│   └── services/              # Domain services (TransactionCategoryService, BedrockClassifierService, etc.)
├── scripts/                   # Utility scripts
└── docs/                      # Additional design notes and artifacts
```

## Prerequisites
- Node.js 18+ and pnpm (repo uses `pnpm@10.x`)
- AWS credentials with rights to S3, SQS, DynamoDB, Parameter Store, and (optionally) `bedrock:InvokeModel`
- Amazon Bedrock access in the chosen region when enabling AI tagging
- Optional: Docker + AWS CDK CLI for infrastructure deployments

## Setup
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/debrajpaul/full-budget-app.git
   cd full-budget-app
   pnpm install
   ```
2. Ensure your AWS CLI profile or environment variables expose the required credentials.

## Environment Variables
Create a `.env` at the repo root (values shown below are illustrative):
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

# sqs queue
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/bank-statement-jobs

# DynamoDB table
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

## Running Locally
```bash
pnpm dev                                   # rebuild packages on change
pnpm --filter @app/graphql-api dev         # start GraphQL API locally
pnpm --filter @app/tag-loaders dev         # run transaction tagger worker
pnpm --filter @app/txn-loaders dev         # process uploaded statements
```

Integration tests live in `packages/services` and `packages/client`; run them with `pnpm test` or scope with `pnpm --filter <package> test`.

## AI-powered Transaction Categorization Flow
1. `tag-loaders` consumes SQS events produced after statement ingestion.
2. `TransactionCategoryService` fetches tenant-specific rules and applies the keyword rule engine.
3. If the transaction remains `UNCLASSIFIED` and `AI_TAGGING_ENABLED` is true, the service calls `BedrockClassifierService`, which delegates to the shared Bedrock client.
4. The resulting base/sub category, reason, tagged source, and confidence score are written back to DynamoDB via `TransactionStore`.
5. Downstream consumers can compare the returned confidence against the optional `AI_CONFIDENCE_THRESHOLD` value if they need to gate AI suggestions.

## Deployment Notes
- Bootstrap the target AWS environment before CDK deploys:
  ```bash
  cdk bootstrap aws://<account-id>/<region>
  ```
- Build and deploy all stacks once bootstrapped:
  ```bash
  pnpm build
  pnpm --filter ./infra cdk:deploy:all
  ```
- CDK environment variables default `AI_TAGGING_ENABLED` to `false`; update stack parameters or related SSM parameters to enable Bedrock in non-local environments.

## Suggested Improvements
- Security: adopt KMS encryption and enforce least-privilege IAM roles for Bedrock access
- Testing: extend integration coverage for Bedrock fallback paths and AI confidence gating
- Deployment: add CI/CD automation with safe rollbacks
- Observability: integrate distributed tracing (AWS X-Ray) and per-tenant dashboards
- Reliability: tune SQS/Lambda DLQs and retry policies for AI provider timeouts

## How to Contribute

Find any typos? Have another resource you think should be included? Contributions are welcome!

First, fork this repository.

![Fork Icon](.github/images/fork-icon.png)

Next, clone this repository to your desktop to make changes.

```sh
$ git clone {YOUR_REPOSITORY_CLONE_URL}
$ cd stock-market
```

Once you've pushed changes to your local repository, you can issue a pull request by clicking on the green pull request icon.

![Pull Request Icon](.github/images/pull-request-icon.png)

Instead of cloning the repository to your desktop, you can also go to `README.md` in your fork on GitHub.com, hit the Edit button (the button with the pencil) to edit the file in your browser, then hit the `Propose file change` button, and finally make a pull request.

## Contact
Debraj Paul  
Email: pauldebraj7@gmail.com  
LinkedIn: https://www.linkedin.com/in/debraj-paul

## License
Apache License 2.0
