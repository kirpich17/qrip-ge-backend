const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String },
    lastname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    location: { type: String },
    bio: { type: String },
    profileImage: { type: String },
    phone: { type: String },
    userType: { type: String, enum: ["user", "admin"], default: "user" },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    subscriptionPlan: {
      type: String,
      // enum: ["Free", "Basic", "Premium"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "expired", "cancelled"],
      default: "inactive",
    },
    subscriptionExpiresAt: {
      type: Date,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    shippingDetails: {
      fullName: { type: String },
      address: { type: String },
      phone: { type: String },
      zipCode: { type: String },
      city: { type: String },
      country: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
