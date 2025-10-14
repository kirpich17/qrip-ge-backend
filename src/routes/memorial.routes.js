// routes/memorial.routes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createMemorial,
  getMyMemorials,
  getPublicMemorialBySlug,
  getMemorialById,
  getMyMemorialById,
  updateMemorial,
  deleteMemorial,
  addPhotosToMemorial,
  addVideoToMemorial,
  updateFamilyTree,
  addDocumentsToMemorial,
  createOrUpdateMemorial,
  viewAndScanMemorialCount,
  createDraftMemorial,
  toggleSlideshow,
} = require("../controller/memorial.controller");

const upload = multer({
  storage: multer.memoryStorage(), // THIS IS THE KEY CHANGE!
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

// Import your security middleware
const { isAuthenticated, isUser } = require("../middlewares/auth.middleware");

// --- Public Route ---
// Get a memorial for the public-facing page (e.g., yoursite.com/memories/john-doe-a2d4f)
router.get("/slug/:slug", getPublicMemorialBySlug);

// --- Private Routes (Require Authentication) ---

// Create a new memorial (only regular users can create)
router.post(
  "/",
  isAuthenticated,
  isUser,
  upload.single("profileImage"),
  createMemorial
);
router.put(
  "/:id",
  isAuthenticated,
  isUser,
  upload.single("profileImage"),
  updateMemorial
);
router.post(
  "/create-update",
  isAuthenticated,
  isUser,
  upload.any(),
  createOrUpdateMemorial
);

router.post(
  "/:id/photos",
  isAuthenticated,
  isUser,
  upload.array("photos", 10), // 'photos' is the field name, 10 is the max count
  addPhotosToMemorial
);

// Add a video link to an existing memorial
router.post(
  "/:id/video",
  isAuthenticated,
  isUser,
  upload.single("video"),
  addVideoToMemorial
);

// Update the entire family tree for a memorial
router.put("/:id/family-tree", isAuthenticated, isUser, updateFamilyTree);
router.post(
  "/:id/documents",
  isAuthenticated,
  isUser,
  upload.array("documents", 5),
  addDocumentsToMemorial
);

// Get all memorials for the currently logged-in user's dashboard
router.get("/my-memorials", isAuthenticated, getMyMemorials);

// Get a specific memorial by ID for editing (user's own memorials only)
router.get("/my-memorial/:id", isAuthenticated, getMyMemorialById);

router.post("/view", viewAndScanMemorialCount);

// Toggle slideshow setting for a memorial (requires active subscription)
router.put("/:memorialId/toggle-slideshow", isAuthenticated, isUser, toggleSlideshow);

// Get, Update, and Delete a specific memorial by its ID
router
  .route("/:id")
  .get(getMemorialById) // Get a memorial for editing

  .delete(isAuthenticated, deleteMemorial); // Delete the memorial
router.post('/create-draft', isAuthenticated, createDraftMemorial);
module.exports = router;
