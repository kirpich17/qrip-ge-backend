// // controllers/paymentController.js
// const axios =require('axios');
// const { getBogToken }=require('../config/bogToken.js');
// const UserSubscription =require( '../models/UserSubscription.js');




// exports.checkPaymentStatus = async (req, res) => {
//   try {
//     const orderId = req.query.orderId;
//     if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

//     const accessToken = await getBogToken();
//     const response = await axios.get(`https://api.bog.ge/payments/v1/receipt/${orderId}`, {
//       headers: { Authorization: `Bearer ${accessToken}`, 'Accept-Language': 'en' }
//     });
//     res.json({ status: response.data.order_status.key });
//   } catch (error) {
//     console.error('Payment status check error:', error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to check payment status' });
//   }
// };



// const calculateEndDate = (startDate, billingPeriod) => {
//   const end = new Date(startDate);
//   if (billingPeriod === 'monthly') end.setMonth(end.getMonth() + 1);
//   return end;
// };

// exports.cancelSubscription = async (req, res) => {
//   try {
//     const { userSubscriptionId } = req.body;
//     const subscription = await UserSubscription.findById(userSubscriptionId).populate('planId');

//     if (!subscription) {
//       return res.status(404).json({ message: "Subscription not found" });
//     }

//     if (subscription.status !== 'active' || subscription.planId.billingPeriod !== 'monthly') {
//       return res.status(400).json({ message: "This subscription cannot be canceled." });
//     }

//     // --- KEY CHANGE ---
//     // Instead of ending now, we mark it as canceled but keep the original end date.
//     subscription.status = 'canceled';
//     // The `nextBillingDate` now becomes the `endDate`.
//     subscription.endDate = subscription.nextBillingDate;
//     // We nullify nextBillingDate to ensure our billing system doesn't try to charge them again.
//     subscription.nextBillingDate = null;

//     await subscription.save();

//     res.json({
//       message: `Subscription successfully canceled. Your access will continue until ${new Date(subscription.endDate).toLocaleDateString()}.`
//     });

//   } catch (error) {
//     console.error("Cancel subscription error:", error);
//     res.status(500).json({ message: "Failed to cancel subscription" });
//   }
// };

// exports.resumeSubscription = async (req, res) => {
//     try {
//         const { userSubscriptionId } = req.body;
//         const subscription = await UserSubscription.findById(userSubscriptionId);

//         if (!subscription || subscription.status !== 'canceled') {
//             return res.status(400).json({ message: "This subscription cannot be resumed." });
//         }
        
//         // Restore the subscription to active
//         subscription.status = 'active';
//         // Calculate a new nextBillingDate based on the original endDate
//         subscription.nextBillingDate = subscription.endDate; 
//         subscription.endDate = null; // Remove the end date

//         await subscription.save();

//         res.json({ message: "Subscription has been resumed." });

//     } catch (error) {
//         console.error("Resume subscription error:", error);
//         res.status(500).json({ message: "Failed to resume subscription." });
//     }
//   }



// controllers/subscription.controller.js
const subscriptionPlan = require('../models/subscriptionPlan.js');
const UserSubscription = require('../models/UserSubscription.js');

// Helper to calculate the end of the current billing period
const calculateEndDate = (startDate, billingPeriod) => {
    const endDate = new Date(startDate);
    if (billingPeriod === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
    }
    // Add other billing periods like 'yearly' if needed
    return endDate;
};

// exports.cancelSubscription = async (req, res) => {
//     try {
//         const { userSubscriptionId } = req.body;
//         const subscription = await UserSubscription.findById(userSubscriptionId).populate('planId');

//         if (!subscription || subscription.status !== 'active') {
//             return res.status(400).json({ message: "Only active subscriptions can be canceled." });
//         }

//         // Set status to 'canceled' and define the date when access will truly end
//         subscription.status = 'canceled';
//         subscription.endDate = subscription.nextBillingDate || calculateEndDate(subscription.lastPaymentDate, subscription.planId.billingPeriod);
//         subscription.nextBillingDate = null; // Stop future renewals

//         await subscription.save();

//         res.json({
//             message: `Subscription canceled. Access remains until ${new Date(subscription.endDate).toLocaleDateString()}.`
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Failed to cancel subscription" });
//     }
// };




exports.cancelSubscription = async (req, res) => {
  try {
    const { userSubscriptionId } = req.body;
    const subscription = await UserSubscription.findById(userSubscriptionId)
      .populate('planId')
      .populate('userId');

    if (!subscription || subscription.status !== 'active') {
      return res.status(400).json({ message: "Only active subscriptions can be canceled." });
    }

    // 1. Cancel the current paid subscription
    subscription.status = 'canceled';
    subscription.endDate = subscription.nextBillingDate || 
                         calculateEndDate(subscription.lastPaymentDate, subscription.planId.billingPeriod);
    subscription.nextBillingDate = null;
    await subscription.save();

    // 2. Find the existing inactive free plan (ID: 6892fb98b7e9f522157033b7)
    const freePlan = await subscriptionPlan.findOne({
      price: 0,
      billingPeriod: 'free'
    });

    if (!freePlan) {
      return res.status(400).json({ message: "Free plan not found in system." });
    }

    // 3. Find and reactivate user's existing free plan subscription
    const existingFreeSubscription = await UserSubscription.findOne({
      userId: subscription.userId._id,
      planId: freePlan._id,
      status: 'inactive' // Looking for the inactive free plan
    });

    if (existingFreeSubscription) {
      // Reactivate the existing free plan
      existingFreeSubscription.status = 'active';
      existingFreeSubscription.startDate = new Date();
      await existingFreeSubscription.save();
    } 
  

    res.json({
      message: `Subscription canceled. Free plan has been automatically reactivated.`
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: "Failed to cancel subscription" });
  }
};


exports.resumeSubscription = async (req, res) => {
    try {
        const { userSubscriptionId } = req.body;
        const subscription = await UserSubscription.findById(userSubscriptionId);

        if (!subscription || subscription.status !== 'canceled') {
            return res.status(400).json({ message: "Only canceled subscriptions can be resumed." });
        }

        // Restore to active state
        subscription.status = 'active';
        subscription.nextBillingDate = subscription.endDate; // The next charge will be on the original date
        subscription.endDate = null; // Remove the end date

        await subscription.save();

        res.json({ message: "Subscription has been resumed successfully." });
    } catch (error) {
        res.status(500).json({ message: "Failed to resume subscription" });
    }
};