require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

app.use(express.json());
app.use(express.static("public"));

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.get("/test-route", (req, res) => {
  res.send("SERVER IS WORKING");
});
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/payment", paymentRoutes);

mongoose
  .connect("mongodb://127.0.0.1:27017/shopzone")
  .then(() => {
    console.log("MongoDB Connected Successfully");
  })
  .catch((error) => {
    console.log("MongoDB Connection Error:", error);
  });

app.listen(5000, () => {
  console.log("Server running on port 5000");
});