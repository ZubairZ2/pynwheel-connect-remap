class AddEnable3DMapsInCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :enable_three_d_maps, :boolean, default: false
  end
end
