class AddFloorplanGalleryPageVisibilityToMapFilters < ActiveRecord::Migration[7.2]
  GALLERY_PAGE_COLUMNS = %w[
    marketing_floorplan_gallery_page_enabled
    ops_floorplan_gallery_page_enabled
  ].freeze

  def up
    GALLERY_PAGE_COLUMNS.each do |col|
      add_column :map_filters, col, :boolean, default: true unless column_exists?(:map_filters, col)
    end

    GALLERY_PAGE_COLUMNS.each do |col|
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
    GALLERY_PAGE_COLUMNS.each do |col|
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
