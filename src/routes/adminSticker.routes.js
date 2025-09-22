// routes/adminSticker.routes.js

const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middlewares/auth.middleware");
const {
  getAllStickerOptions,
  createStickerOption,
  updateStickerOption,
  deleteStickerOption,
  toggleStickerOptionStatus,
  getStickerOptionById,
} = require("../controller/adminSticker.controller");

router.use(isAuthenticated);
router.use(isAdmin); // Admin only routes

router.get("/sticker-options", getAllStickerOptions);
router.post("/sticker-options", createStickerOption);
router.get("/sticker-options/:id", getStickerOptionById);
router.put("/sticker-options/:id", updateStickerOption);
router.delete("/sticker-options/:id", deleteStickerOption);
router.patch("/sticker-options/:id/toggle", toggleStickerOptionStatus);

module.exports = router;
