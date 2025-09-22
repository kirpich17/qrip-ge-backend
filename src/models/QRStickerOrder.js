// models/QRStickerOrder.js
const mongoose = require("mongoose");

const ShippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, required: true },
});

const QRStickerOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    memorial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Memorial",
      required: true,
    },
    stickerOption: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QRStickerOption",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: {
      type: String, // BOG payment ID or other payment gateway ID
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    trackingNumber: {
      type: String,
    },
    notes: {
      type: String,
    },
    // Store snapshot of sticker option at time of purchase
    stickerSnapshot: {
      name: { type: String },
      type: { type: String },
      size: { type: String },
      price: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
QRStickerOrderSchema.index({ user: 1, createdAt: -1 });
QRStickerOrderSchema.index({ paymentStatus: 1 });
QRStickerOrderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model("QRStickerOrder", QRStickerOrderSchema);
