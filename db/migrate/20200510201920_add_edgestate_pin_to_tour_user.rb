class AddEdgestatePinToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :edgestate_pin, :string
  end
end
