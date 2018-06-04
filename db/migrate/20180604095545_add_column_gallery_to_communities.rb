class AddColumnGalleryToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :show_gallery, :boolean, default: true
    add_column :communities, :gallery_page_name, :string, default: "Gallery"
  end
end
