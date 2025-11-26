#!/bin/bash

# Script to tear down the Full Budget App resources in a running LocalStack instance.
#
# This removes the S3 bucket, SQS queue, DynamoDB tables, and SSM parameter
# provisioned by create_localstack_resources.sh. It assumes LocalStack is
# running locally on the default port (4566) and that the AWS CLI is installed.

set -euo pipefail

# Set dummy credentials for LocalStack. These values are ignored by LocalStack
# but required by the AWS CLI.
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-south-1

# Endpoint for all AWS services when using LocalStack. Adjust if your
# LocalStack is running on a different host or port.
ENDPOINT_URL="http://localhost:4566"

echo "Deleting S3 bucket and objects..."
aws --endpoint-url="${ENDPOINT_URL}" s3 rb s3://full-budget-app-upload-bucket --force \
  || echo "Bucket already removed or missing."

echo "Deleting SQS queue..."
QUEUE_URL=$(
  aws --endpoint-url="${ENDPOINT_URL}" sqs get-queue-url \
    --queue-name statement-processing-queue \
    --query "QueueUrl" \
    --output text 2>/dev/null || true
)
if [[ -n "${QUEUE_URL}" ]]; then
  aws --endpoint-url="${ENDPOINT_URL}" sqs delete-queue --queue-url "${QUEUE_URL}" \
    || echo "Failed to delete queue 'statement-processing-queue'."
else
  echo "Queue 'statement-processing-queue' not found; skipping."
fi

echo "Deleting DynamoDB tables..."
for table in transactions categories budgets recurring-transactions users; do
  if aws --endpoint-url="${ENDPOINT_URL}" dynamodb delete-table --table-name "${table}" >/dev/null 2>&1; then
    echo "Deleted table '${table}'."
  else
    echo "Table '${table}' not found or already deleted."
  fi
done

echo "Deleting SSM parameter..."
if aws --endpoint-url="${ENDPOINT_URL}" ssm delete-parameter --name jwt-secret >/dev/null 2>&1; then
  echo "Deleted parameter 'jwt-secret'."
else
  echo "Parameter 'jwt-secret' not found or already deleted."
fi

echo "LocalStack resource teardown complete."
