const prisma = require("../db/prisma");
const { validateProduct } = require("../schemas/product");

async function createProduct(req, res) {
  const error = validateProduct(req.body);
  if (error) {
    return res.status(422).json({ detail: error });
  }

  const product = await prisma.product.create({
    data: {
      name: req.body.name,
      price: req.body.price
    }
  });

  return res.status(201).json(product);
}

async function listProducts(_req, res) {
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" }
  });

  return res.json(products);
}

async function getProduct(req, res) {
  const productId = Number(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    return res.status(404).json({ detail: "Product not found" });
  }

  return res.json(product);
}

module.exports = {
  createProduct,
  listProducts,
  getProduct
};
