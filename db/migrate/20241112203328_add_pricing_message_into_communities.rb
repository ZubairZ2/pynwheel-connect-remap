class AddPricingMessageIntoCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :pricing_message, :string, default: "Please see an agent for pricing details."
  end
end