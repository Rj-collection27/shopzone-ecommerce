const http = require("http");

const data = JSON.stringify({
  name: "iPhone 15",
  price: 69999,
  description: "Apple iPhone 15 128GB",
  image: "iphone15.jpg",
  category: "Mobiles",
  stock: 10
});

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/products",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = "";

  res.on("data", (chunk) => {
    body += chunk;
  });

  res.on("end", () => {
    console.log(body);
  });
});

req.on("error", (error) => {
  console.log("Error:", error);
});

req.write(data);
req.end();