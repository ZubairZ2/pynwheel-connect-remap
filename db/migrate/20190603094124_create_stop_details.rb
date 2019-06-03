class CreateStopDetails < ActiveRecord::Migration[5.0]
  def change
    create_table :stop_details do |t|
      t.references :tour_stop, foreign_key: true
      t.string :description

      t.timestamps
    end
  end
end
