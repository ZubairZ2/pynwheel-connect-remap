class AddDescriptionFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :description, :text
  end
end
