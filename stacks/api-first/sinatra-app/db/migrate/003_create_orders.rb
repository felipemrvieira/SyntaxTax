class CreateOrders < ActiveRecord::Migration[7.2]
  def change
    create_table :orders do |t|
      t.references :user, null: false, foreign_key: true
      t.float :total, null: false, default: 0.0
      t.string :status, null: false, default: "created"
      t.datetime :created_at, null: false
    end
  end
end
