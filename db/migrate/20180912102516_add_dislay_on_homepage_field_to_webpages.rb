class AddDislayOnHomepageFieldToWebpages < ActiveRecord::Migration[5.0]
  def change
    add_column :webpages, :display_on_homepage, :boolean
  end
end
