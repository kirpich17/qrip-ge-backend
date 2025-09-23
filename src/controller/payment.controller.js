  const  axios = require('axios');
  const getBogToken =require('../config/bogToken.js');
  const SubscriptionPlan =require('./../models/SubscriptionPlan.js');
  const UserSubscription =require('./../models/UserSubscription.js');
const { restartFreePlan, cancelActiveFreePlan } = require('../service/subscriptionService.js');
const MemorialPurchase = require('../models/MemorialPurchase.js');
const memorialModel = require('../models/memorial.model.js');
const PromoCodeSchema = require('../models/PromoCodeSchema.js');


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


// controllers/payment.controller.js

const paymentCallbackWebhook = async (req, res) => {
  const paymentData = req.body;
  console.log('Full BOG Webhook received:', JSON.stringify(paymentData, null, 2));

  try {
    // 1. Extract data
    const body = paymentData.body || {};
    const orderStatus = body.order_status?.key;
    const orderId = body.order_id;
    const transactionId = body.payment_detail?.transaction_id;
    const amount = body.purchase_units?.transfer_amount || body.purchase_units?.request_amount;
    const externalOrderId = body.external_order_id;
    
    // 2. Validate required data
    if (!orderId) {
      console.error('Missing order ID in webhook payload');
      return res.status(400).send('Missing order ID');
    }

    // 3. Check if this is a sticker order first
    if (externalOrderId) {
      console.log('🔍 Processing sticker order callback:', externalOrderId);
      const QRStickerOrder = require('../models/QRStickerOrder');
      const QRStickerOption = require('../models/QRStickerOption');
      
      const stickerOrder = await QRStickerOrder.findById(externalOrderId);
      
      if (stickerOrder) {
        console.log('✅ Found sticker order:', stickerOrder._id);
        
        if (orderStatus === 'completed') {
          stickerOrder.paymentStatus = 'paid';
          stickerOrder.paymentId = orderId;
          stickerOrder.orderStatus = 'processing';
          
          // Update stock
          const stickerOption = await QRStickerOption.findById(stickerOrder.stickerOption);
          if (stickerOption) {
            stickerOption.stock = Math.max(0, stickerOption.stock - stickerOrder.quantity);
            if (stickerOption.stock === 0) {
              stickerOption.isInStock = false;
            }
            await stickerOption.save();
          }
          
          await stickerOrder.save();
          console.log('✅ Sticker payment successful:', externalOrderId);
        } else {
          stickerOrder.paymentStatus = 'failed';
          await stickerOrder.save();
          console.log('❌ Sticker payment failed:', externalOrderId);
        }
        
        return res.status(200).send('Sticker webhook processed successfully');
      }
    }

    // 4. Handle memorial purchase (existing logic)
    const purchase = await MemorialPurchase.findOne({ 
      bogOrderId: orderId 
    }).populate('planId').populate('memorialId').populate('appliedPromoCode');

    if (!purchase) {
      console.warn(`Webhook received for unknown order: ${orderId}`);
      return res.status(404).send('Purchase record not found');
    }

    // 5. Handle payment status
    if (orderStatus === 'completed') {
      // Update purchase record
      purchase.status = 'completed';
      purchase.transactionId = transactionId;
      purchase.paymentDate = new Date();
      await purchase.save();


        // Increment promo code usage if applicable
      if (purchase.appliedPromoCode) {
        await PromoCodeSchema.findByIdAndUpdate(
          purchase.appliedPromoCode._id,
          { $inc: { currentUsage: 1 } }
        );
        console.log(`Incremented usage for promo code: ${purchase.appliedPromoCode.code}`);
      }


      // Activate the memorial
      await memorialModel.findByIdAndUpdate(purchase.memorialId, {
        status: 'active',
        memorialPaymentStatus: 'active',
        planId: purchase.planId,
        purchase: purchase._id
      });

      console.log(`Payment successful for memorial ${purchase.memorialId}`);
      
      // Just return success - the frontend will handle the redirect
      return res.status(200).send('Webhook processed successfully');
      
    } else {
      // Handle failed payment
      purchase.status = 'failed';
      await purchase.save();
      
      // Update memorial status
      await Memorial.findByIdAndUpdate(purchase.memorialId, {
        memorialPaymentStatus: 'pending_payment'
      });
      
      console.log(`Payment failed for memorial ${purchase.memorialId}`);
      
      // Just return success - the frontend will handle the redirect
      return res.status(200).send('Webhook processed (payment failed)');
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

                 fail: `${process.env.FRONTEND_URL}/dashboard/subscription/failure`,
          success: `${process.env.FRONTEND_URL}/dashboard/subscription/success`
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
const RETRY_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const reTrySubscriptionPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ 
        success: false,
        message: 'Subscription ID is required' 
      });
    }

    // 1. Find and lock the subscription
    const subscription = await UserSubscription.findOneAndUpdate(
      { 
        _id: subscriptionId, 
        status: 'payment_failed' 
      },
      // { $set: { status: 'processing_payment' } },
      { new: true }
    ).populate('planId').populate('userId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or not eligible for retry'
      });
    }

    console.log(`Processing manual retry for subscription ${subscription._id}`);

    // 2. Prepare payment request
    const isTestMode = process.env.PAYMENT_TEST_MODE === 'true';
    const accessToken = await getBogToken();
    const subscriptionIdForBog = subscription.bogSubscriptionId || subscription.bogInitialOrderId;
    const chargeAmount = isTestMode ? 0.01 : subscription.planId.price;

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

    // 3. Attempt payment
    const chargeResponse = await axios.post(
      `https://api.bog.ge/payments/v1/ecommerce/orders/${subscriptionIdForBog}/subscribe`,
      //  `https://api.bog.ge.INVALID/payments/v1/ecommerce/orders/${subscriptionIdForBog}/subscribe`,
      chargePayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'en'
        }
      }
    );

    // 4. Handle success
    const newTransactionId = chargeResponse.data.id;
    const receiptUrl = chargeResponse.data._links?.details?.href || null;

    // Update subscription
    subscription.status = 'active';
    subscription.retryAttemptCount = 0;
    subscription.lastRetryAttemptDate = null;
    subscription.lastPaymentDate = new Date();
    
    if (subscription.planId.billingPeriod === 'monthly') {
      subscription.nextBillingDate = calculateNextBillingDate(
        'monthly', 
        subscription.lastPaymentDate
      );
    }

    subscription.transactionHistory.push({
      bogTransactionId: newTransactionId,
      bogOrderId: subscriptionIdForBog,
      amount: chargeAmount,
      status: 'recurring_payment_success',
      date: new Date(),
      receiptUrl: receiptUrl
    });

    await subscription.save();

    console.log(`Manual retry succeeded for subscription ${subscription._id}`);

    return res.json({
      success: true,
      message: 'Payment successful',
      receiptUrl
    });

  } catch (error) {
    console.error('Manual retry failed:', error.message);
    
    // 5. Handle payment failure
    try {
      const currentSub = await UserSubscription.findById(subscriptionId)
        .populate('planId')
        .populate('userId');

      if (!currentSub) {
        return res.status(500).json({
          success: false,
          message: 'Error updating subscription after failed payment'
        });
      }

      // // Update subscription
      // currentSub.status = 'payment_failed';
      // currentSub.retryAttemptCount = (currentSub.retryAttemptCount || 0) + 1;
      // currentSub.lastRetryAttemptDate = new Date();

      // currentSub.transactionHistory.push({
      //   bogTransactionId: 'N/A_Failed_Attempt',
      //   bogOrderId: currentSub.bogSubscriptionId || currentSub.bogInitialOrderId,
      //   amount: currentSub.planId.price,
      //   status: 'recurring_payment_failed',
      //   date: new Date(),
      //   receiptUrl: null
      // });

      // // Check if max attempts reached
      // if (currentSub.retryAttemptCount >= MAX_RETRY_ATTEMPTS) {
      //   currentSub.status = 'expired';
      //   currentSub.endDate = new Date();
      //   console.warn(`Subscription ${currentSub._id} expired after ${MAX_RETRY_ATTEMPTS} failed attempts`);
      // }

      // await currentSub.save();

      // Send email if not expired
      // if (currentSub.userId?.email && currentSub.status !== 'expired') {
      //   const nextRetryDelay = Math.min(
      //     Math.pow(2, currentSub.retryAttemptCount - 1) * RETRY_DELAY_MS,
      //     30 * 24 * 60 * 60 * 1000 // Max 30 days
      //   );
      //   const nextRetryDate = new Date(Date.now() + nextRetryDelay);
        
      //   await sendPaymentFailureEmail(
      //     currentSub.userId.email,
      //     currentSub.planId.name,
      //     currentSub.planId.price,
      //     currentSub.retryAttemptCount,
      //     MAX_RETRY_ATTEMPTS,
      //     nextRetryDate
      //   );
      // }

      // return res.status(402).json({
      //   success: false,
      //   message: 'Payment failed',
      //   status: currentSub.status,
      //   retryAttempts: currentSub.retryAttemptCount,
      //   maxRetryAttempts: MAX_RETRY_ATTEMPTS
      // });

    } catch (dbError) {
      console.error('Error updating subscription after failed payment:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error updating subscription after failed payment'
      });
    }
  }
};





