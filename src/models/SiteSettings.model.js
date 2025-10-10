const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  testimonialsEnabled: {
    type: Boolean,
    default: true
  },
  testimonialsMaxDisplay: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  testimonialsAutoApprove: {
    type: Boolean,
    default: false
  },
  testimonialsRequireEmail: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SiteSettingsSchema.index({}, { unique: true });

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
