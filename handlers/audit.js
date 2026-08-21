const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
  const fileId = event?.queryStringParameters?.fileId;
  const query = { TableName: process.env.AUDIT_TABLE, KeyConditionExpression: 'ownerId = :ownerId', ExpressionAttributeValues: { ':ownerId': ownerId } };
  if (process.env.AUDIT_OWNER_INDEX) query.IndexName = process.env.AUDIT_OWNER_INDEX;
  if (fileId) {
    query.KeyConditionExpression += ' AND fileId = :fileId';
    query.ExpressionAttributeValues[':fileId'] = fileId;
  }
  const result = await dynamo.send(new QueryCommand(query));
  return response(200, { success: true, logs: result.Items || [] });
};
