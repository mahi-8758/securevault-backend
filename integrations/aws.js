function getAwsIntegrationStatus() {
  return {
    enabled: false,
    message: 'AWS integration is not enabled in the current demo phase.'
  };
}

function generatePresignedUploadUrl() {
  return {
    enabled: false,
    uploadUrl: null,
    message: 'Presigned upload URLs will be added in the AWS phase.'
  };
}

function generatePresignedDownloadUrl() {
  return {
    enabled: false,
    downloadUrl: null,
    message: 'Presigned download URLs will be added in the AWS phase.'
  };
}

module.exports = {
  getAwsIntegrationStatus,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl
};