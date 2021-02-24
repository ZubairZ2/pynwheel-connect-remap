class AddRelatiosnToTables < ActiveRecord::Migration[5.0]
  def change
    add_column :companies, :creator_id, :integer
    add_column :communities, :creator_id, :integer
    add_column :community_groups, :creator_id, :integer
  end
end
