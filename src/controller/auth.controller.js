const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const memorialModel = require("../models/memorial.model");
const { default: mongoose } = require("mongoose");

exports.signup = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      password,
      userType = "user",
    } = req.body;
    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(400)
        .json({ status: false, message: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstname,
      lastname,
      email,
      password: hash,
      userType,
    });
    res.status(201).json({ status: true, message: "Signup successful", user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ status: false, message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(400)
        .json({ status: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ status: true, message: "Signin successful", token, user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ status: false, message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: email,
      subject: "Password Reset",
      text: `Reset your password using this token: ${resetToken}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ status: true, message: "Reset token sent to email" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ status: false, message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ status: true, message: "Password has been reset successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.user.userId, { password: hash });
    res.json({ status: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    res.status(200).json({
      status: true,
      message: "User details fetched successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL (e.g., /users/:userId)
    const updates = req.body;

    // Update the user and return the new version
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true, upsert: true }
    ).select("-password"); // Don't return password

    if (!updatedUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.allStatsforUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await memorialModel.aggregate([
      {
        $match: { createdBy: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: null,
          totalMemorials: { $sum: 1 },
          totalViews: { $sum: "$viewsCount" },
          totalScans: { $sum: "$scanCount" },
          totalFamilyTreeCount: { $sum: { $size: "$familyTree" } },
        },
      },
    ]);

    const result = stats[0] || {
      totalMemorials: 0,
      totalViews: 0,
      totalScans: 0,
      totalFamilyTreeCount: 0,
    };

    res.status(200).json({
      status: true,
      message: "Stats fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching memorial stats:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
