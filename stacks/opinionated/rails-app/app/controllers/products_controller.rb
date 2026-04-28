class ProductsController < ApplicationController
  def create
    product = Product.create!(params.permit(:name, :price))
    render json: serialize_product(product), status: :created
  end

  def index
    products = Product.order(:id)
    min_price = numeric_query_param(:min_price)
    return if performed?

    max_price = numeric_query_param(:max_price)
    return if performed?

    products = products.where("price >= ?", min_price) unless min_price.nil?
    products = products.where("price <= ?", max_price) unless max_price.nil?

    render json: products.map { |product| serialize_product(product) }
  end

  def show
    render json: serialize_product(Product.find(params[:id]))
  end

  private

  def numeric_query_param(name)
    value = params[name]
    return nil if value.nil?
    return value.to_f if value.to_s.match?(/\A\d+(\.\d+)?\z/) && value.to_f.positive?

    render_error("Query parameter '#{name}' is invalid", :unprocessable_entity)
    nil
  end

  def serialize_product(product)
    {
      id: product.id,
      name: product.name,
      price: product.price
    }
  end
end
