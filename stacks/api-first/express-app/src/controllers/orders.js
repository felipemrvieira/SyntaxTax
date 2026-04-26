const prisma = require("../db/prisma");
const { serializeOrder } = require("../serializers/order");
const { validateOrder, validateOrderFilters, validateOrderStatus } = require("../schemas/order");

const ALLOWED_STATUS_TRANSITIONS = {
  created: new Set(["paid", "cancelled"]),
  paid: new Set(["shipped", "cancelled"]),
  shipped: new Set(),
  cancelled: new Set()
};

async function findDetailedOrder(orderId) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        orderBy: { id: "asc" },
        include: {
          product: true
        }
      }
    }
  });
}

async function createOrder(req, res) {
  const validationError = validateOrder(req.body);
  if (validationError) {
    return res.status(validationError.status).json({ detail: validationError.message });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.body.user_id }
  });
  if (!user) {
    return res.status(404).json({ detail: "User not found" });
  }

  const productIds = [...new Set(req.body.items.map((item) => item.product_id))];
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds }
    }
  });

  if (products.length !== productIds.length) {
    return res.status(404).json({ detail: "Product not found" });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const total = req.body.items.reduce((sum, item) => {
    return sum + productsById.get(item.product_id).price * item.quantity;
  }, 0);

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        user_id: req.body.user_id,
        total,
        status: "created"
      }
    });

    await tx.orderItem.createMany({
      data: req.body.items.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: productsById.get(item.product_id).price
      }))
    });

    return createdOrder;
  });

  const detailedOrder = await findDetailedOrder(order.id);
  return res.status(201).json(serializeOrder(detailedOrder));
}

async function listOrders(req, res) {
  const filterError = validateOrderFilters(req.query);
  if (filterError) {
    return res.status(filterError.status).json({ detail: filterError.message });
  }

  const where = {};
  if (req.query.status !== undefined) {
    where.status = req.query.status;
  }
  if (req.query.user_id !== undefined) {
    where.user_id = Number(req.query.user_id);
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { id: "asc" },
    include: {
      user: true,
      items: {
        orderBy: { id: "asc" },
        include: {
          product: true
        }
      }
    }
  });

  return res.json(orders.map(serializeOrder));
}

async function getOrder(req, res) {
  const orderId = Number(req.params.id);
  const order = await findDetailedOrder(orderId);

  if (!order) {
    return res.status(404).json({ detail: "Order not found" });
  }

  return res.json(serializeOrder(order));
}

async function updateOrderStatus(req, res) {
  const error = validateOrderStatus(req.body);
  if (error) {
    return res.status(error.status).json({ detail: error.message });
  }

  const orderId = Number(req.params.id);
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!existingOrder) {
    return res.status(404).json({ detail: "Order not found" });
  }

  if (!ALLOWED_STATUS_TRANSITIONS[existingOrder.status].has(req.body.status)) {
    return res.status(409).json({ detail: "Invalid order status transition" });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: req.body.status
    }
  });

  const detailedOrder = await findDetailedOrder(orderId);
  return res.json(serializeOrder(detailedOrder));
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus
};
