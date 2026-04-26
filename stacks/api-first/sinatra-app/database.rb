require "active_record"
require "fileutils"

DB_PATH = File.expand_path("db/development.sqlite3", __dir__)
MIGRATIONS_PATH = File.expand_path("db/migrate", __dir__)

ActiveRecord::Base.establish_connection(
  adapter: "sqlite3",
  database: DB_PATH
)

def setup_database
  FileUtils.mkdir_p(File.dirname(DB_PATH))
  ActiveRecord::Migration.verbose = false
  ActiveRecord::Base.connection_pool.migration_context.migrate
end
