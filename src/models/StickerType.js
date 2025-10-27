// models/StickerType.js
const mongoose = require("mongoose");

const StickerTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sticker type name is required'],
      trim: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    specifications: {
      material: { type: String },
      durability: { type: String },
      weatherResistance: { type: String },
      specialFeatures: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
StickerTypeSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model("StickerType", StickerTypeSchema);
