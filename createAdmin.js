const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/shopzone");

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new User({
      name: "ShopZone Admin",
      email: "admin@shopzone.com",
      password: hashedPassword,
      role: "admin"
    });

    await admin.save();

    console.log("Admin created successfully!");
    console.log("Email: admin@shopzone.com");
    console.log("Password: admin123");

    await mongoose.disconnect();

  } catch (error) {
    console.log("Error:", error.message);
  }
}

createAdmin();