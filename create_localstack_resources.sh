#!/bin/bash

# Script to provision the Full Budget App resources in a running LocalStack instance.
#
# This script assumes LocalStack is running locally on the default port (4566)
# and that the AWS CLI is installed. It provisions the S3 bucket, SQS queue,
# DynamoDB tables, and SSM parameter that mirror the AWS CDK stacks defined
# in the Full Budget App. See the project README for context.

set -euo pipefail

# Set dummy credentials for LocalStack. These values are ignored by LocalStack
# but required by the AWS CLI.
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-south-1

# Endpoint for all AWS services when using LocalStack. Adjust if your
# LocalStack is running on a different host or port.
ENDPOINT_URL="http://localhost:4566"

echo "Creating S3 bucket..."
aws --endpoint-url="${ENDPOINT_URL}" s3 mb s3://full-budget-app-upload-bucket || echo "Bucket may already exist."

echo "Creating SQS queue..."
aws --endpoint-url="${ENDPOINT_URL}" sqs create-queue \
  --queue-name statement-processing-queue \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=86400 || echo "Queue may already exist."

echo "Creating DynamoDB tables..."

# Transactions table with tenantId as partition key and transactionId as sort key.
aws --endpoint-url="${ENDPOINT_URL}" dynamodb create-table \
  --table-name transactions \
  --attribute-definitions AttributeName=tenantId,AttributeType=S AttributeName=transactionId,AttributeType=S \
  --key-schema AttributeName=tenantId,KeyType=HASH AttributeName=transactionId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE || echo "Table 'transactions' may already exist."

# Categories table with tenantId as partition key and ruleId as sort key.
aws --endpoint-url="${ENDPOINT_URL}" dynamodb create-table \
  --table-name categories \
  --attribute-definitions AttributeName=tenantId,AttributeType=S AttributeName=ruleId,AttributeType=S \
  --key-schema AttributeName=tenantId,KeyType=HASH AttributeName=ruleId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST || echo "Table 'categories' may already exist."

# Budgets table with tenantId as partition key and budgetId as sort key.
aws --endpoint-url="${ENDPOINT_URL}" dynamodb create-table \
  --table-name budgets \
  --attribute-definitions AttributeName=tenantId,AttributeType=S AttributeName=budgetId,AttributeType=S \
  --key-schema AttributeName=tenantId,KeyType=HASH AttributeName=budgetId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST || echo "Table 'budgets' may already exist."

# Recurring transactions table with tenantId as partition key and recurringId as sort key.
aws --endpoint-url="${ENDPOINT_URL}" dynamodb create-table \
  --table-name recurring-transactions \
  --attribute-definitions AttributeName=tenantId,AttributeType=S AttributeName=recurringId,AttributeType=S \
  --key-schema AttributeName=tenantId,KeyType=HASH AttributeName=recurringId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST || echo "Table 'recurring-transactions' may already exist."

# Users table with tenantId as partition key and email as sort key.
aws --endpoint-url="${ENDPOINT_URL}" dynamodb create-table \
  --table-name users \
  --attribute-definitions AttributeName=tenantId,AttributeType=S AttributeName=email,AttributeType=S \
  --key-schema AttributeName=tenantId,KeyType=HASH AttributeName=email,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST || echo "Table 'users' may already exist."

echo "Creating SSM parameter for JWT secret..."
# Store a placeholder JWT secret in SSM. Replace 'replace-me' with your actual secret.
aws --endpoint-url="${ENDPOINT_URL}" ssm put-parameter \
  --name jwt-secret \
  --value hard_work_payoff \
  --type String \
  --overwrite || echo "Parameter may already exist."

echo "LocalStack resource provisioning complete."