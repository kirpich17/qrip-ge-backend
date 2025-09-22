// models/QRStickerOption.js
const mongoose = require("mongoose");

const QRStickerOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sticker option name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['vinyl', 'engraving', 'premium'],
      required: [true, 'Sticker type is required'],
    },
    size: {
      type: String,
      required: [true, 'Size is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String, // URL to sticker preview image
    },
    specifications: {
      material: { type: String },
      dimensions: { type: String },
      durability: { type: String },
      weatherResistance: { type: String },
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    isInStock: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("QRStickerOption", QRStickerOptionSchema);
