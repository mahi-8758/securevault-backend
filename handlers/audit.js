const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
  const fileId = event?.queryStringParameters?.fileId;
  const query = { TableName: process.env.AUDIT_TABLE, KeyConditionExpression: 'ownerId = :ownerId', ExpressionAttributeValues: { ':ownerId': ownerId } };
  if (process.env.AUDIT_OWNER_INDEX) query.IndexName = process.env.AUDIT_OWNER_INDEX;
  if (fileId) {
    query.KeyConditionExpression += ' AND fileId = :fileId';
    query.ExpressionAttributeValues[':fileId'] = fileId;
  }
  const result = await dynamo.send(new QueryCommand(query));
  return response(200, { success: true, logs: result.Items || [] }, event);
};
