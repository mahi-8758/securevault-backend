const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'http://localhost:8080',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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
  if (!ownerId) return response(401, { success: false, message: 'Authentication required.' });

  const fileId = event?.pathParameters?.fileId;
  console.log('[SecureVault] files.js handler', { pathParameters: event?.pathParameters, fileId });

  if (fileId) {
    console.log('[SecureVault] Single-file GET', fileId);
    try {
      const result = await dynamo.send(new GetCommand({
        TableName: process.env.METADATA_TABLE,
        Key: { fileId }
      }));

      const file = result.Item;
      if (!file) {
        return response(404, { success: false, message: 'File not found.' });
      }

      if (file.ownerId !== ownerId) {
        return response(403, { success: false, message: 'You do not own this file.' });
      }

      if (process.env.AUDIT_TABLE) {
        try {
          await dynamo.send(new PutCommand({
            TableName: process.env.AUDIT_TABLE,
            Item: {
              ownerId,
              fileId: file.fileId,
              fileName: file.fileName,
              action: 'VIEW',
              status: 'Success',
              timestamp: new Date().toISOString()
            }
          }));
          console.log('[SecureVault] VIEW audit written', fileId);
        } catch (error) {
          console.error('[SecureVault] View audit logging failed', error);
        }
      }

      return response(200, { success: true, file });
    } catch (error) {
      console.error('[SecureVault] Get file by ID failed', error);
      return response(500, { success: false, message: 'Unable to retrieve file details.' });
    }
  }

  const query = { TableName: process.env.METADATA_TABLE, KeyConditionExpression: 'ownerId = :ownerId', ExpressionAttributeValues: { ':ownerId': ownerId } };
  if (process.env.OWNER_INDEX) query.IndexName = process.env.OWNER_INDEX;
  const result = await dynamo.send(new QueryCommand(query));
  return response(200, { success: true, files: result.Items || [] });
};
