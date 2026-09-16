let cart = JSON.parse(localStorage.getItem("cart")) || [];

async function loadProducts() {
  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Failed to load products");
    }

    const products = await response.json();

    const productList = document.getElementById("product-list");

    if (!productList) {
      return;
    }

    productList.innerHTML = "";

    if (products.length === 0) {
      productList.innerHTML = "<p>No products available.</p>";
      return;
    }

    products.forEach((product) => {
      const productCard = document.createElement("div");

      productCard.className = "product-card";

      productCard.innerHTML = `
        <div class="product-click-area" onclick="openProductDetails('${product._id}')">
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>₹${product.price}</p>
          <p>${product.description}</p>
          <p>Category: ${product.category}</p>
          <p>Stock: ${product.stock}</p>
        </div>

        <button onclick="event.stopPropagation(); addToCart('${product._id}')">
          Add to Cart
        </button>
      `;

      productList.appendChild(productCard);
    });

    window.products = products;

  } catch (error) {
    console.log("Error loading products:", error);
  }
}


// ===============================
// OPEN PRODUCT DETAILS
// ===============================

function openProductDetails(productId) {
  window.location.href = `/product-details.html?id=${productId}`;
}


// ===============================
// ADD TO CART
// ===============================

function addToCart(productId) {

  const product = window.products.find(
    (item) => item._id === productId
  );

  if (!product) {
    alert("Product not found!");
    return;
  }

  const existingProduct = cart.find(
    (item) => item._id === productId
  );

  if (existingProduct) {

    if (existingProduct.quantity >= product.stock) {
      alert("Maximum available stock reached!");
      return;
    }

    existingProduct.quantity += 1;

  } else {

    cart.push({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });

  }

  localStorage.setItem("cart", JSON.stringify(cart));

  alert(product.name + " added to cart!");
}


// ===============================
// LOAD PRODUCTS
// ===============================

loadProducts();