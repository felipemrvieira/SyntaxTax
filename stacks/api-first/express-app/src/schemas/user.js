function validateUser(payload) {
  if (!payload || typeof payload !== "object") {
    return "Body must be a JSON object";
  }

  if (typeof payload.name !== "string" || payload.name.trim() === "") {
    return "Field 'name' is required";
  }

  if (typeof payload.email !== "string" || payload.email.trim() === "") {
    return "Field 'email' is required";
  }

  return null;
}

module.exports = {
  validateUser
};
