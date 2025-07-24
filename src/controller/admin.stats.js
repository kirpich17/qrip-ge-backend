const userModel = require("../models/user.model");
const memorialModel = require("../models/memorial.model");

exports.adminStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // === USER STATS ===
    const totalUsers = await userModel.countDocuments();
    const usersLastMonth = await userModel.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const usersThisMonth = await userModel.countDocuments({
      createdAt: { $gte: startOfCurrentMonth },
    });
    const userGrowth =
      usersLastMonth === 0
        ? usersThisMonth > 0
          ? 100
          : 0
        : ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100;

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
    const memorialGrowth =
      activeMemorialsLastMonth === 0
        ? activeMemorialsThisMonth > 0
          ? 100
          : 0
        : ((activeMemorialsThisMonth - activeMemorialsLastMonth) /
            activeMemorialsLastMonth) *
          100;

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
    });
  } catch (error) {
    console.error("Error in adminStats API:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
