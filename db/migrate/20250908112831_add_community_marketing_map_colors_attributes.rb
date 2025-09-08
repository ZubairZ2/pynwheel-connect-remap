class AddCommunityMarketingMapColorsAttributes < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :available_units_color, :string, default: '#F9D648', null: false
    add_column :communities, :available_units_opacity, :decimal, precision: 3, scale: 2, default: 1.0, null: false

    add_column :communities, :model_units_color, :string, default: '#F57396', null: false
    add_column :communities, :model_units_opacity, :decimal, precision: 3, scale: 2, default: 1.0, null: false

    add_column :communities, :amenities_color, :string, default: '#d37474', null: false
    add_column :communities, :amenities_opacity, :decimal, precision: 3, scale: 2, default: 1.0, null: false

    add_column :communities, :coloring_mode, :integer, default: 0, null: false
  end
end
