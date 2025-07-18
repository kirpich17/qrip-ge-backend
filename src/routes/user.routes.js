const express = require('express');
const router = express.Router();
const { getUserDetails } = require('../controller/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ✅ Get current logged-in user details
router.get('/details', verifyToken, getUserDetails);

module.exports = router;
