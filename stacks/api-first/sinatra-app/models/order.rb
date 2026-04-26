class Order < ActiveRecord::Base
  belongs_to :user
  has_many :order_items, dependent: :destroy

  validates :status, presence: true
  validates :total, presence: true
  validates :created_at, presence: true
end
