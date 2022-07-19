class CreateHardwareSpecs < ActiveRecord::Migration[5.0]
  def change
    create_table :hardware_specs do |t|
      t.string :name
      t.string :phone
      t.string :image
      t.references :community
      t.timestamps
    end
  end
end
