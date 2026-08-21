const store = require('../data/mockStore');

function listAuditLogs() {
  return {
    success: true,
    logs: store.listAuditLogs()
  };
}

function getAuditLogsForFile(fileId) {
  return {
    success: true,
    logs: store.getAuditLogsForFile(fileId)
  };
}

module.exports = {
  listAuditLogs,
  getAuditLogsForFile
};