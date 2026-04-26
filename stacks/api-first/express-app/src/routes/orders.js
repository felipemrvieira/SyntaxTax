const express = require("express");

const { createOrder, getOrder, listOrders, updateOrderStatus } = require("../controllers/orders");
const { asyncHandler } = require("./async-handler");

const router = express.Router();

router.post("/", asyncHandler(createOrder));
router.get("/", asyncHandler(listOrders));
router.get("/:id", asyncHandler(getOrder));
router.patch("/:id/status", asyncHandler(updateOrderStatus));

module.exports = router;
