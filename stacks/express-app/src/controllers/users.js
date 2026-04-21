const prisma = require("../db/prisma");
const { validateUser } = require("../schemas/user");

async function createUser(req, res) {
  const error = validateUser(req.body);
  if (error) {
    return res.status(422).json({ detail: error });
  }

  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email
    }
  });

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
