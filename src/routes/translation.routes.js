const express = require("express");
const router = express.Router();
const { getTranslationFile } = require("../controller/translation.controller");

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Translation routes are working!" });
});

// Public Translation Routes (No authentication required)
router.get("/:language", getTranslationFile);

module.exports = router;
