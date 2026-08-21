const express = require('express');
const fileService = require('../services/fileService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(fileService.listFiles());
});

router.post('/upload', (req, res) => {
  res.status(201).json(fileService.uploadFile(req.body || {}));
});

router.get('/:fileId', (req, res) => {
  const result = fileService.getFileById(req.params.fileId);
  res.status(result.success ? 200 : 404).json(result);
});

router.get('/:fileId/download', (req, res) => {
  const result = fileService.downloadFile(req.params.fileId);
  res.status(result.success ? 200 : 404).json(result);
});

router.delete('/:fileId', (req, res) => {
  const result = fileService.deleteFile(req.params.fileId);
  res.status(result.success ? 200 : 404).json(result);
});

module.exports = router;