class AddCommunityCountyCode < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :country_code, :string
  end
end
