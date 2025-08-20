// models/MemorialPurchase.js
const mongoose = require('mongoose');

const MemorialPurchaseSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  memorialId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Memorial', 
    required: true 
  },
  planId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SubscriptionPlan', 
    required: true 
  },
  bogOrderId: { 
    type: String, 
    required: true 
  },
  amount: Number,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transactionId: String,
  paymentDate: Date
}, { timestamps: true });

module.exports = mongoose.model('MemorialPurchase', MemorialPurchaseSchema);