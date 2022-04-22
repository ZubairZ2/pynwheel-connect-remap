class CreatePortalTours < ActiveRecord::Migration[5.0]
  def change
    create_table :portal_tours do |t|
      t.integer :community_id
      t.string :start_tour
      t.integer :max_tour
      t.timestamps
    end
  end
end
