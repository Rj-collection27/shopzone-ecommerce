const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const {
  JWT_SECRET,
  protect,
  adminOnly
} = require("../middleware/authMiddleware");
const router = express.Router();


// Register User
router.post("/register", async (req, res) => {

  try {

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name: name,
      email: email,
      password: hashedPassword,
      role: "user"
    });

    const savedUser = await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role
      }
    });

  } catch (error) {

    res.status(500).json({
      message: "Registration failed",
      error: error.message
    });

  }

});
// Login User
router.post("/login", async (req, res) => {
console.log("LOGIN ROUTE HIT");
  try {

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Check password
    const isPasswordCorrect =
      await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
  {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  },
  JWT_SECRET,
  {
    expiresIn: "1d"
  }
);
console.log("TOKEN CREATED:", token ? "YES" : "NO");
res.json({
  message: "Login successful",
  debug: "NEW CODE IS RUNNING",
  token: token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});
  } catch (error) {

    res.status(500).json({
      message: "Login failed",
      error: error.message
    });

  }

});
// Get all users - Admin only
router.get("/", protect, adminOnly, async (req, res) => {

  try {

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);

  } catch (error) {

    res.status(500).json({
      message: "Error fetching users",
      error: error.message
    });

  }

});
// Delete User - Admin only
router.delete("/:id", protect, adminOnly, async (req, res) => {

  try {

    const deletedUser =
      await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "User deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: "Error deleting user",
      error: error.message
    });

  }

});

module.exports = router;