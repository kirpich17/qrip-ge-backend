const express = require("express");
const router = express.Router();
const {
  getUserById,
  createAdminUser,
  adminSignin,
  getAllUsers,
  getAllMemorials,
  toggleAccountStatus,
  adminDeleteMemorial,
  adminDeleteUser,
  toggleMemorialStatus,
  adminCreatePlan,
  adminGetAllPlans,
  adminGetPlanById,
  adminUpdatePlan,
  adminDeletePlan,
  togglePlanStatus,
} = require("../controller/admin.controller");
const { isAuthenticated, isAdmin } = require("../middlewares/auth.middleware");
const { adminStats } = require("../controller/admin.stats");
const { allStatsforUser } = require("../controller/auth.controller");

router.get("/get-user/:id", isAuthenticated, isAdmin, getUserById);
router.post("/signUp", createAdminUser);
router.post("/signIn", adminSignin);
router.get("/stats", adminStats);
router.get("/allusers", getAllUsers);
router.get("/allmemorials", getAllMemorials);
router.put("/toggle-user-status/:userId", toggleAccountStatus);
router.delete("/memorial/:id", adminDeleteMemorial);
router.delete("/user/:id", adminDeleteUser);
router.patch("/toggle-status-memorial/:id", toggleMemorialStatus);

router.post("/subscription", adminCreatePlan);
router.get("/subscription", adminGetAllPlans);

router.put("/subscription/:id", adminUpdatePlan);
router.delete("/subscription/:id", adminDeletePlan);
router.patch("/subscription-status/:id", togglePlanStatus);

module.exports = router;
