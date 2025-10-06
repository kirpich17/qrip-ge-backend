// controllers/adminSticker.controller.js

const QRStickerOption = require("../models/QRStickerOption");
const QRStickerOrder = require("../models/QRStickerOrder");
const { createPaginationObject } = require("../utils/pagination");

exports.getAllStickerOptions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { type: new RegExp(search, 'i') },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const limitValue = parseInt(limit);
    const skipValue = (parseInt(page) - 1) * limitValue;

    const [stickerOptions, totalItems] = await Promise.all([
      QRStickerOption.find(query)
        .populate('type', 'name displayName description')
        .sort({ createdAt: -1 })
        .skip(skipValue)
        .limit(limitValue),
      QRStickerOption.countDocuments(query),
    ]);

    const pagination = createPaginationObject(totalItems, page, limitValue);

    res.json({
      status: true,
      data: stickerOptions,
      pagination,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Create new sticker option
exports.createStickerOption = async (req, res) => {
  try {
    const stickerOption = new QRStickerOption(req.body);
    await stickerOption.save();

    res.status(201).json({
      status: true,
      message: "Sticker option created successfully",
      data: stickerOption,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Update sticker option
exports.updateStickerOption = async (req, res) => {
  try {
    const { id } = req.params;
    
    const stickerOption = await QRStickerOption.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!stickerOption) {
      return res.status(404).json({
        status: false,
        message: "Sticker option not found",
      });
    }

    res.json({
      status: true,
      message: "Sticker option updated successfully",
      data: stickerOption,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Delete sticker option
exports.deleteStickerOption = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are any orders for this sticker option
    const ordersCount = await QRStickerOrder.countDocuments({ stickerOption: id });
    
    if (ordersCount > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete sticker option. There are ${ordersCount} orders associated with it.`,
      });
    }

    const stickerOption = await QRStickerOption.findByIdAndDelete(id);

    if (!stickerOption) {
      return res.status(404).json({
        status: false,
        message: "Sticker option not found",
      });
    }

    res.json({
      status: true,
      message: "Sticker option deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Toggle sticker option status
exports.toggleStickerOptionStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const stickerOption = await QRStickerOption.findById(id);

    if (!stickerOption) {
      return res.status(404).json({
        status: false,
        message: "Sticker option not found",
      });
    }

    stickerOption.isActive = !stickerOption.isActive;
    await stickerOption.save();

    res.json({
      status: true,
      message: `Sticker option ${stickerOption.isActive ? 'activated' : 'deactivated'} successfully`,
      data: stickerOption,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Get sticker option by ID
exports.getStickerOptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const stickerOption = await QRStickerOption.findById(id);

    if (!stickerOption) {
      return res.status(404).json({
        status: false,
        message: "Sticker option not found",
      });
    }

    res.json({
      status: true,
      data: stickerOption,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};
