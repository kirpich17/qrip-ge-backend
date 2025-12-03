// models/MemorialPurchase.js
const mongoose = require('mongoose');

const MemorialPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memorialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memorial',
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    duration: {
      type: String,
      enum: [
        '1_month',
        '3_months',
        '6_months',
        '1_year',
        '2_years',
        'life_time',
      ],
      required: true,
      default: '1_month',
    },
    durationPrice: {
      type: Number,
      required: true,
    },
    bogOrderId: {
      type: String,
      required: true,
    },
    amount: Number,

    finalPricePaid: {
      // The actual amount paid after all discounts (admin or promo code)
      type: Number,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'paid'],
      default: 'pending',
    },
    transactionId: String,
    paymentDate: Date,

    // --- NEW FIELDS TO TRACK DISCOUNT SOURCE ---
    appliedPromoCode: {
      // If a user applied a promo code
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    isAdminDiscount: {
      // If the memorial itself was set as free/discounted by an admin
      type: Boolean,
      default: false,
    },
    // You might want to store the discount details themselves here as well for immutable history
    discountDetails: {
      type: { type: String, enum: ['percentage', 'fixed', 'free', null] },
      value: { type: Number },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MemorialPurchase', MemorialPurchaseSchema);
