// models/SubscriptionPlan.js
const mongoose = require('mongoose');

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
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: [0, 'Price cannot be negative'],
    },

    planType: {
      type: String,
      enum: ['minimal', 'medium', 'premium'],
      required: true,
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
        text: {
          // Description of the feature
          type: String,
          required: [true, 'Feature text is required'],
          trim: true,
        },
        included: {
          // Boolean: true for checkmark (included), false for cross (not included)
          type: Boolean,
          default: true,
        },
      },
    ],
    // limitations: [
    //   {
    //     type: String,
    //   },
    // ],
    color: {
      type: String,
      default: 'text-black',
    },
    bgColor: {
      type: String,
      default: 'bg-green-50',
    },
    borderColor: {
      type: String,
      default: 'border-gray-200',
    },

    maxPhotos: {
      type: Number,
      required: true,
      default: 0,
    },
    allowSlideshow: {
      type: Boolean,
      default: false,
    },
    allowVideos: {
      type: Boolean,
      default: false,
    },
    maxVideoDuration: {
      type: Number, // in seconds
      default: 0,
    },

    ctaButtonText: {
      // e.g., "14 Day's Free Trial", "Upgrade to Premium", "Go Yearly & Save"
      type: String,
      required: [true, 'CTA button text is required'],
      trim: true,
    },

    // Duration options for this plan
    durationOptions: [
      {
        duration: {
          type: String,
          required: true,
          enum: [
            '1_month',
            '3_months',
            '6_months',
            '1_year',
            '2_years',
            'life_time',
          ],
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative'],
        },
        discountPercentage: {
          type: Number,
          default: 0,
          min: [0, 'Discount cannot be negative'],
          max: [100, 'Discount cannot exceed 100%'],
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Default duration for this plan
    defaultDuration: {
      type: String,
      enum: [
        '1_month',
        '3_months',
        '6_months',
        '1_year',
        '2_years',
        'life_time',
      ],
      default: '1_month',
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.SubscriptionPlan ||
  mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
