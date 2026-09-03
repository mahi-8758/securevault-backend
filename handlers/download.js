const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'https://main.d3a1aca3sc3925.amplifyapp.com'
];

function getCorsOrigin(event) {
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin;
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
}

function response(statusCode, body, event) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getCorsOrigin(event),
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function getOwnerId(event) {
  return event?.requestContext?.authorizer?.jwt?.claims?.sub
    || event?.requestContext?.authorizer?.claims?.sub
    || event?.requestContext?.authorizer?.principalId;
}

exports.handler = async (event) => {
  const ownerId = getOwnerId(event);
  if (!ownerId) return response(401, { success: false, message: 'Authentication required.' }, event);
  if (!process.env.AUDIT_TABLE) {
    return response(500, { success: false, message: 'Audit logging configuration is incomplete.' }, event);
  }
  const fileId = event?.pathParameters?.fileId;
  if (!fileId) return response(400, { success: false, message: 'fileId is required.' }, event);

  const result = await dynamo.send(new GetCommand({ TableName: process.env.METADATA_TABLE, Key: { fileId } }));
  const file = result.Item;
  if (!file) return response(404, { success: false, message: 'File not found.' }, event);
  if (file.ownerId !== ownerId) return response(403, { success: false, message: 'You do not own this file.' }, event);

  const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.FILES_BUCKET, Key: file.s3Key }), { expiresIn: 900 });
  await dynamo.send(new PutCommand({ TableName: process.env.AUDIT_TABLE, Item: { fileId, timestamp: new Date().toISOString(), ownerId, fileName: file.fileName, action: 'DOWNLOAD', status: 'Success' } }));
  return response(200, { success: true, fileId, downloadUrl }, event);
};
