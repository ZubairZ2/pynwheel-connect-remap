class MapOpticalCharachterRecognition < ActiveRecord::Migration[5.0]
  def change
    add_column :sitemaps, :map_ocr_data, :text
    add_column :floorplates, :map_ocr_data, :text
  end
end
