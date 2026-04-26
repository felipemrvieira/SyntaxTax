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
  const minPrice = _req.query.min_price;
  const maxPrice = _req.query.max_price;
  const where = {};

  if (minPrice !== undefined) {
    const parsedMinPrice = Number(minPrice);
    if (!Number.isFinite(parsedMinPrice) || parsedMinPrice <= 0) {
      return res.status(422).json({ detail: "Query parameter 'min_price' is invalid" });
    }
    where.price ??= {};
    where.price.gte = parsedMinPrice;
  }

  if (maxPrice !== undefined) {
    const parsedMaxPrice = Number(maxPrice);
    if (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice <= 0) {
      return res.status(422).json({ detail: "Query parameter 'max_price' is invalid" });
    }
    where.price ??= {};
    where.price.lte = parsedMaxPrice;
  }

  const products = await prisma.product.findMany({
    where,
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
