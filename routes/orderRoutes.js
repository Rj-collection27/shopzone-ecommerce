console.log("ORDER ROUTES FILE LOADED");
const express = require("express");
const Order = require("../models/Order");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const router = express.Router();

// Create a new order
router.post("/", protect, async (req, res) => {
    try {
    const order = new Order({
     ...req.body,
     userId: req.user.id
  });
    const savedOrder = await order.save();

    res.status(201).json(savedOrder);

  } catch (error) {
    res.status(500).json({
      message: "Error creating order",
      error: error.message
    });
  }
});
// Customer My Orders
router.get("/my-orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    console.log("MY ORDERS ERROR:", error);

    res.status(500).json({
      message: "Error fetching your orders",
      error: error.message
    });
  }
});
// Customer Order Tracking
router.get("/track/:id", protect, async (req, res) => {
  console.log("TRACK ROUTE HIT:", req.params.id);

  try {
    // Find order only by Order ID
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    // Security check:
    // If order has a userId, it must belong to the logged-in user.
    if (
      order.userId &&
      order.userId.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "You are not allowed to track this order"
      });
    }

    res.json(order);

  } catch (error) {
    console.log("TRACKING ERROR:", error);

    res.status(500).json({
      message: "Error tracking order",
      error: error.message
    });
  }
});

// Get all orders
router.get("/", protect, adminOnly, async (req, res) => {  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching orders",
      error: error.message
    });
  }
});

// Update order status
router.put("/:id", protect, adminOnly, async (req, res) => {  try {

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status
      },
      {
        new: true
      }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json(updatedOrder);

  } catch (error) {

    res.status(500).json({
      message: "Error updating order status",
      error: error.message
    });

  }
});

module.exports = router;