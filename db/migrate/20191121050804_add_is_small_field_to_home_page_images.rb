class AddIsSmallFieldToHomePageImages < ActiveRecord::Migration[5.0]
  def change
    add_column :home_page_images, :is_small, :boolean, default: false
  end
end
