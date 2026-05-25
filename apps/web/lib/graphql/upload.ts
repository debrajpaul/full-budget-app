import { graphql } from "@api-client";

export const CreateUploadUrlDocument = graphql(`
  mutation CreateUploadUrl($input: CreateUploadUrlInput!) {
    createUploadUrl(input: $input) {
      jobId
      uploadUrl
      expiresInSeconds
    }
  }
`);

export const NotifyUploadCompleteDocument = graphql(`
  mutation NotifyUploadComplete($jobId: String!) {
    notifyUploadComplete(jobId: $jobId) {
      jobId
      accepted
      warnings
    }
  }
`);
