const express = require("express");
const Category = require("../models/Category");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Get all categories
router.get("/", async (req, res) => {

  try {

    const categories = await Category.find()
      .sort({ createdAt: -1 });

    res.json(categories);

  } catch (error) {

    res.status(500).json({
      message: "Error fetching categories",
      error: error.message
    });

  }

});


// Add category - Admin only
router.post("/", protect, adminOnly, async (req, res) => {

  try {

    const category = new Category({
      name: req.body.name
    });

    const savedCategory = await category.save();

    res.status(201).json(savedCategory);

  } catch (error) {

    res.status(500).json({
      message: "Error adding category",
      error: error.message
    });

  }

});


// Delete category - Admin only
router.delete("/:id", protect, adminOnly, async (req, res) => {

  try {

    const deletedCategory =
      await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).json({
        message: "Category not found"
      });
    }

    res.json({
      message: "Category deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: "Error deleting category",
      error: error.message
    });

  }

});


module.exports = router;