class AddIsDefaultColumnToGallery < ActiveRecord::Migration[5.0]
  def change
    add_column :galleries, :is_default, :boolean, default: false
  end
end
