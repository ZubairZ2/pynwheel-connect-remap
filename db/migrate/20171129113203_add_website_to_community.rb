class AddWebsiteToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :website, :string
  end
end
