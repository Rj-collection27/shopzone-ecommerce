
const express = require("express");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

// Add product (Admin only)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, price, description, image, category, stock } = req.body;

    if (
      !name?.trim() ||
      price === undefined ||
      !description?.trim() ||
      !image?.trim() ||
      !category?.trim() ||
      stock === undefined
    ) {
      return res.status(400).json({
        message: "All product fields are required"
      });
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: "Invalid product price" });
    }

    if (
      !Number.isInteger(Number(stock)) ||
      Number(stock) < 0
    ) {
      return res.status(400).json({
        message: "Stock must be a non-negative whole number"
      });
    }

    const product = await Product.create({
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      image: image.trim(),
      category: category.trim(),
      stock: Number(stock)
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({
      message: "Error adding product",
      error: error.message
    });
  }
});

// Delete product (Admin only)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(400).json({
      message: "Error deleting product",
      error: error.message
    });
  }
});

// Update product (Admin only)
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const allowedFields = [
      "name", "price", "description", "image", "category", "stock"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.price !== undefined) {
      updates.price = Number(updates.price);

      if (!Number.isFinite(updates.price) || updates.price < 0) {
        return res.status(400).json({ message: "Invalid product price" });
      }
    }

    if (updates.stock !== undefined) {
      updates.stock = Number(updates.stock);

      if (!Number.isInteger(updates.stock) || updates.stock < 0) {
        return res.status(400).json({
          message: "Stock must be a non-negative whole number"
        });
      }
    }

    for (const field of ["name", "description", "image", "category"]) {
      if (updates[field] !== undefined) {
        if (typeof updates[field] !== "string" || !updates[field].trim()) {
          return res.status(400).json({
            message: `${field} cannot be empty`
          });
        }
        updates[field] = updates[field].trim();
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({
      message: "Error updating product",
      error: error.message
    });
  }
});

module.exports = router;
