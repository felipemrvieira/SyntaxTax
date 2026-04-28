class Order < ApplicationRecord
  belongs_to :user
  has_many :order_items, dependent: :destroy

  scope :detailed, -> { includes(:user, order_items: :product) }

  validates :status, presence: true
  validates :total, presence: true

  def self.create_with_items!(user:, items:)
    products = products_by_id(items)
    total = items.sum { |item| products.fetch(item[:product_id]).price * item[:quantity] }

    transaction do
      order = create!(user: user, total: total, status: "created")

      items.each do |item|
        product = products.fetch(item[:product_id])
        order.order_items.create!(
          product: product,
          quantity: item[:quantity],
          unit_price: product.price
        )
      end

      detailed.find(order.id)
    end
  end

  def self.fetch_detailed!(id)
    detailed.find(id)
  end

  def as_api_json
    {
      id: id,
      user: {
        id: user.id,
        name: user.name
      },
      items: order_items.sort_by(&:id).map do |item|
        {
          product_id: item.product_id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }
      end,
      item_count: order_items.size,
      total: total,
      status: status,
      created_at: created_at.utc.iso8601
    }
  end

  def self.products_by_id(items)
    product_ids = items.map { |item| item[:product_id] }.uniq
    products = Product.where(id: product_ids).index_by(&:id)
    raise ActiveRecord::RecordNotFound, "Product not found" unless products.size == product_ids.size

    products
  end
  private_class_method :products_by_id
end
