require "json"
require "sinatra"
require "time"

require_relative "database"
require_relative "models/user"
require_relative "models/product"
require_relative "models/order"
require_relative "models/order_item"

set :bind, "0.0.0.0"
set :port, ENV.fetch("PORT", 8000)
set :show_exceptions, false

configure do
  setup_database
end

before do
  content_type :json
end

helpers do
  def request_body
    body = request.body.read
    return {} if body.empty?

    JSON.parse(body)
  rescue JSON::ParserError
    halt 400, JSON.generate(detail: "Invalid JSON")
  end

  def serialize_user(user)
    {
      id: user.id,
      name: user.name,
      email: user.email
    }
  end

  def serialize_product(product)
    {
      id: product.id,
      name: product.name,
      price: product.price
    }
  end

  def serialize_order(order)
    {
      id: order.id,
      user: {
        id: order.user.id,
        name: order.user.name
      },
      items: order.order_items.map do |item|
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

  def find_order(id)
    Order.includes(:user, :order_items).find_by(id: id)
  end
end

error ActiveRecord::RecordInvalid do
  status 422
  JSON.generate(detail: env["sinatra.error"].record.errors.full_messages.join(", "))
end

post "/users" do
  payload = request_body
  halt 422, JSON.generate(detail: "Field 'name' is required") unless payload["name"].is_a?(String) && !payload["name"].strip.empty?
  halt 422, JSON.generate(detail: "Field 'email' is required") unless payload["email"].is_a?(String) && !payload["email"].strip.empty?

  user = User.create!(name: payload["name"], email: payload["email"])
  status 201
  JSON.generate(serialize_user(user))
end

get "/users" do
  JSON.generate(User.order(:id).map { |user| serialize_user(user) })
end

get "/users/:id" do
  user = User.find_by(id: params[:id])
  halt 404, JSON.generate(detail: "User not found") unless user

  JSON.generate(serialize_user(user))
end

post "/products" do
  payload = request_body
  halt 422, JSON.generate(detail: "Field 'name' is required") unless payload["name"].is_a?(String) && !payload["name"].strip.empty?
  halt 422, JSON.generate(detail: "Field 'price' must be numeric") unless payload["price"].is_a?(Numeric)

  product = Product.create!(name: payload["name"], price: payload["price"])
  status 201
  JSON.generate(serialize_product(product))
end

get "/products" do
  JSON.generate(Product.order(:id).map { |product| serialize_product(product) })
end

get "/products/:id" do
  product = Product.find_by(id: params[:id])
  halt 404, JSON.generate(detail: "Product not found") unless product

  JSON.generate(serialize_product(product))
end

post "/orders" do
  payload = request_body

  halt 422, JSON.generate(detail: "Field 'user_id' is required") unless payload["user_id"].is_a?(Numeric)
  halt 422, JSON.generate(detail: "Order must contain at least one item") unless payload["items"].is_a?(Array) && !payload["items"].empty?

  payload["items"].each do |item|
    halt 422, JSON.generate(detail: "Each item must be an object") unless item.is_a?(Hash)
    halt 422, JSON.generate(detail: "Field 'product_id' is required") unless item["product_id"].is_a?(Numeric)
    halt 422, JSON.generate(detail: "Field 'quantity' must be greater than zero") unless item["quantity"].is_a?(Numeric) && item["quantity"] > 0
  end

  user = User.find_by(id: payload["user_id"])
  halt 404, JSON.generate(detail: "User not found") unless user

  product_ids = payload["items"].map { |item| item["product_id"] }.uniq
  products = Product.where(id: product_ids).index_by(&:id)
  halt 404, JSON.generate(detail: "Product not found") unless products.size == product_ids.size

  total = payload["items"].sum do |item|
    products.fetch(item["product_id"]).price * item["quantity"]
  end

  order = nil
  ActiveRecord::Base.transaction do
    order = Order.create!(
      user: user,
      total: total,
      status: "created",
      created_at: Time.now.utc
    )

    payload["items"].each do |item|
      product = products.fetch(item["product_id"])
      OrderItem.create!(
        order: order,
        product: product,
        quantity: item["quantity"],
        unit_price: product.price
      )
    end
  end

  detailed_order = find_order(order.id)
  status 201
  JSON.generate(serialize_order(detailed_order))
end

get "/orders" do
  orders = Order.includes(:user, :order_items).order(:id)
  JSON.generate(orders.map { |order| serialize_order(order) })
end

get "/orders/:id" do
  order = find_order(params[:id])
  halt 404, JSON.generate(detail: "Order not found") unless order

  JSON.generate(serialize_order(order))
end

patch "/orders/:id/status" do
  payload = request_body
  halt 422, JSON.generate(detail: "Field 'status' is required") unless payload["status"].is_a?(String) && !payload["status"].strip.empty?

  order = Order.find_by(id: params[:id])
  halt 404, JSON.generate(detail: "Order not found") unless order

  order.update!(status: payload["status"])
  JSON.generate(serialize_order(find_order(order.id)))
end
