class AddFileToSitemap < ActiveRecord::Migration[5.0]
  def change
    add_column :sitemaps, :file, :string
  end
end
