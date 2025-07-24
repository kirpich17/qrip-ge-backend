const express = require('express');
const router = express.Router();

// Import the new controller function

// Import your security middleware
const { isAuthenticated, isUser } = require('../middlewares/auth.middleware');
const { generateQrCode } = require('../controller/qrcode.controller');

/**
 * @route   POST /api/qrcode/generate
 * @desc    Creates and returns a downloadable QR code image
 * @access  Private
 */
router.post(
  '/generate',
  isAuthenticated,
  isUser,
  generateQrCode
);

module.exports = router;