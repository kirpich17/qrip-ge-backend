const Testimonial = require('../models/Testimonial.model');
const SiteSettings = require('../models/SiteSettings.model');

/**
 * Submit a new testimonial
 */
exports.submitTestimonial = async (req, res) => {
  try {
    const { name, email, location, text, rating } = req.body;

    // Validate required fields
    if (!name || !email || !location || !text) {
      return res.status(400).json({
        status: false,
        message: "All fields are required"
      });
    }

    // Check if testimonials are enabled
    const settings = await SiteSettings.findOne();
    if (!settings?.testimonialsEnabled) {
      return res.status(403).json({
        status: false,
        message: "Testimonials are currently disabled"
      });
    }

    // Create testimonial
    const testimonial = await Testimonial.create({
      name,
      email,
      location,
      text,
      rating: rating || 5,
      status: settings.testimonialsAutoApprove ? 'approved' : 'pending'
    });

    res.status(201).json({
      status: true,
      message: settings.testimonialsAutoApprove 
        ? "Thank you for your testimonial!" 
        : "Thank you for your testimonial! It will be reviewed before being published.",
      data: testimonial
    });
  } catch (error) {
    console.error("Error submitting testimonial:", error);
    res.status(500).json({
      status: false,
      message: "Failed to submit testimonial"
    });
  }
};

/**
 * Get approved testimonials for public display
 */
exports.getPublicTestimonials = async (req, res) => {
  try {
    const { limit } = req.query;

    // Check if testimonials are enabled
    const settings = await SiteSettings.findOne();
    if (!settings?.testimonialsEnabled) {
      return res.json({
        status: true,
        data: [],
        message: "Testimonials are disabled"
      });
    }

    // Use the limit from query or fall back to settings max display
    const displayLimit = limit ? parseInt(limit) : settings.testimonialsMaxDisplay;

    const testimonials = await Testimonial.find({
      status: 'approved',
      isActive: true
    })
    .sort({ approvedAt: -1, submittedAt: -1 })
    .limit(displayLimit)
    .select('-email -__v');

    res.json({
      status: true,
      data: testimonials
    });
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch testimonials"
    });
  }
};

/**
 * Get all testimonials for admin (with pagination)
 */
exports.getAdminTestimonials = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { text: { $regex: search, $options: 'i' } }
      ];
    }

    const [testimonials, total] = await Promise.all([
      Testimonial.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('approvedBy', 'firstname lastname'),
      Testimonial.countDocuments(query)
    ]);

    res.json({
      status: true,
      data: testimonials,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching admin testimonials:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch testimonials"
    });
  }
};

/**
 * Update testimonial status (approve/reject)
 */
exports.updateTestimonialStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.userId;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status"
      });
    }

    const updateData = { status };
    if (status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = adminId;
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('approvedBy', 'firstname lastname');

    if (!testimonial) {
      return res.status(404).json({
        status: false,
        message: "Testimonial not found"
      });
    }

    res.json({
      status: true,
      message: `Testimonial ${status} successfully`,
      data: testimonial
    });
  } catch (error) {
    console.error("Error updating testimonial status:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update testimonial"
    });
  }
};

/**
 * Delete testimonial
 */
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findByIdAndDelete(id);
    if (!testimonial) {
      return res.status(404).json({
        status: false,
        message: "Testimonial not found"
      });
    }

    res.json({
      status: true,
      message: "Testimonial deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({
      status: false,
      message: "Failed to delete testimonial"
    });
  }
};

/**
 * Get public site settings (for frontend display)
 */
exports.getPublicSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await SiteSettings.create({
        updatedBy: null // No user ID for default creation
      });
    }

    // Only return the settings needed for public display
    res.json({
      status: true,
      data: {
        testimonialsEnabled: settings.testimonialsEnabled,
        testimonialsMaxDisplay: settings.testimonialsMaxDisplay
      }
    });
  } catch (error) {
    console.error("Error fetching public site settings:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch site settings"
    });
  }
};

/**
 * Get site settings (admin only)
 */
exports.getSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await SiteSettings.create({
        updatedBy: req.user.userId
      });
    }

    res.json({
      status: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching site settings:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch site settings"
    });
  }
};

/**
 * Update site settings
 */
exports.updateSiteSettings = async (req, res) => {
  try {
    const { testimonialsEnabled, testimonialsMaxDisplay, testimonialsAutoApprove } = req.body;
    const adminId = req.user.userId;

    let settings = await SiteSettings.findOne();
    
    if (!settings) {
      settings = await SiteSettings.create({
        testimonialsEnabled,
        testimonialsMaxDisplay,
        testimonialsAutoApprove,
        updatedBy: adminId
      });
    } else {
      settings.testimonialsEnabled = testimonialsEnabled;
      settings.testimonialsMaxDisplay = testimonialsMaxDisplay;
      settings.testimonialsAutoApprove = testimonialsAutoApprove;
      settings.updatedBy = adminId;
      settings.lastUpdated = new Date();
      await settings.save();
    }

    res.json({
      status: true,
      message: "Settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error updating site settings:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update settings"
    });
  }
};
