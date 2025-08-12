class AddUnitNameKeyToCredentials < ActiveRecord::Migration[7.2]
  def change
    add_column :credentials, :unit_name_key, :string, default: 'MarketingTitle', null: false
  end
end
