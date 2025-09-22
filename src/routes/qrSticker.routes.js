// routes/qrSticker.routes.js

const express = require("express");
const router = express.Router();
const { isAuthenticated, isUser, isAdmin } = require("../middlewares/auth.middleware");
const {
  getStickerOptions,
  createStickerOrder,
  getUserStickerOrders,
  updateOrderPaymentStatus,
  getAllStickerOrders,
  updateOrderStatus,
  getOrderStatistics,
  initiateStickerPayment,
  handleStickerPaymentCallback,
  deleteOrder,
  getOrderById,
  getUserOrderById,
} = require("../controller/qrSticker.controller");

// Public routes
router.get("/options", getStickerOptions);
// Payment callback (webhook) - must be public for BOG to access
router.post("/payment/callback", handleStickerPaymentCallback);

// User routes (protected)
router.use(isAuthenticated); // Apply auth middleware to all routes below

// User sticker operations
router.post("/orders", createStickerOrder);
router.get("/orders", getUserStickerOrders);
router.get("/orders/:orderId", getUserOrderById);
router.put("/orders/payment-status", updateOrderPaymentStatus);

// Payment routes
router.post("/payment/initiate", initiateStickerPayment);

// Admin routes (additional admin check needed in controller)
router.get("/admin/orders", getAllStickerOrders);
router.get("/admin/orders/:orderId", getOrderById);
router.put("/admin/orders/:orderId", updateOrderStatus);
router.delete("/admin/orders/:orderId", deleteOrder);
router.get("/admin/statistics", getOrderStatistics);

module.exports = router;
