class AddSelfTourToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :self_tour, :boolean, :default => false
  end
end
