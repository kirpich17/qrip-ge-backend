const express = require("express");
const router = express.Router();
const {
  getUserById,
  createAdminUser,
  adminSignin,
} = require("../controller/admin.controller");
const { isAuthenticated, isAdmin } = require("../middlewares/auth.middleware");
const { adminStats } = require("../controller/admin.stats");

router.get("/get-user/:id", isAuthenticated, isAdmin, getUserById);
router.post("/signUp", createAdminUser);
router.post("/signIn", adminSignin);
router.get("/stats", adminStats);

module.exports = router;
