const User = require('../models/user.model');

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    res.status(200).json({ status: true, message: 'User details fetched successfully', user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
