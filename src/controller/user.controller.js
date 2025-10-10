// controllers/memorial.controller.js

const { uploadFileToS3, deleteFileFromS3 } = require("../config/configureAWS");
const UserSubscription = require("../models/UserSubscription");
const subscriptionModal = require("../models/SubscriptionPlan");
const { createPaginationObject } = require("../utils/pagination");
const subscriptionPlan = require("../models/SubscriptionPlan");
const Memorial = require("../models/memorial.model");







exports.getUserSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get only monthly and lifetime plans
    const paidPlans = await subscriptionPlan.find({
      billingPeriod: { $in: ['monthly', 'one_time'] },
      isActive: true
    }).lean();

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

    // Get ALL user subscriptions first
    const allUserSubscriptions = await UserSubscription.find({ userId })
      .populate('planId', 'name description status price billingPeriod')
      .lean();

    // Then filter for paid plans only
    const paidSubscriptions = allUserSubscriptions.filter(sub => 
      sub.planId && ['monthly', 'one_time'].includes(sub.planId.billingPeriod)
    );
    console.log("🚀 ~ paidSubscriptions:", paidSubscriptions);

    // Create otherPlanCurrentStatus object with only paid plans
    const otherPlanCurrentStatus = {};
    
    paidPlans.forEach(plan => {
      const planSub = paidSubscriptions.find(sub => 
        sub.planId._id.toString() === plan._id.toString()
      );
      
      otherPlanCurrentStatus[plan.billingPeriod] = {
        planId: plan._id,
         subscriptionId: planSub?._id, 
        planName: plan.name,
        status: planSub?.status || 'never_active',
        startDate: planSub?.startDate,
        endDate: planSub?.endDate,
        lastPaymentDate: planSub?.lastPaymentDate,
        canResume: planSub?.status === 'canceled' && 
                  planSub?.endDate && 
                  new Date(planSub.endDate) > new Date()
      };
    });

    let allTransactions = [];
    if (currentSubscription && currentSubscription.transactionHistory) {
      allTransactions = currentSubscription.transactionHistory.map(transaction => ({
        ...transaction,
        subscriptionId: currentSubscription._id,
        planId: currentSubscription.planId._id.toString(),
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
      otherPlanCurrentStatus, // Only contains monthly and lifetime plans
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

/**
 * Get recent activities for the authenticated user
 */
exports.getUserActivities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 5;

    // Get user's memorials with recent activity
    const memorials = await Memorial.find({ createdBy: userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('firstName lastName _id createdAt updatedAt viewsCount scanCount');

    // Get memorials that were recently viewed/scanned (from other users)
    const recentViews = await Memorial.find({ 
      createdBy: userId,
      $or: [
        { viewsCount: { $gt: 0 } },
        { scanCount: { $gt: 0 } }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('firstName lastName _id viewsCount scanCount updatedAt');

    // Format activities
    const activities = [];

    // Add memorial creation activities
    memorials.forEach(memorial => {
      activities.push({
        id: `created_${memorial._id}`,
        type: 'memorial_created',
        description: `Created memorial for ${memorial.firstName} ${memorial.lastName}`,
        memorialName: `${memorial.firstName} ${memorial.lastName}`,
        memorialId: memorial._id,
        createdAt: memorial.createdAt
      });
    });

    // Add view/scan activities
    recentViews.forEach(memorial => {
      if (memorial.scanCount > 0) {
        activities.push({
          id: `scanned_${memorial._id}`,
          type: 'memorial_scanned',
          description: `QR code scanned for ${memorial.firstName} ${memorial.lastName}`,
          memorialName: `${memorial.firstName} ${memorial.lastName}`,
          memorialId: memorial._id,
          createdAt: memorial.updatedAt
        });
      } else if (memorial.viewsCount > 0) {
        activities.push({
          id: `viewed_${memorial._id}`,
          type: 'memorial_viewed',
          description: `Memorial viewed for ${memorial.firstName} ${memorial.lastName}`,
          memorialName: `${memorial.firstName} ${memorial.lastName}`,
          memorialId: memorial._id,
          createdAt: memorial.updatedAt
        });
      }
    });

    // Sort by creation date and limit
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limitedActivities = activities.slice(0, limit);

    res.json({
      status: true,
      message: "Activities fetched successfully",
      data: limitedActivities
    });
  } catch (error) {
    console.error("Error fetching user activities:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch activities",
      error: error.message
    });
  }
};