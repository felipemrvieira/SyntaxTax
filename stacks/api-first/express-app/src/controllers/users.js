const prisma = require("../db/prisma");
const { validateUser } = require("../schemas/user");

async function createUser(req, res) {
  const error = validateUser(req.body);
  if (error) {
    return res.status(422).json({ detail: error });
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email
      }
    });
  } catch (error) {
    if (error && error.code === "P2002") {
      return res.status(409).json({ detail: "Email already exists" });
    }

    throw error;
  }

  return res.status(201).json(user);
}

async function listUsers(_req, res) {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" }
  });

  return res.json(users);
}

async function getUser(req, res) {
  const userId = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return res.status(404).json({ detail: "User not found" });
  }

  return res.json(user);
}

module.exports = {
  createUser,
  listUsers,
  getUser
};
