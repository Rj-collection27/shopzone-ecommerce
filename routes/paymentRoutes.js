const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "shopzone_" + Date.now()
    };

    const order = await razorpay.orders.create(options);

    res.json({
      order: order,
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.log("Razorpay Error:", error);

    res.status(500).json({
      message: "Failed to create Razorpay order",
      error: error.message
    });
  }
});


// Verify Razorpay Payment
router.post("/verify", async (req, res) => {
  try {

    console.log("VERIFY ROUTE CALLED");

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    console.log("Razorpay Order ID:", razorpay_order_id);
    console.log("Razorpay Payment ID:", razorpay_payment_id);
    console.log("Signature received:", !!razorpay_signature);


    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        razorpay_order_id +
        "|" +
        razorpay_payment_id
      )
      .digest("hex");


    console.log(
      "Signature matched:",
      generatedSignature === razorpay_signature
    );


    if (generatedSignature !== razorpay_signature) {

      console.log("PAYMENT VERIFICATION FAILED");

      return res.status(400).json({

        success: false,

        message: "Payment verification failed"

      });

    }


    console.log("PAYMENT VERIFIED SUCCESSFULLY");


    res.json({

      success: true,

      message: "Payment verified successfully"

    });


  } catch (error) {

    console.log(
      "Payment Verification Error:",
      error
    );

    res.status(500).json({

      success: false,

      message: "Payment verification error"

    });

  }
});
module.exports = router;