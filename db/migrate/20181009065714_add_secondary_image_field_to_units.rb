class AddSecondaryImageFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :secondary_image, :string
  end
end
