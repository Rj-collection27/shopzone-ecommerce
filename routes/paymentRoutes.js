const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a Razorpay order and reserve product stock
router.post("/create-order", protect, async (req, res) => {
  const reserved = [];
  let shopOrder;

  try {
    const { customerName, email, phone, address, items } = req.body;

    if (
      !customerName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !address?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Enter all customer details and cart items"
      });
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
        return res.status(400).json({
          message: "Invalid product or quantity"
        });
      }

      quantities.set(id, (quantities.get(id) || 0) + quantity);
    }

    const verifiedItems = [];
    let totalAmount = 0;

    for (const [id, quantity] of quantities) {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          message: "Insufficient stock for " + product.name
        });
      }

      verifiedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity
      });

      totalAmount += product.price * quantity;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid order amount" });
    }

    // Reserve stock using conditional updates
    for (const item of verifiedItems) {
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.quantity }
        },
        {
          $inc: { stock: -item.quantity }
        },
        { new: true }
      );

      if (!product) {
        throw new Error("Insufficient stock for " + item.name);
      }

      reserved.push(item);
    }

    shopOrder = await Order.create({
      userId: req.user.id,
      customerName: customerName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: verifiedItems,
      totalAmount,
      paymentMethod: "ONLINE",
      paymentStatus: "Pending",
      stockDeducted: true,
      status: "Payment Pending"
    });

    const paymentOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: shopOrder._id.toString()
    });

    shopOrder.razorpayOrderId = paymentOrder.id;
    await shopOrder.save();

    return res.json({
      order: paymentOrder,
      shopZoneOrderId: shopOrder._id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Create payment order error:", error.message);

    if (shopOrder) {
      await Order.findByIdAndDelete(shopOrder._id);
    }

    for (const item of reserved.reverse()) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );
    }

    return res.status(500).json({
      message: "Could not create payment order. Please try again."
    });
  }
});

// Verify Razorpay payment
router.post("/verify", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details missing"
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest();

    let receivedSignature;

    try {
      receivedSignature = Buffer.from(razorpay_signature, "hex");
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    if (
      receivedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user.id,
      paymentMethod: "ONLINE"
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "ShopZone order not found"
      });
    }

    if (order.paymentStatus === "Paid") {
      if (order.razorpayPaymentId === razorpay_payment_id) {
        return res.json({ success: true, orderId: order._id });
      }

      return res.status(409).json({
        success: false,
        message: "Order already paid"
      });
    }

    if (!order.stockDeducted || order.status === "Cancelled") {
      return res.status(409).json({
        success: false,
        message: "Order is no longer active. Contact support before retrying."
      });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      payment.amount !== Math.round(order.totalAmount * 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or amount does not match"
      });
    }

    // Only one request can confirm this pending order
    const confirmedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        userId: req.user.id,
        paymentStatus: "Pending",
        stockDeducted: true,
        status: "Payment Pending"
      },
      {
        $set: {
          paymentStatus: "Paid",
          razorpayPaymentId: razorpay_payment_id,
          status: "Confirmed"
        }
      },
      { new: true }
    );

    if (!confirmedOrder) {
      const latestOrder = await Order.findById(order._id);

      if (
        latestOrder?.paymentStatus === "Paid" &&
        latestOrder.razorpayPaymentId === razorpay_payment_id
      ) {
        return res.json({ success: true, orderId: latestOrder._id });
      }

      return res.status(409).json({
        success: false,
        message: "Order status changed. Check My Orders before retrying."
      });
    }

    return res.json({
      success: true,
      orderId: confirmedOrder._id
    });
  } catch (error) {
    console.error("Payment verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Payment verification error. Check My Orders before retrying."
    });
  }
});

// Release reserved stock after checking Razorpay payment status
router.post("/release-stock", protect, async (req, res) => {
  try {
    const { shopZoneOrderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(shopZoneOrderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findOne({
      _id: shopZoneOrderId,
      userId: req.user.id,
      paymentMethod: "ONLINE"
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({
        message: "Paid order cannot release stock"
      });
    }

    if (!order.stockDeducted) {
      return res.json({ message: "Stock already released" });
    }

    if (!order.razorpayOrderId) {
      return res.status(409).json({
        message: "Payment order is not ready. Check My Orders before retrying."
      });
    }

    const payments = await razorpay.orders.fetchPayments(
      order.razorpayOrderId
    );

    const paymentExists = payments.items.some(
      payment =>
        payment.status === "captured" ||
        payment.status === "authorized"
    );

    if (paymentExists) {
      return res.status(409).json({
        message: "Payment exists or is authorized. Stock not released."
      });
    }

    // Atomically claim the release so repeated requests cannot claim it twice
    const claimedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        userId: req.user.id,
        paymentMethod: "ONLINE",
        paymentStatus: "Pending",
        status: "Payment Pending",
        stockDeducted: true
      },
      {
        $set: {
          stockDeducted: false,
          paymentStatus: "Failed",
          status: "Cancelled"
        }
      },
      { new: true }
    );

    if (!claimedOrder) {
      return res.status(409).json({
        message: "Order status changed. Check My Orders before retrying."
      });
    }

    for (const item of claimedOrder.items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );
    }

    return res.json({ message: "Stock released" });
  } catch (error) {
    console.error("Stock release error:", error.message);

    return res.status(500).json({
      message: "Could not confirm payment status. Check My Orders before retrying."
    });
  }
});

module.exports = router;
