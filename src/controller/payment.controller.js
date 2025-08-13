  const  axios = require('axios');
  const getBogToken =require('../config/bogToken.js');
  const SubscriptionPlan =require('./../models/SubscriptionPlan.js');
  const UserSubscription =require('./../models/UserSubscription.js');
const { restartFreePlan, cancelActiveFreePlan } = require('../service/subscriptionService.js');


  const initiatePayment = async (req, res) => {
    const userId =req.user.userId; // From 'protect' middleware
    const { planId } = req.body;
    console.log("🚀 ~ initiatePayment ~ planId:", userId)

    try {
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || plan.price <= 0) {
        return res.status(400).json({ message: "Invalid or free plan selected." });
      }

      const accessToken = await getBogToken();
      
      // --- Step 1: Create Ecommerce Order ---

      const orderPayload = {
        callback_url: `${process.env.BACKEND_URL}/api/payments/callback`,
        // callback_url: "http://localhost:5000/api/payments/callback",
        // external_order_id: externalOrderId,
        purchase_units: {
          currency: "GEL",
          // total_amount: plan.price,
          total_amount:0.01,
          basket: [{
            quantity: 1,
            // unit_price: plan.price,
            unit_price: 0.01,
            product_id: process.env.BOG_PRODUCT_ID, // Use a generic product ID from .env
          //   description: `Subscription to ${plan.name}`
          }]
        },
        redirect_urls: {
          fail: `${process.env.FRONTEND_URL}/dashboard/subscription/failure`,
          success: `${process.env.FRONTEND_URL}/dashboard/subscription/success`
        // fail:"http://localhost:3000/dashboard/subscription/failure",
        // success:"http://localhost:3000/dashboard/subscription/success"
        }
      };
      console.log("🚀 ~ initiatePayment ~ orderPayload:", orderPayload)

      const orderResponse = await axios.post('https://api.bog.ge/payments/v1/ecommerce/orders', orderPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept-Language': 'en'
        }
      });
      console.log("🚀 ~ initiatePayment ~ orderResponse:", orderResponse)
      const orderData = orderResponse.data;
      const bogOrderId = orderData.id;

      // --- Step 2: Request to Save Card for Subscription ---
      const subscriptionRequestResponse = await axios.put(`https://api.bog.ge/payments/v1/orders/${bogOrderId}/subscriptions`, {}, {
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'Accept-Language': 'en'
          }
      });
      console.log('BOG Subscription Request (Card Save) response:', subscriptionRequestResponse.data);

      // --- Step 3: Create a pending subscription record in your DB ---
      await UserSubscription.create({
        userId,
        planId,
        bogInitialOrderId: bogOrderId,
        status: 'pending'
      });

      res.json({ redirectUrl: orderData._links.redirect.href, orderId: bogOrderId });


    } catch (error) {
      console.error("Payment initiation failed:", error.response?.data || error.message);
      res.status(500).json({ message: "Failed to initiate payment." });
    }
  };


  const paymentCallbackWebhook = async (req, res) => {
  const paymentData = req.body;
  console.log('Full BOG Webhook received:', JSON.stringify(paymentData, null, 2));

  try {
    // 1. Extract data from correct structure
    const event = paymentData.event;
    const body = paymentData.body || {};
    const orderStatus = body.order_status?.key;
    const orderId = body.order_id; // Correct extraction
    const externalOrderId = body.external_order_id;
    
    // 2. Extract payment details correctly
    const paymentDetail = body.payment_detail || {};
    const transactionId = paymentDetail.transaction_id;
    const paymentOption = paymentDetail.payment_option;
    
    // 3. Extract purchase units correctly
    const amount =  body.purchase_units?.transfer_amount || body.purchase_units?.request_amount;
    
    // 4. Extract redirect URLs
    const redirectLinks = body.redirect_links || {};
    const successUrl = redirectLinks.success;
    const failUrl = redirectLinks.fail;

    console.log(`Payment Update:
      Event: ${event}
      Order ID: ${orderId}
      External Order ID: ${externalOrderId}
      Status: ${orderStatus}
      Transaction ID: ${transactionId}
      Amount: ${amount}
      Payment Option: ${paymentOption}
      Success URL: ${successUrl || 'Not provided'}
      Fail URL: ${failUrl || 'Not provided'}`);

    // 5. Validate we have required data
    if (!orderId) {
      console.error('Missing order ID in webhook payload');
      return res.status(400).send('Missing order ID');
    }

    const subscription = await UserSubscription.findOne({ 
      bogInitialOrderId: orderId 
    }).populate('planId').populate('userId');

    if (!subscription) {
      console.warn(`Webhook received for unknown order: ${orderId}`);
      return res.status(404).send('Subscription record not found');
    }

    // Determine payment type
    const isInitialPayment = subscription.status === 'pending';

    if (orderStatus === 'completed') {
      // Record transaction
      subscription.transactionHistory.push({
        bogTransactionId: transactionId,
        bogOrderId: orderId,
        amount: parseFloat(amount) || subscription.planId.price,
        status: isInitialPayment ? 'initial_payment_success' : 'recurring_payment_success',
        date: new Date(),
        receiptUrl: `https://api.bog.ge/payments/v1/receipt/${orderId}`
      });

      // Update subscription
      subscription.status = 'active';
      if (isInitialPayment) {
        subscription.startDate = new Date();
      }
      subscription.lastPaymentDate = new Date();
      
      // Calculate next billing date
     


      if (subscription.planId.billingPeriod === 'monthly') {
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  subscription.nextBillingDate = nextBillingDate;
} else {
  // For one_time plans, set to null
  subscription.nextBillingDate = null;
}

      await subscription.save();
      console.log(`Payment successful for subscription ${subscription._id}`);

   
   // Only cancel free subscription for new paid subscriptions
    if (isInitialPayment) {
      try {
        await cancelActiveFreePlan(subscription.userId);
      } catch (cancelError) {
        console.error('Error canceling free plan:', cancelError);
      }
    }
    

       // Handle redirect for initial payments
      if (isInitialPayment) {
        const redirectUrl = successUrl || 'https://mydiscount.ge/userDashboard/subscription/success';
        console.log(`Redirecting to: ${redirectUrl}`);
        return res.redirect(redirectUrl);
      }
      
    
      res.status(200).send('OK');
      
    } else {
      // Handle failed payment
      subscription.transactionHistory.push({
        bogTransactionId: transactionId || 'N/A',
        bogOrderId: orderId,
        amount: parseFloat(amount) || subscription.planId.price,
        status: isInitialPayment ? 'initial_payment_failed' : 'recurring_payment_failed',
        date: new Date(),
        receiptUrl: null
      });
      
      subscription.status = 'payment_failed';
      await subscription.save();
      console.log(`Payment failed for subscription ${subscription._id}`);

      // Handle redirect for initial payments
      if (isInitialPayment) {
        const redirectUrl = failUrl || 'https://mydiscount.ge/userDashboard/subscription/failure';
        console.log(`Redirecting to: ${redirectUrl}`);
        return res.redirect(redirectUrl);
      }
      
      res.status(200).send('OK');
    }

  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Internal Server Error");
  }
};

