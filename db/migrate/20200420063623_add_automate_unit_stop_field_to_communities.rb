class AddAutomateUnitStopFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :automate_unit_stop, :boolean, default: false
  end
end
