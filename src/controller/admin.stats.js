const userModel = require("../models/user.model");
const memorialModel = require("../models/memorial.model");
const UserSubscription = require("../models/UserSubscription");
const MemorialPurchase = require("../models/MemorialPurchase");
const QRStickerOrder = require("../models/QRStickerOrder");

exports.adminStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // === USER STATS ===
    const totalUsers = await userModel.countDocuments({ userType: "user" });
    const usersLastMonth = await userModel.countDocuments({
      userType: "user",
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const usersThisMonth = await userModel.countDocuments({
      userType: "user",
      createdAt: { $gte: startOfCurrentMonth },
    });
    let userGrowth = 0;
    if (usersLastMonth === 0) {
      userGrowth = usersThisMonth > 0 ? 100 : 0;
    } else {
      userGrowth = ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100;
      // Cap the percentage at reasonable limits
      if (userGrowth > 1000) {
        userGrowth = 1000;
      }
    }

    // === ACTIVE MEMORIAL STATS ===
    const totalActiveMemorials = await memorialModel.countDocuments({
      status: "active",
    });
    const activeMemorialsLastMonth = await memorialModel.countDocuments({
      status: "active",
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const activeMemorialsThisMonth = await memorialModel.countDocuments({
      status: "active",
      createdAt: { $gte: startOfCurrentMonth },
    });
    let memorialGrowth = 0;
    if (activeMemorialsLastMonth === 0) {
      memorialGrowth = activeMemorialsThisMonth > 0 ? 100 : 0;
    } else {
      memorialGrowth = ((activeMemorialsThisMonth - activeMemorialsLastMonth) / activeMemorialsLastMonth) * 100;
      // Cap the percentage at reasonable limits
      if (memorialGrowth > 1000) {
        memorialGrowth = 1000;
      }
    }

    // === REVENUE STATS ===
    // Calculate subscription revenue strictly from verified payments (payment date only)
    const subscriptionRevenueThisMonth = await UserSubscription.aggregate([
      {
        $match: {
          status: 'active',
          lastPaymentDate: { $gte: startOfCurrentMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$durationPrice' }
        }
      }
    ]);

    const subscriptionRevenueLastMonth = await UserSubscription.aggregate([
      {
        $match: {
          status: 'active',
          lastPaymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$durationPrice' }
        }
      }
    ]);

    // Calculate memorial purchase revenue (based on payment date)
    const memorialRevenueThisMonth = await MemorialPurchase.aggregate([
      {
        $match: {
          status: 'completed',
          $or: [
            { paymentDate: { $gte: startOfCurrentMonth } },
            { createdAt: { $gte: startOfCurrentMonth } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalPricePaid' }
        }
      }
    ]);

    const memorialRevenueLastMonth = await MemorialPurchase.aggregate([
      {
        $match: {
          status: 'completed',
          $or: [
            { paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
            { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalPricePaid' }
        }
      }
    ]);

    // Calculate QR sticker order revenue (based on payment date)
    const stickerRevenueThisMonth = await QRStickerOrder.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          $or: [
            { updatedAt: { $gte: startOfCurrentMonth } },
            { createdAt: { $gte: startOfCurrentMonth } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const stickerRevenueLastMonth = await QRStickerOrder.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          $or: [
            { updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
            { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Calculate total revenue
    const totalRevenueThisMonth = 
      (subscriptionRevenueThisMonth[0]?.totalRevenue || 0) +
      (memorialRevenueThisMonth[0]?.totalRevenue || 0) +
      (stickerRevenueThisMonth[0]?.totalRevenue || 0);

    const totalRevenueLastMonth = 
      (subscriptionRevenueLastMonth[0]?.totalRevenue || 0) +
      (memorialRevenueLastMonth[0]?.totalRevenue || 0) +
      (stickerRevenueLastMonth[0]?.totalRevenue || 0);

    // Calculate revenue growth with better handling of edge cases
    let revenueGrowth = 0;
    if (totalRevenueLastMonth === 0) {
      revenueGrowth = totalRevenueThisMonth > 0 ? 100 : 0;
    } else {
      revenueGrowth = ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100;
      // Cap the percentage at reasonable limits to avoid extreme values
      if (revenueGrowth > 1000) {
        revenueGrowth = 1000; // Cap at 1000% for display purposes
      }
    }

    // Debug logging
    console.log('Revenue Debug:', {
      totalRevenueThisMonth,
      totalRevenueLastMonth,
      revenueGrowth,
      subscriptionThisMonth: subscriptionRevenueThisMonth[0]?.totalRevenue || 0,
      memorialThisMonth: memorialRevenueThisMonth[0]?.totalRevenue || 0,
      stickerThisMonth: stickerRevenueThisMonth[0]?.totalRevenue || 0
    });

    // === RESPONSE ===
    res.json({
      users: {
        total: totalUsers,
        percentageChange: userGrowth.toFixed(2),
        message:
          userGrowth >= 0
            ? `📈 +${userGrowth.toFixed(2)}% from last month`
            : `📉 ${userGrowth.toFixed(2)}% from last month`,
      },
      activeMemorials: {
        total: totalActiveMemorials,
        percentageChange: memorialGrowth.toFixed(2),
        message:
          memorialGrowth >= 0
            ? `📈 +${memorialGrowth.toFixed(2)}% from last month`
            : `📉 ${memorialGrowth.toFixed(2)}% from last month`,
      },
      revenue: {
        total: totalRevenueThisMonth,
        percentageChange: revenueGrowth.toFixed(2),
        message:
          revenueGrowth >= 0
            ? `📈 +${revenueGrowth.toFixed(2)}% from last month`
            : `📉 ${revenueGrowth.toFixed(2)}% from last month`,
      },
    });
  } catch (error) {
    console.error("Error in adminStats API:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
