const express = require("express");

const orderRoutes = require("./routes/orders");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");

const app = express();

app.use(express.json());

app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ detail: "Internal server error" });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 8000);
  app.listen(port, () => {
    console.log(`Express app listening on port ${port}`);
  });
}

module.exports = app;
