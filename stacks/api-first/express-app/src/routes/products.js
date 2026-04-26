const express = require("express");

const { createProduct, getProduct, listProducts } = require("../controllers/products");
const { asyncHandler } = require("./async-handler");

const router = express.Router();

router.post("/", asyncHandler(createProduct));
router.get("/", asyncHandler(listProducts));
router.get("/:id", asyncHandler(getProduct));

module.exports = router;
