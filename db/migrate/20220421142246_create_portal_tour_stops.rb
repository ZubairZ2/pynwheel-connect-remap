class CreatePortalTourStops < ActiveRecord::Migration[5.0]
  def change
    create_table :portal_tour_stops do |t|
      t.integer :portal_tour_id
      t.string :stop_type
      t.string :name
      t.string :starting_point
      t.string :description
      t.string :direction
      t.string :video_link
      t.timestamps
    end
  end
end
