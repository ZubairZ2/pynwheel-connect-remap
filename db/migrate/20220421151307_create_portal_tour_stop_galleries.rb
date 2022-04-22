class CreatePortalTourStopGalleries < ActiveRecord::Migration[5.0]
  def change
    create_table :portal_tour_stop_galleries do |t|
      t.integer :portal_tour_stop_id
      t.string :image
      t.string :description
      t.timestamps
    end
  end
end
