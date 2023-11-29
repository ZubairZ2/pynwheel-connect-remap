class AddUnitStatus < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :unit_status, :string, default: ""
  end
end
