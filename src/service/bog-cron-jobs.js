
// const UserSubscription=require('../models/UserSubscription.js');
// const  axios=require('axios');
// const   getBogToken =require('../config/bogToken.js');
// const   {sendPaymentFailureEmail}  =require('./emailService.js');
// const SubscriptionPlan = require('../models/SubscriptionPlan.js');

// // Helper to calculate next billing date
// const calculateNextBillingDate = (billingPeriod, startDate = new Date()) => {
//   const nextDate = new Date(startDate);
//   if (billingPeriod === 'monthly') {
//     nextDate.setMonth(nextDate.getMonth() + 1);
//   } 
//   return nextDate;
// };

// // Define retry policy
// const MAX_RETRY_ATTEMPTS = 3;
// const RETRY_DELAY_DAYS = 3;
// const RETRY_DELAY_MS = RETRY_DELAY_DAYS * 24 * 60 * 60 * 1000;

// const chargeRecurringSubscriptions = async () => {
//   console.log('--- Running recurring subscription charge job ---');
//   try {
//      // 1. ACTIVE subscriptions due for renewal


//      // 1. Find all plan IDs that are monthly
//     const monthlyPlanIds = await SubscriptionPlan.find({ billingPeriod: 'monthly' }).select('_id');
//     const monthlyPlanObjectIds = monthlyPlanIds.map(plan => plan._id);

//     // 2. Find ACTIVE subscriptions due for renewal that have a monthly plan
//     const activeDueSubscriptions = await UserSubscription.find({
//       status: 'active',
//       nextBillingDate: { $lte: new Date() },
//       planId: { $in: monthlyPlanObjectIds } // Use the IDs of the monthly plans
//     }).populate('planId').populate('userId');
//     console.log("🚀 ~ chargeRecurringSubscriptions ~ activeDueSubscriptions:", activeDueSubscriptions)


//    // 2. PAYMENT_FAILED subscriptions (recurring only)
//     const retryableFailedSubscriptions = await UserSubscription.find({
//       status: 'payment_failed',
//       bogSubscriptionId: { $exists: true }, // CRITICAL: Only subscriptions with saved payment method
//       retryAttemptCount: { $lt: MAX_RETRY_ATTEMPTS },
//       $or: [
//         { lastRetryAttemptDate: { $lte: new Date(Date.now() - RETRY_DELAY_MS) } },
//         { lastRetryAttemptDate: { $exists: false } }
//       ]
//     }).populate('planId').populate('userId');

//     console.log("🚀 ~ chargeRecurringSubscriptions ~ retryableFailedSubscriptions:", retryableFailedSubscriptions)


//     const subscriptionsToProcess = [
//       ...activeDueSubscriptions,
//       ...retryableFailedSubscriptions,
//     ];

//     if (subscriptionsToProcess.length === 0) {
//       console.log('No subscriptions due for recurring charge or eligible for retry.');
//       return;
//     }
//     const isTestMode = process.env.PAYMENT_TEST_MODE === 'true';
//     for (const sub of subscriptionsToProcess) {
//       console.log("🚀 ~ chargeRecurringSubscriptions ~ sub:", sub)
//       const isInitialCharge = sub.status === 'pending';
//       const isRetry = sub.status === 'payment_failed';

//       console.log(`Processing ${isInitialCharge ? 'PENDING' : isRetry ? 'RETRY' : 'RECURRING'} subscription ${sub._id} for user ${sub.userId.email}`);

//       // Basic validation
//       if (!sub.bogInitialOrderId || !sub.planId || !sub.userId?.email) {
//         console.warn(`Skipping invalid subscription ${sub._id}: Missing required fields`);
//         continue;
//       }

//       try {
//         const accessToken = await getBogToken();
//         const subscriptionId = sub.bogSubscriptionId || sub.bogInitialOrderId;

//               // Use test amount if in test mode
//         const chargeAmount = isTestMode ? 0.01 : sub.planId.price;

//         const chargePayload = {
//           callback_url: `${process.env.BACKEND_URL}/api/payments/callback`,
//           purchase_units: {
//             total_amount: chargeAmount,
//             currency_code: "GEL",
//             basket: [{
//               quantity: 1,
//               unit_price: chargeAmount,
//               product_id: process.env.BOG_PRODUCT_ID
//             }]
//           }
//         };


