# 🔐 SecureVault Backend

SecureVault Backend provides the serverless API layer and backend microservices for the SecureVault cloud document management platform. Built using Node.js and AWS SDK v3, it powers authenticated document management operations, Amazon S3 file storage transfers via presigned URLs, Amazon DynamoDB metadata persistence, and access audit logging. The codebase supports both AWS Lambda serverless execution behind Amazon API Gateway and a local Express server workflow for offline development.

---

## 🎥 Project Demo

▶️ [Watch SecureVault Project Demo](https://youtu.be/W42Mjil9OKo)

This video demonstrates the complete working SecureVault application and its cloud architecture.

---

## ✨ Features

- **File Upload Workflow**: Generates time-limited Amazon S3 presigned PUT URLs for secure direct binary uploads and registers file metadata in DynamoDB.
- **File Listing**: Retrieves document metadata filtered by the authenticated user's identity (`ownerId`).
- **File Details & View Tracking**: Fetches specific document details and automatically records a `VIEW` audit event.
- **Secure File Download**: Generates temporary Amazon S3 presigned GET URLs for authorized file downloads and records `DOWNLOAD` audit logs.
- **File Deletion**: Permanently removes document objects from Amazon S3, deletes metadata entries from DynamoDB, and logs `DELETE` audit events.
- **User Ownership Validation**: Strictly enforces user identity boundaries (`sub` claim) to ensure users can only access and manage their own files.
- **Authentication & Authorization**: Decodes and verifies Amazon Cognito JWT authorizer claims passed via API Gateway.
- **Audit Logging**: Automatically records immutable access audit history (`UPLOAD`, `VIEW`, `DOWNLOAD`, `DELETE`) in DynamoDB.
- **S3 Integration**: Direct object manipulation and presigned URL generation using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- **DynamoDB Integration**: Fast document metadata and audit log querying using `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`.
- **CORS Handling**: Dynamic Cross-Origin Resource Sharing (CORS) headers configured for web applications.
- **Structured Error Handling**: Graceful error management returning standardized JSON payloads and appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500).

---

## ☁️ AWS Services

| AWS Service | Purpose |
|---|---|
| Amazon Cognito | User authentication and identity verification |
| Amazon API Gateway | REST API routing, request validation, and authorization |
| AWS Lambda | Serverless backend execution for file operations and audit handlers |
| Amazon S3 | Secure private file storage with presigned URL transfers |
| Amazon DynamoDB | File metadata persistence and access audit log tracking |
| Amazon CloudWatch | Lambda execution logging, diagnostics, and metrics |

---

## 🔌 API Endpoints

All REST API endpoints require a valid Amazon Cognito JWT authentication token passed in standard `Authorization: Bearer <token>` headers.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload` | Generates presigned S3 PUT URL, writes document metadata, and logs UPLOAD audit entry |
| GET | `/files` | Retrieves all document metadata entries belonging to the authenticated user |
| GET | `/files/{fileId}` | Retrieves specific file metadata details and logs VIEW audit entry |
| DELETE | `/files/{fileId}` | Deletes S3 document object, removes DynamoDB metadata, and logs DELETE audit entry |
| GET | `/download/{fileId}` | Generates temporary presigned S3 GET URL and logs DOWNLOAD audit entry |
| GET | `/audit` | Retrieves access audit logs for the authenticated user |

---

## 🔄 Backend Workflow

1. The user authenticates using Amazon Cognito via the frontend.
2. The frontend sends an authenticated REST API request to Amazon API Gateway with a Cognito ID token.
3. Amazon API Gateway receives the request and verifies the Cognito JWT authorization token.
4. API Gateway invokes the corresponding AWS Lambda handler function.
5. Lambda validates the authenticated user identity (`ownerId`) and requested document operation.
6. Lambda interacts with Amazon S3 (generating presigned URLs or deleting objects) and/or Amazon DynamoDB (querying or updating metadata).
7. Key file access operations generate corresponding audit records in DynamoDB.
8. Lambda returns the HTTP response with JSON payload and CORS headers to API Gateway and the frontend.

---

## 📁 Project Structure

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
│   ├── audit.js             # Express route handler for local /api/audit-logs
│   ├── auth.js              # Express route handler for local authentication
│   └── files.js             # Express route handler for local files, upload, and download
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

### Handler Descriptions
- **`handlers/upload.js`**: Handles `POST /upload` requests. Generates a 15-minute presigned PUT URL for S3, creates a metadata record in DynamoDB, and logs an `UPLOAD` audit entry.
- **`handlers/files.js`**: Handles `GET /files` (lists user documents) and `GET /files/{fileId}` (retrieves single document metadata and writes a `VIEW` audit log).
- **`handlers/download.js`**: Handles `GET /download/{fileId}` requests. Generates a 15-minute presigned GET URL for S3 download and records a `DOWNLOAD` audit entry.
- **`handlers/delete.js`**: Handles `DELETE /files/{fileId}` requests. Deletes the file object from S3, removes metadata from DynamoDB, and writes a `DELETE` audit log.
- **`handlers/audit.js`**: Handles `GET /audit` requests. Queries access activity history from the DynamoDB audit table for the authenticated user.
- **`scripts/build-lambda.js`**: Packaging script that creates standalone, optimized Lambda bundles in `lambda-build/` and zips them for Terraform deployment.
- **`server.js`**: Entry point for running a local Express development server with mock or AWS integrations.

---

## ⚙️ Setup & Development

### 1. Install Dependencies
Install all required Node.js packages:

```bash
npm install
```

### 2. Run Local Development Server
To run the Express development server locally:

```bash
npm start
```

Default local server port: `http://localhost:3000`.

### 3. Build Production Lambda Bundles
To package standalone AWS Lambda deployment bundles:

```bash
npm run build:lambda
```

This runs `scripts/build-lambda.js` to create isolated Lambda build packages in `lambda-build/` and zip archives in `../securevault-infrastructure/lambda-packages/`.