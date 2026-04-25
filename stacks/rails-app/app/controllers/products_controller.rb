class ProductsController < ApplicationController
  def create
    product = Product.create!(params.permit(:name, :price))
    render json: serialize_product(product), status: :created
  end

  def index
    render json: Product.order(:id).map { |product| serialize_product(product) }
  end

  def show
    render json: serialize_product(Product.find(params[:id]))
  end

  private

  def serialize_product(product)
    {
      id: product.id,
      name: product.name,
      price: product.price
    }
  end
end
