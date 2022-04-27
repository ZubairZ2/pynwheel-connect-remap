class AddLabelImages < ActiveRecord::Migration[5.0]
  def change
    add_column :sitemaps , :label_image , :string
    add_column :floorplates , :label_image , :string
  end
end
