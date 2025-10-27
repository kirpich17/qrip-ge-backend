// routes/memorial.routes.js

const express = require("express");
const router = express.Router();

const {
  
  getUserSubscriptionDetails,
  getUserActivities,
} = require("../controller/user.controller");

// Import your security middleware
const { isAuthenticated } = require("../middlewares/auth.middleware");

router.get("/subscription-details",isAuthenticated,getUserSubscriptionDetails)
router.get("/activities",isAuthenticated,getUserActivities)
module.exports = router;
