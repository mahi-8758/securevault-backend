const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

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
  if (!ownerId) {
    return response(401, { success: false, message: 'Authentication required.' }, event);
  }

  if (!process.env.FILES_BUCKET || !process.env.METADATA_TABLE || !process.env.AUDIT_TABLE) {
    return response(500, { success: false, message: 'Storage configuration is incomplete.' }, event);
  }

  const fileId = event?.pathParameters?.fileId;
  if (!fileId) {
    return response(400, { success: false, message: 'fileId is required.' }, event);
  }

  let file;
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: process.env.METADATA_TABLE,
      Key: { fileId }
    }));
    file = result.Item;
  } catch (error) {
    return response(500, { success: false, message: 'Unable to read file metadata.' }, event);
  }

  if (!file) {
    return response(404, { success: false, message: 'File not found.' }, event);
  }

  if (file.ownerId !== ownerId) {
    return response(403, { success: false, message: 'You do not own this file.' }, event);
  }

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.FILES_BUCKET,
      Key: file.s3Key
    }));

    await dynamo.send(new DeleteCommand({
      TableName: process.env.METADATA_TABLE,
      Key: { fileId }
    }));

    await dynamo.send(new PutCommand({
      TableName: process.env.AUDIT_TABLE,
      Item: {
        ownerId,
        fileId,
        fileName: file.fileName,
        action: 'DELETE',
        status: 'Success',
        timestamp: new Date().toISOString()
      }
    }));

    return response(200, {
      success: true,
      message: 'File deleted successfully.'
    }, event);
  } catch (error) {
    try {
      await dynamo.send(new PutCommand({
        TableName: process.env.AUDIT_TABLE,
        Item: {
          ownerId,
          fileId,
          fileName: file.fileName,
          action: 'DELETE',
          status: 'Failed',
          timestamp: new Date().toISOString()
        }
      }));
    } catch (auditError) {
      console.error('[SecureVault] Delete audit failure logging failed', auditError);
    }

    return response(500, {
      success: false,
      message: error.message || 'Delete failed.'
    }, event);
  }
};
