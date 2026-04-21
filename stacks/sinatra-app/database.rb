require "active_record"

DB_PATH = File.expand_path("db/development.sqlite3", __dir__)

ActiveRecord::Base.establish_connection(
  adapter: "sqlite3",
  database: DB_PATH
)

def setup_database
  return if ActiveRecord::Base.connection.data_source_exists?("users")

  ActiveRecord::Schema.define do
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
    end

    add_index :users, :email, unique: true

    create_table :products do |t|
      t.string :name, null: false
      t.float :price, null: false
    end

    create_table :orders do |t|
      t.references :user, null: false, foreign_key: true
      t.float :total, null: false, default: 0.0
      t.string :status, null: false, default: "created"
      t.datetime :created_at, null: false
    end

    create_table :order_items do |t|
      t.references :order, null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true
      t.integer :quantity, null: false
      t.float :unit_price, null: false
    end
  end
end
