class ChangeMapOcrDataToJsonb < ActiveRecord::Migration[7.2]
  def change
    change_column :floorplates, :map_ocr_data, :jsonb, using: 'map_ocr_data::jsonb'
    change_column :sitemaps, :map_ocr_data, :jsonb, using: 'map_ocr_data::jsonb'
  end
end