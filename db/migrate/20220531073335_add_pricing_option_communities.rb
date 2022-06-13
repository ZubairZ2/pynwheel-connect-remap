class AddPricingOptionCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_pricing_options, :boolean,default: true
  end
end
