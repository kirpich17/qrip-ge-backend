const express = require("express");
const multer = require("multer");
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  }
});
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
  uploadLanguageFile,
  getLanguageFiles,
  downloadLanguageFile,
  deleteLanguageFile,
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

// Language file management routes
router.post("/languages/:language/upload", isAuthenticated, isAdmin, upload.single('file'), uploadLanguageFile);
router.get("/languages", isAuthenticated, isAdmin, getLanguageFiles);
router.get("/languages/:language/download", isAuthenticated, isAdmin, downloadLanguageFile);

module.exports = router;
