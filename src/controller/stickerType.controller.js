// controllers/stickerType.controller.js

const StickerType = require("../models/StickerType");
const QRStickerOption = require("../models/QRStickerOption");
const { createPaginationObject } = require("../utils/pagination");

// Get all active sticker types
exports.getStickerTypes = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const stickerTypes = await StickerType.find(query)
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      status: true,
      data: stickerTypes,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Get all sticker types with pagination
exports.getAllStickerTypes = async (req, res) => {
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
        { displayName: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const limitValue = parseInt(limit);
    const skipValue = (parseInt(page) - 1) * limitValue;

    const [stickerTypes, totalItems] = await Promise.all([
      StickerType.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .skip(skipValue)
        .limit(limitValue),
      StickerType.countDocuments(query),
    ]);

    const pagination = createPaginationObject(totalItems, page, limitValue);

    res.json({
      status: true,
      data: stickerTypes,
      pagination,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Create new sticker type
exports.createStickerType = async (req, res) => {
  try {
    const stickerType = new StickerType(req.body);
    await stickerType.save();

    res.status(201).json({
      status: true,
      message: "Sticker type created successfully",
      data: stickerType,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "A sticker type with this name already exists",
      });
    }
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Update sticker type
exports.updateStickerType = async (req, res) => {
  try {
    const { id } = req.params;
    
    const stickerType = await StickerType.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!stickerType) {
      return res.status(404).json({
        status: false,
        message: "Sticker type not found",
      });
    }

    res.json({
      status: true,
      message: "Sticker type updated successfully",
      data: stickerType,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "A sticker type with this name already exists",
      });
    }
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Delete sticker type
exports.deleteStickerType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are any sticker options using this type
    const stickerOptionsCount = await QRStickerOption.countDocuments({ type: id });
    
    if (stickerOptionsCount > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete sticker type. There are ${stickerOptionsCount} sticker options using this type.`,
      });
    }

    const stickerType = await StickerType.findByIdAndDelete(id);

    if (!stickerType) {
      return res.status(404).json({
        status: false,
        message: "Sticker type not found",
      });
    }

    res.json({
      status: true,
      message: "Sticker type deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Toggle sticker type status
exports.toggleStickerTypeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const stickerType = await StickerType.findById(id);

    if (!stickerType) {
      return res.status(404).json({
        status: false,
        message: "Sticker type not found",
      });
    }

    stickerType.isActive = !stickerType.isActive;
    await stickerType.save();

    res.json({
      status: true,
      message: `Sticker type ${stickerType.isActive ? 'activated' : 'deactivated'} successfully`,
      data: stickerType,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Get sticker type by ID
exports.getStickerTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const stickerType = await StickerType.findById(id);

    if (!stickerType) {
      return res.status(404).json({
        status: false,
        message: "Sticker type not found",
      });
    }

    res.json({
      status: true,
      data: stickerType,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Update sort order of sticker types
exports.updateSortOrder = async (req, res) => {
  try {
    const { types } = req.body; // Array of { id, sortOrder }

    const updatePromises = types.map(({ id, sortOrder }) =>
      StickerType.findByIdAndUpdate(id, { sortOrder }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({
      status: true,
      message: "Sort order updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};
