class AddDataLastUpdatedDateToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :data_provider_updated_on, :string, default: "Never"
  end
end
