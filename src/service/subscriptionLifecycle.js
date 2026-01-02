const cron = require('node-cron');
const mongoose = require('mongoose');
const Memorial = require('../models/memorial.model');

const durationMap = {
  '1_month': { unit: 'days', value: 30 },
  '3_months': { unit: 'days', value: 90 },
  '6_months': { unit: 'days', value: 180 },
  '1_year': { unit: 'days', value: 365 },
  '2_years': { unit: 'days', value: 730 },
  life_time: { unit: 'infinite' },
};

const manageMemorialExpiry = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    const memorials = await Memorial.find({
      status: 'active',
      purchase: { $exists: true, $ne: null },
    })
      .populate('purchase')
      .session(session);

    for (const memorial of memorials) {
      const purchase = memorial.purchase;

      if (!purchase || !purchase.paymentDate) continue;
      if (purchase.status !== 'active') continue;

      if (memorial.isAdminDiscounted && memorial.adminDiscountType === 'free') {
        continue;
      }

      const durationConfig = durationMap[purchase.duration];
      if (!durationConfig || durationConfig.unit === 'infinite') continue;

      const expiryDate = new Date(purchase.paymentDate);
      expiryDate.setDate(expiryDate.getDate() + durationConfig.value);

      if (now >= expiryDate) {
        memorial.status = 'expired';
        memorial.memorialPaymentStatus = 'draft';
        await memorial.save({ session });
      }
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const findExpiringMemorials = async (daysAhead = 7) => {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const memorials = await Memorial.find({
    status: 'active',
    purchase: { $ne: null },
  }).populate('purchase');

  return memorials
    .map((memorial) => {
      const purchase = memorial.purchase;
      if (!purchase || purchase.status !== 'active') return null;

      const config = durationMap[purchase.duration];
      if (!config || config.unit === 'infinite') return null;

      const expiryDate = new Date(purchase.paymentDate);
      expiryDate.setDate(expiryDate.getDate() + config.value);

      if (expiryDate >= now && expiryDate <= future) {
        return {
          memorial,
          expiryDate,
          daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
        };
      }

      return null;
    })
    .filter(Boolean);
};

const triggerMemorialExpiryCheck = async () => {
  await manageMemorialExpiry();
};

cron.schedule('*/10 * * * * *', manageMemorialExpiry, {
  timezone: 'Asia/Tbilisi',
  name: 'memorial-expiry-check',
});

module.exports = {
  manageMemorialExpiry,
  findExpiringMemorials,
  triggerMemorialExpiryCheck,
  durationMap,
};
