class AddSvgAndMetadataInSitemapsAndFloorplates < ActiveRecord::Migration[5.0]
  def change
    add_column :sitemaps, :svg_image, :string
    add_column :sitemaps, :svg_metadata, :jsonb, default: {}
    add_column :floorplates, :svg_image, :string
    add_column :floorplates, :svg_metadata, :jsonb, default: {}
  end
end
