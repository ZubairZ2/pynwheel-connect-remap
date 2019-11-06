class AddMenuButtonShadeFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :menu_button_shade, :string, default: "light"
  end
end
