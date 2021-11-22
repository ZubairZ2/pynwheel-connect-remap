class AddPropertyAccessColumnsInTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :property_access_code, :integer
    add_column :tour_users, :property_access_code_generated_at, :datetime
  end
end
