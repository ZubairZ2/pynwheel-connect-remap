class AddAutoWayfindingToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :auto_wayfinding, :boolean, default: false
  end
end
