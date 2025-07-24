// src/middlewares/auth.middleware.js

const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

// --- YOU SHOULD ALREADY HAVE THIS ---
// Checks if a user is logged in (Authentication)
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

// --- YOU SHOULD ALREADY HAVE THIS ---
// Checks if a logged-in user is an ADMIN (Authorization)
const isAdmin = (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    return res.status(403).json({ status: false, message: 'Forbidden. Administrator access is required.' });
  }
};

// --- ADD THIS NEW MIDDLEWARE ---
// Checks if a logged-in user is a regular USER (Authorization)
const isUser = (req, res, next) => {
  // This checks the req.user object that was attached by isAuthenticated
  if (req.user && req.user.userType === 'user') {
    next(); // The user is a regular user, so we grant access
  } else {
    // The user is logged in but is not a regular user (they might be an admin)
    return res.status(403).json({ status: false, message: 'Forbidden. This action is for regular users only.' });
  }
};


// --- UPDATE YOUR EXPORTS ---
module.exports = {
  isAuthenticated,
  isAdmin,
  isUser // Export the new middleware
};