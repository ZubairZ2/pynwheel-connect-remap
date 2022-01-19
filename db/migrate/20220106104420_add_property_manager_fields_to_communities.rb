class AddPropertyManagerFieldsToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :property_manager_name, :string
    add_column :communities, :property_manager_email, :string
    add_column :communities, :property_manager_phone, :string
  end
end
