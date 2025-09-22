const express = require('express');
const router = express.Router();

// Import the new controller function

// Import your security middleware
const { isAuthenticated, isUser, isAdmin } = require('../middlewares/auth.middleware');
const { generateQrCode } = require('../controller/qrcode.controller');

/**
 * @route   POST /api/qrcode/generate
 * @desc    Creates and returns a downloadable QR code image
 * @access  Private (Users and Admins)
 */
router.post(
  '/generate',
  isAuthenticated,
  (req, res, next) => {
    // Allow both users and admins to generate QR codes
    if (req.user.userType === 'user' || req.user.userType === 'admin') {
      next();
    } else {
      return res.status(403).json({ status: false, message: 'Forbidden. User or Admin access required.' });
    }
  },
  generateQrCode
);

module.exports = router;