//         // Make the API call to BOG
//         const chargeResponse = await axios.post(
//           `https://api.bog.ge/payments/v1/ecommerce/orders/${subscriptionId}/subscribe`,
//           // `https://api.bog.ge/payments/v1/ecommerce/orders/745017ce-a1d3-4220-b49c-7dc131753018/subscribe`,
//           chargePayload,
//           {
//             headers: {
//               'Authorization': `Bearer ${accessToken}`,
//               'Content-Type': 'application/json',
//               'Accept-Language': 'en'
//             }
//           }
//         );
//         console.log("🚀 ~ chargeRecurringSubscriptions ~ chargeResponse:", chargeResponse)

//         const newTransactionId = chargeResponse.data.id;
//         const receiptUrl = chargeResponse.data._links?.details?.href || null;

//         // Update subscription on success
//         sub.status = 'active';
//         sub.retryAttemptCount = 0;
//         sub.lastRetryAttemptDate = null;
        
//         if (isInitialCharge) {
//           sub.startDate = new Date();
//           sub.bogSubscriptionId = newTransactionId; // Save the subscription ID from BOG
//           sub.nextBillingDate = calculateNextBillingDate(sub.planId.billingPeriod);
//         } else {
//           sub.lastPaymentDate = new Date();
//           sub.nextBillingDate = calculateNextBillingDate(sub.planId.billingPeriod, sub.lastPaymentDate);
//         }

//         sub.transactionHistory.push({
//           bogTransactionId: newTransactionId,
//            bogOrderId: subscriptionId,
//           amount: chargeAmount,
//           status: isInitialCharge ? 'initial_payment_success' : 'recurring_payment_success',
//           date: new Date(),
//           receiptUrl: receiptUrl
//         });

//         await sub.save();
//         console.log(`Successfully processed subscription ${sub._id}. Status: ${sub.status}`);

//       } catch (chargeError) {
//         console.error(`Payment failed for subscription ${sub._id}:`, chargeError.message);

//         // Update subscription on failure
//         if (isInitialCharge) {
//           sub.status = 'payment_failed';
//           sub.retryAttemptCount = 1;
//         } else {
//           sub.retryAttemptCount = (sub.retryAttemptCount || 0) + 1;
//         }

//         sub.lastRetryAttemptDate = new Date();
//   // Calculate next retry date with exponential backoff
//         const nextRetryDelay = Math.min(
//           Math.pow(2, sub.retryAttemptCount - 1) * RETRY_DELAY_MS,
//           30 * 24 * 60 * 60 * 1000 // Max 30 days
//         );
//         const nextRetryDate = new Date(Date.now() + nextRetryDelay);
//         sub.transactionHistory.push({
//           bogTransactionId:  'N/A_Failed_Attempt',
//            bogOrderId: sub.bogSubscriptionId || sub.bogInitialOrderId,
//           amount: sub.planId.price,
//           status: isInitialCharge ? 'initial_payment_failed' : 'recurring_payment_failed',
//           date: new Date(),
//           receiptUrl: null
//         });


      

//         // Check if max retries exceeded
//         if (sub.retryAttemptCount >= MAX_RETRY_ATTEMPTS) {
//           sub.status = 'expired';
//           sub.endDate = new Date();
//           console.warn(`Subscription ${sub._id} expired after ${MAX_RETRY_ATTEMPTS} failed attempts`);
//         }

//         await sub.save();

//         // Send appropriate email notification
//         if (sub.userId?.email) {
//           await sendPaymentFailureEmail(
//             sub.userId.email,
//             sub.planId.name,
//              sub.planId.price,  // ADDED PLAN PRICE
//             sub.retryAttemptCount,
//             MAX_RETRY_ATTEMPTS,
//               sub.status === 'expired' ? null : nextRetryDate
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Critical error in recurring subscription cron job:', error);
//   }
// };

// module.exports= chargeRecurringSubscriptions;


const UserSubscription = require('../models/UserSubscription.js');
const axios = require('axios');
const getBogToken = require('../config/bogToken.js');
const { sendPaymentFailureEmail } = require('./emailService.js');
const SubscriptionPlan = require('../models/SubscriptionPlan.js');

