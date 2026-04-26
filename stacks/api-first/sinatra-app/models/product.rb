class Product < ActiveRecord::Base
  has_many :order_items, dependent: :restrict_with_exception

  validates :name, presence: true
  validates :price, presence: true
end
