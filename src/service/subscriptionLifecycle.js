

// const cron =require('node-cron');
const mongoose =require('mongoose');
const UserModal =require('../../src/models/user.model.js');
const UserSubscription =require('../../src/models/UserSubscription.js');
const {CronJob } =require('cron');


const manageSubscriptionLifecycle = async () => {
  try {
    // 1. Create consistent evaluation point
    const evaluationTime = new Date();
    const startOfToday = new Date(evaluationTime);
    startOfToday.setHours(0, 0, 0, 0);

    console.log(`[${evaluationTime.toISOString()}] Running subscription job`);

 

    // 3. Handle canceled subscriptions (WITH USER STATE UPDATE)
    const endedSubscriptions = await UserSubscription.find({
      status: 'canceled',
      endDate: { $lt: startOfToday } 
    }).populate('userId', 'email subscriptionPlan');

    console.log(`Found ${endedSubscriptions.length} ended subscriptions`);

    for (const sub of endedSubscriptions) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Update subscription
        await UserSubscription.findByIdAndUpdate(
          sub._id,
          { status: 'expired' }, // Matches model enum
          { session }
        );

        // Update user if this was their active plan
        if (sub.userId.subscriptionPlan?.equals(sub.planId)) {
          await UserModal.findByIdAndUpdate(
            sub.userId._id,
            {
              accountStatus: 'active', // Or whatever status makes sense
           subscriptionExpiresAt: null //When a subscription expires, setting it to null indicates: No active subscription end date
            },
            { session }
          );
        }

        await session.commitTransaction();
        console.log(`Expired canceled sub ${sub._id} for ${sub.userId.email}`);
      } catch (error) {
        await session.abortTransaction();
        console.error(`Failed sub expiration ${sub._id}:`, error);
      } finally {
        session.endSession();
      }
    }

  } catch (error) {
    console.error('Critical job error:', error);
    // ADD REAL ALERTING HERE (Sentry, PagerDuty, etc)
  }
};

// Production schedule: Daily at 3 AM Tbilisi time
// cron.schedule('0 3 * * *', manageSubscriptionLifecycle, {
//   timezone: "Asia/Tbilisi"
// });



// new CronJob('*/1 * * * * *', manageSubscriptionLifecycle, null, true, 'Asia/Tbilisi');