// Helper to calculate next billing date
const calculateNextBillingDate = (billingPeriod, startDate = new Date()) => {
  const nextDate = new Date(startDate);
  if (billingPeriod === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } 
  return nextDate;
};

// Define retry policy
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_DAYS = 3;
const RETRY_DELAY_MS = RETRY_DELAY_DAYS * 24 * 60 * 60 * 1000;

const chargeRecurringSubscriptions = async () => {
  console.log('--- Running recurring subscription charge job ---');
  try {
    // 1. Find all plan IDs that are monthly
    const monthlyPlanIds = await SubscriptionPlan.find({ billingPeriod: 'monthly' }).select('_id');
    const monthlyPlanObjectIds = monthlyPlanIds.map(plan => plan._id);

    // 2. Find ACTIVE subscriptions due for renewal that have a monthly plan
    const activeDueSubscriptions = await UserSubscription.find({
      status: 'active',
      nextBillingDate: { $lte: new Date() },
      planId: { $in: monthlyPlanObjectIds }
    }).populate('planId').populate('userId');

    // 3. PAYMENT_FAILED subscriptions (recurring only)
    const retryableFailedSubscriptions = await UserSubscription.find({
      status: 'payment_failed',
      // bogSubscriptionId: { $exists: true },

       bogInitialOrderId: { $exists: true },
      retryAttemptCount: { $lt: MAX_RETRY_ATTEMPTS },
      $or: [
        { lastRetryAttemptDate: { $lte: new Date(Date.now() - RETRY_DELAY_MS) } },
        { lastRetryAttemptDate: { $exists: false } }
      ]
    }).populate('planId').populate('userId');
    console.log("🚀 ~ chargeRecurringSubscriptions ~ retryableFailedSubscriptions:", retryableFailedSubscriptions)

    const subscriptionsToProcess = [
      ...activeDueSubscriptions,
      ...retryableFailedSubscriptions,
    ];

    if (subscriptionsToProcess.length === 0) {
      console.log('No subscriptions due for recurring charge or eligible for retry.');
      return;
    }

    const isTestMode = process.env.PAYMENT_TEST_MODE === 'true';
    
    for (const sub of subscriptionsToProcess) {
      let updatedSub;
      try {
        // --- START: LOCK THE SUBSCRIPTION ---
         updatedSub = await UserSubscription.findOneAndUpdate(
          { 
            _id: sub._id, 
            status: { $in: ['active', 'payment_failed'] } 
          },
          { $set: { status: 'processing_payment' } },
          { new: true }
        ).populate('planId').populate('userId');

        if (!updatedSub) {
          console.log(`Subscription ${sub._id} is already being processed. Skipping.`);
          continue;
        }
        // --- END: LOCK THE SUBSCRIPTION ---

        console.log(`Processing subscription ${updatedSub._id} for user ${updatedSub.userId?.email || 'unknown'}`);
        
        const isInitialCharge = updatedSub.status === 'pending';
        const isRetry = updatedSub.status === 'payment_failed';

        // Basic validation
        if (!updatedSub.bogInitialOrderId || !updatedSub.planId || !updatedSub.userId?.email) {
          console.warn(`Skipping invalid subscription ${updatedSub._id}: Missing required fields`);
          // Release lock by setting back to previous status
          await UserSubscription.findByIdAndUpdate(updatedSub._id, { status: sub.status });
          continue;
        }

        const accessToken = await getBogToken();
        const subscriptionId = updatedSub.bogSubscriptionId || updatedSub.bogInitialOrderId;
        const chargeAmount = isTestMode ? 0.01 : updatedSub.planId.price;

        const chargePayload = {
          callback_url: `${process.env.BACKEND_URL}/api/payments/callback`,
          purchase_units: {
            total_amount: chargeAmount,
            currency_code: "GEL",
            basket: [{
              quantity: 1,
              unit_price: chargeAmount,
              product_id: process.env.BOG_PRODUCT_ID
            }]
          }
        };

        const chargeResponse = await axios.post(
          `https://api.bog.ge/payments/v1/ecommerce/orders/${subscriptionId}/subscribe`,
          //  `https://api.bog.ge.INVALID/payments/v1/ecommerce/orders/${subscriptionId}/subscribe`,
          chargePayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept-Language': 'en'
            }
          }
        );

        const newTransactionId = chargeResponse.data.id;
        const receiptUrl = chargeResponse.data._links?.details?.href || null;

        // Update subscription on success
        updatedSub.status = 'active';
        updatedSub.retryAttemptCount = 0;
        updatedSub.lastRetryAttemptDate = null;
        
        if (isInitialCharge) {
          updatedSub.startDate = new Date();
          updatedSub.bogSubscriptionId = newTransactionId;
        } else {
          updatedSub.lastPaymentDate = new Date();
        }
        
        // Only set next billing for monthly plans
        if (updatedSub.planId.billingPeriod === 'monthly') {
          updatedSub.nextBillingDate = calculateNextBillingDate(
            updatedSub.planId.billingPeriod, 
            updatedSub.lastPaymentDate || new Date()
          );
        } else {
          updatedSub.nextBillingDate = null;
        }

        updatedSub.transactionHistory.push({
          bogTransactionId: newTransactionId,
          bogOrderId: subscriptionId,
          amount: chargeAmount,
          status: isInitialCharge ? 'initial_payment_success' : 'recurring_payment_success',
          date: new Date(),
          receiptUrl: receiptUrl
        });

        await updatedSub.save();
        console.log(`Successfully processed subscription ${updatedSub._id}. Status: ${updatedSub.status}`);

      } catch (chargeError) {
        console.error(`Payment failed for subscription ${sub._id}:`, chargeError.message);
        
        // Fetch the latest subscription state
        const currentSub = await UserSubscription.findById(sub._id).populate('planId').populate('userId');
        if (!currentSub) {
          console.error(`Subscription ${sub._id} not found during error handling`);
          continue;
        }

        const isInitialCharge = currentSub.status === 'pending';
        
        // Update subscription on failure
        currentSub.status = 'payment_failed';
        currentSub.retryAttemptCount = (currentSub.retryAttemptCount || 0) + 1;
        currentSub.lastRetryAttemptDate = new Date();

        // Calculate next retry date with exponential backoff
        const nextRetryDelay = Math.min(
          Math.pow(2, currentSub.retryAttemptCount - 1) * RETRY_DELAY_MS,
          30 * 24 * 60 * 60 * 1000 // Max 30 days
        );
        const nextRetryDate = new Date(Date.now() + nextRetryDelay);
        
        currentSub.transactionHistory.push({
          bogTransactionId: 'N/A_Failed_Attempt',
          bogOrderId: currentSub.bogSubscriptionId || currentSub.bogInitialOrderId,
          amount: currentSub.planId.price,
          status: isInitialCharge ? 'initial_payment_failed' : 'recurring_payment_failed',
          date: new Date(),
          receiptUrl: null
        });

        if (currentSub.retryAttemptCount >= MAX_RETRY_ATTEMPTS) {
          currentSub.status = 'expired';
          currentSub.endDate = new Date();
          console.warn(`Subscription ${currentSub._id} expired after ${MAX_RETRY_ATTEMPTS} failed attempts`);
        }

        await currentSub.save();

        // Send email notification
        if (currentSub.userId?.email) {
          await sendPaymentFailureEmail(
            currentSub.userId.email,
            currentSub.planId.name,
            currentSub.planId.price,
            currentSub.retryAttemptCount,
            MAX_RETRY_ATTEMPTS,
            currentSub.status === 'expired' ? null : nextRetryDate
          );
        }
      }    finally {
  // This block runs even if a critical error happens
  if (updatedSub && updatedSub.status === 'processing_payment') {
    console.warn(`Releasing lock for subscription ${updatedSub._id} that was stuck.`);
    // Revert it to payment_failed so it can be retried
    await UserSubscription.findByIdAndUpdate(updatedSub._id, { status: 'payment_failed' });
  }

   
    }
  }
  } catch (error) {
    console.error('Critical error in recurring subscription cron job:', error);
  }
};

module.exports = chargeRecurringSubscriptions;


