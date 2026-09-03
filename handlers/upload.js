const { v4: uuid } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

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
  if (!process.env.FILES_BUCKET || !process.env.METADATA_TABLE) {
    return response(500, { success: false, message: 'Storage configuration is incomplete.' }, event);
  }

  const requestBody = typeof event.body === 'string'
    ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body)
    : event.body;
  const body = typeof requestBody === 'string' ? JSON.parse(requestBody || '{}') : (requestBody || {});
  const fileName = String(body.fileName || '').trim();
  if (!fileName) return response(400, { success: false, message: 'fileName is required.' }, event);

  const fileId = uuid();
  const key = `${ownerId}/${fileId}-${fileName}`;
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.FILES_BUCKET, Key: key }), { expiresIn: 900 });

  await dynamo.send(new PutCommand({
    TableName: process.env.METADATA_TABLE,
    Item: { fileId, ownerId, fileName, fileType: body.fileType || 'OTHER', size: Number(body.size || 0), s3Key: key, uploadedAt: new Date().toISOString(), status: 'Encrypted' }
  }));

  if (process.env.AUDIT_TABLE) {
    try {
      await dynamo.send(new PutCommand({
        TableName: process.env.AUDIT_TABLE,
        Item: {
          ownerId,
          fileId,
          fileName,
          action: 'UPLOAD',
          status: 'Success',
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('[SecureVault] Upload audit logging failed', error);
    }
  }

  return response(201, { success: true, fileId, uploadUrl }, event);
};
