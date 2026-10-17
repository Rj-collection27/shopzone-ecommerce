require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createOrResetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await User.findOneAndUpdate(
      { email: "admin@shopzone.com" },
      {
        name: "ShopZone Admin",
        email: "admin@shopzone.com",
        password: hashedPassword,
        role: "admin"
      },
      {
        new: true,
        upsert: true
      }
    );

    console.log("Admin ready successfully!");
    console.log("Email: admin@shopzone.com");
    console.log("Password: admin123");

    await mongoose.disconnect();

  } catch (error) {
    console.log("Error:", error.message);
  }
}

createOrResetAdmin();