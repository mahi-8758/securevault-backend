const { state } = require('../data/mockStore');

function login(credentials = {}) {
  const email = String(credentials.email || '').trim() || state.demoUser.email;
  const name = credentials.name ? String(credentials.name).trim() : state.demoUser.name;

  return {
    success: true,
    message: 'Mock login successful.',
    user: {
      ...state.demoUser,
      email,
      name,
      signedInAt: new Date().toISOString()
    },
    demoMode: true
  };
}

module.exports = {
  login
};