class AddColumnApartmentPageShowHideToCommunities < ActiveRecord::Migration[5.0]
  def change
  	add_column :communities, :show_apartment, :boolean, default: true
    add_column :communities, :apartment_page_name, :string, default: "Apartments"
    remove_column :designs, :show_apartments, :boolean
    remove_column :designs, :apartments_name, :string
  end
end
