const SubscriptionPlan = require('../models/subscriptionPlan.js');
const UserSubscription = require('../models/UserSubscription.js');

exports.assignFreePlan = async (userId) => {
  try {
    const freePlan = await SubscriptionPlan.findOne({ 
      price: 0, 
      billingPeriod: 'free' 
    });
    
    if (!freePlan) {
      throw new Error('Free plan not configured');
    }

    return await UserSubscription.create({
      userId,
      planId: freePlan._id,
      bogInitialOrderId: `free_${userId}_${Date.now()}`,
      status: 'active',
      startDate: new Date()
    });
  } catch (error) {
    throw error;
  }
};

exports.restartFreePlan = async (userId) => {
  try {
    // Find existing free subscription
    const freePlan = await SubscriptionPlan.findOne({ 
      price: 0, 
      billingPeriod: 'free' 
    });
    
    const existingFreeSub = await UserSubscription.findOne({
      userId,
      planId: freePlan._id
    });

    if (existingFreeSub) {
      // Reactivate existing free subscription
      return await UserSubscription.findByIdAndUpdate(
        existingFreeSub._id,
        { status: 'active', startDate: new Date() },
        { new: true }
      );
    }

    // Create new free subscription
    return await UserSubscription.create({
      userId,
      planId: freePlan._id,
      bogInitialOrderId: `free_restart_${userId}_${Date.now()}`,
      status: 'active',
      startDate: new Date()
    });
  } catch (error) {
    throw error;
  }
};

exports.cancelActiveFreePlan = async (userId) => {
  try {
    const freePlan = await SubscriptionPlan.findOne({ 
      price: 0, 
      billingPeriod: 'free' 
    });
    
    if (!freePlan) {
      throw new Error('Free plan not configured');
    }

    await UserSubscription.updateMany(
      {
        userId,
        planId: freePlan._id,
        status: 'active'
      },
      { 
        status: 'inactive',
        // endDate: new Date() 
      }
    );
  } catch (error) {
    throw error;
  }
};