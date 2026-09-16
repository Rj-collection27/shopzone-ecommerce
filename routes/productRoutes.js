const { protect, adminOnly } = require("../middleware/authMiddleware");
const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();

    res.json(products);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching products"
    });
  }
});


// Add a new product
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const product = new Product(req.body);

    const savedProduct = await product.save();

    res.status(201).json(savedProduct);

  } catch (error) {
    res.status(500).json({
      message: "Error adding product",
      error: error.message
    });
  }
});


// Delete a product
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deletedProduct =
      await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json({
      message: "Product deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting product",
      error: error.message
    });
  }
});


// Update a product
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const updatedProduct =
      await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json({
      message: "Error updating product",
      error: error.message
    });
  }
});


module.exports = router;