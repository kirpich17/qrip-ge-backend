const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Memorial = require("../models/memorial.model");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const PromoCodeSchema = require("../models/PromoCodeSchema");
const memorialModel = require("../models/memorial.model");
const UserSubscription = require("../models/UserSubscription");
const MemorialPurchase = require("../models/MemorialPurchase");
const { sendPasswordResetEmail } = require("../service/unifiedEmailService");

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    res.json({ status: true, message: "User fetched successfully", user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
exports.createAdminUser = async (req, res) => {
  try {
    const { email, password, firstname, lastname } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, message: "Email and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: false,
        message: "An account with this email already exists.",
      });
    }
    // --- End Validation ---

    // Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user with the 'admin' role
    const newAdmin = await User.create({
      email,
      password: hashedPassword,
      firstname: firstname, // Optional: provide a default
      lastname: lastname, // Optional: provide a default
      userType: "admin", // Explicitly set the role to 'admin'
    });

    
    // Remove the password from the response object for security
    newAdmin.password = undefined;

    res.status(201).json({
      status: true,
      message: "New admin user created successfully.",
      user: newAdmin,
    });
  } catch (err) {
    
    res
      .status(500)
      .json({ status: false, message: "Server error: " + err.message });
  }
};
exports.adminSignin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user by email
    const user = await User.findOne({ email }).select("+password");

    // 2. If no user or password doesn't match, send a generic error
    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials or access denied",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials or access denied",
      });
    }

    // 3. !! CRITICAL !!: Check if the user is an admin
    if (user.userType !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have administrator privileges.",
      });
    }
    

    // 4. If all checks pass, create a token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType }, // Payload
      process.env.JWT_SECRET, // Secret
      { expiresIn: "7d" } // Expiration
    );

    // 5. Send the successful response
    // Do not send the hashed password in the response
    user.password = undefined;

    res.json({
      status: true,
      message: "Admin signin successful",
      token,
      user: {
        id: user._id,
        firstname: user.firstname, // You might not have this for an admin, adjust as needed
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: false, message: "Server error: " + err.message });
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search functionality
    const searchQuery = req.query.search || "";
    const searchFilter = {
      userType: "user",
      $or: [
        { firstName: { $regex: searchQuery, $options: "i" } },
        { lastName: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // Fetch users with pagination and search
    const usersData = await User.find(searchFilter)
    // .skip(skip).limit(limit);

    const totalUsers = await User.countDocuments(searchFilter);
    const users = JSON.parse(JSON.stringify(usersData));

    // Get memorial counts for all users
    const memorialCounts = await Memorial.aggregate([
      {
        $group: {
          _id: "$createdBy",
          count: { $sum: 1 },
        },
      },
    ]);

    // Create a map for quick lookup
    const memorialMap = {};
    memorialCounts.forEach((item) => {
      memorialMap[item._id.toString()] = item.count;
    });

    // Get memorial subscriptions through MemorialPurchase
    const memorialSubscriptions = await MemorialPurchase.aggregate([
      {
        $lookup: {
          from: 'memorials',
          localField: 'memorialId',
          foreignField: '_id',
          as: 'memorialData'
        }
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'planId',
          foreignField: '_id',
          as: 'planData'
        }
      },
      {
        $lookup: {
          from: 'usersubscriptions',
          localField: 'memorialId',
          foreignField: 'userId',
          as: 'subscriptionData'
        }
      },
      {
        $match: {
          status: { $in: ['completed', 'paid'] },
          'memorialData.status': 'active'
        }
      },
      {
        $project: {
          userId: 1,
          memorialId: 1,
          planId: 1,
          duration: 1,
          durationPrice: 1,
          finalPricePaid: 1,
          status: 1,
          memorialData: { $arrayElemAt: ['$memorialData', 0] },
          planData: { $arrayElemAt: ['$planData', 0] },
          subscriptionData: { $arrayElemAt: ['$subscriptionData', 0] }
        }
      }
    ]);

    // Create a map for memorial subscriptions
    const memorialSubscriptionMap = {};
    memorialSubscriptions.forEach((purchase) => {
      const userId = purchase.userId.toString();
      if (!memorialSubscriptionMap[userId]) {
        memorialSubscriptionMap[userId] = [];
      }
      
      // Get the most recent active subscription for this memorial
      const activeSubscription = purchase.subscriptionData;
      const subscriptionStatus = activeSubscription?.status || 'inactive';
      
      memorialSubscriptionMap[userId].push({
        memorialId: purchase.memorialId,
        memorialName: `${purchase.memorialData?.firstName || 'Unknown'} ${purchase.memorialData?.lastName || ''}`,
        planName: purchase.planData?.name || 'Unknown',
        duration: purchase.duration || '1_month',
        durationPrice: purchase.durationPrice || 0,
        finalPricePaid: purchase.finalPricePaid || 0,
        subscriptionStatus: subscriptionStatus,
        purchaseStatus: purchase.status,
        planType: purchase.planData?.planType || 'minimal'
      });
    });

    // Add memorial count and subscriptions to each user
    const usersWithMemorialCount = users.map((user) => ({
      ...user,
      memorialCount: memorialMap[user._id.toString()] || 0,
      memorialSubscriptions: memorialSubscriptionMap[user._id.toString()] || [],
    }));

    res.json({
      status: true,
      message: "Users fetched successfully",
      users: usersWithMemorialCount,
      // pagination: {
      //   currentPage: page,
      //   totalPages: Math.ceil(totalUsers / limit),
      //   totalUsers,
      //   usersPerPage: limit,
      // },
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Server error: " + err.message,
    });
  }
};



exports.getAllMemorials = async (req, res) => {
  try {
    // Check for the pagination flag
    const isPagination = req.query.isPagination === 'true' || false;
    const isPublic = req.query.isPublic === 'true';

    // --- Search functionality (no changes here) ---
    const searchQuery = req.query.search || "";
    let searchFilter = {
      memorialPaymentStatus: { $ne: 'draft' }
    };

    if (isPublic) {
      searchFilter.isPublic = true;
    }
    if (searchQuery) {
      const searchRegex = searchQuery.trim();
      searchFilter = {
        ...searchFilter,
        $or: [
          { firstName: { $regex: searchRegex, $options: "i" } },
          { lastName: { $regex: searchRegex, $options: "i" } },
          { lifeStory: { $regex: searchRegex, $options: "i" } },
          { location: { $regex: searchRegex, $options: "i" } },
        ],
      };
    }
    // --- End of search logic ---

    // --- Sorting logic ---
    const sortBy = req.query.sortBy || 'recent'; // Default to 'recent' if not provided
    let sortOptions = {};

    if (sortBy === 'a-z') {
      // Sort alphabetically by firstName, then by lastName as a fallback
      sortOptions = { firstName: 1, lastName: 1 };
    } else {
      // Default to 'recent'
      sortOptions = { createdAt: -1 }; // Sort by creation date in descending order
    }
    // --- End of sorting logic ---

    // Start building the query
    let query = Memorial.find(searchFilter)
      .populate("createdBy")
      .populate({
        path: "purchase",
        populate: {
          path: "planId",
          model: "SubscriptionPlan"
        }
      })
      .sort(sortOptions); // Apply the sorting to the query

    let paginationData = null;

    // --- Conditionally apply pagination ---
    if (isPagination) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      query = query.skip(skip).limit(limit);

      const totalMemorials = await Memorial.countDocuments(searchFilter);

      paginationData = {
        currentPage: page,
        totalPages: Math.ceil(totalMemorials / limit),
        totalMemorials,
        memorialsPerPage: limit,
      };
    }
    // --- End of pagination logic ---

    // Execute the final query
    const memorials = await query;

    if (!memorials || memorials.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "No memorials found" });
    }

    // --- Conditionally build the final response object ---
    const response = {
      status: true,
      message: "Memorials fetched successfully",
      memorials,
    };

    if (isPagination) {
      response.pagination = paginationData;
    }

    res.json(response);

  } catch (err) {
    res
      .status(500)
      .json({ status: false, message: "Server error: " + err.message });
  }
};


