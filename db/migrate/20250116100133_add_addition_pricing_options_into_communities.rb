class AddAdditionPricingOptionsIntoCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_additional_fee, :boolean, default: true
    add_column :communities, :display_manual_additional_fee, :boolean, default: false

    add_column :communities, :additional_fee, :string, default: ""
    add_column :communities, :manual_additional_fee, :string, default: ""
  end
end