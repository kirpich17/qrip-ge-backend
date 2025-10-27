// This file is deprecated - use unifiedEmailService.js instead
// Keeping for backward compatibility but redirecting to unified service
const { sendPaymentFailureEmail } = require('./unifiedEmailService.js');

module.exports = {
  sendPaymentFailureEmail
};