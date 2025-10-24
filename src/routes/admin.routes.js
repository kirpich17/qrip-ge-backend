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
  AddPromoCode,
  GetAllPromoCodes,
  GetPromoCodeById,
  DeletePromoCode,
  UpdatePromoCode,
  ValidatePromoCode,
} = require("../controller/admin.controller");
const { isAuthenticated, isAdmin } = require("../middlewares/auth.middleware");
const { adminStats } = require("../controller/admin.stats");
const { allStatsforUser } = require("../controller/auth.controller");
const {
  getAllStickerTypes,
  createStickerType,
  updateStickerType,
  deleteStickerType,
  toggleStickerTypeStatus,
  getStickerTypeById,
  updateSortOrder,
} = require("../controller/stickerType.controller");

const {
  getTranslationFiles,
  uploadTranslationFile,
  downloadTranslationFile,
  previewTranslationFile,
} = require("../controller/translation.controller");

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


router.post("/promocode", AddPromoCode);
router.get("/promocode", GetAllPromoCodes);
router.get("/promocode/:id", GetPromoCodeById);
router.delete("/promocode/:id", DeletePromoCode);
router.put("/promocode/:id", UpdatePromoCode );

router.post("/validate-promo", ValidatePromoCode);

// Sticker Type Management Routes
router.get("/sticker-types", isAuthenticated, isAdmin, getAllStickerTypes);
router.post("/sticker-types", isAuthenticated, isAdmin, createStickerType);
router.get("/sticker-types/:id", isAuthenticated, isAdmin, getStickerTypeById);
router.put("/sticker-types/:id", isAuthenticated, isAdmin, updateStickerType);
router.delete("/sticker-types/:id", isAuthenticated, isAdmin, deleteStickerType);
router.patch("/sticker-types/:id/toggle", isAuthenticated, isAdmin, toggleStickerTypeStatus);
router.patch("/sticker-types/sort", isAuthenticated, isAdmin, updateSortOrder);

// Translation Management Routes (Admin only)
router.get("/translation-files", isAuthenticated, isAdmin, getTranslationFiles);
router.post("/upload-translation", isAuthenticated, isAdmin, uploadTranslationFile);
router.get("/download-translation/:language", isAuthenticated, isAdmin, downloadTranslationFile);
router.get("/preview-translation/:language", isAuthenticated, isAdmin, previewTranslationFile);

module.exports = router;
