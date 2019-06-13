class AddStopDescriptionFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :stop_description, :string
  end
end
