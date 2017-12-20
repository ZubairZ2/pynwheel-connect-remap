class RemoveColumnRadiusFromCommunities < ActiveRecord::Migration[5.0]
  def change
    remove_column :communities, :radius, :float
  end
end
