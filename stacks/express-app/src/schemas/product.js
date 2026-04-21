function validateProduct(payload) {
  if (!payload || typeof payload !== "object") {
    return "Body must be a JSON object";
  }

  if (typeof payload.name !== "string" || payload.name.trim() === "") {
    return "Field 'name' is required";
  }

  if (typeof payload.price !== "number" || Number.isNaN(payload.price)) {
    return "Field 'price' must be numeric";
  }

  return null;
}

module.exports = {
  validateProduct
};
