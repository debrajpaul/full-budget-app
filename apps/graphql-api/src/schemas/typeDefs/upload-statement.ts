export const uploadStatementTypeDefs = /* GraphQL */ `
  """
  Payload to upload a bank statement (base64 content).
  """
  input StatementInput {
    bankName: BankName!
    bankType: BankType!
    fileName: String!
    contentBase64: String!
  }

  """
  Input to request a pre-signed S3 upload URL for a bank statement.
  """
  input CreateUploadUrlInput {
    bankName: BankName!
    bankType: BankType!
    fileName: String!
  }

  """
  Result of the createUploadUrl mutation.
  """
  type UploadUrlResult {
    jobId: String!
    uploadUrl: String!
    expiresInSeconds: Int!
  }

  """
  Rich result returned after a statement upload is accepted for processing.
  warnings surfaces non-fatal issues such as oversized files.
  """
  type StatementUploadResult {
    jobId: String!
    accepted: Boolean!
    warnings: [String!]!
  }

  """
  Root mutation operations for the Finance Budget API.
  """
  type Mutation {
    """
    Uploads a bank statement file (base64) for processing and import.
    """
    uploadStatement(input: StatementInput!): StatementUploadResult!
      @deprecated(
        reason: "Use createUploadUrl + notifyUploadComplete instead. Will be removed in the next release."
      )
    """
    Creates a pre-signed S3 URL for direct statement upload. After the client PUTs
    the file to uploadUrl, call notifyUploadComplete(jobId) to trigger processing.
    """
    createUploadUrl(input: CreateUploadUrlInput!): UploadUrlResult!
    """
    Notifies that a direct S3 upload has completed, enqueuing the transaction
    processing job. Idempotent: replaying the same jobId is safe.
    """
    notifyUploadComplete(jobId: String!): StatementUploadResult!
  }
`;
