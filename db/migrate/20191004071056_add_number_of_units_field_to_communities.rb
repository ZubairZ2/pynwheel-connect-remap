class AddNumberOfUnitsFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :number_of_units, :integer
  end
end
