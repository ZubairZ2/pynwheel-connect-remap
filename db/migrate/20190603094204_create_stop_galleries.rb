class CreateStopGalleries < ActiveRecord::Migration[5.0]
  def change
    create_table :stop_galleries do |t|
      t.references :tour_stop, foreign_key: true
      t.string :image
      t.string :name

      t.timestamps
    end
  end
end
