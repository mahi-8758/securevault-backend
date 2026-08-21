const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

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
  const fileId = event?.pathParameters?.fileId;
  if (!fileId) return response(400, { success: false, message: 'fileId is required.' });

  const result = await dynamo.send(new GetCommand({ TableName: process.env.METADATA_TABLE, Key: { fileId } }));
  const file = result.Item;
  if (!file) return response(404, { success: false, message: 'File not found.' });
  if (file.ownerId !== ownerId) return response(403, { success: false, message: 'You do not own this file.' });

  const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.FILES_BUCKET, Key: file.s3Key }), { expiresIn: 900 });
  if (process.env.AUDIT_TABLE) {
    await dynamo.send(new PutCommand({ TableName: process.env.AUDIT_TABLE, Item: { logId: `${Date.now()}-${fileId}`, ownerId, fileId, fileName: file.fileName, action: 'DOWNLOAD', dateTime: new Date().toISOString(), status: 'Success' } }));
  }
  return response(200, { success: true, fileId, downloadUrl });
};
