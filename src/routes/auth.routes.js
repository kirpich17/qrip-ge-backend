const express = require("express");
const router = express.Router();
const {
  signup,
  signin,
  forgotPassword,
  resetPassword,
  updatePassword,
  changePassword,
  getUserDetails,
  updateUser,
  allStatsforUser,
  updateUserProfile,
} = require("../controller/auth.controller");
const { isAuthenticated, isUser } = require("../middlewares/auth.middleware");
const { adminGetAllPlans } = require("../controller/admin.controller");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(), // THIS IS THE KEY CHANGE!
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

// Signup/Login
router.post("/signup", signup);
router.post("/signin", signin);

// Password Reset Flow
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/details", isAuthenticated, getUserDetails);

// Common Password Update (Admin/User both)
router.put("/update-password", isAuthenticated, isUser, updatePassword);
router.put("/change-password", isAuthenticated, isUser, changePassword);
router.put("/users/:userId", updateUser);
router.get("/users/subscription", adminGetAllPlans);
router.get("/stats/:userId", allStatsforUser);

router.patch("/update-profile/:userId", upload.any(), updateUserProfile);

module.exports = router;
