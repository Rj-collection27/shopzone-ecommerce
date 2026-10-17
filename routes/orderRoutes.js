
const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Validate cart and calculate prices from database
async function getVerifiedItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty");
  }

  const quantities = new Map();

  for (const item of items) {
    const id = String(item.productId || item._id || "");
    const quantity = Number(item.quantity);

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      throw new Error("Invalid product or quantity");
    }

    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  const verifiedItems = [];
  let totalAmount = 0;

  for (const [productId, quantity] of quantities) {
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("A product in your cart no longer exists");
    }

    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    verifiedItems.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity
    });

    totalAmount += product.price * quantity;
  }

  return { verifiedItems, totalAmount };
}

// Deduct stock atomically; restore previous deductions if an item fails
async function deductStock(items) {
  const deducted = [];

  try {
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.quantity }
        },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!product) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }

      deducted.push(item);
    }
  } catch (error) {
    for (const item of deducted.reverse()) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );
    }

    throw error;
  }
}

// Create COD order
router.post("/", protect, async (req, res) => {
  let deductedItems = [];

  try {
    const {
      customerName,
      email,
      phone,
      address,
      items,
      paymentMethod
    } = req.body;

    if (
      !customerName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !address?.trim()
    ) {
      return res.status(400).json({
        message: "Please provide all customer details"
      });
    }

    if (paymentMethod !== "COD") {
      return res.status(400).json({
        message: "Use the online payment flow for online orders"
      });
    }

    const {
      verifiedItems,
      totalAmount
    } = await getVerifiedItems(items);

    await deductStock(verifiedItems);
    deductedItems = verifiedItems;

    const order = await Order.create({
      userId: req.user.id,
      customerName: customerName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: verifiedItems,
      totalAmount,
      paymentMethod: "COD",
      paymentStatus: "Pending",
      stockDeducted: true,
      status: "Pending"
    });

    res.status(201).json(order);
  } catch (error) {
    if (deductedItems.length > 0) {
      for (const item of deductedItems) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } }
        );
      }
    }

    const clientError = /cart is empty|invalid product|insufficient stock|no longer exists/i
      .test(error.message);

    res.status(clientError ? 400 : 500).json({
      message: error.message || "Error creating order"
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
    res.status(500).json({
      message: "Error fetching your orders"
    });
  }
});

// Customer Order Tracking
router.get("/track/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

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
    res.status(500).json({ message: "Error tracking order" });
  }
});

// Admin: Get all orders
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// Admin: Update order status
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled"
    ];

    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Do not cancel an order here until stock restoration is implemented.
    if (req.body.status === "Cancelled" && order.stockDeducted) {
      return res.status(400).json({
        message: "Stock restoration for cancellation must be handled first"
      });
    }

    order.status = req.body.status;
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Error updating order status" });
  }
});

module.exports = router;
