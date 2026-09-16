# 🛍️ ShopZone - E-Commerce Website

ShopZone is a full-stack e-commerce web application developed as a Web Development Capstone Project.

It provides a complete shopping experience for customers along with a separate Admin Panel for managing products, categories, orders, and users.

---

## 🚀 Features

### 👤 Customer Features

- User Registration
- User Login
- Product Catalog
- Product Details
- Product Search
- Shopping Cart
- Wishlist
- Checkout
- Cash on Delivery (COD)
- Online Payment using Razorpay
- My Orders
- Order Tracking
- Order Status Timeline
- Responsive User Interface

---

## 🔐 Admin Panel

ShopZone includes a separate Admin Panel with role-based access.

### Admin Features

- Separate Admin Login
- Admin Authentication
- Dashboard
- Sales Analytics
- Total Products
- Total Orders
- Total Users
- Total Sales
- Recent Orders
- Product Management
  - Add Product
  - Edit Product
  - Delete Product
- Category Management
  - Add Category
  - View Categories
  - Delete Category
- Order Management
  - View Orders
  - Update Order Status
- User Management
  - View Users
  - Delete Customer Accounts
- Admin Logout
- Protected Admin Routes

---

## 💳 Payment Integration

ShopZone uses **Razorpay** for online payment processing.

The application also supports:

- Online Payment
- Cash on Delivery

Razorpay credentials are stored securely using environment variables and are not included in the repository.

---

## 🛠️ Technologies Used

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### Authentication & Security

- JWT Authentication
- bcryptjs
- Role-Based Access Control
- Environment Variables using dotenv

### Payment

- Razorpay

---

## 📁 Project Structure

```text
web-development-project
│
├── middleware
│   └── authMiddleware.js
│
├── models
│   ├── Category.js
│   ├── Product.js
│   ├── Order.js
│   └── User.js
│
├── routes
│   ├── categoryRoutes.js
│   ├── productRoutes.js
│   ├── orderRoutes.js
│   ├── userRoutes.js
│   └── paymentRoutes.js
│
├── public
│   ├── admin
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── products.html
│   │   ├── orders.html
│   │   ├── users.html
│   │   └── categories.html
│   │
│   ├── css
│   │   └── style.css
│   │
│   ├── js
│   │   └── app.js
│   │
│   ├── images
│   ├── index.html
│   ├── products.html
│   ├── product-details.html
│   ├── cart.html
│   ├── checkout.html
│   ├── login.html
│   ├── register.html
│   ├── wishlist.html
│   ├── my-orders.html
│   └── track-order.html
│
├── createAdmin.js
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── .env
