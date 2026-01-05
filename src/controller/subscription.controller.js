const subscriptionPlan = require('../models/SubscriptionPlan.js');
const UserSubscription = require('../models/UserSubscription.js');

const calculateEndDate = (startDate, billingPeriod) => {
  const endDate = new Date(startDate);
  if (billingPeriod === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { userSubscriptionId } = req.body;
    const subscription = await UserSubscription.findById(userSubscriptionId)
      .populate('planId')
      .populate('userId');

    if (!subscription || subscription.status !== 'active') {
      return res
        .status(400)
        .json({ message: 'Only active subscriptions can be canceled.' });
    }

    subscription.status = 'canceled';
    subscription.endDate =
      subscription.nextBillingDate ||
      calculateEndDate(
        subscription.lastPaymentDate,
        subscription.planId.billingPeriod
      );
    subscription.nextBillingDate = null;
    await subscription.save();

    const freePlan = await subscriptionPlan.findOne({
      price: 0,
      billingPeriod: 'free',
    });

    if (!freePlan) {
      return res
        .status(400)
        .json({ message: 'Free plan not found in system.' });
    }

    const existingFreeSubscription = await UserSubscription.findOne({
      userId: subscription.userId._id,
      planId: freePlan._id,
      status: 'inactive',
    });

    if (existingFreeSubscription) {
      existingFreeSubscription.status = 'active';
      existingFreeSubscription.startDate = new Date();
      await existingFreeSubscription.save();
    }

    res.json({
      message: `Subscription canceled. Free plan has been automatically reactivated.`,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
};

exports.resumeSubscription = async (req, res) => {
  try {
    const { userSubscriptionId } = req.body;
    const subscription = await UserSubscription.findById(userSubscriptionId);

    if (!subscription || subscription.status !== 'canceled') {
      return res
        .status(400)
        .json({ message: 'Only canceled subscriptions can be resumed.' });
    }

    subscription.status = 'active';
    subscription.nextBillingDate = subscription.endDate;
    subscription.endDate = null;

    await subscription.save();

    res.json({ message: 'Subscription has been resumed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resume subscription' });
  }
};
