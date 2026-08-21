const store = require('../data/mockStore');

function listFiles() {
  return {
    success: true,
    files: store.listFiles()
  };
}

function getFileById(fileId) {
  const file = store.getFile(fileId);
  if (!file) {
    return {
      success: false,
      message: 'File not found.'
    };
  }

  return {
    success: true,
    file
  };
}

function uploadFile(payload = {}) {
  const file = store.uploadFile(payload);

  return {
    success: true,
    message: 'Document uploaded successfully.',
    file
  };
}

function downloadFile(fileId) {
  const file = store.getFile(fileId);
  if (!file) {
    return {
      success: false,
      message: 'File not found.'
    };
  }

  store.addAuditLog({
    fileId: file.fileId,
    fileName: file.fileName,
    action: 'DOWNLOAD',
    dateTime: new Date().toISOString()
  });

  return {
    success: true,
    fileId: file.fileId,
    fileName: file.fileName,
    downloadReady: true,
    downloadUrl: null,
    message: 'Download link generated. Demo mode does not expose a real storage URL.'
  };
}

function deleteFile(fileId) {
  const removedFile = store.deleteFile(fileId);
  if (!removedFile) {
    return {
      success: false,
      message: 'File not found.'
    };
  }

  return {
    success: true,
    message: 'File deleted successfully.'
  };
}

module.exports = {
  listFiles,
  getFileById,
  uploadFile,
  downloadFile,
  deleteFile
};