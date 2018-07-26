class AddFieldsToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :sold, :boolean,default: false
    add_column :units, :manually_updated, :boolean,default: false
  end
end
