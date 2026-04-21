const express = require("express");

const { createUser, getUser, listUsers } = require("../controllers/users");

const router = express.Router();

router.post("/", createUser);
router.get("/", listUsers);
router.get("/:id", getUser);

module.exports = router;