// FOR ONE-TIME PAYMENTS
const initiateOneTimePayment = async (req, res) => {
    const userId = req.user.userId;
    const { planId } = req.body;

    try {
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan || plan.billingPeriod !== 'one_time') {
            return res.status(400).json({ message: "Invalid plan for one-time payment." });
        }

        const accessToken = await getBogToken();
      
        // --- Create Ecommerce Order ---
        const orderPayload = {
            callback_url: `${process.env.BACKEND_URL}/api/payments/callback`,
            purchase_units: {
                currency: "GEL",
                // total_amount: plan.price, // Using actual price

                 total_amount:0.01,
                basket: [{
                    quantity: 1,
                    // unit_price: plan.price, // Using actual price

                             unit_price: 0.01,
                    product_id: process.env.BOG_PRODUCT_ID,
                    // description: `One-time payment for ${plan.name}`
                }]
            },
            redirect_urls: {
             fail: `${process.env.FRONTEND_URL}/userDashboard/subscription/failure`,
          success: `${process.env.FRONTEND_URL}/userDashboard/subscription/success`
            }
        };
 console.log("🚀 ~ initiateOneTimePayment ~:", orderPayload)
        const orderResponse = await axios.post('https://api.bog.ge/payments/v1/ecommerce/orders', orderPayload, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`,  'Accept-Language': 'en' }
        });

        const orderData = orderResponse.data;
        const bogOrderId = orderData.id;

        // --- CARD SAVING STEP IS SKIPPED ---
        console.log('One-time payment. Card save step is intentionally skipped.');
        
        // --- Create a pending subscription record in DB ---
        // This is still needed so the webhook can find and activate the record
        await UserSubscription.create({
            userId,
            planId,
            bogInitialOrderId: bogOrderId,
            status: 'pending'
        });

        res.json({ redirectUrl: orderData._links.redirect.href, orderId: bogOrderId });

    } catch (error) {
        console.error("One-time payment initiation failed:", error.response?.data || error.message);
        res.status(500).json({ message: "Failed to initiate one-time payment." });
    }
};


const restartLifeTimeFreePlan = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user has active paid subscriptions
    const activePaidSubs = await UserSubscription.find({
      userId,
      status: 'active',
      'plan.billingPeriod': { $ne: 'free' }
    });

    if (activePaidSubs.length > 0) {
      return res.status(400).json({
        message: "Cannot restart free plan while active paid subscriptions exist"
      });
    }

    // Restart free plan
    await restartFreePlan(userId);

    res.json({ 
      status: true,
      message: "Free plan restarted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      status: false,
      message: error.message 
    });
  }
};

const getActiveSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const subscription = await UserSubscription.findOne({
      userId,
      status: 'active'
    }).populate('planId');
    
    if (!subscription) {
      return res.status(404).json({
        status: false,
        message: "No active subscription found"
      });
    }
    
    res.json({
      status: true,
      data: subscription
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

  module.exports = {initiatePayment,paymentCallbackWebhook,initiateOneTimePayment,getActiveSubscription,restartLifeTimeFreePlan}