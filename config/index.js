function getAppConfig() {
  return {
    port: Number(process.env.PORT || 3000),
    demoMode: String(process.env.DEMO_MODE || 'true').toLowerCase() !== 'false'
  };
}

module.exports = {
  getAppConfig
};