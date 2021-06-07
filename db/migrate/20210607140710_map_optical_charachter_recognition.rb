class MapOpticalCharachterRecognition < ActiveRecord::Migration[5.0]
  def change
    add_column :sitemaps, :map_ocr_data, :text
    add_column :floorplates, :map_ocr_data, :text

    add_column :sitemaps, :is_ocr_enabled, :boolean, default: false
    add_column :floorplates, :is_ocr_enabled, :boolean, default: false
  end
end
