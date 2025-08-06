// controllers/memorial.controller.js

const { uploadFileToS3, deleteFileFromS3 } = require("../config/configureAWS");
const UserSubscription = require("../models/UserSubscription");
const subscriptionModal = require("../models/SubscriptionPlan");
const { createPaginationObject } = require("../utils/pagination");






exports.getUserSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get current active subscription (or most recent if no active)
    let currentSubscription = await UserSubscription.findOne({ 
      userId,
      status: 'active'
    })
    .sort({ createdAt: -1 })
    .populate('planId', 'name description price billingPeriod')
    .lean();

    // If no active, get the most recent subscription regardless of status
    if (!currentSubscription) {
      currentSubscription = await UserSubscription.findOne({ userId })
        .sort({ createdAt: -1 })
        .populate('planId', 'name description price billingPeriod')
        .lean();
    }

    let allTransactions = [];
    // 1. ONLY USE CURRENT SUBSCRIPTION'S TRANSACTIONS
    if (currentSubscription && currentSubscription.transactionHistory) {
      allTransactions = currentSubscription.transactionHistory.map(transaction => ({
        ...transaction,
        subscriptionId: currentSubscription._id,
        planId: currentSubscription.planId._id.toString(), // Ensure ID is string
        subscriptionStatus: currentSubscription.status
      }));
    }

    // Sort transactions by date descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Paginate transactions
    const totalTransactions = allTransactions.length;
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);

    // Format response
    const response = {
      currentSubscription: currentSubscription || null,
      transactions: paginatedTransactions,
      totalTransactions,
      totalPages: Math.ceil(totalTransactions / limit),
      currentPage: page,
      limit
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    res.status(500).json({ message: "Failed to fetch subscription details." });
  }
};