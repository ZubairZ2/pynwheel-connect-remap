class RemoveUserFromEdgeState < ActiveRecord::Migration[5.0]
  def change
    remove_reference :edge_states, :user, index: true, foreign_key: true
  end
end
