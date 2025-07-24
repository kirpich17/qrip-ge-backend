const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

// Logs in ANY valid user (admin or regular).
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
