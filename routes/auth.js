const express = require('express');
const { login } = require('../services/authService');

const router = express.Router();

router.post('/login', (req, res) => {
  const result = login(req.body || {});
  res.status(200).json(result);
});

module.exports = router;