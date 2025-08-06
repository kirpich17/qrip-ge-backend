// routes/memorial.routes.js

const express = require("express");
const router = express.Router();

const {
  
  getUserSubscriptionDetails,
} = require("../controller/user.controller");

// Import your security middleware
const { isAuthenticated } = require("../middlewares/auth.middleware");

router.get("/subscription-details",isAuthenticated,getUserSubscriptionDetails)
module.exports = router;
