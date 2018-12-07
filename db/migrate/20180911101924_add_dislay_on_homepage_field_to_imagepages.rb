class AddDislayOnHomepageFieldToImagepages < ActiveRecord::Migration[5.0]
  def change
    add_column :imagepages, :display_on_homepage, :boolean, default: false 
  end
end
