// models/SubscriptionPlan.js
const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    monthlyPrice: {
      type: Number,
      required: true,
    },
    yearlyPrice: {
      type: Number,
      required: true,
    },
    isOneTime: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    features: [
      {
        type: String,
        required: true,
      },
    ],
    limitations: [
      {
        type: String,
      },
    ],
    color: {
      type: String,
      default: "text-black",
    },
    bgColor: {
      type: String,
      default: "bg-green-50",
    },
    borderColor: {
      type: String,
      default: "border-gray-200",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
