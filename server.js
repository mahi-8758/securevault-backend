require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { getAppConfig } = require('./config');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const auditRoutes = require('./routes/audit');

const config = getAppConfig();
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'SecureVault backend',
    mode: config.demoMode ? 'demo' : 'runtime',
    message: 'API service is running. Serve the frontend repository separately.'
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SecureVault backend',
    mode: config.demoMode ? 'demo' : 'runtime',
    status: 'ok'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/audit-logs', auditRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
});

app.use((error, req, res, next) => {
  res.status(500).json({
    success: false,
    message: error.message || 'Internal server error.'
  });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`SecureVault backend running at http://localhost:${config.port}`);
  });
}

module.exports = app;