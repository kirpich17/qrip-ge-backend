 const User = require('../models/user.model');


exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    res.json({ status: true, message: 'User fetched successfully', user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
