class OrdersController < ApplicationController
  VALID_ORDER_STATUSES = %w[created paid shipped cancelled].freeze
  ALLOWED_STATUS_TRANSITIONS = {
    "created" => %w[paid cancelled],
    "paid" => %w[shipped cancelled],
    "shipped" => [],
    "cancelled" => []
  }.freeze

  def create
    payload = params.permit(:user_id, items: [:product_id, :quantity])
    user_id = require_user_id(payload)
    items = validate_items(payload[:items])
    user = User.find(user_id)
    order = Order.create_with_items!(user: user, items: items)

    render json: order.as_api_json, status: :created
  end

  def index
    orders = Order.detailed.order(:id)
    status_filter = params[:status]
    user_id_filter = params[:user_id]

    if status_filter.present?
      return render_error("Query parameter 'status' is invalid", :unprocessable_entity) unless VALID_ORDER_STATUSES.include?(status_filter)

      orders = orders.where(status: status_filter)
    end

    if user_id_filter.present?
      return render_error("Query parameter 'user_id' is invalid", :unprocessable_entity) unless user_id_filter.to_s.match?(/\A\d+\z/)

      orders = orders.where(user_id: user_id_filter.to_i)
    end

    render json: orders.map(&:as_api_json)
  end

  def show
    render json: Order.fetch_detailed!(params[:id]).as_api_json
  end

  def status
    order = Order.find(params[:id])
    status_value = params.permit(:status)[:status]

    return render_error("Field 'status' is required", :unprocessable_entity) unless status_value.is_a?(String) && status_value.strip != ""
    return render_error("Field 'status' is invalid", :unprocessable_entity) unless VALID_ORDER_STATUSES.include?(status_value)
    return render_error("Invalid order status transition", :conflict) unless ALLOWED_STATUS_TRANSITIONS.fetch(order.status).include?(status_value)

    order.update!(status: status_value)
    render json: Order.fetch_detailed!(order.id).as_api_json
  end

  private

  def require_user_id(payload)
    user_id = payload[:user_id]
    raise ActionController::BadRequest, "Field 'user_id' is required" unless user_id.is_a?(Integer)

    user_id
  end

  def validate_items(items)
    raise ActionController::BadRequest, "Order must contain at least one item" unless items.is_a?(Array) && items.any?

    items.map do |item|
      product_id = item[:product_id]
      quantity = item[:quantity]

      raise ActionController::BadRequest, "Field 'product_id' is required" unless product_id.is_a?(Integer)
      raise ActionController::BadRequest, "Field 'quantity' must be greater than zero" unless quantity.is_a?(Integer) && quantity.positive?

      { product_id: product_id, quantity: quantity }
    end
  end
end
