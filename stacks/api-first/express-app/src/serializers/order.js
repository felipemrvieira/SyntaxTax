function serializeOrder(order) {
  return {
    id: order.id,
    user: {
      id: order.user.id,
      name: order.user.name
    },
    items: order.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unit_price
    })),
    item_count: order.items.length,
    total: order.total,
    status: order.status,
    created_at: order.created_at
  };
}

module.exports = {
  serializeOrder
};
