const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middlewares/auth.middleware");
const {
  submitTestimonial,
  getPublicTestimonials,
  getAdminTestimonials,
  updateTestimonialStatus,
  deleteTestimonial,
  getPublicSiteSettings,
  getSiteSettings,
  updateSiteSettings
} = require("../controller/testimonial.controller");

// Public routes
router.post("/submit", submitTestimonial);
router.get("/public", getPublicTestimonials);
router.get("/public/settings", getPublicSiteSettings);

// Admin routes
router.get("/admin", isAuthenticated, isAdmin, getAdminTestimonials);
router.put("/admin/:id/status", isAuthenticated, isAdmin, updateTestimonialStatus);
router.delete("/admin/:id", isAuthenticated, isAdmin, deleteTestimonial);
router.get("/admin/settings", isAuthenticated, isAdmin, getSiteSettings);
router.put("/admin/settings", isAuthenticated, isAdmin, updateSiteSettings);

module.exports = router;
