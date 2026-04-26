const express = require("express");

const { createOrder, getOrder, listOrders, updateOrderStatus } = require("../controllers/orders");

const router = express.Router();

router.post("/", createOrder);
router.get("/", listOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
