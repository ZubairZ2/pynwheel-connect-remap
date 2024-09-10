class CreateElevatorBanks < ActiveRecord::Migration[5.0]
  def change
    create_table :elevator_banks do |t|
      t.string :name
      t.string :position
      t.string :lock_type
      t.string :lock_name
      t.string :lock_id
      t.references :elevator, null: false, foreign_key: true

      t.timestamps
    end
  end
end