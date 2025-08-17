# full-budget-app

A modular, scalable microservice architecture with best practices of a multi-tenancy SaaS platform for managing transactions, budgets, and reviews using AWS CDK, Lambda, DynamoDB, SQS, and S3.

- **GraphQL Apollo** for the API layer
- **SQS** for event-driven background processing
- **S3** to store the bank statement
- **DynamoDB** for the persistence layer
- **pnpm workspaces** for package management

## Design Decisions

- **Monorepo (pnpm workspaces)**
  - Enables code reuse (commons) across GraphQL API and worker
  - Clear project separation with fast local builds
- **AWS CDK**
  - Infrastructure-as-code with reusable L3 Constructs
- **Parameter Store (SSM)**
  - Used for secrets/config management
- **GraphQL Apollo**
  - Simple schema-first API with modern middleware support
  - Exposes /metrics endpoint for CloudWatch dashboard
- **SQS**
  - Background task processing (bank parser)
  - Decouples write-heavy or async logic from API
- **DynamoDB**
  - Document-oriented for nested data (bank → transactions[])
  - Easy ODM support with validation
- **Winston Logger**
  - Standardized logs across all services
  - Tagged by topic, service, and error level

## \*Architecture Diagram **coming soon\***

### Multi-Tenancy Models

**Single Table / Shared Infrastructure (Recommended Initially)**

- Add `tenantId` to every DynamoDB record
- Inject `tenantId` into GraphQL context via middleware
- Enforce tenant scoping in queries and mutations

**Isolated Resources per Tenant (Enterprise)**

- S3: Prefix all paths with `tenantId` → `s3://bucket/<tenantId>/`
- DynamoDB: Table-per-tenant for strict isolation

### Authentication

- JWT includes `tenantId`:

```json
{
  "userId": "user-id",
  "tenantId": "tenant-abc123",
  "email": "user@example.com"
}
```

- Middleware extracts and validates `tenantId`

### Tenant Provisioning

1. Generate unique `tenantId`
2. Create entry in `Tenants` table with plan and limits
3. Initialize S3 prefix
4. Send onboarding email

### Billing & Plans

- Integrate **Stripe** for subscriptions
- Store `stripeCustomerId` in `Tenants`
- Track usage in DynamoDB and enforce limits

### Security

- Use IAM condition keys to restrict access by `tenantId`
- Include `tenantId` in CloudWatch logs for auditing

### Observability

- Tag all logs with `tenantId`
- Filter logs in CloudWatch Insights by `tenantId`

### Testing Isolation

- Create mock tenants in seed data
- Run integration tests to ensure no cross-tenant data leaks

### SaaS Readiness Checklist

| Area           | Implementation                                     |
| -------------- | -------------------------------------------------- |
| Multi-Tenancy  | Tenant-aware context, `tenantId` filtering         |
| Authentication | JWT with `tenantId`                                |
| Billing        | Stripe + usage tracking                            |
| Data Isolation | S3 prefixes, Dynamo filters                        |
| Observability  | Logs & metrics tagged with `tenantId`              |
| Scalability    | Serverless infra, provisioned concurrency optional |

---

## What is this repository for?

    Monorepo Structure
    .
    ├── apps/
    │ ├── graphql-api/ # GraphQL API (reads/writes to DynamoDB)
    │ │ ├── dockerfile
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── txn-loaders/ # SQS consumer (adds transaction to DynamoDB)
    │ │ ├── dockerfile
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── tag-loaders/ # DynamoDB stream consumer (adds categories to DynamoDB)
    │ │ ├── dockerfile
    │ │ ├── package.json
    │ │ └── tsconfig.json
    ├── infra/
    │ ├── bin/ # root entry (AWS CDK)
    │ ├── lib/ # all reusable L3 Constructs (AWS CDK)
    ├── packages/
    │ ├── auth/ # Authentication service for managing user sessions and security
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── client/ # Client for managing file uploads and downloads
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── commons/ # Common service providing foundational functionality for the application
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── db/ # Database service for managing data storage and retrieval
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── logger/ # Logger for application events
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── nlp-tagger/ # NLP Tagger service for processing and tagging text data
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── parser/ # Parser service for HDFC and SBI data processing
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ └── services/ # Service layer for handling business logic
    │   ├── package.json
    │   └── tsconfig.json
    ├── pnpm-workspace.yaml
    ├── docker-compose.yml
    ├── package.json
    └── tsconfig.json

## How do I get set up?

1. Clone the repo:
   ```bash
   git clone https://github.com/debrajpaul/full-budget-app.git
   ```
2. Go to the root folder and install dependencies:
   ```bash
   pnpm install
   ```

> 📦 Version: `1.0`

---

## Server Configuration:-

- Region: `ap-south-1`
- Deployed via: AWS CDK v2
- Log Retention: 7 days (set via CDK)
- CDK Bootstrapping Required:

```bash
cdk bootstrap aws://<account-id>/ap-south-1
```

---

## Dependencies

All dependencies are listed in the `package.json` files across `apps/`, `infra/` and `packages/`.

Steps:

1. In terminal, go to your project directory
2. Run:
   ```bash
   pnpm install
   ```

---

## .env file

```
PORT=4005
NODE_ENV=dev
LOG_LEVEL=debug

# mongo cred
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=bookdb

# kafka cred
KAFKA_BROKERS_HOST=localhost
KAFKA_BROKERS_PORT=9092
CLIENT_ID=book-service
```

---

## Local Deployment instructions:-

1. Build backend:

   ```bash
   cd apps/api && pnpm build
   ```

2. Deploy CDK Stacks:

   ```bash
   cd infra && pnpm run build && pnpm exec cdk deploy --all
   ```

3. If deployment fails due to LogGroup already exists, go to AWS CloudWatch Logs and delete the corresponding log group manually.

4. (Optional) Delete failed CloudFormation stacks via CloudFormation Console.

---

## Suggested Improvements

    * Security:- Use KMS encryption and least-privilege IAM roles.
    * Testing:- Add unit/integration tests for background jobs and Lambda handlers.
    * Deployment:- Integrate CI/CD pipelines with rollback support.
    * Observability:- Integrate with AWS X-Ray or third-party tracing.
    * Retry Logic:- Improve SQS + Lambda dead-letter handling and retries.
    * API Evolution:- GraphQL schema versioning support.
    * Reduce Latency:- Enable Lambda provisioned concurrency if needed.
    * Traceability:- Include X-Request-ID or correlation IDs in logs.

---

## Who do I talk to?

    Debraj Paul
    contact info:- pauldebraj7@gmail.com
    LinkedIn:- https://www.linkedin.com/in/debraj-paul

---

## License

    Apache License
