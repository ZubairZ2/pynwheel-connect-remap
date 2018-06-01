class AddColumnShowHideToGalleries < ActiveRecord::Migration[5.0]
  def change
    add_column :galleries, :show_gallery, :boolean, default: true
    add_column :galleries, :gallery_name, :string, default: "Gallery"
  end
end
