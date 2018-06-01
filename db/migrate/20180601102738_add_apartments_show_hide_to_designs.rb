class AddApartmentsShowHideToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :show_apartments, :boolean, default: true
    add_column :designs, :apartments_name, :string, default: "Apartments"
  end
end
