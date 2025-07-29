const express = require("express");
const router = express.Router();
const {
  signup,
  signin,
  forgotPassword,
  resetPassword,
  updatePassword,
  getUserDetails,
  updateUser,
  allStatsforUser,
} = require("../controller/auth.controller");
const { isAuthenticated, isUser } = require("../middlewares/auth.middleware");
const { adminGetAllPlans } = require("../controller/admin.controller");

// Signup/Login
router.post("/signup", signup);
router.post("/signin", signin);

// Password Reset Flow
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/details", isAuthenticated, getUserDetails);

// Common Password Update (Admin/User both)
router.put("/update-password", isAuthenticated, isUser, updatePassword);
router.put("/users/:userId", updateUser);
router.get("/users/subscription", adminGetAllPlans);
router.get("/stats/:userId", allStatsforUser);
module.exports = router;
