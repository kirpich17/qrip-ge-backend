const express = require('express');
const router = express.Router();
const { getUserById } = require('../controller/admin.controller');
const { verifyToken } = require('../middlewares/auth.middleware');




router.get('/get-user/:id', verifyToken, getUserById);

module.exports = router;
