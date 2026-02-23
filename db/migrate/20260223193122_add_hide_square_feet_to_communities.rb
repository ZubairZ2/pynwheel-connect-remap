class AddHideSquareFeetToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :hide_square_feet, :boolean, default: false
  end
end
