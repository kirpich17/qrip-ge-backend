const express = require('express');
const router = express.Router();
const { signup, signin, forgotPassword, resetPassword, updatePassword, getUserDetails } = require('../controller/auth.controller');
const {  isAuthenticated, isUser } = require('../middlewares/auth.middleware');

// Signup/Login
router.post('/signup', signup);
router.post('/signin', signin);

// Password Reset Flow
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/details', isAuthenticated, getUserDetails);

// Common Password Update (Admin/User both)
router.put('/update-password', isAuthenticated,isUser, updatePassword);

module.exports = router;
