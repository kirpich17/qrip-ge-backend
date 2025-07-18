const express = require('express');
const router = express.Router();
const { signup, signin, forgotPassword, resetPassword, updatePassword } = require('../controller/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Signup/Login
router.post('/signup', signup);
router.post('/signin', signin);

// Password Reset Flow
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Common Password Update (Admin/User both)
router.put('/update-password', verifyToken, updatePassword);

module.exports = router;
