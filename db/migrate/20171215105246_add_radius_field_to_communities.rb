class AddRadiusFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :radius, :float
  end
end
