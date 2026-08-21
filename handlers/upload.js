const { v4: uuid } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function getOwnerId(event) {
  return event?.requestContext?.authorizer?.jwt?.claims?.sub
    || event?.requestContext?.authorizer?.claims?.sub
    || event?.requestContext?.authorizer?.principalId;
}

exports.handler = async (event) => {
  const ownerId = getOwnerId(event);
  if (!ownerId) return response(401, { success: false, message: 'Authentication required.' });
  if (!process.env.FILES_BUCKET || !process.env.METADATA_TABLE) {
    return response(500, { success: false, message: 'Storage configuration is incomplete.' });
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
  const fileName = String(body.fileName || '').trim();
  if (!fileName) return response(400, { success: false, message: 'fileName is required.' });

  const fileId = uuid();
  const key = `${ownerId}/${fileId}-${fileName}`;
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.FILES_BUCKET, Key: key }), { expiresIn: 900 });

  await dynamo.send(new PutCommand({
    TableName: process.env.METADATA_TABLE,
    Item: { fileId, ownerId, fileName, fileType: body.fileType || 'OTHER', size: Number(body.size || 0), s3Key: key, uploadedAt: new Date().toISOString(), status: 'Encrypted' }
  }));

  return response(201, { success: true, fileId, uploadUrl });
};
