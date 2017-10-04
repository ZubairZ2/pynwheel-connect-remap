class AddThemeNameToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :theme_name, :string
  end
end
