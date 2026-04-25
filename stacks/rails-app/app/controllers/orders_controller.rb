class OrdersController < ApplicationController
  def create
    payload = params.permit(:user_id, items: [:product_id, :quantity])
    user_id = payload[:user_id]
    items = payload[:items]

    return render_error("Field 'user_id' is required", :unprocessable_entity) unless user_id.is_a?(Integer)
    return render_error("Order must contain at least one item", :unprocessable_entity) unless items.is_a?(Array) && items.any?

    validated_items = items.map { |item| validate_item(item) }

    user = User.find_by(id: user_id)
    return render_error("User not found", :not_found) unless user

    products = load_products(validated_items)
    total = validated_items.sum { |item| products.fetch(item[:product_id]).price * item[:quantity] }

    order = Order.transaction do
      created_order = Order.create!(user: user, total: total, status: "created")

      validated_items.each do |item|
        product = products.fetch(item[:product_id])
        created_order.order_items.create!(
          product: product,
          quantity: item[:quantity],
          unit_price: product.price
        )
      end

      created_order
    end

    render json: serialize_order(find_order(order.id)), status: :created
  end

  def index
    orders = Order.includes(:user, :order_items).order(:id)
    render json: orders.map { |order| serialize_order(order) }
  end

  def show
    render json: serialize_order(find_order(params[:id]))
  end

  def status
    order = Order.find(params[:id])
    status_value = params.permit(:status)[:status]

    return render_error("Field 'status' is required", :unprocessable_entity) unless status_value.is_a?(String) && status_value.strip != ""

    order.update!(status: status_value)
    render json: serialize_order(find_order(order.id))
  end

  private

  def find_order(id)
    Order.includes(:user, :order_items).find(id)
  end

  def validate_item(item)
    product_id = item[:product_id]
    quantity = item[:quantity]

    raise ActionController::BadRequest, "Field 'product_id' is required" unless product_id.is_a?(Integer)
    raise ActionController::BadRequest, "Field 'quantity' must be greater than zero" unless quantity.is_a?(Integer) && quantity.positive?

    { product_id: product_id, quantity: quantity }
  end

  def load_products(items)
    product_ids = items.map { |item| item[:product_id] }.uniq
    products = Product.where(id: product_ids).index_by(&:id)
    raise ActiveRecord::RecordNotFound, "Product not found" unless products.size == product_ids.size

    products
  end

  def serialize_order(order)
    {
      id: order.id,
      user: {
        id: order.user.id,
        name: order.user.name
      },
      items: order.order_items.sort_by(&:id).map do |item|
        {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }
      end,
      total: order.total,
      status: order.status,
      created_at: order.created_at.utc.iso8601
    }
  end
end
