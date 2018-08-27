class AddDisplayRentFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_rent, :boolean,default: true
  end
end
