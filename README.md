# full-budget-app

A modular, scalable microservice architecture for handling books and reviews using:

- **GraphQL Yoga** for the API layer
- **KafkaJS** for event-driven background processing
- **MongoDB** with Mongoose ODM
- **pnpm workspaces** for package management

## Design Decisions

    * Monorepo (pnpm workspaces)
        * Enables code reuse (commons) across graphql, processor
        * Clear project separation with fast local builds
    * GraphQL Yoga
        * Simple schema-first API with modern middleware support
        * Exposes /metrics endpoint for Prometheus
    * Kafka with KafkaJS
        * Background task processing (review verification)
        * Decouples write-heavy or async logic from API
    * MongoDB with Mongoose
        * Document-oriented for nested data (Book -> reviews[])
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
    ├── projects/
    │ ├── graphql/ # GraphQL API (reads/writes to Mongo)
    │ ├── processor/ # Kafka consumer (adds verified reviews)
    │ └── commons/ # Shared code: logger, kafka, services, models
    ├── pnpm-workspace.yaml
    ├── docker-compose.yml
    ├── package.json
    └── tsconfig.json

## How do I get set up?

    Set up all dependencies mentioned below
    Summary of set up:- Clone the file from repository and follow the "deployment instructions".
    Version:- 1.0
    Git clone :-https://github.com/debrajpaul/book-review-microservice.git

## Server Configuration:-

    Node 20+
    Docker & Docker Compose
    pnpm

## Dependencies

    All dependencies are listed in package.json file
    * In terminal go to your project directory
    * In terminal type "pnpm i" to add all dependencies.

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

## Local Deployment instructions:-

    In terminal go to your project directory
    * GraphQL API
        cd projects/graphql
        pnpm run dev
    * Kafka Processor
        cd projects/processor
        pnpm run dev

## Docker Compose (Kafka + Mongo + Prometheus + Grafana):-

    In terminal go to your project directory
    * docker-compose up --build
    * Services:
        * MongoDB: localhost:27017
        * Kafka: localhost:9092
        * Prometheus: localhost:9090
        * Grafana: localhost:3000

## Suggested Improvements

    * Security:- Add input validation (Zod or GraphQL types), auth middleware
    * Testing:- Add Jest unit + integration tests with CI
    * Deployment:- Use Docker multi-stage builds and GitHub Actions
    * Observability:- Integrate Prometheus + Grafana for logs, alerts on failure metrics
    * Retry Logic:- Implement retry queues or dead-letter support for Kafka
    * API Evolution:- Add versioning to GraphQL schema (via modules or federation)
    * Reduce Latency:- Redia caache to GraphQl API
    * Traceability:- Add OpenTelemetry for distributed tracing

## Who do I talk to?

    Debraj Paul
    contact info:- pauldebraj7@gmail.com
    LinkedIn:- https://www.linkedin.com/in/debraj-paul

## License

    Apache License
