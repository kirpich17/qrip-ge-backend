const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstname: { type: String},
  lastname: { type: String},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['user', 'admin'], default: 'user' },
  resetPasswordToken: String,
  resetPasswordExpires: Date,

    subscriptionPlan: {
    type: String,
    enum: ['Free', 'Basic', 'Premium'],
    default: 'Free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'cancelled'],
    default: 'inactive'
  },
  subscriptionExpiresAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);