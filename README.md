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

## Build Lambda packages

Create isolated production packages for the four handlers with:

```bash
npm run build:lambda
```

This recreates `lambda-build/` and produces `upload/`, `files/`, `download/`, and `audit/` directories. Each directory contains the handler as `index.js`, a minimal `package.json`, a generated `package-lock.json`, and only that handler's production dependencies. The build does not read or copy `.env` files, credentials, the Express server, routes, services, or the main repository's `node_modules`.

To verify a package before deployment, confirm its entry point and dependency set, then load its handler locally:

```bash
node -e "const lambda = require('./lambda-build/upload'); console.log(typeof lambda.handler)"
npm --prefix lambda-build/upload ls --omit=dev
```

Repeat those commands for `files`, `download`, and `audit`. Zip the contents of one package directory, including `index.js`, `package.json`, `package-lock.json`, and `node_modules/`, when preparing an upload. This build only creates local artifacts; it does not deploy to AWS.