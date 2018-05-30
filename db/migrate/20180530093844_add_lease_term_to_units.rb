class AddLeaseTermToUnits < ActiveRecord::Migration[5.0]
  def change
  	add_column :units, :lease_term, :integer, default: 12
  end
end
