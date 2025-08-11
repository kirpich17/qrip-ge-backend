
const UserSubscription=require('../models/UserSubscription.js');
const  axios=require('axios');
const   getBogToken =require('../config/bogToken.js');
const   {sendPaymentFailureEmail}  =require('./emailService.js');

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
     // 1. ACTIVE subscriptions due for renewal
    const activeDueSubscriptions = await UserSubscription.find({
      status: 'active',
      nextBillingDate: { $lte: new Date() }
    }).populate('planId').populate('userId');
    console.log("🚀 ~ chargeRecurringSubscriptions ~ activeDueSubscriptions:", activeDueSubscriptions)


   // 2. PAYMENT_FAILED subscriptions (recurring only)
    const retryableFailedSubscriptions = await UserSubscription.find({
      status: 'payment_failed',
      bogSubscriptionId: { $exists: true }, // CRITICAL: Only subscriptions with saved payment method
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
      console.log("🚀 ~ chargeRecurringSubscriptions ~ sub:", sub)
      const isInitialCharge = sub.status === 'pending';
      const isRetry = sub.status === 'payment_failed';

      console.log(`Processing ${isInitialCharge ? 'PENDING' : isRetry ? 'RETRY' : 'RECURRING'} subscription ${sub._id} for user ${sub.userId.email}`);

      // Basic validation
      if (!sub.bogInitialOrderId || !sub.planId || !sub.userId?.email) {
        console.warn(`Skipping invalid subscription ${sub._id}: Missing required fields`);
        continue;
      }

      try {
        const accessToken = await getBogToken();
        const subscriptionId = sub.bogSubscriptionId || sub.bogInitialOrderId;

              // Use test amount if in test mode
        const chargeAmount = isTestMode ? 0.01 : sub.planId.price;

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


        // Make the API call to BOG
        const chargeResponse = await axios.post(
          // `https://api.bog.ge/payments/v1/ecommerce/orders/${subscriptionId}/subscribe`,
          `https://api.bog.ge/payments/v1/ecommerce/orders/745017ce-a1d3-4220-b49c-7dc131753018/subscribe`,
          chargePayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept-Language': 'en'
            }
          }
        );
        console.log("🚀 ~ chargeRecurringSubscriptions ~ chargeResponse:", chargeResponse)

        const newTransactionId = chargeResponse.data.id;
        const receiptUrl = chargeResponse.data._links?.details?.href || null;

        // Update subscription on success
        sub.status = 'active';
        sub.retryAttemptCount = 0;
        sub.lastRetryAttemptDate = null;
        
        if (isInitialCharge) {
          sub.startDate = new Date();
          sub.bogSubscriptionId = newTransactionId; // Save the subscription ID from BOG
          sub.nextBillingDate = calculateNextBillingDate(sub.planId.billingPeriod);
        } else {
          sub.lastPaymentDate = new Date();
          sub.nextBillingDate = calculateNextBillingDate(sub.planId.billingPeriod, sub.lastPaymentDate);
        }

        sub.transactionHistory.push({
          bogTransactionId: newTransactionId,
           bogOrderId: subscriptionId,
          amount: chargeAmount,
          status: isInitialCharge ? 'initial_payment_success' : 'recurring_payment_success',
          date: new Date(),
          receiptUrl: receiptUrl
        });

        await sub.save();
        console.log(`Successfully processed subscription ${sub._id}. Status: ${sub.status}`);

      } catch (chargeError) {
        console.error(`Payment failed for subscription ${sub._id}:`, chargeError.message);

        // Update subscription on failure
        if (isInitialCharge) {
          sub.status = 'payment_failed';
          sub.retryAttemptCount = 1;
        } else {
          sub.retryAttemptCount = (sub.retryAttemptCount || 0) + 1;
        }

        sub.lastRetryAttemptDate = new Date();
  // Calculate next retry date with exponential backoff
        const nextRetryDelay = Math.min(
          Math.pow(2, sub.retryAttemptCount - 1) * RETRY_DELAY_MS,
          30 * 24 * 60 * 60 * 1000 // Max 30 days
        );
        const nextRetryDate = new Date(Date.now() + nextRetryDelay);
        sub.transactionHistory.push({
          bogTransactionId:  'N/A_Failed_Attempt',
           bogOrderId: sub.bogSubscriptionId || sub.bogInitialOrderId,
          amount: sub.planId.price,
          status: isInitialCharge ? 'initial_payment_failed' : 'recurring_payment_failed',
          date: new Date(),
          receiptUrl: null
        });


      

        // Check if max retries exceeded
        if (sub.retryAttemptCount >= MAX_RETRY_ATTEMPTS) {
          sub.status = 'expired';
          sub.endDate = new Date();
          console.warn(`Subscription ${sub._id} expired after ${MAX_RETRY_ATTEMPTS} failed attempts`);
        }

        await sub.save();

        // Send appropriate email notification
        if (sub.userId?.email) {
          await sendPaymentFailureEmail(
            sub.userId.email,
            sub.planId.name,
             sub.planId.price,  // ADDED PLAN PRICE
            sub.retryAttemptCount,
            MAX_RETRY_ATTEMPTS,
              sub.status === 'expired' ? null : nextRetryDate
          );
        }
      }
    }
  } catch (error) {
    console.error('Critical error in recurring subscription cron job:', error);
  }
};

module.exports= chargeRecurringSubscriptions;