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
    price: { // e.g., 0, 4.99, 49.99
    type: Number,
    required: [true, 'Plan price is required'],
    min: [0, 'Price cannot be negative'],
  },
    // isOneTime: {
    //   type: Boolean,
    //   default: false,
    // },


      planType: {
    type: String,
    enum: ['minimal', 'medium', 'premium'],
    required: true
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
      text: { // Description of the feature
        type: String,
        required: [true, 'Feature text is required'],
        trim: true,
      },
      included: { // Boolean: true for checkmark (included), false for cross (not included)
        type: Boolean,
        default: true,
      },
    }
    ],
    // limitations: [
    //   {
    //     type: String,
    //   },
    // ],
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

  maxPhotos: {
    type: Number,
    required: true,
    default: 0
  },
  allowSlideshow: {
    type: Boolean,
    default: false
  },
  allowVideos: {
    type: Boolean,
    default: false
  },
  maxVideoDuration: {
    type: Number, // in seconds
    default: 0
  },

  ctaButtonText: { // e.g., "14 Day's Free Trial", "Upgrade to Premium", "Go Yearly & Save"
    type: String,
    required: [true, 'CTA button text is required'],
    trim: true,
  },

  },
  {
    timestamps: true,
  }
);

module.exports =  mongoose.models.SubscriptionPlan || mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
