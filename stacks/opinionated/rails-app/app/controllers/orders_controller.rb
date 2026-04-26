class OrdersController < ApplicationController
  def create
    payload = params.permit(:user_id, items: [:product_id, :quantity])
    user_id = require_user_id(payload)
    items = validate_items(payload[:items])
    user = User.find(user_id)
    order = Order.create_with_items!(user: user, items: items)

    render json: order.as_api_json, status: :created
  end

  def index
    render json: Order.detailed.order(:id).map(&:as_api_json)
  end

  def show
    render json: Order.fetch_detailed!(params[:id]).as_api_json
  end

  def status
    order = Order.find(params[:id])
    status_value = params.permit(:status)[:status]

    return render_error("Field 'status' is required", :unprocessable_entity) unless status_value.is_a?(String) && status_value.strip != ""

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
