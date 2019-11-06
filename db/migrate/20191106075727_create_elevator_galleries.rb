class CreateElevatorGalleries < ActiveRecord::Migration[5.0]
  def change
    create_table :elevator_galleries do |t|
      t.references :elevator, foreign_key: true
      t.string :image

      t.timestamps
    end
  end
end
