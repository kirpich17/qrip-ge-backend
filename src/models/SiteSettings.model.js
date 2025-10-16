const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  testimonialsEnabled: {
    type: Boolean,
    default: true
  },
  testimonialsMaxDisplay: {
    type: Number,
    default: 5,
    min: 1,
    max: 50
  },
  testimonialsAutoApprove: {
    type: Boolean,
    default: false
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
