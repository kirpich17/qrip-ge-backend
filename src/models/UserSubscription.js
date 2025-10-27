// models/UserSubscription.js
const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
  },
  duration: {
    type: String,
    enum: ['1_month', '3_months', '6_months', '1_year', '2_years'],
    required: true,
    default: '1_month'
  },
  durationPrice: {
    type: Number,
    required: true
  },
  bogInitialOrderId: { // The order ID of the very first payment
    type: String,
    required: true,
    unique: true,
  },
  bogSubscriptionId: { // The ID BOG provides for the recurring payment setup
    type: String,
    unique: true,
    sparse: true, // Allows nulls
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'payment_failed', 'canceled', 'expired','inactive'],
    default: 'pending',
  },
  startDate: { type: Date },
  endDate: { type: Date },
  nextBillingDate: { type: Date },
  lastPaymentDate: { type: Date },

    retryAttemptCount: { // Number of times a failed payment has been retried
    type: Number,
    default: 0,
    min: 0
  },
  lastRetryAttemptDate: { // Timestamp of the last retry attempt
    type: Date,
    default: null
  },
  
  transactionHistory: [ // Keep a log of all transactions
    {
      bogTransactionId: String,
      bogOrderId:String,
      amount: Number,
      status: String,
      date: Date,
      receiptUrl: String, // <--- ADDED THIS FIELD
    }
  ]
}, { timestamps: true });

const UserSubscription = mongoose.models.UserSubscription || mongoose.model('UserSubscription', userSubscriptionSchema);
module.exports= UserSubscription;