exports.toggleAccountStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Toggle logic
    user.accountStatus =
      user.accountStatus === "active" ? "suspended" : "active";
    await user.save();

    res.status(200).json({
      status: true,
      message: `Account status updated to ${user.accountStatus}`,
      data: { accountStatus: user.accountStatus },
    });
  } catch (error) {
    console.error("Error toggling account status:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};
exports.adminDeleteMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id);
    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }
    await memorial.deleteOne();
    res.json({ status: true, message: "Memorial deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};
exports.adminDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }
    await user.deleteOne();
    res.json({ status: true, message: "User deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};
exports.toggleMemorialStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const memorial = await Memorial.findById(id);

    if (!memorial) {
      return res.status(404).json({ message: "Memorial not found" });
    }

    if (memorial.status === "expired") {
      return res
        .status(400)
        .json({ message: "Cannot toggle status of an expired memorial" });
    }

    // Toggle between active and inactive
    memorial.status = memorial.status === "active" ? "inactive" : "active";
    await memorial.save();

    return res.status(200).json({
      message: `Memorial status updated to ${memorial.status}`,
      status: memorial.status,
    });
  } catch (error) {
    console.error("Error toggling memorial status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Create a new plan
exports.adminCreatePlan = async (req, res) => {
  try {
    const { 
      maxPhotos = 0,
      allowSlideshow = false,
      allowVideos = false,
      maxVideoDuration = 0,
      ...otherFields
    } = req.body;
    
    const plan = await SubscriptionPlan.create({
      maxPhotos,
      allowSlideshow,
      allowVideos,
      maxVideoDuration,
      ...otherFields
    });
    
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all plans
exports.adminGetAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single plan by ID
exports.adminGetPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a plan
exports.adminUpdatePlan = async (req, res) => {
  try {
    const { 
      maxPhotos,
      allowSlideshow,
      allowVideos,
      maxVideoDuration,
      ...otherFields
    } = req.body;
    
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      {
        maxPhotos,
        allowSlideshow,
        allowVideos,
        maxVideoDuration,
        ...otherFields
      },
      { new: true }
    );
    
    res.json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a plan
exports.adminDeletePlan = async (req, res) => {
  try {
    const deleted = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Plan not found" });
    res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.togglePlanStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ error: "Subscription plan not found" });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.status(200).json({
      message: "Subscription plan 'isActive' status toggled successfully",
      updatedPlan: plan,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
};


exports.AddPromoCode = async (req, res) => {
 try {
    const { code, discountType, discountValue, expiryDate, maxUsage, isActive, appliesToPlan, appliesToUser } = req.body;

    // Basic validation
    if (!code || !discountType || !expiryDate) {
      return res.status(400).json({ message: "Please provide code, discount type, and expiry date." });
    }

       if (!appliesToPlan) {
      return res.status(400).json({ message: "Please select plan first." });
    }
    if (discountType !== 'free' && (discountValue === undefined || discountValue === null)) {
      return res.status(400).json({ message: "Discount value is required for 'percentage' or 'fixed' discount types." });
    }
    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({ message: "Percentage discount value must be between 0 and 100." });
    }
    if (discountType === 'fixed' && discountValue < 0) {
      return res.status(400).json({ message: "Fixed discount value cannot be negative." });
    }
    if (maxUsage !== undefined && maxUsage !== null && maxUsage < 1) {
        return res.status(400).json({ message: "Max usage must be at least 1 or left empty for unlimited." });
    }

    const newPromoCode = new PromoCodeSchema({
      code: code.toUpperCase(), // Ensure code is uppercase
      discountType,
      discountValue: discountType === 'free' ? 0 : discountValue, // Set value to 0 for free type
      expiryDate,
      maxUsage: maxUsage === "" ? null : maxUsage, // Handle empty string for maxUsage as null
      isActive,
      appliesToPlan: appliesToPlan || null,
      appliesToUser: appliesToUser || null,
    });

    const savedPromoCode = await newPromoCode.save();
    res.status(201).json(savedPromoCode);
  } catch (error) {
    console.error("Error creating promo code:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Promo code already exists.", error: error.message });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




exports.GetAllPromoCodes = async (req, res) => {
  try {
    let { page = 1, limit = 5, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? { code: { $regex: search, $options: "i" } }
      : {};

    const total = await PromoCodeSchema.countDocuments(query);
    const promoCodes = await PromoCodeSchema.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: promoCodes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.GetPromoCodeById = async (req, res) => {
  try {
    const promoCode = await PromoCodeSchema.findById(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ message: "Promo code not found" });
    }
    res.status(200).json(promoCode);
  } catch (error) {
    console.error("Error fetching promo code:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.DeletePromoCode = async (req, res) => {
  try {
    const deletedPromo = await PromoCodeSchema.findByIdAndDelete(req.params.id);
    if (!deletedPromo) {
      return res.status(404).json({ message: "Promo code not found" });
    }
    res.status(200).json({ message: "Promo code deleted successfully" });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.UpdatePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discountType,
      discountValue,
      expiryDate,
      maxUsage,
      isActive,
      appliesToPlan,
      appliesToUser,
    } = req.body;

    // Basic validation
    if (discountType && !["percentage", "fixed", "free"].includes(discountType)) {
      return res.status(400).json({ message: "Invalid discount type." });
    }
    if (discountType === "percentage" && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({ message: "Percentage discount value must be between 0 and 100." });
    }
    if (discountType === "fixed" && discountValue < 0) {
      return res.status(400).json({ message: "Fixed discount value cannot be negative." });
    }
    if (maxUsage !== undefined && maxUsage !== null && maxUsage < 1) {
      return res.status(400).json({ message: "Max usage must be at least 1 or left empty for unlimited." });
    }

    // Prepare update object
    const updateData = {};
    if (code) updateData.code = code.toUpperCase();
    if (discountType) updateData.discountType = discountType;
    if (discountType === "free") {
      updateData.discountValue = 0;
    } else if (discountValue !== undefined) {
      updateData.discountValue = discountValue;
    }
    if (expiryDate) updateData.expiryDate = expiryDate;
    if (maxUsage === "") {
      updateData.maxUsage = null;
    } else if (maxUsage !== undefined) {
      updateData.maxUsage = maxUsage;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (appliesToPlan !== undefined) updateData.appliesToPlan = appliesToPlan;
    if (appliesToUser !== undefined) updateData.appliesToUser = appliesToUser;

    const updatedPromoCode = await PromoCodeSchema.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPromoCode) {
      return res.status(404).json({ message: "Promo code not found." });
    }

    res.status(200).json(updatedPromoCode);
  } catch (error) {
    console.error("Error updating promo code:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Promo code already exists.", error: error.message });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Updated validation function that accepts planId
exports.ValidatePromoCode = async (req, res) => {
  try {
    console.log("🚀 ~ req:", req)
    const { promoCode, memorialId, planId } = req.body;

    if (!promoCode || !memorialId || !planId) {
      return res.status(400).json({ 
        isValid: false, 
        message: "Promo code, memorial ID, and plan ID are required" 
      });
    }

    // Find the promo code
    const promo = await PromoCodeSchema.findOne({ 
      code: promoCode.toUpperCase(), 
      isActive: true 
    });

    if (!promo) {
      return res.status(404).json({ 
        isValid: false, 
        message: "Promo code not found" 
      });
    }

    // Check if expired
    if (new Date() > promo.expiryDate) {
      return res.status(400).json({ 
        isValid: false, 
        message: "Promo code has expired" 
      });
    }

    // Check usage limits
    if (promo.maxUsage !== null && promo.currentUsage >= promo.maxUsage) {
      return res.status(400).json({ 
        isValid: false, 
        message: "Promo code has reached its usage limit" 
      });
    }

    // Check if applies to specific user
 

    // Check if applies to specific plan
    if (promo.appliesToPlan && promo.appliesToPlan.toString() !== planId) {
      return res.status(400).json({ 
        isValid: false, 
        message: "This promo code is not valid for the selected plan" 
      });
    }

    // Get memorial to check if it already has a discount
    const memorial = await memorialModel.findById(memorialId);
    if (memorial && memorial.isAdminDiscounted) {
      return res.status(400).json({ 
        isValid: false, 
        message: "Cannot apply promo code to an already discounted memorial" 
      });
    }

    // If all checks pass, return success with discount details
    return res.status(200).json({
      isValid: true,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      appliesToPlan: promo.appliesToPlan,
      code: promo.code,
      message: "Promo code applied successfully"
    });

  } catch (error) {
    console.error("Error validating promo code:", error);
    res.status(500).json({ 
      isValid: false, 
      message: "Server error validating promo code" 
    });
  }
};

// Admin forgot password functionality
exports.adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if email is provided
    if (!email) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }

    // Check if email credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ 
        status: false, 
        message: "Email service not configured. Please contact administrator." 
      });
    }

    // Find admin user by email
    const user = await User.findOne({ email, userType: "admin" });
    if (!user) {
      return res.status(404).json({ 
        status: false, 
        message: "Admin user not found with this email" 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Create reset link for admin (using same page as regular users)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    // Send password reset email using unified email service
    const emailSent = await sendPasswordResetEmail(email, resetLink, user.firstname || "Admin");
    
    if (emailSent) {
      res.json({ 
        status: true, 
        message: "Password reset link sent to your email" 
      });
    } else {
      res.status(500).json({ 
        status: false, 
        message: "Failed to send reset email" 
      });
    }
  } catch (err) {
    console.error("Admin forgot password error:", err);
    
    // Handle specific nodemailer errors
    if (err.code === 'EAUTH' || err.message.includes('Missing credentials')) {
      return res.status(500).json({ 
        status: false, 
        message: "Email service authentication failed. Please contact administrator." 
      });
    }
    res.status(500).json({ 
      status: false, 
      message: "Server error: " + err.message 
    });
  }
};

exports.updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        status: false, 
        message: "Current password and new password are required" 
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        status: false, 
        message: "New password must be at least 8 characters long" 
      });
    }
    
    // Find the admin user with password field
    const user = await User.findById(req.user.userId).select("+password");
    
    if (!user) {
      return res.status(404).json({ 
        status: false, 
        message: "Admin user not found" 
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        status: false, 
        message: "Current password is incorrect" 
      });
    }
    
    // Hash the new password
    const hash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.userId, { password: hash });
    
    res.json({ 
      status: true,
      message: "Password updated successfully" 
    });
  } catch (err) {
    console.error("Admin password update error:", err);
    res.status(500).json({ 
      status: false, 
      message: "Server error: " + err.message 
    });
  }
};
