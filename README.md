# SecureVault Backend

SecureVault Backend provides microservice logic for SecureVault. It supports both local Express server execution for rapid development and AWS SDK v3 Lambda handlers for production serverless execution.

## Directory Tree

```text
securevault-backend/
├── config/
│   └── index.js             # Environment configuration parser (port, demo mode settings)
├── data/
│   └── mockStore.js         # In-memory mock data store for local demo mode
├── handlers/
│   ├── audit.js             # GET /audit Lambda handler (queries DynamoDB audit log table)
│   ├── delete.js            # DELETE /files/{fileId} Lambda handler (deletes S3 object & DynamoDB metadata)
│   ├── download.js          # GET /download/{fileId} Lambda handler (generates S3 presigned GET URL)
│   ├── files.js             # GET /files & GET /files/{fileId} Lambda handler (queries DynamoDB metadata)
│   └── upload.js            # POST /upload Lambda handler (generates S3 presigned PUT URL & writes DynamoDB record)
├── integrations/
│   └── aws.js               # AWS SDK v3 client initializers (DynamoDB client, S3 client)
├── routes/
│   ├── audit.js             # Express route handler for /api/audit-logs
│   ├── auth.js              # Express route handler for local authentication
│   └── files.js             # Express route handler for files, upload, and download
├── scripts/
│   └── build-lambda.js      # Production Lambda packager script (`npm run build:lambda`)
├── services/
│   ├── auditService.js      # Business logic for recording & retrieving audit events
│   ├── authService.js       # Business logic for local user session verification
│   └── fileService.js        # Business logic for file metadata & presigned URLs
├── .env.example             # Template for local environment variables
├── .gitignore               # Backend gitignore rules (excludes node_modules, build packages, secrets)
├── package.json             # NPM dependencies, scripts, and package metadata
├── package-lock.json        # Locked dependency tree
├── README.md                # Backend documentation
└── server.js                # Express local API server entry point
```

## Dual Execution Modes

### 1. Serverless AWS Lambda Handlers (`handlers/`)
Designed to run in AWS Lambda behind API Gateway with Cognito Authorization:
- **`upload.js`**: Receives document metadata, generates an S3 presigned PUT URL valid for 15 minutes, writes file metadata to DynamoDB, and logs an `UPLOAD` audit entry.
- **`download.js`**: Retrieves file metadata from DynamoDB, generates an S3 presigned GET URL valid for 15 minutes, and records a `DOWNLOAD` audit entry.
- **`files.js`**: Lists all documents belonging to the authenticated user (`ownerId`) or fetches specific document metadata.
- **`audit.js`**: Queries user access audit events from DynamoDB.
- **`delete.js`**: Deletes the document file object from S3, removes the metadata entry from DynamoDB, and logs a `DELETE` audit event.

### 2. Local Express Server (`server.js`)
Runs locally for offline development or testing without AWS credentials:
```bash
cd securevault-backend
npm install
npm start
```
Default server port: `http://localhost:3000`.

## Building Production Lambda Bundles

To build isolated, lightweight Lambda packages for deployment to AWS:

```bash
npm run build:lambda
```

This runs `scripts/build-lambda.js`, creating the `lambda-build/` directory with production-only packages:
- `lambda-build/upload/`
- `lambda-build/files/`
- `lambda-build/download/`
- `lambda-build/audit/`
- `lambda-build/delete/`

Each package directory contains its standalone `index.js`, `package.json`, `package-lock.json`, and optimized `node_modules/`.

## Environment Variables

Configure the following environment variables in your deployment environment or AWS Lambda configuration:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `FILES_BUCKET` | S3 bucket name for document storage | `securevault-files-dev` |
| `METADATA_TABLE` | DynamoDB table name for document metadata | `securevault-metadata-dev` |
| `AUDIT_TABLE` | DynamoDB table name for audit logs | `securevault-audit-logs-dev` |
| `DEMO_MODE` | Enable local mock fallback mode (`true`/`false`) | `false` |
| `PORT` | Local Express server port | `3000` |