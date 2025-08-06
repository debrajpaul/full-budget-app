# full-budget-app

A modular, scalable microservice architecture for managing transactions, budgets, and reviews. using AWS CDK, Lambda, DynamoDB, SQS, and S3.

- **GraphQL Apollo** for the API layer
- **SQS** for event-driven background processing
- **S3** to store the bank statement
- **DynamoDB** for the persistence layer
- **pnpm workspaces** for package management

## Design Decisions

    * Monorepo (pnpm workspaces)
        * Enables code reuse (commons) across graphql api, processor worker
        * Clear project separation with fast local builds
    * AWS CDK
        * Infrastructure-as-code with reusable L3 Constructs
    * Parameter Store (SSM)
        * Used for secrets/config management.
    * GraphQL Apollo
        * Simple schema-first API with modern middleware support
        * Exposes /metrics endpoint for cloudwatch dashboad
    * Simple Queue Service (SQS)
        * Background task processing (bank parcer)
        * Decouples write-heavy or async logic from API
    * DynamoDB
        * Document-oriented for nested data (bank -> transactions[])
        * Easy ODM support with validation
    * Winston Logger
        * Standardized logs across all services
        * Tagged by topic, service, and error level

    * Architecture Diagram

    +-------------------+         Kafka Topic          +------------------+
    | GraphQL API (Yoga)|  ──────> "review-events" ──> | Kafka Broker     |
    |  - Zod Validation |                              |                  |
    |  - Mongoose       |                              +------------------+
    |  - Prom-client    |
    +--------+----------+
            |
            | MongoDB Write
            ▼
    +--------------------+
    |   MongoDB          |
    |  - Books + Reviews |
    +--------------------+

    <-------------------- Prometheus scrapes /metrics ------------------->
            Grafana visualizes latency, errors, consumer lag

            +------------------------------------------+
            | Kafka Consumer (Processor Service)       |
            |  - KafkaJS                               |
            |  - Mongoose                              |
            |  - Winston logger                        |
            |  - Zod Revalidation                      |
            +------------------------------------------+

## What is this repository for?

    Monorepo Structure
    .
    ├── apps/
    │ ├── api/ # GraphQL API (reads/writes to DynamoDB)
    │ │ ├── dockerfile
    │ │ ├── package.json
    │ │ └── tsconfig.json
    │ ├── worker/ # SQS consumer (adds transaction to DynamoDB)
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
