const express = require('express');
const auditService = require('../services/auditService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(auditService.listAuditLogs());
});

router.get('/:fileId', (req, res) => {
  res.json(auditService.getAuditLogsForFile(req.params.fileId));
});

module.exports = router;