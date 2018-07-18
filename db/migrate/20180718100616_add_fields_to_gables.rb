class AddFieldsToGables < ActiveRecord::Migration[5.0]
  def change
    add_column :gables, :webpages_button_color, :string
    add_column :gables, :imagepages_button_color, :string
  end
end
