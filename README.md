# SecureVault Backend

This repository retains the working Express/mock backend for local demonstrations and adds AWS SDK v3 Lambda-ready handlers under `handlers/`. The demo server is intentionally not replaced while the AWS phase is pending.

## Local demo

```bash
npm install
npm start
```

The health endpoint is `http://localhost:3000/health`. It returns the demo service status and the existing `/api/auth`, `/api/files`, and `/api/audit-logs` routes remain available.

## Lambda preparation

Handlers use `exports.handler = async (event) => {}` and read identity only from the API Gateway authorizer context. Configure `FILES_BUCKET`, `METADATA_TABLE`, `AUDIT_TABLE`, and optional owner-index variables at deployment time. Documents are intended to move directly between S3 and the browser using presigned URLs; they are never stored in DynamoDB.

The handlers are preparation only. Cognito, API Gateway, S3, DynamoDB, IAM, and deployment have not been configured or provisioned.