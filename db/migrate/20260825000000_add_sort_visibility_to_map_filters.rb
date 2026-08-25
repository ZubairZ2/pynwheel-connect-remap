class AddSortVisibilityToMapFilters < ActiveRecord::Migration[7.2]
  SORT_COLUMNS = %w[
    marketing_sort_enabled
    ops_sort_enabled
  ].freeze

  def up
    SORT_COLUMNS.each do |col|
      add_column :map_filters, col, :boolean, default: true unless column_exists?(:map_filters, col)
    end

    SORT_COLUMNS.each do |col|
      constraint_name = "map_filters_#{col}_not_null"
      next if constraint_exists?(constraint_name)

      execute <<~SQL
        ALTER TABLE map_filters
          ADD CONSTRAINT #{constraint_name}
          CHECK (#{col} IS NOT NULL)
          NOT VALID;
      SQL
    end
  end

  def down
    SORT_COLUMNS.each do |col|
      constraint_name = "map_filters_#{col}_not_null"
      execute "ALTER TABLE map_filters DROP CONSTRAINT IF EXISTS #{constraint_name};"
      remove_column :map_filters, col if column_exists?(:map_filters, col)
    end
  end

  private

  def constraint_exists?(name)
    ActiveRecord::Base.connection.execute(
      "SELECT 1 FROM pg_constraint WHERE conname = '#{name}' LIMIT 1"
    ).any?
  end
end
