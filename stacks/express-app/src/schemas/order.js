function validateOrder(payload) {
  if (!payload || typeof payload !== "object") {
    return { status: 422, message: "Body must be a JSON object" };
  }

  if (typeof payload.user_id !== "number") {
    return { status: 422, message: "Field 'user_id' is required" };
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { status: 422, message: "Order must contain at least one item" };
  }

  for (const item of payload.items) {
    if (!item || typeof item !== "object") {
      return { status: 422, message: "Each item must be an object" };
    }

    if (typeof item.product_id !== "number") {
      return { status: 422, message: "Field 'product_id' is required" };
    }

    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      return { status: 422, message: "Field 'quantity' must be greater than zero" };
    }
  }

  return null;
}

function validateOrderStatus(payload) {
  if (!payload || typeof payload !== "object") {
    return "Body must be a JSON object";
  }

  if (typeof payload.status !== "string" || payload.status.trim() === "") {
    return "Field 'status' is required";
  }

  return null;
}

module.exports = {
  validateOrder,
  validateOrderStatus
};
