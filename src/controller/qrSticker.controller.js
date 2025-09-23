// controllers/qrSticker.controller.js

const QRStickerOption = require("../models/QRStickerOption");
const QRStickerOrder = require("../models/QRStickerOrder");
const Memorial = require("../models/memorial.model");
const User = require("../models/user.model");
const { createPaginationObject } = require("../utils/pagination");
const axios = require('axios');
const getBogToken = require('../config/bogToken.js');

// Get all active sticker options
exports.getStickerOptions = async (req, res) => {
  try {
    const stickerOptions = await QRStickerOption.find({ 
      isActive: true,
      isInStock: true 
    }).sort({ createdAt: -1 });

    res.json({
      status: true,
      data: stickerOptions,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Create sticker order
exports.createStickerOrder = async (req, res) => {
  try {
    const {
      memorialId,
      stickerOptionId,
      quantity = 1,
      shippingAddress,
    } = req.body;

    const userId = req.user.userId;
    
    console.log("🚀 Creating sticker order:", {
      userId,
      memorialId,
      stickerOptionId,
      quantity,
      shippingAddress
    });

    // Validate memorial exists and belongs to user
    const memorial = await Memorial.findOne({
      _id: memorialId,
      createdBy: userId,
      status: 'active'
    });

    console.log("🔍 Memorial validation:", { memorial: memorial ? "found" : "not found" });

    if (!memorial) {
      return res.status(404).json({
        status: false,
        message: "Memorial not found or not accessible",
      });
    }

    // Validate sticker option exists and is active
    const stickerOption = await QRStickerOption.findOne({
      _id: stickerOptionId,
      isActive: true,
      isInStock: true
    });

    console.log("🔍 Sticker option validation:", { stickerOption: stickerOption ? "found" : "not found" });

    if (!stickerOption) {
      return res.status(404).json({
        status: false,
        message: "Sticker option not available",
      });
    }

    // Check stock availability
    if (stickerOption.stock < quantity) {
      return res.status(400).json({
        status: false,
        message: "Insufficient stock available",
      });
    }

    const unitPrice = stickerOption.price;
    const totalAmount = unitPrice * quantity;

    // Create order
    const order = new QRStickerOrder({
      user: userId,
      memorial: memorialId,
      stickerOption: stickerOptionId,
      quantity,
      unitPrice,
      totalAmount,
      shippingAddress,
      stickerSnapshot: {
        name: stickerOption.name,
        type: stickerOption.type,
        size: stickerOption.size,
        price: stickerOption.price,
      },
    });

    await order.save();

    // Populate the order for response
    await order.populate([
      { path: 'memorial', select: 'firstName lastName slug' },
      { path: 'stickerOption', select: 'name type size price' }
    ]);

    console.log("✅ Order created successfully:", order._id);
    
    res.status(201).json({
      status: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Get user's sticker orders
exports.getUserStickerOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
    } = req.query;

    const userId = req.user.userId;
    const query = { user: userId };

    if (status) {
      query.paymentStatus = status;
    }

    const limitValue = parseInt(limit);
    const skipValue = (parseInt(page) - 1) * limitValue;

    const [orders, totalItems] = await Promise.all([
      QRStickerOrder.find(query)
        .populate('memorial', 'firstName lastName slug')
        .populate('stickerOption', 'name type size')
        .sort({ createdAt: -1 })
        .skip(skipValue)
        .limit(limitValue),
      QRStickerOrder.countDocuments(query),
    ]);

    const pagination = createPaginationObject(totalItems, page, limitValue);

    res.json({
      status: true,
      data: orders,
      pagination,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Update order payment status (for payment webhook)
exports.updateOrderPaymentStatus = async (req, res) => {
  try {
    const { orderId, paymentStatus, paymentId } = req.body;

    const order = await QRStickerOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    order.paymentStatus = paymentStatus;
    if (paymentId) {
      order.paymentId = paymentId;
    }

    if (paymentStatus === 'paid') {
      order.orderStatus = 'processing';
    }

    await order.save();

    res.json({
      status: true,
      message: "Order payment status updated",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Get all sticker orders
exports.getAllStickerOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search,
    } = req.query;

    const query = {};

    if (status) {
      query.orderStatus = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        { 'shippingAddress.fullName': new RegExp(search, 'i') },
        { 'shippingAddress.email': new RegExp(search, 'i') },
        { trackingNumber: new RegExp(search, 'i') },
      ];
    }

    const limitValue = parseInt(limit);
    const skipValue = (parseInt(page) - 1) * limitValue;

    const [orders, totalItems] = await Promise.all([
      QRStickerOrder.find(query)
        .populate('user', 'firstname lastname email phone')
        .populate('memorial', 'firstName lastName slug')
        .populate('stickerOption', 'name type size')
        .sort({ createdAt: -1 })
        .skip(skipValue)
        .limit(limitValue),
      QRStickerOrder.countDocuments(query),
    ]);

    const pagination = createPaginationObject(totalItems, page, limitValue);

    res.json({
      status: true,
      data: orders,
      pagination,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, trackingNumber, notes } = req.body;

    const order = await QRStickerOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    order.orderStatus = orderStatus;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    if (notes) {
      order.notes = notes;
    }

    await order.save();

    res.json({
      status: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Admin: Get order statistics
exports.getOrderStatistics = async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      paidOrders,
      shippedOrders,
      totalRevenue,
    ] = await Promise.all([
      QRStickerOrder.countDocuments(),
      QRStickerOrder.countDocuments({ paymentStatus: 'pending' }),
      QRStickerOrder.countDocuments({ paymentStatus: 'paid' }),
      QRStickerOrder.countDocuments({ orderStatus: 'shipped' }),
      QRStickerOrder.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
    ]);

    res.json({
      status: true,
      data: {
        totalOrders,
        pendingOrders,
        paidOrders,
        shippedOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

// Initiate payment for QR sticker order
exports.initiateStickerPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.body;

    // Find the order
    const order = await QRStickerOrder.findOne({
      _id: orderId,
      user: userId,
      paymentStatus: 'pending'
    }).populate('stickerOption memorial');

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found or already paid"
      });
    }

    // Get BOG access token
    const accessToken = await getBogToken();
    
    // Check environment variables
    console.log("🔍 Environment check:", {
      BOG_PRODUCT_ID: process.env.BOG_PRODUCT_ID ? "present" : "missing",
      BACKEND_URL: process.env.BACKEND_URL ? "present" : "missing",
      FRONTEND_URL: process.env.FRONTEND_URL ? "present" : "missing"
    });
    
    // Create BOG payment order
    // For testing, use 0.01 amount like subscription payments
    const testAmount = 0.01;
    const orderPayload = {
      callback_url: `${process.env.BACKEND_URL}/api/payments/callback`,
      external_order_id: orderId,
      purchase_units: {
        currency: "GEL",
        total_amount: testAmount, // Using test amount for now
        basket: [{
          quantity: 1, // Using quantity 1 for testing
          unit_price: testAmount, // Using test amount for now
          product_id: process.env.BOG_PRODUCT_ID,
          description: `QR Sticker - ${order.stickerOption.name} for ${order.memorial.firstName} ${order.memorial.lastName}`
        }]
      },
      redirect_urls: {
        fail: `${process.env.FRONTEND_URL}/stickers/payment/failure?orderId=${orderId}`,
        success: `${process.env.FRONTEND_URL}/stickers/payment/success?orderId=${orderId}`
      }
    };

    console.log("🚀 QR Sticker Payment Order Payload:", orderPayload);

    // Create order with BOG
    console.log("🚀 Making BOG API call with access token:", accessToken ? "present" : "missing");
    
    const bogResponse = await axios.post(
      'https://api.bog.ge/payments/v1/ecommerce/orders',
      orderPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept-Language': 'en'
        }
      }
    );

    console.log("🚀 BOG API Response:", bogResponse.data);
    console.log("🔍 BOG Response Structure:", {
      hasOrderId: !!bogResponse.data?.order_id,
      hasId: !!bogResponse.data?.id,
      hasLinks: !!bogResponse.data?.links,
      hasLinksArray: Array.isArray(bogResponse.data?.links),
      hasLinksRedirect: !!bogResponse.data?._links?.redirect,
      linksKeys: bogResponse.data?.links ? Object.keys(bogResponse.data.links) : 'no links',
      linksRedirectKeys: bogResponse.data?._links?.redirect ? Object.keys(bogResponse.data._links.redirect) : 'no _links.redirect'
    });

    if (bogResponse.data && (bogResponse.data.order_id || bogResponse.data.id)) {
      // Update order with BOG order ID (try both possible field names)
      const bogOrderId = bogResponse.data.order_id || bogResponse.data.id;
      order.paymentId = bogOrderId;
      await order.save();

      // Try multiple possible payment URL locations
      const paymentUrl = bogResponse.data._links?.redirect?.href || 
                        bogResponse.data.links?.find(link => link.rel === 'approve')?.href ||
                        bogResponse.data.links?.redirect?.href ||
                        bogResponse.data.redirect_url ||
                        bogResponse.data.approval_url ||
                        bogResponse.data.payment_url;

      console.log("🔍 Payment URL found:", paymentUrl);

      if (!paymentUrl) {
        console.error("❌ No payment URL found in BOG response. Full response:", JSON.stringify(bogResponse.data, null, 2));
        throw new Error("BOG payment response does not contain a payment URL");
      }

      res.json({
        status: true,
        message: "Payment initiated successfully",
        data: {
          paymentUrl: paymentUrl,
          orderId: orderId,
          bogOrderId: bogOrderId
        }
      });
    } else {
      console.error("❌ BOG Response missing order_id or id:", bogResponse.data);
      throw new Error("Failed to create BOG payment order");
    }

  } catch (error) {
    console.error("❌ QR Sticker Payment Error:", error.response?.data || error.message);
    res.status(500).json({
      status: false,
      message: "Payment initiation failed: " + (error.response?.data?.message || error.message)
    });
  }
};

// Handle payment callback from BOG
exports.handleStickerPaymentCallback = async (req, res) => {
  try {
    console.log("🚀 QR Sticker Payment Callback - Full Request Body:", JSON.stringify(req.body, null, 2));
    console.log("🚀 QR Sticker Payment Callback - Headers:", JSON.stringify(req.headers, null, 2));
    
    const { order_id, status, external_order_id } = req.body;
    
    console.log("🚀 QR Sticker Payment Callback:", { order_id, status, external_order_id });

    // Basic validation - ensure we have required fields
    if (!external_order_id) {
      console.error("❌ Missing external_order_id in callback");
      return res.status(400).json({ status: false, message: "Missing external_order_id" });
    }

    // Find the order
    const order = await QRStickerOrder.findById(external_order_id);
    
    if (!order) {
      console.error("❌ Order not found:", external_order_id);
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    console.log("🔍 Found order:", { 
      orderId: order._id, 
      currentStatus: order.paymentStatus,
      paymentId: order.paymentId 
    });

    // Update payment status based on BOG response
    if (status === 'APPROVED') {
      order.paymentStatus = 'paid';
      order.paymentId = order_id;
      order.orderStatus = 'processing'; // Set order status to processing when payment is successful
      
      // Update stock
      const stickerOption = await QRStickerOption.findById(order.stickerOption);
      if (stickerOption) {
        stickerOption.stock = Math.max(0, stickerOption.stock - order.quantity);
        if (stickerOption.stock === 0) {
          stickerOption.isInStock = false;
        }
        await stickerOption.save();
      }
      
      await order.save();
      
      console.log("✅ QR Sticker Payment successful:", external_order_id);
    } else {
      order.paymentStatus = 'failed';
      await order.save();
      
      console.log("❌ QR Sticker Payment failed:", external_order_id);
    }

    res.json({ status: true, message: "Payment status updated" });

  } catch (error) {
    console.error("❌ QR Sticker Payment Callback Error:", error);
    res.status(500).json({
      status: false,
      message: "Callback processing failed: " + error.message
    });
  }
};

// Admin: Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await QRStickerOrder.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    await QRStickerOrder.findByIdAndDelete(orderId);
    
    console.log("✅ Order deleted:", orderId);
    
    res.json({
      status: true,
      message: "Order deleted successfully"
    });

  } catch (error) {
    console.error("❌ Delete Order Error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to delete order: " + error.message
    });
  }
};

// Get single order by ID (user accessible)
exports.getUserOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await QRStickerOrder.findOne({
      _id: orderId,
      user: userId
    })
      .populate('memorial', 'firstName lastName slug')
      .populate('stickerOption', 'name type size price');
    
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    res.json({
      status: true,
      data: order
    });

  } catch (error) {
    console.error("❌ Get User Order Error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to get order: " + error.message
    });
  }
};

// Manual payment status update (for testing/debugging)
exports.manualUpdatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;

    console.log("🔧 Manual payment status update:", { orderId, paymentStatus });

    const order = await QRStickerOrder.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    order.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid') {
      order.orderStatus = 'processing';
    }
    
    await order.save();
    
    console.log("✅ Manual payment status updated:", { orderId, newStatus: paymentStatus });

    res.json({
      status: true,
      message: "Payment status updated manually",
      data: order
    });

  } catch (error) {
    console.error("❌ Manual Payment Status Update Error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update payment status: " + error.message
    });
  }
};

// Admin: Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await QRStickerOrder.findById(orderId)
      .populate('user', 'firstname lastname email phone')
      .populate('memorial', 'firstName lastName slug')
      .populate('stickerOption', 'name type size price');
    
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    res.json({
      status: true,
      data: order
    });

  } catch (error) {
    console.error("❌ Get Order Error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to get order: " + error.message
    });
  }
};
