// src/middlewares/auth.middleware.js

const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

const isAuthenticated = async(req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ status: false, message: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId);
if (!user) {
  return res.status(401).json({ status: false, message: 'Unauthorized: User not found.' });
}
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: false, message: 'Invalid token.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    return res.status(403).json({ status: false, message: 'Forbidden. Administrator access is required.' });
  }
};

const isUser = (req, res, next) => {
  if (req.user && req.user.userType === 'user') {
    next(); 
  } else {
    return res.status(403).json({ status: false, message: 'Forbidden. This action is for regular users only.' });
  }
};


module.exports = {
  isAuthenticated,
  isAdmin,
  isUser // Export the new middleware
};