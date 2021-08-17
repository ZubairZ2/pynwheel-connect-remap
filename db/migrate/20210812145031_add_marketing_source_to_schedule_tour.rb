class AddMarketingSourceToScheduleTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :realpage_marketing_source, :string
  end
end
