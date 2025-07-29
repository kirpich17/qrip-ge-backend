const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Memorial = require("../models/memorial.model");
const SubscriptionPlan = require("../models/SubscriptionPlan");

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
    // Get user details from the request body
    const { email, password, firstname, lastname } = req.body;

    // --- Validation ---
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
    const usersData = await User.find(searchFilter).skip(skip).limit(limit);

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

    // Add memorial count to each user
    const usersWithMemorialCount = users.map((user) => ({
      ...user,
      memorialCount: memorialMap[user._id.toString()] || 0,
    }));

    res.json({
      status: true,
      message: "Users fetched successfully",
      users: usersWithMemorialCount,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        usersPerPage: limit,
      },
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
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search functionality
    const searchQuery = req.query.search || "";
    const searchFilter = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { lifeStory: { $regex: searchQuery, $options: "i" } },
        { location: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // Fetch memorials with pagination and search
    const memorials = await Memorial.find(searchFilter)
      .populate("createdBy")
      .skip(skip)
      .limit(limit);

    const totalMemorials = await Memorial.countDocuments(searchFilter);

    if (!memorials || memorials.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "No memorials found" });
    }

    res.json({
      status: true,
      message: "Memorials fetched successfully",
      memorials,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMemorials / limit),
        totalMemorials,
        memorialsPerPage: limit,
      },
    });
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
    const plan = await SubscriptionPlan.create(req.body);
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
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.status(200).json(plan);
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
