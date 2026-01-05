const mongoose = require('mongoose');

const PromoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Promo code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'free'],
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: function () {
        return this.discountType !== 'free';
      },
      min: [0, 'Discount value cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    maxUsage: {
      type: Number,
      min: [1, 'Max usage must be at least 1'],
      default: null,
    },
    currentUsage: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    appliesToPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      default: null,
    },
    appliesToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

PromoCodeSchema.methods.isValid = function () {
  const now = new Date();
  const isNotExpired = this.expiryDate > now;
  const hasUsagesLeft =
    this.maxUsage === null || this.currentUsage < this.maxUsage;
  return this.isActive && isNotExpired && hasUsagesLeft;
};

module.exports =
  mongoose.models.PromoCode || mongoose.model('PromoCode', PromoCodeSchema);