const initiateMemorialPayment = async (req, res) => {
    const userId = req.user.userId;
    const { planId, memorialId, promoCode } = req.body;
    let successUrl;

    try {
        console.log(req.body, "req.bodyreq.body");
        
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(400).json({ message: "Invalid plan selected." });
        }

        // Verify memorial exists and is in draft status
        const memorial = await memorialModel.findOne({
            _id: memorialId,
            memorialPaymentStatus: 'active',
            createdBy: userId
        });
        
        if (memorial) {
          successUrl= `${process.env.FRONTEND_URL}/dashboard/subscription/update?memorialId=${memorialId}`
        }else{
          successUrl= `${process.env.FRONTEND_URL}/dashboard/subscription/success?memorialId=${memorialId}`
        }

        const accessToken = await getBogToken();
        const isTestMode = process.env.PAYMENT_TEST_MODE === 'true';
        
        // Calculate amount after applying promo code (if any)
        let amount = plan.price;
        let promoCodeDoc
        if (promoCode) {
            // Validate promo code and calculate discount
            const promoValidation = await validatePromoCode(promoCode, memorialId, planId);
            
            if (promoValidation.isValid) {
                switch (promoValidation.discountType) {
                    case "percentage":
                        amount = plan.price * (1 - promoValidation.discountValue / 100);
                        break;
                    case "fixed":
                        amount = Math.max(0, plan.price - promoValidation.discountValue);
                        break;
                    case "free":
                        amount = 0;
                        break;
                    default:
                        amount = plan.price;
                }

                 // Store promo code document for later use
    promoCodeDoc = promoValidation.promoCodeDoc;
            } else {
                return res.status(400).json({ message: promoValidation.message || "Invalid promo code" });
            }
        }
        
        // Use test amount if in test mode
        if (isTestMode) {
            amount = 0.01;
        }

        // Create order payload
        console.log("🚀 ~ initiateMemorialPayment ~ successUrl:", successUrl)
        const orderPayload = {
            callback_url: `${process.env.BACKEND_URL}/api/payments/callback`,
            external_order_id: memorialId, // Pass memorial ID to webhook
            purchase_units: {
                currency: "GEL",
                total_amount: amount,
                basket: [{
                    quantity: 1,
                    unit_price: amount,
                    product_id: process.env.BOG_PRODUCT_ID,
                    description: `Memorial Plan: ${plan.name}`
                }]
            },
            redirect_urls: {
                fail: `${process.env.FRONTEND_URL}/dashboard/subscription/failure`,
                 // Changed to success page instead of direct memorial creation
                success: successUrl
            }
        };

        // Create Bog order
        const orderResponse = await axios.post(
            'https://api.bog.ge/payments/v1/ecommerce/orders',
            orderPayload,
            {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${accessToken}`,  
                    'Accept-Language': 'en' 
                }
            }
        );

        const orderData = orderResponse.data;
        const bogOrderId = orderData.id;

        // Create purchase record
        await MemorialPurchase.create({
            userId,
            memorialId,
            planId,
            bogOrderId,
            amount: plan.price,
             finalPricePaid: amount,
             ...(promoCodeDoc && {
    appliedPromoCode: promoCodeDoc._id,
     isAdminDiscount: true,
    discountDetails: {
      type: promoCodeDoc.discountType,
      value: promoCodeDoc.discountValue
    }
  }),
            status: 'pending'
        });

        res.json({ 
            redirectUrl: orderData._links.redirect.href,
            memorialId
        });

    } catch (error) {
        console.error("Payment initiation failed:", error);
        res.status(500).json({ message: "Failed to initiate payment" });
    }
};

async function validatePromoCode(promoCode, memorialId, planId) {
    try {
        // Find the promo code in the database
        const promo = await PromoCodeSchema.findOne({ code: promoCode.toUpperCase() });
        
        if (!promo) {
            return { isValid: false, message: "Promo code not found" };
        }
        
        // Check if expired
        if (promo.expiryDate && new Date() > promo.expiryDate) {
            return { isValid: false, message: "Promo code has expired" };
        }
        
        // Check if usage limit exceeded
        if (promo.maxUsage && promo.usedCount >= promo.maxUsage) {
            return { isValid: false, message: "Promo code usage limit exceeded" };
        }
        
        // Check if the promo code applies to the specific plan
        if (promo.appliesToPlan && promo.appliesToPlan.toString() !== planId) {
            return { isValid: false, message: "This promo code is not valid for the selected plan" };
        }
        
        // Check if the memorial has already used this promo code
        const existingUsage = await MemorialPurchase.findOne({ memorialId, promoCode: promo.code });
        if (existingUsage) {
            return { isValid: false, message: "This memorial has already used this promo code" };
        }
        
        return {
            isValid: true,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            appliesToPlan: promo.appliesToPlan,
             promoCodeDoc: promo // Return the document
        };
    } catch (error) {
        console.error("Error validating promo code:", error);
        return { isValid: false, message: "Error validating promo code" };
    }
}
  module.exports = {reTrySubscriptionPayment,initiateMemorialPayment,initiatePayment,paymentCallbackWebhook,initiateOneTimePayment,getActiveSubscription,restartLifeTimeFreePlan}