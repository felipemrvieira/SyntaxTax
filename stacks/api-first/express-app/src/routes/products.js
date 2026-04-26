const express = require("express");

const { createProduct, getProduct, listProducts } = require("../controllers/products");

const router = express.Router();

router.post("/", createProduct);
router.get("/", listProducts);
router.get("/:id", getProduct);

module.exports = router;
