const state = {
  nextFileNumber: 4,
  demoUser: {
    userId: 'demo-user-001',
    name: 'Demo User',
    email: 'demo@securevault.local',
    role: 'Owner',
    demoMode: true
  },
  files: [
    {
      fileId: 'file-001',
      fileName: 'annual-report.pdf',
      fileType: 'PDF',
      size: 2400000,
      uploadedAt: '2026-08-21T10:32:00Z',
      status: 'Encrypted'
    },
    {
      fileId: 'file-002',
      fileName: 'project-report.docx',
      fileType: 'DOCX',
      size: 1800000,
      uploadedAt: '2026-08-20T14:05:00Z',
      status: 'Encrypted'
    },
    {
      fileId: 'file-003',
      fileName: 'certificate.pdf',
      fileType: 'PDF',
      size: 850000,
      uploadedAt: '2026-08-18T08:12:00Z',
      status: 'Encrypted'
    }
  ],
  auditLogs: [
    {
      logId: 'log-001',
      fileId: 'file-001',
      fileName: 'annual-report.pdf',
      action: 'UPLOAD',
      user: 'demo@securevault.local',
      dateTime: '2026-08-21T10:32:00Z',
      ipAddress: '192.168.1.10',
      status: 'Success'
    },
    {
      logId: 'log-002',
      fileId: 'file-001',
      fileName: 'annual-report.pdf',
      action: 'DOWNLOAD',
      user: 'demo@securevault.local',
      dateTime: '2026-08-21T11:05:00Z',
      ipAddress: '192.168.1.10',
      status: 'Success'
    },
    {
      logId: 'log-003',
      fileId: 'file-003',
      fileName: 'certificate.pdf',
      action: 'VIEW',
      user: 'demo@securevault.local',
      dateTime: '2026-08-20T18:21:00Z',
      ipAddress: '192.168.1.10',
      status: 'Success'
    },
    {
      logId: 'log-004',
      fileId: 'file-002',
      fileName: 'project-report.docx',
      action: 'UPLOAD',
      user: 'demo@securevault.local',
      dateTime: '2026-08-20T14:05:00Z',
      ipAddress: '192.168.1.10',
      status: 'Success'
    }
  ]
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listFiles() {
  return clone(state.files);
}

function getFile(fileId) {
  const file = state.files.find((item) => item.fileId === fileId);
  return file ? clone(file) : null;
}

function createFileId() {
  const next = String(state.nextFileNumber).padStart(3, '0');
  state.nextFileNumber += 1;
  return `file-${next}`;
}

function createLogId() {
  return `log-${String(state.auditLogs.length + 1).padStart(3, '0')}`;
}

function addAuditLog(entry) {
  state.auditLogs.unshift({
    logId: createLogId(),
    ipAddress: '192.168.1.10',
    status: 'Success',
    user: state.demoUser.email,
    ...entry
  });
}

function uploadFile(payload = {}) {
  const fileName = payload.fileName || 'untitled.txt';
  const fileType = payload.fileType || getFileTypeFromName(fileName);
  const size = Number(payload.size || 0);

  const file = {
    fileId: createFileId(),
    fileName,
    fileType,
    size,
    uploadedAt: new Date().toISOString(),
    status: 'Encrypted'
  };

  state.files.unshift(file);
  addAuditLog({
    fileId: file.fileId,
    fileName: file.fileName,
    action: 'UPLOAD',
    dateTime: file.uploadedAt
  });

  return clone(file);
}

function deleteFile(fileId) {
  const fileIndex = state.files.findIndex((item) => item.fileId === fileId);
  if (fileIndex === -1) {
    return null;
  }

  const [removedFile] = state.files.splice(fileIndex, 1);
  addAuditLog({
    fileId: removedFile.fileId,
    fileName: removedFile.fileName,
    action: 'DELETE',
    dateTime: new Date().toISOString(),
    status: 'Success'
  });

  return clone(removedFile);
}

function listAuditLogs() {
  return clone(state.auditLogs);
}

function getAuditLogsForFile(fileId) {
  return clone(state.auditLogs.filter((entry) => entry.fileId === fileId));
}

function getStats() {
  const totalStorage = state.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const recentAccesses = state.auditLogs.filter((entry) => {
    const entryDate = new Date(entry.dateTime);
    const now = new Date();
    return now.getTime() - entryDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    totalDocuments: state.files.length,
    storageUsed: totalStorage,
    recentAccesses,
    securityStatus: 'Protected'
  };
}

function getFileTypeFromName(fileName) {
  const extension = String(fileName || '').split('.').pop().toUpperCase();
  if (['PDF', 'DOC', 'DOCX', 'TXT', 'PNG', 'JPG', 'JPEG'].includes(extension)) {
    return extension === 'JPEG' ? 'JPG' : extension;
  }
  return 'OTHER';
}

module.exports = {
  state,
  listFiles,
  getFile,
  uploadFile,
  deleteFile,
  listAuditLogs,
  getAuditLogsForFile,
  getStats,
  addAuditLog,
  getFileTypeFromName
};