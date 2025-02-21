class AddPointerDataInUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :pointer_data, :jsonb, default: {}
  end
end
