const express = require("express");

const { createUser, getUser, listUsers } = require("../controllers/users");
const { asyncHandler } = require("./async-handler");

const router = express.Router();

router.post("/", asyncHandler(createUser));
router.get("/", asyncHandler(listUsers));
router.get("/:id", asyncHandler(getUser));

module.exports = router;
