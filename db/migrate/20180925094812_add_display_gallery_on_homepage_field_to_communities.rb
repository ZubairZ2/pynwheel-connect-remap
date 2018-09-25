class AddDisplayGalleryOnHomepageFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_gallery_on_homepage, :boolean, default: false
  end
end
